const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createAnalytics } = require("../api/_lib/analytics.js");

const src = fs.readFileSync(path.join(__dirname, "..", "analytics.js"), "utf8");
const json = x => JSON.parse(JSON.stringify(x));

function setup({ config, dnt = null, posthog = true } = {}) {
  const calls = [];
  const scripts = [];
  const win = {};
  if (config) win.DRILLBIT_CONFIG = config;
  if (posthog) win.posthog = { __SV: 1, init: (...a) => calls.push(["init", ...a]), capture: (...a) => calls.push(["capture", ...a]), identify: (...a) => calls.push(["identify", ...a]) };
  const ctx = vm.createContext({
    window: win,
    navigator: { doNotTrack: dnt },
    document: { createElement: () => ({}), getElementsByTagName: () => [{ parentNode: { insertBefore: el => scripts.push(el) } }] }
  });
  vm.runInContext(src, ctx);
  return { win, calls, scripts };
}

test("analytics is a no-op without a key", () => {
  const { win, calls } = setup({ config: {} });
  assert.strictEqual(win.ANALYTICS.enabled, false);
  win.ANALYTICS.track("x", { a: 1 });
  win.ANALYTICS.identify("u1");
  assert.deepStrictEqual(calls, []);
});

test("analytics is a no-op when Do Not Track is on", () => {
  const { win, calls } = setup({ config: { posthogKey: "phc_x" }, dnt: "1" });
  assert.strictEqual(win.ANALYTICS.enabled, false);
  win.ANALYTICS.track("x");
  assert.deepStrictEqual(calls, []);
});

test("with a key it inits PostHog with the private settings and forwards track", () => {
  const { win, calls } = setup({ config: { posthogKey: "phc_x" } });
  assert.strictEqual(win.ANALYTICS.enabled, true);
  assert.deepStrictEqual(json(calls[0]), ["init", "phc_x", {
    api_host: "https://us.i.posthog.com", autocapture: false, capture_pageview: true, persistence: "localStorage", disable_session_recording: true
  }]);
  win.ANALYTICS.track("session_completed", { correct: 2, phase: "learn" });
  assert.deepStrictEqual(json(calls[1]), ["capture", "session_completed", { correct: 2, phase: "learn" }]);
});

test("a custom host is used and identify passes only the id", () => {
  const { win, calls } = setup({ config: { posthogKey: "phc_x", posthogHost: "https://eu.i.posthog.com" } });
  assert.strictEqual(calls[0][2].api_host, "https://eu.i.posthog.com");
  win.ANALYTICS.identify("user-1", { email: "a@b.test" });
  assert.deepStrictEqual(calls[1], ["identify", "user-1"]);
});

test("without a preloaded posthog it injects the stub and loads array.js", () => {
  const { win, scripts } = setup({ config: { posthogKey: "phc_x" }, posthog: false });
  assert.strictEqual(scripts.length, 1);
  assert.strictEqual(scripts[0].src, "https://us-assets.i.posthog.com/static/array.js");
  assert.doesNotThrow(() => win.ANALYTICS.track("x"));
});

test("server capture posts the expected body", async () => {
  const seen = [];
  const a = createAnalytics({ key: "phc_k", host: "https://eu.i.posthog.com/", fetch: async (url, init) => { seen.push([url, init]); return { ok: true }; } });
  await a.capture("refund", "pi_1", { kind: "refund" });
  assert.strictEqual(seen[0][0], "https://eu.i.posthog.com/i/v0/e/");
  assert.strictEqual(seen[0][1].method, "POST");
  assert.deepStrictEqual(JSON.parse(seen[0][1].body), { api_key: "phc_k", event: "refund", distinct_id: "pi_1", properties: { kind: "refund" } });
});

test("server capture defaults the host and does nothing without a key", async () => {
  const seen = [];
  const fetch = async url => { seen.push(url); };
  await createAnalytics({ key: "k", fetch }).capture("e", "d");
  assert.deepStrictEqual(seen, ["https://us.i.posthog.com/i/v0/e/"]);
  await createAnalytics({ fetch }).capture("e", "d");
  assert.strictEqual(seen.length, 1);
});

test("server capture swallows a fetch rejection", async () => {
  const a = createAnalytics({ key: "k", fetch: async () => { throw new Error("net"); } });
  await assert.doesNotReject(a.capture("e", "d"));
});

test("server capture gives up after the timeout", async () => {
  const a = createAnalytics({ key: "k", fetch: () => new Promise(() => {}) });
  const t0 = Date.now();
  await a.capture("e", "d");
  assert.ok(Date.now() - t0 < 3000);
});
