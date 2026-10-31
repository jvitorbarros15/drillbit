const test = require("node:test");
const assert = require("node:assert");
const TRACE = require("../trace.js");
const lessons = require("../data.js");

const trace = (code, fn, args, watch) => TRACE.run(code, fn, args, watch);

test("for loop snapshots each body and the return", () => {
  const r = trace("function f(n) { let s = 0; for (let i = 0; i < n; i++) { s += i; } return s; }", "f", [3], ["i", "s"]);
  assert.strictEqual(r.result, 3);
  assert.deepStrictEqual(r.steps, [{ i: 0, s: 0 }, { i: 1, s: 0 }, { i: 2, s: 1 }, { i: undefined, s: 3 }]);
  assert.strictEqual(r.truncated, false);
});

test("while loop", () => {
  const r = trace("function f(n) { let k = n; while (k > 0) { k -= 2; } return k; }", "f", [5], ["k"]);
  assert.strictEqual(r.result, -1);
  assert.deepStrictEqual(r.steps.map(s => s.k), [5, 3, 1, -1]);
});

test("do while body is recorded and its while tail is left alone", () => {
  const r = trace("function f() { let k = 0; do { k++; } while (k < 3); return k; }", "f", [], ["k"]);
  assert.strictEqual(r.result, 3);
  assert.deepStrictEqual(r.steps.map(s => s.k), [0, 1, 2, 3]);
});

test("nested loops", () => {
  const r = trace("function f() { let c = 0; for (let i = 0; i < 2; i++) { for (let j = 0; j < 3; j++) { c++; } } return c; }", "f", [], ["i", "j", "c"]);
  assert.strictEqual(r.result, 6);
  assert.strictEqual(r.steps.length, 2 + 6 + 1);
  assert.deepStrictEqual(r.steps[1], { i: 0, j: 0, c: 0 });
});

test("braces inside strings and template literals are untouched", () => {
  const code = "function f() { const a = 'for (;;) {'; const b = `x ${'}'} for (;;) { return 1 }`; return a.length + b.length; }";
  const inst = TRACE.instrument(code, ["a"]);
  assert.ok(inst.includes("'for (;;) {'"));
  assert.ok(inst.includes("`x ${'}'} for (;;) { return 1 }`"));
  const plain = new Function(code + ";return f();")();
  assert.strictEqual(trace(code, "f", [], ["a"]).result, plain);
  assert.strictEqual(trace(code, "f", [], ["a"]).steps.length, 1);
});

test("regex literal with a brace is untouched", () => {
  const code = "function f(s) { let n = 0; for (const c of s) { if (/[{}]/.test(c)) n++; } return s.replace(/\\{/g, '').length + n; }";
  const inst = TRACE.instrument(code, ["n"]);
  assert.ok(inst.includes("/[{}]/.test(c)"));
  assert.ok(inst.includes("/\\{/g"));
  const plain = new Function(code + ";return f('a{b}');")();
  const r = trace(code, "f", ["a{b}"], ["n"]);
  assert.strictEqual(r.result, plain);
  assert.strictEqual(r.steps.length, 4 + 1);
});

test("division is not mistaken for a regex", () => {
  const r = trace("function f(a, b) { let x = a / b; for (let i = 0; i < 2; i++) { x = x / 2; } return x / 1; }", "f", [8, 2], ["x"]);
  assert.strictEqual(r.result, 1);
  assert.strictEqual(r.steps.length, 3);
});

test("single statement loop bodies get braces", () => {
  const r = trace("function f(a) { let s = 0; for (const x of a) s += x; let k = 0; while (k < 2) k++; if (s > 0) for (let i = 0; i < 2; i++) s++; else s--; return s; }", "f", [[1, 2, 3]], ["s", "k"]);
  assert.strictEqual(r.result, 8);
  assert.deepStrictEqual(r.steps.map(x => x.s), [0, 1, 3, 6, 6, 6, 7, 8]);
  assert.strictEqual(r.steps.length, 3 + 2 + 2 + 1);
});

test("single statement body without a semicolon ends at the line break", () => {
  const r = trace("function f(a) {\n let s = 0\n for (const x of a) s += x\n s *= 2\n return s\n}", "f", [[1, 2]], ["s"]);
  assert.strictEqual(r.result, 6);
  assert.strictEqual(r.steps.length, 3);
});

