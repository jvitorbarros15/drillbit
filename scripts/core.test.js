const test = require("node:test");
const assert = require("node:assert");
const C = require("../core.js");

const T = "2026-03-10";
const mis = pid => [1, 2, 3].map(i => ({ id: `${pid}.m${i}`, label: "l", fix: "f" }));
const pat = (id, topic, guide = null) => ({ id, name: id.toUpperCase(), topics: [topic], guide, misconceptions: mis(id) });
const base = { track: "algo", prompt: "p", explain: "e", title: "t" };
const mcq = (id, topic, level, answer, misses) => ({ ...base, id, topic, level, type: "mcq", options: ["a", "b", "c"], answer, misses });
const code = (id, topic, level, tests) => ({ ...base, id, topic, level, type: "code", fn: "f", starter: "s", solution: "s", tests });
const ctx = {
  patterns: [pat("pa", "TA", "ga"), pat("pb", "TB"), pat("pc", "TC"), pat("pd", "TD")],
  guides: [{ id: "ga" }],
  lessons: [
    mcq("qa1", "TA", 1, 0, [null, "pa.m1", "pa.m2"]),
    { ...base, id: "qa2", topic: "TA", level: 2, type: "multi", options: ["a", "b"], answers: [0], miss: "pa.m1" },
    code("ca1", "TA", 1, [{ args: [1], expected: 1, miss: "pa.m1" }, { args: [2], expected: 2 }, { args: [3], expected: 3, miss: "pa.m3" }]),
    code("ca2", "TA", 2, [{ args: [1], expected: 1, miss: "pa.m1" }]),
    code("ca3", "TA", 3, [{ args: [1], expected: 1, miss: "pa.m2" }]),
    mcq("qb1", "TB", 1, 1, ["pb.m1", null, "pb.m2"]),
    code("cb1", "TB", 1, [{ args: [1], expected: 1, miss: "pb.m1" }]),
    mcq("qc1", "TC", 1, 2, ["pc.m1", "pc.m2", null]),
    mcq("qc2", "TC", 2, 2, ["pc.m1", "pc.m2", null]),
    { ...base, id: "sd1", track: "sd", topic: "Caching", level: 1, type: "mcq", options: ["a", "b"], answer: 0 }
  ]
};
const L = id => ctx.lessons.find(l => l.id === id);
const st = () => C.blankState();
const rec = (s, o, day = T) => C.recordAttempt(s, ctx, day, o);
const ready = s => { s.patterns.pb = { mastered: T }; s.patterns.pc = { mastered: T }; return s; };

test("dates and rng", () => {
  assert.strictEqual(C.addDays("2026-02-27", 3), "2026-03-02");
  assert.strictEqual(C.diffDays("2026-03-10", "2026-03-01"), 9);
  assert.strictEqual(C.fmt(C.parse("2026-03-10")), "2026-03-10");
  assert.strictEqual(C.seededRng("x")(), C.seededRng("x")());
  assert.notStrictEqual(C.seededRng("x")(), C.seededRng("y")());
});

test("patternOf", () => {
  assert.strictEqual(C.patternOf(L("ca1"), ctx), "pa");
  assert.strictEqual(C.patternOf(L("qc1"), ctx), "pc");
  assert.strictEqual(C.patternOf(L("sd1"), ctx), null);
});

test("inferMiss for every type", () => {
  assert.strictEqual(C.inferMiss(L("qa1"), { picked: 1 }), "pa.m1");
  assert.strictEqual(C.inferMiss(L("qa1"), { picked: 0 }), null);
  assert.strictEqual(C.inferMiss(L("qa2"), { picked: [1] }), "pa.m1");
  assert.strictEqual(C.inferMiss({ type: "number", miss: "pa.m2" }, {}), "pa.m2");
  assert.strictEqual(C.inferMiss({ type: "number" }, {}), null);
  assert.strictEqual(C.inferMiss(L("ca1"), { results: [{ pass: true }, { pass: false }, { pass: false }] }), "pa.m3");
  assert.strictEqual(C.inferMiss(L("ca1"), { results: [{ pass: false }, { pass: false }, { pass: false }] }), null);
  assert.strictEqual(C.inferMiss(L("ca1"), { results: [{ pass: false }, { pass: true }, { pass: false }] }), "pa.m1");
  assert.strictEqual(C.inferMiss(L("ca1"), { results: [{ pass: true }, { pass: false }, { pass: true }] }), null);
  assert.strictEqual(C.inferMiss(L("ca1"), { results: [{ pass: true }, { pass: true }, { pass: true }] }), null);
});

