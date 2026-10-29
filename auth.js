(function () {
  const cfg = window.DRILLBIT_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

  if (!enabled) {
    const none = async () => null;
    window.AUTH = {
      enabled: false, ready: Promise.resolve(), user: () => null, attach() {}, onChange() {},
      signInWithEmail: none, signInWithGoogle: none, signOut: none, pull: none, push: none,
      logAttempt: none, syncQueue: none, sync: none
    };
    return;
  }

  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  const PUSH_DELAY = 2000;
  let client = null, user = null, hooks = null, failed = false, syncedFor = null, lastQueue = "", timer = null, pending = null;
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

  function sync() {
    return guard(async () => {
      if (!user || !hooks) return;
      const local = hooks.get();
      const remote = await pullRaw();
      const next = remote ? window.CORE.mergeProgress(local, remote) : local;
      if (remote) hooks.set(next);
      clearTimeout(timer);
      pending = null;
      await pushNow(next);
      await queueNow(next.misses);
      emit("synced");
    });
  }

  window.AUTH = {
    enabled: true,
    ready,
    user: () => user,
    attach(h) { hooks = h; },
    onChange(cb) { listeners.push(cb); },
    sync,
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
    logAttempt: row => guard(async () => { if (user) check(await client.from("attempts").insert(row)); }),
    syncQueue: misses => guard(async () => { if (user) await queueNow(misses); })
  };
})();
