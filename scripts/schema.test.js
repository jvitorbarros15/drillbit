const test = require("node:test");
const assert = require("node:assert");
const { validateLesson, validateGuide } = require("./schema.js");

const base = { id: "x1", track: "algo", level: 1, topic: "arrays", title: "T", prompt: "P", explain: "E" };
const mcq = { ...base, type: "mcq", options: ["a", "b"], answer: 0 };
const multi = { ...base, type: "multi", options: ["a", "b", "c"], answers: [0, 2] };
const num = { ...base, type: "number", answer: 5, min: 1, max: 10, unit: "ms" };
const code = { ...base, type: "code", fn: "f", starter: "function f(){}", solution: "function f(){return 1}", hint: "h", tests: [{ args: [1], expected: 1 }, { argsCode: "[2]", expectedCode: "2", label: "big" }] };
const guide = { id: "g1", track: "sd", title: "T", summary: "S", body: "B", topics: ["arrays"] };
const bad = (v, o) => assert.ok(v(o).length > 0, JSON.stringify(v(o)));

test("valid items pass", () => {
  for (const l of [mcq, multi, num, code]) assert.deepStrictEqual(validateLesson(l), []);
  assert.deepStrictEqual(validateGuide(guide), []);
});

test("bad lessons fail", () => {
  bad(validateLesson, { ...mcq, track: "web" });
  bad(validateLesson, { ...mcq, level: 0 });
  bad(validateLesson, { ...mcq, level: 2.5 });
  const { prompt, ...noPrompt } = mcq;
  bad(validateLesson, noPrompt);
  bad(validateLesson, { ...mcq, answer: 2 });
  bad(validateLesson, { ...multi, answers: [1, 1] });
  bad(validateLesson, { ...num, answer: 11 });
  bad(validateLesson, { ...code, tests: [{ args: [1], argsCode: "[1]", expected: 1 }] });
  bad(validateLesson, { ...code, tests: [{ args: [1] }] });
  bad(validateLesson, { ...mcq, anwser: 1 });
});

test("bad guides fail", () => {
  const { topics, ...noTopics } = guide;
  bad(validateGuide, noTopics);
  bad(validateGuide, { ...guide, extra: 1 });
});

test("miss tags", () => {
  assert.deepStrictEqual(validateLesson({ ...mcq, misses: [null, "p.x"] }), []);
  assert.deepStrictEqual(validateLesson({ ...multi, miss: "p.x" }), []);
  assert.deepStrictEqual(validateLesson({ ...num, miss: "p.x" }), []);
  assert.deepStrictEqual(validateLesson({ ...code, tests: [{ args: [1], expected: 1, miss: "p.x" }] }), []);
  bad(validateLesson, { ...mcq, misses: [null] });
  bad(validateLesson, { ...mcq, misses: [null, 3] });
  bad(validateLesson, { ...mcq, misses: "p.x" });
  bad(validateLesson, { ...multi, miss: "" });
  bad(validateLesson, { ...num, miss: 5 });
  bad(validateLesson, { ...code, tests: [{ args: [1], expected: 1, miss: "" }] });
  bad(validateLesson, { ...mcq, miss: "p.x" });
  bad(validateLesson, { ...multi, misses: [null, null, null] });
});

test("viz specs", () => {
  const ok = v => assert.deepStrictEqual(validateLesson({ ...code, viz: v }), []);
  const no = v => bad(validateLesson, { ...code, viz: v });
  ok({ view: "array-pointers", watch: ["l", "r"], pointers: ["l", "r"], window: ["l", "r"], arrayArg: 0 });
  ok({ view: "binary-search", watch: ["lo", "hi"], pointers: ["lo", "hi"], arrayArg: 1 });
  ok({ view: "stack", watch: ["stack"] });
  ok({ view: "dp-table", watch: ["dp"], arrayArg: 0 });
  no("stack");
  no({ view: "graph", watch: ["a"] });
  no({ view: "stack" });
  no({ view: "stack", watch: [] });
  no({ view: "stack", watch: ["a b"] });
  no({ view: "stack", watch: ["a", "a"] });
  no({ view: "stack", watch: ["a"], extra: 1 });
  no({ view: "stack", watch: ["a"], pointers: ["a"] });
  no({ view: "array-pointers", watch: ["l"], pointers: ["l"] });
  no({ view: "array-pointers", watch: ["l"], pointers: ["r"], arrayArg: 0 });
  no({ view: "array-pointers", watch: ["l", "r"], window: ["l"], arrayArg: 0 });
  no({ view: "array-pointers", watch: ["l", "r"], window: ["l", "x"], arrayArg: 0 });
  no({ view: "binary-search", watch: ["lo"], window: ["lo", "lo"], arrayArg: 0 });
  no({ view: "dp-table", watch: ["dp"], arrayArg: -1 });
  no({ view: "dp-table", watch: ["dp"], arrayArg: 1.5 });
  bad(validateLesson, { ...mcq, viz: { view: "stack", watch: ["a"] } });
});
