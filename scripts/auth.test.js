const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const CORE = require("../core.js");

const src = fs.readFileSync(path.join(__dirname, "..", "auth.js"), "utf8");
const json = x => JSON.parse(JSON.stringify(x));
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)); };

function setup({ config, remote = null, failUpdate = false, fetchStatus = 200, token = "tok", owner = null, stashed = {}, ctx: lessonCtx, push = null, beforeMerge = null, subsLeft = null } = {}) {
  const calls = [];
  let authCb = null;
  const builder = (table, op, args) => {
    calls.push({ table, op, args, filters: [] });
    const call = calls[calls.length - 1];
    const b = {
      select: () => b,
      eq: (...a) => { call.filters.push(["eq", ...a]); return b; },
      in: (...a) => { call.filters.push(["in", ...a]); return b; },
      maybeSingle: () => Promise.resolve({ data: { progress: remote }, error: null }),
      then: (res, rej) => (failUpdate && op === "update" ? Promise.reject(new Error("net")) : Promise.resolve({ data: op === "select" && table === "push_subscriptions" ? subsLeft : null, error: null })).then(res, rej)
    };
    return b;
  };
  const fake = {
    createClient: (url, key) => {
      calls.push({ op: "createClient", args: [url, key] });
      return {
        auth: {
          onAuthStateChange: cb => { authCb = cb; },
          getSession: async () => ({ data: { session: token ? { access_token: token } : null } }),
          signInWithOtp: async a => { calls.push({ op: "signInWithOtp", args: a }); return { error: null }; },
          signInWithOAuth: async a => { calls.push({ op: "signInWithOAuth", args: a }); return { error: null }; },
          signOut: async () => { calls.push({ op: "signOut" }); return { error: null }; }
        },
        from: table => ({
          select: (...a) => builder(table, "select", a),
          update: (...a) => builder(table, "update", a),
          insert: (...a) => builder(table, "insert", a),
          upsert: (...a) => builder(table, "upsert", a),
          delete: (...a) => builder(table, "delete", a)
        }),
        rpc: (fn, a) => builder(fn, "rpc", [a])
      };
    }
  };
  const win = {
    CORE, location: { origin: "http://app.test" }, supabase: fake,
    fetch: async (url, init) => { calls.push({ op: "fetch", args: [url, init] }); return { ok: fetchStatus === 200, status: fetchStatus, json: async () => ({ url, ok: 1 }) }; }
  };
  if (config) win.DRILLBIT_CONFIG = config;
  if (push) Object.assign(win, { PushManager: function () {}, Notification: { requestPermission: async () => push.permission }, atob: b => Buffer.from(b, "base64").toString("binary") });
  const ctx = vm.createContext({
    window: win,
    document: { createElement: () => ({}), head: { appendChild() {} } },
    setTimeout: (...a) => setTimeout(...a),
    clearTimeout: (...a) => clearTimeout(...a),
    Date, JSON, Promise, Uint8Array,
    ...(push ? { navigator: { serviceWorker: push.sw } } : {})
  });
  vm.runInContext(src, ctx);
  const notes = [];
  let state = json(CORE.blankState());
  state.streak = 3;
  state.lastDone = "2026-03-10";
  state.owner = owner;
  const sets = [], stashes = [];
  win.AUTH.attach({
    get: () => state, set: s => { sets.push(s); state = s; }, notify: m => notes.push(m),
    stash: s => stashes.push(json(s)), unstash: id => { const v = stashed[id] || null; delete stashed[id]; return v; },
    ...(lessonCtx ? { ctx: () => lessonCtx } : {}),
    ...(beforeMerge ? { beforeMerge } : {})
  });
  const signIn = async () => {
    await win.AUTH.ready;
    authCb("SIGNED_IN", { user: { id: "u1", email: "a@x.test" } });
    mock.timers.tick(10);
    await flush();
  };
  return { AUTH: win.AUTH, calls, notes, sets, stashes, signIn, getState: () => state };
}

const { mock } = test;
test.beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
test.afterEach(() => mock.timers.reset());
const ops = (calls, op) => calls.filter(c => c.op === op);
const CFG = { supabaseUrl: "https://x.supabase.test", supabaseAnonKey: "anon" };

