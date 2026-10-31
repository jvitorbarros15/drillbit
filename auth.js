(function () {
  const cfg = window.DRILLBIT_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

  if (!enabled) {
    const none = async () => null;
    window.AUTH = {
      access: none, content: none, checkout: none,
      enabled: false, ready: Promise.resolve(), user: () => null, attach() {}, onChange() {},
      signInWithEmail: none, signInWithGoogle: none, signOut: none, pull: none, push: none,
      logAttempt: none, syncQueue: none, sync: none, loadReminder: none, saveReminder: none,
      lastSync: () => null, syncFailed: () => false
    };
    return;
  }

  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  const PUSH_DELAY = 2000;
  let client = null, user = null, hooks = null, failed = false, syncedFor = null, lastQueue = "", timer = null, pending = null, lastSync = null;
  const listeners = [];
  const emit = what => listeners.forEach(cb => { try { cb(what); } catch (e) { /* listener bug must not break auth */ } });

  const fail = () => {
    if (failed) return;
    failed = true;
    if (hooks) hooks.notify("Couldn't reach your account. Progress is saved on this device.");
  };
  const check = res => { if (res && res.error) throw res.error; return res; };

  const ready = new Promise(resolve => {
    const start = () => {
      try {
        client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        client.auth.onAuthStateChange(onAuth);
      } catch (e) { client = null; fail(); }
      resolve();
    };
    if (window.supabase) { start(); return; }
    const s = document.createElement("script");
    s.src = CDN;
    s.onload = start;
    s.onerror = () => { fail(); resolve(); };
    document.head.appendChild(s);
  });

  const guard = async fn => {
    try {
      await ready;
      return client ? await fn() : null;
    } catch (e) { fail(); return null; }
  };

  function onAuth(event, session) {
    user = session ? session.user : null;
    if (!user) { syncedFor = null; lastQueue = ""; }
    emit("user");
    if (user && syncedFor !== user.id) { syncedFor = user.id; setTimeout(() => sync(), 0); }
  }

  async function pullRaw() {
    const r = check(await client.from("profiles").select("progress").eq("id", user.id).maybeSingle());
    return (r.data && r.data.progress) || null;
  }
  async function pushNow(state) {
    check(await client.from("profiles").update({
      progress: state,
      progress_updated_at: state.updatedAt || new Date().toISOString(),
      interview_date: (state.profile && state.profile.interviewDate) || null
    }).eq("id", user.id));
  }
  async function queueNow(misses) {
    const q = window.CORE.queueRows(misses);
    const key = JSON.stringify(q);
    if (key === lastQueue) return;
    if (q.upsert.length) check(await client.from("review_queue").upsert(q.upsert.map(r => ({ ...r, user_id: user.id })), { onConflict: "user_id,item_id" }));
    if (q.remove.length) check(await client.from("review_queue").delete().in("item_id", q.remove));
    lastQueue = key;
  }

  // Local progress owned by another account is never merged into this one. It is stashed on the device
  // and comes back if that account signs in here again.
  function sync() {
    failed = false;
    return guard(async () => {
      if (!user || !hooks) return;
      const C = window.CORE, uid = user.id;
      const local = hooks.get();
      const remote = await pullRaw();
      const foreign = !!local.owner && local.owner !== uid;
      if (foreign && hooks.stash) hooks.stash(local);
      const own = foreign ? (hooks.unstash ? hooks.unstash(uid) : null) : local;
      let next = own && remote ? C.mergeProgress(own, remote, hooks.ctx ? hooks.ctx() : undefined) : own || (remote ? C.migrate(remote) : C.blankState());
      if (next !== local || next.owner !== uid) { next = Object.assign({}, next, { owner: uid }); hooks.set(next); }
      clearTimeout(timer);
      pending = null;
      await pushNow(next);
      await queueNow(next.misses);
      lastSync = new Date().toISOString();
      emit("synced");
    });
  }

  const api = (path, init = {}) => guard(async () => {
    const { data } = await client.auth.getSession();
    const token = data && data.session && data.session.access_token;
    if (!token) return null;
    const res = await window.fetch(path, { ...init, headers: { ...(init.headers || {}), Authorization: "Bearer " + token } });
    return res.ok ? res.json() : null;
  });

  window.AUTH = {
    enabled: true,
    access: () => api("/api/access"),
    content: () => api("/api/content"),
    checkout: () => api("/api/checkout", { method: "POST" }),
    ready,
    user: () => user,
    attach(h) { hooks = h; },
    onChange(cb) { listeners.push(cb); },
    sync,
    lastSync: () => lastSync,
    syncFailed: () => failed,
    signInWithEmail: email => guard(async () => {
      check(await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } }));
      return { ok: true };
    }),
    signInWithGoogle: () => guard(async () => {
      check(await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }));
      return { ok: true };
    }),
    signOut: () => guard(async () => {
      check(await client.auth.signOut());
      user = null; syncedFor = null; lastQueue = "";
      emit("user");
    }),
    pull: () => guard(async () => (user ? pullRaw() : null)),
    push: async state => {
      if (!user) return;
      pending = state;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const s = pending;
        pending = null;
        if (s) guard(() => pushNow(s));
      }, PUSH_DELAY);
    },
    loadReminder: () => guard(async () => {
      if (!user) return null;
      const r = check(await client.from("profiles").select("reminders_enabled, reminder_hour, timezone").eq("id", user.id).maybeSingle());
      return r.data ? { enabled: r.data.reminders_enabled, hour: r.data.reminder_hour, timezone: r.data.timezone } : null;
    }),
    saveReminder: ({ enabled, hour, timezone }) => guard(async () => {
      if (!user) return null;
      check(await client.from("profiles").update({ reminders_enabled: enabled, reminder_hour: hour, timezone }).eq("id", user.id));
      return { ok: true };
    }),
    logAttempt: row => guard(async () => { if (user) check(await client.from("attempts").insert(row)); }),
    syncQueue: misses => guard(async () => { if (user) await queueNow(misses); })
  };
})();
