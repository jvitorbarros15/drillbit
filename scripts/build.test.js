const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { build } = require("./build.js");
const { split } = require("../api/_lib/split.js");
const CORE = require("../core.js");

const lessons = require("../data.js");
const patterns = require("../patterns.js");
const guides = require("../guides.js");
const S = split({ lessons, patterns, guides });

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "drillbit-build-"));
const load = out => {
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(out, "content-free.js"), "utf8"), { window: win });
  return win;
};

test("build output has the free bundle and none of the paid text", () => {
  const out = tmp();
  build(out, {});
  const text = fs.readFileSync(path.join(out, "content-free.js"), "utf8");
  for (const l of S.paidLessons) {
    assert.ok(!text.includes(`"id":"${l.id}"`), l.id);
    assert.ok(!text.includes(JSON.stringify(l.prompt)), l.id + " prompt");
  }
  for (const g of S.paidGuides) assert.ok(!text.includes(JSON.stringify(g.body)), g.id + " body");
  assert.ok(!fs.existsSync(path.join(out, "data.js")));
  assert.ok(!fs.existsSync(path.join(out, "guides.js")));
  for (const f of ["index.html", "styles.css", "learn.css", "viz.js", "anim.js", "trace.js", "patterns.js", "companies.js", "core.js", "auth.js", "analytics.js", "app.js", "terms.html", "privacy.html", "refund.html"]) assert.ok(fs.existsSync(path.join(out, f)), f);
});

test("every free and diagnostic lesson is present", () => {
  const out = tmp();
  build(out, {});
  const win = load(out);
  const ids = new Set(win.LESSONS.map(l => l.id));
  for (const id of CORE.buildDiagnostic({ lessons, patterns, guides })) assert.ok(ids.has(id), id);
  const ctx = { lessons, patterns, guides };
  for (const l of lessons.filter(x => ["hashing", "two-pointers"].includes(CORE.patternOf(x, ctx)))) assert.ok(ids.has(l.id), l.id);
  assert.strictEqual(win.LESSONS.length + S.paidLessons.length, lessons.length);
});

test("each paid pattern the diagnostic tests has a free recognition item and a free coding problem", () => {
  const out = tmp();
  build(out, {});
  const win = load(out);
  const ids = new Set(win.LESSONS.map(l => l.id));
  const ctx = { lessons, patterns, guides };
  const diag = CORE.buildDiagnostic(ctx);
  const tested = new Set(diag.map(id => CORE.patternOf(lessons.find(l => l.id === id), ctx)));
  const samples = win.CONTENT_META.samples;
  for (const pid of tested) {
    if (["hashing", "two-pointers"].includes(pid)) { assert.ok(!samples[pid]); continue; }
    const [recog, code] = samples[pid];
    assert.ok(ids.has(recog) && ids.has(code), pid);
    const r = lessons.find(l => l.id === recog), c = lessons.find(l => l.id === code);
    assert.deepStrictEqual([CORE.patternOf(r, ctx), CORE.patternOf(c, ctx)], [pid, pid]);
    assert.ok(["mcq", "multi"].includes(r.type) && c.type === "code", pid);
    assert.ok(!diag.includes(recog) && !diag.includes(code), pid + " sample must differ from the diagnostic question");
  }
  assert.ok(S.paidLessons.every(l => !Object.values(samples).flat().includes(l.id)));
});

test("free guides are full and the rest are stubs without a body", () => {
  const out = tmp();
  build(out, {});
  const win = load(out);
  assert.strictEqual(win.GUIDES.length, guides.length);
  const freeIds = S.freeGuides.map(g => g.id).sort();
  assert.deepStrictEqual(freeIds, ["hashing", "two-pointers"]);
  for (const g of win.GUIDES) {
    if (freeIds.includes(g.id)) assert.ok(g.body && !g.locked, g.id);
    else {
      assert.strictEqual(g.locked, true);
      assert.deepStrictEqual(Object.keys(g).sort(), ["id", "locked", "summary", "title", "topics", "track"]);
    }
  }
});

test("CONTENT_META describes the split", () => {
  const out = tmp();
  build(out, {});
  const { CONTENT_META: m } = load(out);
  assert.deepStrictEqual([...m.freePatterns], ["hashing", "two-pointers"]);
  assert.strictEqual(m.paidLessons, S.paidLessons.length);
  assert.strictEqual(m.patternsWithContent, 13);
  assert.ok(m.lockedPatterns.length > 0);
  assert.ok(!m.lockedPatterns.includes("hashing") && !m.lockedPatterns.includes("two-pointers"));
});

test("index.html uses content-free.js instead of data.js and guides.js", () => {
  const out = tmp();
  build(out, {});
  const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
  assert.ok(html.includes('src="content-free.js"'));
  assert.ok(!html.includes('src="data.js"') && !html.includes('src="guides.js"'));
  assert.ok(html.indexOf("content-free.js") < html.indexOf("app.js"));
  assert.ok(fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").includes('src="data.js"'));
});

test("config.js is written only when both env vars are set", () => {
  let out = tmp();
  build(out, { SUPABASE_URL: "https://x.supabase.test" });
  assert.ok(!fs.existsSync(path.join(out, "config.js")));
  out = tmp();
  build(out, {});
  assert.ok(!fs.existsSync(path.join(out, "config.js")));
  out = tmp();
  build(out, { SUPABASE_URL: "https://x.supabase.test", SUPABASE_ANON_KEY: "anon" });
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(out, "config.js"), "utf8"), { window: win });
  assert.strictEqual(win.DRILLBIT_CONFIG.supabaseUrl, "https://x.supabase.test");
  assert.strictEqual(win.DRILLBIT_CONFIG.supabaseAnonKey, "anon");
});

test("config.js carries the PostHog settings only when POSTHOG_KEY is set", () => {
  let out = tmp();
  build(out, { POSTHOG_HOST: "https://eu.i.posthog.com" });
  assert.ok(!fs.existsSync(path.join(out, "config.js")));
  out = tmp();
  build(out, { SUPABASE_URL: "https://x.supabase.test", SUPABASE_ANON_KEY: "anon" });
  const plain = {};
  vm.runInNewContext(fs.readFileSync(path.join(out, "config.js"), "utf8"), { window: plain });
  assert.ok(!("posthogKey" in plain.DRILLBIT_CONFIG) && !("posthogHost" in plain.DRILLBIT_CONFIG));
  out = tmp();
  build(out, { POSTHOG_KEY: "phc_test", POSTHOG_HOST: "https://eu.i.posthog.com" });
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(out, "config.js"), "utf8"), { window: win });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(win.DRILLBIT_CONFIG)), { posthogKey: "phc_test", posthogHost: "https://eu.i.posthog.com" });
});

test("the legal pages are built and use the stylesheet", () => {
  const out = tmp();
  build(out, {});
  for (const f of ["terms.html", "privacy.html", "refund.html"]) {
    const html = fs.readFileSync(path.join(out, f), "utf8");
    assert.ok(html.includes('href="styles.css"') && html.includes("[Support email]"), f);
  }
});

test("build refuses to wipe the repo root", () => {
  assert.throws(() => build(path.join(__dirname, ".."), {}), /refusing/);
});