test("without config AUTH is disabled and every method resolves", async () => {
  const { AUTH, calls } = setup({});
  assert.strictEqual(AUTH.enabled, false);
  await AUTH.ready;
  assert.strictEqual(AUTH.user(), null);
  for (const r of [await AUTH.signInWithEmail("a@x.test"), await AUTH.signInWithGoogle(), await AUTH.signOut(), await AUTH.pull(), await AUTH.push({}), await AUTH.logAttempt({}), await AUTH.syncQueue({}), await AUTH.sync()]) assert.strictEqual(r, null);
  AUTH.onChange(() => {});
  assert.strictEqual(calls.length, 0);
});

test("with only half the config AUTH stays disabled", () => {
  assert.strictEqual(setup({ config: { supabaseUrl: "https://x" } }).AUTH.enabled, false);
});

test("signInWithEmail sends an OTP with emailRedirectTo", async () => {
  const { AUTH, calls } = setup({ config: CFG });
  const r = await AUTH.signInWithEmail("a@x.test");
  assert.deepStrictEqual(json(r), { ok: true });
  assert.deepStrictEqual(json(ops(calls, "signInWithOtp")[0].args), { email: "a@x.test", options: { emailRedirectTo: "http://app.test" } });
  assert.deepStrictEqual(json(ops(calls, "createClient")[0].args), [CFG.supabaseUrl, CFG.supabaseAnonKey]);
});

test("signInWithGoogle starts the google OAuth flow", async () => {
  const { AUTH, calls } = setup({ config: CFG });
  await AUTH.signInWithGoogle();
  assert.strictEqual(ops(calls, "signInWithOAuth")[0].args.provider, "google");
});

test("first sign-in with no remote progress claims and pushes local", async () => {
  const t = setup({ config: CFG, remote: null });
  await t.signIn();
  assert.strictEqual(t.sets.length, 1);
  assert.deepStrictEqual([t.getState().owner, t.getState().streak], ["u1", 3]);
  const up = ops(t.calls, "update");
  assert.strictEqual(up.length, 1);
  assert.strictEqual(up[0].table, "profiles");
  assert.deepStrictEqual(json(up[0].args[0].progress), json(t.getState()));
  assert.deepStrictEqual(up[0].filters, [["eq", "id", "u1"]]);
  assert.strictEqual(t.AUTH.user().id, "u1");
});

test("sign-in with remote progress pushes the merged state", async () => {
  const remote = json(CORE.blankState());
  remote.streak = 9; remote.best = 9; remote.lastDone = "2026-03-12";
  const t = setup({ config: CFG, remote });
  const local = json(t.getState());
  await t.signIn();
  const merged = { ...json(CORE.mergeProgress(local, remote)), owner: "u1" };
  assert.strictEqual(t.sets.length, 1);
  assert.deepStrictEqual(json(t.sets[0]), merged);
  assert.deepStrictEqual(json(ops(t.calls, "update")[0].args[0].progress), merged);
  assert.strictEqual(merged.streak, 9);
});

test("push is debounced to the last state after 2 seconds", async () => {
  const t = setup({ config: CFG, remote: null });
  await t.signIn();
  const before = ops(t.calls, "update").length;
  await t.AUTH.push({ profile: { interviewDate: "2026-05-01" }, n: 1 });
  await t.AUTH.push({ profile: { interviewDate: "2026-05-01" }, n: 2 });
  mock.timers.tick(1999);
  await flush();
  assert.strictEqual(ops(t.calls, "update").length, before);
  mock.timers.tick(1);
  await flush();
  const up = ops(t.calls, "update");
  assert.strictEqual(up.length, before + 1);
  assert.strictEqual(up[before].args[0].progress.n, 2);
  assert.strictEqual(up[before].args[0].interview_date, "2026-05-01");
});

test("logAttempt inserts a row and does nothing when signed out", async () => {
  const t = setup({ config: CFG });
  await t.AUTH.logAttempt({ item_id: "q1", correct: true });
  assert.strictEqual(ops(t.calls, "insert").length, 0);
  await t.signIn();
  const row = { item_id: "q1", correct: false, misconception_tag: "hashing.m1", duration_ms: 1200 };
  await t.AUTH.logAttempt(row);
  const ins = ops(t.calls, "insert")[0];
  assert.strictEqual(ins.table, "attempts");
  assert.deepStrictEqual(json(ins.args[0]), row);
});