test("a miss puts the tag due tomorrow", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  assert.deepStrictEqual(s.misses["pa.m1"], { box: 0, due: "2026-03-11", lastMiss: T, items: ["qa1"], count: 1, resolved: false });
  assert.strictEqual(s.patterns.pa.lastMiss, T);
  assert.strictEqual(s.patterns.pa.started, T);
  assert.deepStrictEqual(s.items.qa1, { seen: 1, correct: 0, wrong: 1, last: T, hinted: false });
  assert.deepStrictEqual(s.days[T], { answered: 1, correct: 0 });
  rec(s, { lessonId: "qa1", correct: false, tag: "pa.m1" });
  rec(s, { lessonId: "qa2", correct: false, tag: "pa.m1" });
  assert.strictEqual(s.misses["pa.m1"].count, 3);
  assert.deepStrictEqual(s.misses["pa.m1"].items, ["qa1", "qa2"]);
  assert.deepStrictEqual(C.dueTags(s, T), []);
  assert.deepStrictEqual(C.dueTags(s, "2026-03-11"), ["pa.m1"]);
});

test("a wrong answer without a tag still sets lastMiss", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false });
  assert.deepStrictEqual(s.misses, {});
  assert.strictEqual(s.patterns.pa.lastMiss, T);
});

test("sd lessons only touch item stats", () => {
  const s = rec(st(), { lessonId: "sd1", correct: false, tag: "pa.m1" });
  assert.deepStrictEqual(s.patterns, {});
  assert.deepStrictEqual(s.misses, {});
  assert.strictEqual(s.items.sd1.wrong, 1);
});

test("review spacing 1, 3, 7 then resolved", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  const m = () => s.misses["pa.m1"];
  rec(s, { lessonId: "qa2", correct: true, reviewOf: "pa.m1" }, "2026-03-11");
  assert.deepStrictEqual([m().box, m().due, m().resolved], [1, "2026-03-14", false]);
  rec(s, { lessonId: "qa2", correct: true, reviewOf: "pa.m1" }, "2026-03-14");
  assert.deepStrictEqual([m().box, m().due, m().resolved], [2, "2026-03-21", false]);
  assert.deepStrictEqual(C.dueTags(s, "2026-03-20"), []);
  rec(s, { lessonId: "qa2", correct: true, reviewOf: "pa.m1" }, "2026-03-21");
  assert.deepStrictEqual([m().resolved, m().due], [true, null]);
  assert.deepStrictEqual(C.dueTags(s, "2030-01-01"), []);
});

test("a miss during review resets the box", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  rec(s, { lessonId: "qa2", correct: true, reviewOf: "pa.m1" }, "2026-03-11");
  rec(s, { lessonId: "qa2", correct: false, reviewOf: "pa.m1" }, "2026-03-14");
  assert.deepStrictEqual([s.misses["pa.m1"].box, s.misses["pa.m1"].due], [0, "2026-03-15"]);
  assert.strictEqual(s.misses["pa.m1"].count, 1);
});

test("a new miss reopens a resolved tag", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  s.misses["pa.m1"].resolved = true;
  s.misses["pa.m1"].due = null;
  rec(s, { lessonId: "qa1", correct: false, tag: "pa.m1" }, "2026-03-20");
  assert.deepStrictEqual([s.misses["pa.m1"].resolved, s.misses["pa.m1"].due], [false, "2026-03-21"]);
});