test("return inside a loop, including an unbraced if", () => {
  const code = "function f(a) { for (let i = 0; i < a.length; i++) { if (a[i] < 0) return i; } return -1; }";
  assert.deepStrictEqual(trace(code, "f", [[3, -1, 4]], ["i"]).steps.map(s => s.i), [0, 1, 1]);
  assert.strictEqual(trace(code, "f", [[3, -1, 4]], ["i"]).result, 1);
  const r = trace("function g(a) { for (const x of a) if (x > 1) return x; return 0; }", "g", [[1, 2, 3]], ["x"]);
  assert.strictEqual(r.result, 2);
  assert.strictEqual(r.steps.length, 3);
});

test("bare return and return with a newline keep returning undefined", () => {
  assert.strictEqual(trace("function f() { return; }", "f", [], []).result, undefined);
  assert.strictEqual(trace("function f() { return\n 5 }", "f", [], []).result, undefined);
});

test("temporal dead zone and undeclared names do not throw", () => {
  const r = trace("function f(a) { for (const x of a) { const y = x * 2; } return 1; }", "f", [[1, 2]], ["y", "nope", "x"]);
  assert.strictEqual(r.error, undefined);
  assert.strictEqual(r.result, 1);
  assert.deepStrictEqual(r.steps[0], { y: undefined, nope: undefined, x: 1 });
});

test("snapshots are deep copies, capped at 200 elements", () => {
  const r = trace("function f(a) { const st = []; for (const x of a) { st.push(x); } return st; }", "f", [[1, 2]], ["st"]);
  assert.deepStrictEqual(r.steps.map(s => s.st), [[], [1], [1, 2]]);
  const big = trace("function f(n) { const a = Array.from({ length: n }, (_, i) => i); for (let k = 0; k < 1; k++) { a.length; } return 0; }", "f", [1000], ["a"]);
  assert.strictEqual(big.steps[0].a.length, 200);
});

test("step cap stops recording and flags truncation without changing the result", () => {
  const r = trace("function f() { let n = 0; while (n < 2000) { n++; } return n; }", "f", [], ["n"]);
  assert.strictEqual(r.result, 2000);
  assert.strictEqual(r.steps.length, 500);
  assert.strictEqual(r.truncated, true);
});

test("errors are reported and bad watch names are rejected", () => {
  assert.match(trace("function f() { throw new Error('boom'); }", "f", [], []).error, /boom/);
  assert.match(trace("function f( {", "f", [], []).error, /Syntax error/);
  assert.match(trace("function f() {}", "g", [], []).error, /Could not find/);
  assert.throws(() => TRACE.instrument("function f() {}", ["a b"]));
});

const plainRun = (l, args) => new Function(l.solution + `;return ${l.fn};`)()(...JSON.parse(JSON.stringify(args)));

test("instrumented reference solutions match the originals on their small tests", () => {
  const specs = { a203: ["start", "i", "best"], a109: ["i", "j"], a209: ["i", "j"], a201: ["lo", "hi", "target"], a104: ["stack"], a213: ["cur", "prev"] };
  for (const [id, watch] of Object.entries(specs)) {
    const l = lessons.find(x => x.id === id);
    assert.ok(l, id);
    const small = l.tests.filter(t => t.args);
    assert.ok(small.length, id);
    for (const t of small) {
      const r = trace(l.solution, l.fn, t.args, watch);
      assert.strictEqual(r.error, undefined, id);
      assert.deepStrictEqual(r.result, plainRun(l, t.args), id);
      assert.deepStrictEqual(r.result, t.expected, id);
    }
  }
});

test("every lesson with a viz spec watches names that its reference solution uses", () => {
  for (const l of lessons.filter(x => x.viz)) {
    for (const w of l.viz.watch) assert.ok(new RegExp(`\\b${w}\\b`).test(l.solution), `${l.id} ${w}`);
    const t = l.tests.find(x => x.args);
    const r = trace(l.solution, l.fn, t.args, l.viz.watch);
    assert.ok(r.steps.length > 0 && !r.error, l.id);
  }
});