test("syncQueue upserts unresolved misses, deletes resolved ones and skips unchanged", async () => {
  const t = setup({ config: CFG });
  await t.signIn();
  const misses = {
    a: { box: 1, due: "2026-03-13", resolved: false },
    b: { box: 3, due: null, resolved: true }
  };
  await t.AUTH.syncQueue(misses);
  const up = ops(t.calls, "upsert")[0];
  assert.strictEqual(up.table, "review_queue");
  assert.deepStrictEqual(json(up.args[0]), [{ item_id: "a", due_at: "2026-03-13", interval_days: 3, user_id: "u1" }]);
  assert.deepStrictEqual(json(up.args[1]), { onConflict: "user_id,item_id" });
  const del = ops(t.calls, "delete")[0];
  assert.deepStrictEqual(del.filters, [["in", "item_id", ["b"]]]);
  await t.AUTH.syncQueue(misses);
  assert.strictEqual(ops(t.calls, "upsert").length, 1);
});

test("a network failure never throws and notifies once", async () => {
  const t = setup({ config: CFG, failUpdate: true });
  await t.signIn();
  await t.AUTH.push({ profile: {} });
  mock.timers.tick(2000);
  await flush();
  assert.deepStrictEqual(await t.AUTH.pull().then(() => "ok"), "ok");
  assert.strictEqual(t.notes.length, 1);
});

test("access, content and checkout call the API with the bearer token", async () => {
  const t = setup({ config: CFG });
  assert.strictEqual(json(await t.AUTH.access()).url, "/api/access");
  assert.strictEqual(json(await t.AUTH.content()).url, "/api/content");
  assert.strictEqual(json(await t.AUTH.checkout()).url, "/api/checkout");
  const f = ops(t.calls, "fetch");
  assert.deepStrictEqual(f.map(c => c.args[0]), ["/api/access", "/api/content", "/api/checkout"]);
  assert.ok(f.every(c => c.args[1].headers.Authorization === "Bearer tok"));
  assert.strictEqual(f[0].args[1].method, undefined);
  assert.strictEqual(f[2].args[1].method, "POST");
});

test("API calls resolve null when signed out or when the server refuses", async () => {
  const out = setup({ config: CFG, token: null });
  assert.strictEqual(await out.AUTH.access(), null);
  assert.strictEqual(ops(out.calls, "fetch").length, 0);
  const denied = setup({ config: CFG, fetchStatus: 403 });
  assert.strictEqual(await denied.AUTH.content(), null);
  assert.strictEqual(denied.notes.length, 0);
});

test("disabled AUTH resolves access, content and checkout to null", async () => {
  const { AUTH } = setup({});
  assert.deepStrictEqual([await AUTH.access(), await AUTH.content(), await AUTH.checkout()], [null, null, null]);
});

test("saveReminder updates the own profile row with the reminder fields", async () => {
  const t = setup({ config: CFG });
  await t.signIn();
  const r = await t.AUTH.saveReminder({ enabled: true, hour: 8, timezone: "America/New_York" });
  assert.deepStrictEqual(json(r), { ok: true });
  const up = ops(t.calls, "update").filter(c => c.table === "profiles").pop();
  assert.deepStrictEqual(json(up.args), [{ reminders_enabled: true, reminder_hour: 8, timezone: "America/New_York" }]);
  assert.deepStrictEqual(json(up.filters), [["eq", "id", "u1"]]);
});

test("saveReminder resolves null when signed out", async () => {
  const t = setup({ config: CFG });
  assert.strictEqual(await t.AUTH.saveReminder({ enabled: true, hour: 8, timezone: "UTC" }), null);
});