test("dueTags orders by overdue then id", () => {
  const s = st();
  s.misses = {
    "pa.m2": { box: 0, due: "2026-03-09", items: [], resolved: false },
    "pa.m1": { box: 0, due: "2026-03-09", items: [], resolved: false },
    "pb.m1": { box: 0, due: "2026-03-05", items: [], resolved: false },
    "pb.m2": { box: 0, due: "2026-03-20", items: [], resolved: false },
    "pc.m1": { box: 0, due: "2026-03-01", items: [], resolved: true }
  };
  assert.deepStrictEqual(C.dueTags(s, T), ["pb.m1", "pa.m1", "pa.m2"]);
});

test("pickReview picks a different lesson and falls back", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  const day = "2026-03-11";
  assert.strictEqual(C.pickReview(s, ctx, T), null);
  const r = C.pickReview(s, ctx, day);
  assert.strictEqual(r.tag, "pa.m1");
  assert.ok(["qa2", "ca1", "ca2"].includes(r.lessonId));
  for (const id of ["qa2", "ca1", "ca2"]) s.misses["pa.m1"].items.push(id);
  const f = C.pickReview(s, ctx, day);
  assert.ok(["qa1", "qa2", "ca1", "ca2"].includes(f.lessonId));
});

test("pickReview prefers the least recently seen", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  s.items.qa2 = { seen: 1, correct: 1, wrong: 0, last: "2026-03-09", hinted: false };
  s.items.ca1 = { seen: 1, correct: 1, wrong: 0, last: "2026-03-01", hinted: false };
  s.items.ca2 = { seen: 1, correct: 1, wrong: 0, last: "2026-03-05", hinted: false };
  assert.strictEqual(C.pickReview(s, ctx, "2026-03-11").lessonId, "ca1");
});

test("pickReview skips a due tag no lesson carries", () => {
  const s = st();
  s.misses["pa.m2"] = { box: 0, due: "2026-03-01", items: [], resolved: false };
  s.misses["pd.m1"] = { box: 0, due: "2026-02-01", items: [], resolved: false };
  assert.strictEqual(C.pickReview(s, ctx, T).tag, "pa.m2");
});

test("mastery rules", () => {
  const ok = { lessonId: "ca1", correct: true, hinted: false };
  assert.strictEqual(rec(st(), ok).patterns.pa.mastered, T);
  assert.strictEqual(rec(st(), { ...ok, hinted: true }).patterns.pa.mastered, null);
  assert.strictEqual(rec(st(), { ...ok, diagnostic: true }).patterns.pa.mastered, null);
  assert.strictEqual(rec(st(), { lessonId: "qa1", correct: true }).patterns.pa.mastered, null);
  assert.strictEqual(rec(st(), { ...ok, correct: false }).patterns.pa.mastered, null);
  const seenBefore = rec(st(), { lessonId: "ca1", correct: false }, "2026-03-01");
  assert.strictEqual(rec(seenBefore, ok).patterns.pa.mastered, null);
  const recent = rec(st(), { lessonId: "qa1", correct: false }, "2026-03-09");
  assert.strictEqual(rec(recent, ok).patterns.pa.mastered, null);
  const old = rec(st(), { lessonId: "qa1", correct: false }, "2026-03-08");
  assert.strictEqual(rec(old, ok).patterns.pa.mastered, T);
});

test("a later miss clears mastery", () => {
  const s = rec(st(), { lessonId: "ca1", correct: true });
  assert.strictEqual(s.patterns.pa.mastered, T);
  rec(s, { lessonId: "qa1", correct: false, tag: "pa.m1" }, "2026-03-12");
  assert.strictEqual(s.patterns.pa.mastered, null);
});

