const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const CORE = require("../core.js");

const src = fs.readFileSync(path.join(__dirname, "..", "auth.js"), "utf8");
const json = x => JSON.parse(JSON.stringify(x));
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)); };

function setup({ config, remote = null, failUpdate = false } = {}) {
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
      then: (res, rej) => (failUpdate && op === "update" ? Promise.reject(new Error("net")) : Promise.resolve({ data: null, error: null })).then(res, rej)
    };
    return b;
  };
  const fake = {
    createClient: (url, key) => {
      calls.push({ op: "createClient", args: [url, key] });
      return {
        auth: {
          onAuthStateChange: cb => { authCb = cb; },
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
        })
      };
    }
  };
  const win = { CORE, location: { origin: "http://app.test" }, supabase: fake };
  if (config) win.DRILLBIT_CONFIG = config;
  const ctx = vm.createContext({
    window: win,
    document: { createElement: () => ({}), head: { appendChild() {} } },
    setTimeout: (...a) => setTimeout(...a),
    clearTimeout: (...a) => clearTimeout(...a),
    Date, JSON, Promise
  });
  vm.runInContext(src, ctx);
  const notes = [];
  let state = json(CORE.blankState());
  state.streak = 3;
  state.lastDone = "2026-03-10";
  const sets = [];
  win.AUTH.attach({ get: () => state, set: s => { sets.push(s); state = s; }, notify: m => notes.push(m) });
  const signIn = async () => {
    await win.AUTH.ready;
    authCb("SIGNED_IN", { user: { id: "u1", email: "a@x.test" } });
    mock.timers.tick(10);
    await flush();
  };
  return { AUTH: win.AUTH, calls, notes, sets, signIn, getState: () => state };
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

test("first sign-in with no remote progress pushes local", async () => {
  const t = setup({ config: CFG, remote: null });
  await t.signIn();
  assert.strictEqual(t.sets.length, 0);
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
  const merged = json(CORE.mergeProgress(local, remote));
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