test("progress owned by another account is stashed, not merged", async () => {
  const remote = json(CORE.blankState());
  remote.streak = 9; remote.lastDone = "2026-03-12";
  const t = setup({ config: CFG, remote, owner: "someone-else" });
  await t.signIn();
  assert.deepStrictEqual([t.getState().owner, t.getState().streak], ["u1", 9]);
  assert.deepStrictEqual([t.stashes.length, t.stashes[0].owner, t.stashes[0].streak], [1, "someone-else", 3]);
  assert.strictEqual(json(ops(t.calls, "update")[0].args[0].progress).streak, 9);
});

test("a stashed copy of this account comes back on sign-in", async () => {
  const mine = json(CORE.blankState());
  mine.owner = "u1"; mine.best = 21;
  const t = setup({ config: CFG, remote: null, owner: "someone-else", stashed: { u1: mine } });
  await t.signIn();
  assert.deepStrictEqual([t.getState().owner, t.getState().best], ["u1", 21]);
});

test("sync replays attempt events when the app provides lesson context", async () => {
  const lessonCtx = { patterns: [], guides: [], lessons: [{ id: "q1", track: "sd", topic: "x", type: "mcq" }, { id: "q2", track: "sd", topic: "x", type: "mcq" }] };
  const remote = json(CORE.recordAttempt(CORE.blankState(), lessonCtx, "2026-03-10", { lessonId: "q1", correct: true, id: "r1", ts: "2026-03-10T09:00:00Z" }));
  const t = setup({ config: CFG, remote, ctx: lessonCtx });
  CORE.recordAttempt(t.getState(), lessonCtx, "2026-03-10", { lessonId: "q2", correct: true, id: "l1", ts: "2026-03-10T10:00:00Z" });
  await t.signIn();
  assert.deepStrictEqual(t.getState().events.map(e => e.id), ["r1", "l1"]);
  assert.strictEqual(t.getState().days["2026-03-10"].answered, 2);
});

test("lastSync and syncFailed report sync status, and sync retries", async () => {
  const ok = setup({ config: CFG });
  assert.strictEqual(ok.AUTH.lastSync(), null);
  await ok.signIn();
  assert.ok(ok.AUTH.lastSync());
  assert.strictEqual(ok.AUTH.syncFailed(), false);
  const bad = setup({ config: CFG, failUpdate: true });
  await bad.signIn();
  assert.deepStrictEqual([bad.AUTH.lastSync(), bad.AUTH.syncFailed()], [null, true]);
  await bad.AUTH.sync();
  assert.strictEqual(bad.notes.length, 2, "a manual retry that fails again says so");
  assert.deepStrictEqual([setup({}).AUTH.lastSync(), setup({}).AUTH.syncFailed()], [null, false]);
});

// a fake service worker registration whose push manager records what happens
const fakePush = (permission = "granted", existing = null) => {
  const log = [];
  let current = existing;
  const sub = endpoint => ({ endpoint, toJSON: () => ({ endpoint, keys: { p256dh: "pk", auth: "ak" } }), unsubscribe: async () => { log.push(["unsubscribe", endpoint]); current = null; } });
  if (existing) current = sub(existing);
  const reg = { pushManager: { getSubscription: async () => current, subscribe: async o => { log.push(["subscribe", o.userVisibleOnly, o.applicationServerKey.length]); current = sub("https://push.test/new"); return current; } } };
  return { permission, log, sw: { register: async p => { log.push(["register", p]); return reg; }, getRegistration: async () => reg } };
};
const PUSH_CFG = { ...CFG, vapidPublicKey: "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" };

test("push is unsupported without a VAPID key or browser support", async () => {
  assert.strictEqual(setup({ config: CFG, push: fakePush() }).AUTH.pushSupported(), false);
  assert.strictEqual(setup({ config: PUSH_CFG }).AUTH.pushSupported(), false);
  assert.strictEqual(setup({ config: PUSH_CFG, push: fakePush() }).AUTH.pushSupported(), true);
  assert.strictEqual(await setup({}).AUTH.enablePush({ hour: 8, timezone: "UTC" }), null);
});