test("readiness statuses", () => {
  const s = st();
  let r = C.readiness(s, ctx, T);
  assert.deepStrictEqual(r.map(x => x.id), ["pa", "pb", "pc", "pd"]);
  assert.deepStrictEqual(r.map(x => x.status), ["new", "new", "new", "new"]);
  assert.deepStrictEqual(r.map(x => x.hasContent), [true, true, true, false]);
  rec(s, { lessonId: "qa1", correct: true });
  r = C.readiness(s, ctx, T);
  assert.deepStrictEqual([r[0].status, r[0].attempted, r[0].correct], ["learning", 1, 1]);
  rec(s, { lessonId: "cb1", correct: true });
  assert.strictEqual(C.readiness(s, ctx, T)[1].status, "ready");
  rec(s, { lessonId: "qc1", correct: false, tag: "pc.m1" });
  r = C.readiness(s, ctx, T);
  assert.deepStrictEqual([r[2].status, r[2].openMisses], ["shaky", 1]);
  s.misses["pb.m1"] = { box: 0, due: "2026-03-11", items: [], resolved: false };
  r = C.readiness(s, ctx, T);
  assert.deepStrictEqual([r[1].status, r[1].openMisses], ["shaky", 1]);
  s.misses["pb.m1"].resolved = true;
  assert.strictEqual(C.readiness(s, ctx, T)[1].status, "ready");
});

test("schedule phases", () => {
  const s = st();
  const at = d => { s.profile.interviewDate = d; const r = C.schedule(s, ctx, T); return [r.phase, r.daysLeft]; };
  assert.deepStrictEqual(C.schedule(s, ctx, T), { daysLeft: null, phase: "no-date", current: "pa", remaining: 3 });
  assert.deepStrictEqual(at("2026-04-10"), ["learn", 31]);
  assert.deepStrictEqual(at("2026-03-18"), ["learn", 8]);
  assert.deepStrictEqual(at("2026-03-17"), ["final-review", 7]);
  assert.deepStrictEqual(at("2026-03-11"), ["final-review", 1]);
  assert.deepStrictEqual(at(T), ["past", 0]);
  assert.deepStrictEqual(at("2026-03-01"), ["past", -9]);
});

test("schedule current is weak first, then pattern order", () => {
  const s = st();
  const cur = () => C.schedule(s, ctx, T);
  s.diagnostic = { at: T, results: { pa: { correct: 1, total: 1 }, pb: { correct: 0, total: 1 }, pc: { correct: 1, total: 1 } } };
  assert.strictEqual(cur().current, "pb");
  s.diagnostic.results.pc = { correct: 0, total: 1 };
  assert.strictEqual(cur().current, "pb");
  s.patterns.pb = { mastered: T };
  assert.strictEqual(cur().current, "pc");
  s.patterns.pc = { mastered: T };
  assert.deepStrictEqual([cur().current, cur().remaining], ["pa", 1]);
  s.patterns.pa = { mastered: T };
  assert.deepStrictEqual([cur().current, cur().remaining], [null, 0]);
});

test("composeSession in the learn phase falls back to recognition", () => {
  const s = st();
  const a = C.composeSession(s, ctx, T);
  assert.deepStrictEqual(a, [
    { kind: "recognition", lessonId: "qa1" },
    { kind: "concept", patternId: "pa", guideId: "ga" },
    { kind: "exercise", lessonId: "ca1", independent: false }
  ]);
  assert.deepStrictEqual(C.composeSession(s, ctx, T), a);
  rec(s, { lessonId: "qa1", correct: true });
  assert.strictEqual(C.composeSession(s, ctx, T)[0].lessonId, "qa2");
});

test("composeSession starts with a due review", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  const a = C.composeSession(s, ctx, "2026-03-11");
  assert.strictEqual(a.length, 3);
  assert.strictEqual(a[0].kind, "review");
  assert.strictEqual(a[0].tag, "pa.m1");
  assert.notStrictEqual(a[0].lessonId, "qa1");
  assert.notStrictEqual(a[2].lessonId, a[0].lessonId);
});

test("composeSession concept has a null guide when the pattern has none", () => {
  const s = st();
  s.patterns.pa = { mastered: T };
  assert.deepStrictEqual(C.composeSession(s, ctx, T)[1], { kind: "concept", patternId: "pb", guideId: null });
});

