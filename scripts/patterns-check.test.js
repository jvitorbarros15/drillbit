const test = require("node:test");
const assert = require("node:assert");
const { checkPatterns, unusedTopics, contentBar } = require("./patterns-check.js");

const fix = "A fix paragraph that is comfortably longer than eighty characters so it passes the length rule.";
const mis = (p, n) => Array.from({ length: n }, (_, i) => ({ id: `${p}.m${i}`, label: "Some mistake", fix }));
const base = { id: "t", topic: "Topic", title: "T", prompt: "P", explain: "E", track: "algo", level: 1 };
const mcq = { ...base, id: "q1", type: "mcq", options: ["a", "b", "c"], answer: 1, misses: ["pa.m0", null, "pa.m1"] };
const multi = { ...base, id: "q2", type: "multi", options: ["a", "b"], answers: [0], miss: "pa.m2" };
const code = { ...base, id: "q3", type: "code", fn: "f", starter: "s", solution: "s", tests: [{ args: [1], expected: 1 }, { args: [2], expected: 2, miss: "pa.m0" }] };
const mk = () => [{ id: "pa", name: "Pattern A", topics: ["Topic"], guide: "g1", misconceptions: mis("pa", 3) }];
const lessons = () => [mcq, multi, code].map(l => ({ ...l, topic: "Topic" }));
const guides = [{ id: "g1" }];
const errs = (p, l, g = guides) => checkPatterns(p, l, g);
const has = (list, re) => assert.ok(list.some(m => re.test(m)), JSON.stringify(list));

test("valid data passes", () => {
  assert.deepStrictEqual(errs(mk(), lessons()), []);
});

test("pattern rules", () => {
  let p = mk(); p[0].misconceptions = mis("pa", 2); has(errs(p, lessons()), /need 3 to 5/);
  p = mk(); p[0].misconceptions = mis("pa", 6); has(errs(p, lessons()), /need 3 to 5/);
  p = mk(); p[0].misconceptions[1].id = "pa.m0"; has(errs(p, lessons()), /duplicate misconception id/);
  p = mk(); p[0].misconceptions[0].fix = "too short"; has(errs(p, lessons()), /shorter than 80/);
  p = mk(); p[0].guide = "nope"; has(errs(p, lessons()), /unknown guide/);
  p = mk(); p[0].guide = null; assert.deepStrictEqual(errs(p, lessons()), []);
  p = mk(); p[0].misconceptions[0].label = "bad — dash"; has(errs(p, lessons()), /dash/);
  p = mk(); p[0].misconceptions[0].fix = fix + " bad -- dash"; has(errs(p, lessons()), /dash/);
  p = mk(); p[0].name = "Bad — name"; has(errs(p, lessons()), /name contains/);
  p = mk(); p[0].misconceptions[0].id = "other.m0"; has(errs(p, lessons()), /must start with pa\./);
});

test("topic rules", () => {
  const p = mk();
  p.push({ id: "pb", name: "B", topics: ["Topic"], guide: null, misconceptions: mis("pb", 3) });
  has(errs(p, lessons()), /belongs to 2 patterns/);
  has(errs(mk(), lessons().map(l => ({ ...l, topic: "Other" }))), /belongs to 0 patterns/);
  const q = mk(); q[0].topics.push("Unused"); has(errs(q, lessons()), /not used by any lesson/);
  const t = mk(); t[0].topics.push("Trees");
  assert.deepStrictEqual(errs(t, lessons()), []);
  const e = mk(); e.push({ id: "pt", name: "Trees", topics: ["Trees"], guide: null, misconceptions: mis("pt", 3) });
  assert.deepStrictEqual(errs(e, lessons()), []);
  assert.deepStrictEqual(unusedTopics(e, lessons()), ["pt: topic Trees has no lessons yet"]);
});

test("lesson tag rules", () => {
  const withLesson = (i, patch) => { const l = lessons(); l[i] = { ...l[i], ...patch }; return l; };
  has(errs(mk(), withLesson(0, { misses: undefined })), /mcq without misses/);
  has(errs(mk(), withLesson(0, { misses: ["pa.m0", null] })), /does not match options/);
  has(errs(mk(), withLesson(0, { misses: ["pa.m0", "pa.m1", "pa.m1"] })), /null at the answer index/);
  has(errs(mk(), withLesson(0, { misses: [null, null, "pa.m1"] })), /is null but option 0 is wrong/);
  has(errs(mk(), withLesson(0, { misses: ["zz.x", null, "pa.m1"] })), /not a misconception of pa/);
  has(errs(mk(), withLesson(1, { miss: undefined })), /multi without miss/);
  has(errs(mk(), withLesson(1, { miss: "pb.m0" })), /not a misconception of pa/);
  has(errs(mk(), withLesson(2, { tests: [{ args: [1], expected: 1 }] })), /no test with miss/);
  has(errs(mk(), withLesson(2, { tests: [{ args: [1], expected: 1, miss: "pb.m0" }] })), /not a misconception of pa/);
  const sd = lessons().map(l => ({ ...l, track: "sd", misses: undefined, miss: undefined }));
  assert.ok(!errs(mk(), sd).some(m => /miss/.test(m)));
});

test("content bar counts", () => {
  assert.deepStrictEqual(contentBar(mk(), lessons()), [{ id: "pa", code: 1, recognition: 2, misconceptions: 3 }]);
});