test("enablePush subscribes, stores the subscription and turns push on for the profile", async () => {
  const p = fakePush();
  const t = setup({ config: PUSH_CFG, push: p });
  await t.signIn();
  const r = await t.AUTH.enablePush({ hour: 8, timezone: "America/New_York" });
  assert.deepStrictEqual(json(r), { ok: true });
  assert.deepStrictEqual(p.log.map(x => x[0]), ["register", "subscribe"]);
  assert.strictEqual(p.log[1][1], true);
  const claim = ops(t.calls, "rpc").find(c => c.table === "claim_push_subscription");
  assert.deepStrictEqual(json(claim.args), [{ p_endpoint: "https://push.test/new", p_p256dh: "pk", p_auth: "ak" }]);
  const prof = ops(t.calls, "update").filter(c => c.table === "profiles").pop();
  assert.deepStrictEqual(json(prof.args[0]), { push_enabled: true, reminder_hour: 8, timezone: "America/New_York" });
});

test("enablePush stops when notification permission is denied", async () => {
  const p = fakePush("denied");
  const t = setup({ config: PUSH_CFG, push: p });
  await t.signIn();
  assert.deepStrictEqual(json(await t.AUTH.enablePush({ hour: 8, timezone: "UTC" })), { ok: false, reason: "denied" });
  assert.strictEqual(p.log.length, 0);
});

test("disablePush and sign-out remove this device's subscription", async () => {
  const p = fakePush("granted", "https://push.test/old");
  const t = setup({ config: PUSH_CFG, push: p });
  await t.signIn();
  assert.deepStrictEqual(json(await t.AUTH.disablePush()), { ok: true });
  const del = ops(t.calls, "delete").find(c => c.table === "push_subscriptions");
  assert.deepStrictEqual(del.filters, [["eq", "endpoint", "https://push.test/old"]]);
  assert.deepStrictEqual(p.log, [["unsubscribe", "https://push.test/old"]]);
  const q = fakePush("granted", "https://push.test/shared");
  const u = setup({ config: PUSH_CFG, push: q });
  await u.signIn();
  await u.AUTH.signOut();
  assert.deepStrictEqual(q.log, [["unsubscribe", "https://push.test/shared"]]);
  assert.ok(ops(u.calls, "signOut").length === 1);
});

test("sign-out sends a save still waiting on the delay, and the timer never fires afterwards", async () => {
  const t = setup({ config: CFG });
  await t.signIn();
  const before = ops(t.calls, "update").length;
  await t.AUTH.push({ v: 3, streak: 7 });
  await t.AUTH.signOut();
  const ups = ops(t.calls, "update");
  assert.strictEqual(ups.length, before + 1, "flushed once on sign-out");
  assert.strictEqual(ups[ups.length - 1].args[0].progress.streak, 7);
  mock.timers.tick(5000);
  await flush();
  assert.strictEqual(ops(t.calls, "update").length, before + 1, "the delayed save didn't run again with no user");
  assert.ok(ops(t.calls, "update").indexOf(ups[ups.length - 1]) >= 0 && t.calls.indexOf(ups[ups.length - 1]) < t.calls.findIndex(c => c.op === "signOut"), "saved before the session ended");
});

test("sync waits for beforeMerge (paid content) before merging", async () => {
  const order = [];
  const t = setup({ config: CFG, remote: { v: 3, streak: 9, lastDone: "2026-03-11" }, beforeMerge: async () => { order.push("beforeMerge"); } });
  const set = t.sets.length;
  await t.signIn();
  assert.deepStrictEqual(order, ["beforeMerge"]);
  assert.ok(t.sets.length > set, "merged after the hook ran");
});

test("disablePush keeps push on for the account while another device is subscribed", async () => {
  const t = setup({ config: PUSH_CFG, push: fakePush("granted", "https://push.test/laptop"), subsLeft: [{ endpoint: "https://push.test/phone" }] });
  await t.signIn();
  assert.deepStrictEqual(json(await t.AUTH.disablePush()), { ok: true });
  assert.ok(!ops(t.calls, "update").some(c => c.table === "profiles" && c.args[0].push_enabled === false), "phone keeps getting reminders");
  const u = setup({ config: PUSH_CFG, push: fakePush("granted", "https://push.test/only"), subsLeft: [] });
  await u.signIn();
  await u.AUTH.disablePush();
  assert.ok(ops(u.calls, "update").some(c => c.table === "profiles" && c.args[0].push_enabled === false), "last device off turns push off");
});