test("exercise picks unseen, then unsolved, then any", () => {
  const s = ready(st());
  rec(s, { lessonId: "ca1", correct: true }, "2026-03-01");
  assert.strictEqual(C.composeSession(s, ctx, T)[2].lessonId, "ca2");
  rec(s, { lessonId: "ca2", correct: false });
  rec(s, { lessonId: "ca3", correct: true });
  assert.strictEqual(C.composeSession(s, ctx, "2026-03-20")[2].lessonId, "ca2");
  rec(s, { lessonId: "ca2", correct: true }, "2026-03-21");
  assert.strictEqual(C.composeSession(s, ctx, "2026-03-22")[2].lessonId, "ca1");
});

test("independent flag", () => {
  const s = ready(st());
  rec(s, { lessonId: "qa1", correct: true });
  let e = C.composeSession(s, ctx, T)[2];
  assert.deepStrictEqual([e.lessonId, e.independent], ["ca1", true]);
  s.patterns.pa.lastMiss = "2026-03-08";
  assert.strictEqual(C.composeSession(s, ctx, T)[2].independent, true);
  s.patterns.pa.lastMiss = "2026-03-09";
  assert.strictEqual(C.composeSession(s, ctx, T)[2].independent, false);
  const nothing = ready(st());
  assert.strictEqual(C.composeSession(nothing, ctx, T)[2].independent, false);
  const seenOnly = ready(st());
  rec(seenOnly, { lessonId: "qa1", correct: true });
  rec(seenOnly, { lessonId: "ca1", correct: false }, "2026-03-01");
  rec(seenOnly, { lessonId: "ca2", correct: false }, "2026-03-01");
  rec(seenOnly, { lessonId: "ca3", correct: false }, "2026-03-01");
  const x = C.composeSession(seenOnly, ctx, T)[2];
  assert.deepStrictEqual([x.kind, x.independent], ["exercise", false]);
});

test("a pattern with no code lesson uses an unseen recognition item", () => {
  const s = st();
  s.patterns.pa = { mastered: T };
  s.patterns.pb = { mastered: T };
  const a = C.composeSession(s, ctx, T);
  assert.strictEqual(a.length, 3);
  assert.deepStrictEqual(a[1], { kind: "concept", patternId: "pc", guideId: null });
  assert.strictEqual(a[2].independent, false);
  assert.notStrictEqual(a[0].lessonId, a[2].lessonId);
  assert.ok(["qc1", "qc2"].includes(a[2].lessonId));
});

test("composeSession in final-review", () => {
  const s = st();
  s.profile.interviewDate = "2026-03-14";
  let a = C.composeSession(s, ctx, T);
  assert.strictEqual(a.length, 3);
  assert.ok(a.every(e => e.kind === "exercise" && e.independent === true));
  assert.strictEqual(new Set(a.map(e => e.lessonId)).size, 3);
  rec(s, { lessonId: "qa1", correct: false, tag: "pa.m1" });
  rec(s, { lessonId: "qb1", correct: true });
  a = C.composeSession(s, ctx, "2026-03-11");
  assert.strictEqual(a.length, 3);
  assert.deepStrictEqual([a[0].kind, a[0].tag], ["review", "pa.m1"]);
  assert.ok(a.slice(1).every(e => e.kind === "exercise" && e.independent));
  assert.strictEqual(C.patternOf(L(a[1].lessonId), ctx), "pa");
  s.profile.interviewDate = "2026-03-01";
  assert.strictEqual(C.composeSession(s, ctx, "2026-03-11").length, 3);
});

test("diagnostic never grants mastery and records results", () => {
  const s = st();
  C.recordDiagnostic(s, ctx, T, [
    { lessonId: "ca1", correct: true, tag: null },
    { lessonId: "qb1", correct: false, tag: "pb.m1" }
  ]);
  assert.deepStrictEqual(s.diagnostic, { at: T, results: { pa: { correct: 1, total: 1 }, pb: { correct: 0, total: 1 } } });
  assert.strictEqual(s.patterns.pa.mastered, null);
  assert.strictEqual(s.items.ca1.seen, 1);
  assert.strictEqual(s.misses["pb.m1"].due, "2026-03-11");
  assert.strictEqual(C.schedule(s, ctx, T).current, "pb");
});

test("buildDiagnostic on a fixture", () => {
  const ids = ["hashing", "two-pointers", "sliding-window", "stacks", "binary-search", "heaps", "graphs", "dp"];
  const c = { guides: [], patterns: ids.map(id => pat(id, "T-" + id)), lessons: [] };
  for (const id of ids.filter(i => i !== "dp")) {
    c.lessons.push(mcq("r2-" + id, "T-" + id, 2, 0, [null, `${id}.m1`, `${id}.m2`]));
    c.lessons.push(mcq("r1-" + id, "T-" + id, 1, 0, [null, `${id}.m1`, `${id}.m2`]));
  }
  c.lessons.push(code("hc2", "T-hashing", 2, [{ args: [1], expected: 1, miss: "hashing.m1" }]));
  c.lessons.push(code("hc1", "T-hashing", 1, [{ args: [1], expected: 1, miss: "hashing.m1" }]));
  c.lessons.push(code("dc2", "T-dp", 2, [{ args: [1], expected: 1, miss: "dp.m1" }]));
  c.lessons.push(code("dc1", "T-dp", 1, [{ args: [1], expected: 1, miss: "dp.m1" }]));
  const d = C.buildDiagnostic(c);
  assert.deepStrictEqual(d, ["hc1", "r1-two-pointers", "r1-sliding-window", "r1-stacks", "r1-binary-search", "r1-heaps", "r1-graphs", "dc1"]);
});

test("migrate from v1", () => {
  const v1 = {
    v: 1, xp: 900, streak: 4, best: 9, freezes: 1, lastDone: "2026-03-09",
    days: { "2026-03-09": { xp: 50, answered: 5, correct: 4 }, "2026-03-08": { xp: 10, answered: 1, correct: 1, frozen: true } },
    items: { qa1: { seen: 3, correct: 2, wrong: 1, box: 2, due: "2026-03-20", last: "2026-03-09" } },
    daily: { date: "2026-03-09" }, drafts: { ca1: "code" }, read: { big: 1 }
  };
  assert.deepStrictEqual(C.migrate(v1), {
    v: 2, profile: { interviewDate: null, language: "js" }, diagnostic: null,
    items: { qa1: { seen: 3, correct: 2, wrong: 1, last: "2026-03-09", hinted: false } },
    misses: {}, patterns: {}, streak: 4, best: 9, freezes: 1, lastDone: "2026-03-09",
    days: { "2026-03-09": { answered: 5, correct: 4 }, "2026-03-08": { answered: 1, correct: 1, frozen: true } },
    drafts: { ca1: "code" }, read: { big: 1 }
  });
});

test("migrate keeps v2 and rejects garbage", () => {
  const s = rec(st(), { lessonId: "qa1", correct: false, tag: "pa.m1" });
  assert.deepStrictEqual(C.migrate(JSON.parse(JSON.stringify(s))), s);
  assert.deepStrictEqual(C.migrate({ v: 2, streak: 3 }).profile, { interviewDate: null, language: "js" });
  for (const g of [null, undefined, 5, "x", [], {}, { v: 99 }, { v: 1.5 }]) assert.deepStrictEqual(C.migrate(g), C.blankState());
  const odd = C.migrate({ v: 1, streak: "x", items: { a: 5, b: { seen: "q" } }, days: [] });
  assert.deepStrictEqual([odd.streak, odd.items.a, odd.items.b.seen], [0, undefined, 0]);
});

test("smoke over the real content", () => {
  const real = { lessons: require("../data.js"), patterns: require("../patterns.js"), guides: require("../guides.js") };
  const algoIds = new Set(real.lessons.filter(l => l.track === "algo").map(l => l.id));
  const diag = C.buildDiagnostic(real);
  assert.strictEqual(diag.length, 8);
  assert.ok(diag.every(id => algoIds.has(id)));
  assert.strictEqual(diag.filter(id => real.lessons.find(l => l.id === id).type === "code").length, 1);
  const s = C.blankState();
  for (const date of [null, "2026-03-13", "2026-03-01"]) {
    s.profile.interviewDate = date;
    for (const day of ["2026-03-10", "2026-03-11"]) {
      const a = C.composeSession(s, real, day);
      assert.strictEqual(a.length, 3);
      assert.ok(a.every(e => !e.lessonId || algoIds.has(e.lessonId)));
      const ex = a.find(e => e.kind === "exercise");
      const lesson = real.lessons.find(l => l.id === ex.lessonId);
      C.recordAttempt(s, real, day, { lessonId: ex.lessonId, correct: false, tag: C.inferMiss(lesson, { results: (lesson.tests || []).map(() => ({ pass: false })), picked: 0 }) });
    }
  }
});

const sv = o => Object.assign(C.blankState(), o);

test("mergeProgress items and misses: later date wins, remote on tie or missing", () => {
  const it = (last, correct) => ({ seen: 1, correct, wrong: 0, last, hinted: false });
  const m = (lastMiss, count) => ({ box: 0, due: null, lastMiss, items: [], count, resolved: false });
  const l = sv({ items: { a: it("2026-03-10", 1), b: it("2026-03-01", 2), c: it("2026-03-05", 3), onlyL: it("2026-03-01", 1) }, misses: { x: m("2026-03-10", 1), y: m("2026-03-01", 2), z: m("2026-03-05", 3) } });
  const r = sv({ items: { a: it("2026-03-02", 9), b: it("2026-03-09", 9), c: it("2026-03-05", 9), onlyR: it("2026-03-01", 1) }, misses: { x: m("2026-03-02", 9), y: m("2026-03-09", 9), z: m("2026-03-05", 9) } });
  const out = C.mergeProgress(l, r);
  assert.deepStrictEqual(["a", "b", "c"].map(k => out.items[k].correct), [1, 9, 9]);
  assert.ok(out.items.onlyL && out.items.onlyR);
  assert.deepStrictEqual(["x", "y", "z"].map(k => out.misses[k].count), [1, 9, 9]);
  assert.strictEqual(out.v, 2);
});

test("mergeProgress patterns use the later of lastMiss and started, mastered follows the chosen entry", () => {
  const l = sv({ patterns: { a: { started: "2026-03-01", lastMiss: "2026-03-10", mastered: null }, b: { started: "2026-03-08", lastMiss: null, mastered: "2026-03-09" }, c: { started: "2026-03-01", lastMiss: null, mastered: "2026-03-02" } } });
  const r = sv({ patterns: { a: { started: "2026-03-01", lastMiss: "2026-03-05", mastered: "2026-03-04" }, b: { started: "2026-03-01", lastMiss: "2026-03-03", mastered: null }, c: { started: "2026-03-01", lastMiss: null, mastered: null } } });
  const p = C.mergeProgress(l, r).patterns;
  assert.deepStrictEqual(p.a, l.patterns.a);
  assert.strictEqual(p.a.mastered, null);
  assert.deepStrictEqual(p.b, l.patterns.b);
  assert.deepStrictEqual(p.c, r.patterns.c);
});

test("mergeProgress days union with remote winning the same date", () => {
  const out = C.mergeProgress(sv({ days: { d1: { answered: 1, correct: 1 }, d2: { answered: 5, correct: 5 } } }), sv({ days: { d2: { answered: 2, correct: 0 }, d3: { answered: 3, correct: 3 } } }));
  assert.deepStrictEqual(Object.keys(out.days).sort(), ["d1", "d2", "d3"]);
  assert.strictEqual(out.days.d2.answered, 2);
});

test("mergeProgress streak block comes from the later lastDone, best is the max", () => {
  const l = sv({ streak: 5, best: 9, freezes: 1, lastDone: "2026-03-10" });
  const r = sv({ streak: 2, best: 4, freezes: 2, lastDone: "2026-03-08" });
  let out = C.mergeProgress(l, r);
  assert.deepStrictEqual([out.streak, out.freezes, out.lastDone, out.best], [5, 1, "2026-03-10", 9]);
  out = C.mergeProgress(r, l);
  assert.deepStrictEqual([out.streak, out.freezes, out.lastDone, out.best], [5, 1, "2026-03-10", 9]);
  out = C.mergeProgress(sv({ streak: 5, lastDone: "2026-03-10" }), sv({ streak: 2, lastDone: "2026-03-10" }));
  assert.strictEqual(out.streak, 2);
  out = C.mergeProgress(sv({ streak: 5, lastDone: "2026-03-10" }), sv({}));
  assert.strictEqual(out.streak, 5);
});

test("mergeProgress profile, diagnostic, drafts, read", () => {
  const l = sv({ profile: { interviewDate: "2026-05-01", language: "js" }, diagnostic: { at: "L", results: {} }, drafts: { a: "L", b: "L" }, read: { g1: "2026-03-01", g2: "2026-03-02" } });
  const r = sv({ profile: { interviewDate: "2026-06-01", language: "js" }, diagnostic: { at: "R", results: {} }, drafts: { a: "R" }, read: { g2: "2026-03-09", g3: "2026-03-03" } });
  let out = C.mergeProgress(l, r);
  assert.strictEqual(out.profile.interviewDate, "2026-06-01");
  assert.strictEqual(out.diagnostic.at, "R");
  assert.deepStrictEqual(out.drafts, { a: "R", b: "L" });
  assert.deepStrictEqual(out.read, { g1: "2026-03-01", g2: "2026-03-09", g3: "2026-03-03" });
  out = C.mergeProgress(l, sv({}));
  assert.strictEqual(out.profile.interviewDate, "2026-05-01");
  assert.strictEqual(out.diagnostic.at, "L");
});

test("mergeProgress is pure and tracks updatedAt", () => {
  const l = sv({ updatedAt: "2026-03-10T10:00:00.000Z", items: { a: { seen: 1, correct: 1, wrong: 0, last: "2026-03-01", hinted: false } } });
  const r = sv({ updatedAt: "2026-03-11T10:00:00.000Z" });
  const snap = JSON.stringify([l, r]);
  const out = C.mergeProgress(l, r);
  assert.strictEqual(JSON.stringify([l, r]), snap);
  assert.strictEqual(out.updatedAt, "2026-03-11T10:00:00.000Z");
  out.items.a.seen = 99;
  assert.strictEqual(l.items.a.seen, 1);
});

test("queueRows upserts unresolved dated misses and removes resolved ones", () => {
  const m = (box, due, resolved = false) => ({ box, due, lastMiss: T, items: [], count: 1, resolved });
  const q = C.queueRows({ a: m(0, "2026-03-11"), b: m(1, "2026-03-13"), c: m(2, "2026-03-17"), d: m(3, null, true), e: m(0, null) });
  assert.deepStrictEqual(q.upsert, [
    { item_id: "a", due_at: "2026-03-11", interval_days: 1 },
    { item_id: "b", due_at: "2026-03-13", interval_days: 3 },
    { item_id: "c", due_at: "2026-03-17", interval_days: 7 }
  ]);
  assert.deepStrictEqual(q.remove, ["d"]);
  assert.deepStrictEqual(C.queueRows({}), { upsert: [], remove: [] });
});

test("sessionsDone counts days with a finished session", () => {
  assert.strictEqual(C.sessionsDone(sv({})), 0);
  assert.strictEqual(C.sessionsDone(sv({ days: { a: { done: true }, b: { answered: 3 }, c: { done: true, answered: 1 } } })), 2);
});

test("patternLocked is open when there is no content meta", () => {
  const meta = { lockedPatterns: ["pa"] };
  assert.strictEqual(C.patternLocked(meta, "pa"), true);
  assert.strictEqual(C.patternLocked(meta, "pb"), false);
  assert.strictEqual(C.patternLocked(undefined, "pa"), false);
  assert.strictEqual(C.patternLocked(null, "pa"), false);
});
