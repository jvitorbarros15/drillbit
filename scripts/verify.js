// Sanity checks for the lesson bank. Run: node scripts/verify.js
const LESSONS = require("../data.js");

function eq(a, b) {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
  if (a && b && typeof a === "object" && typeof b === "object") {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => eq(a[k], b[k]));
  }
  return false;
}

let failures = 0;
const fail = (id, msg) => { failures++; console.log(`FAIL ${id}: ${msg}`); };
const ids = new Set();

for (const l of LESSONS) {
  if (ids.has(l.id)) fail(l.id, "duplicate id");
  ids.add(l.id);
  for (const f of ["id", "track", "level", "topic", "type", "title", "prompt", "explain"])
    if (l[f] === undefined || l[f] === "") fail(l.id, `missing ${f}`);
  if (!["algo", "sd"].includes(l.track)) fail(l.id, "bad track");
  if (!(l.level >= 1 && l.level <= 5)) fail(l.id, "bad level");

  const prose = [l.title, l.prompt, l.explain, l.hint || "", ...(l.options || [])].join(" ");
  if (/—|--/.test(prose)) fail(l.id, "contains a dash pair or em dash");

  if (l.type === "mcq" && !(l.answer >= 0 && l.answer < l.options.length)) fail(l.id, "answer out of range");
  if (l.type === "multi" && !(l.answers.length && l.answers.every(i => i >= 0 && i < l.options.length))) fail(l.id, "answers out of range");
  if (l.type === "number" && !(l.min <= l.answer && l.answer <= l.max)) fail(l.id, "answer outside [min, max]");

  if (l.type === "code") {
    let fn;
    try { fn = new Function(l.solution + `\n;return ${l.fn};`)(); }
    catch (e) { fail(l.id, "solution does not compile: " + e.message); continue; }
    // Starter must compile too
    try { new Function(l.starter + `\n;return ${l.fn};`)(); } catch (e) { fail(l.id, "starter does not compile"); }
    l.tests.forEach((t, i) => {
      const args = t.argsCode ? new Function("return " + t.argsCode)() : JSON.parse(JSON.stringify(t.args));
      const expected = t.expectedCode ? new Function("return " + t.expectedCode)() : t.expected;
      const t0 = Date.now();
      const out = fn(...args);
      const ms = Date.now() - t0;
      if (!eq(out, expected)) fail(l.id, `test ${i + 1}: got ${JSON.stringify(out).slice(0, 80)}, expected ${JSON.stringify(expected).slice(0, 80)}`);
      if (ms > 1500) fail(l.id, `test ${i + 1} too slow for reference solution (${ms}ms)`);
    });
  }
}

const GUIDES = require("../guides.js");
const vizNames = new Set([...require("fs").readFileSync(__dirname + "/../viz.js", "utf8").matchAll(/VIZ\.(\w+) = /g)].map(m => m[1]));
const covered = new Set();
const gids = new Set();
for (const g of GUIDES) {
  if (gids.has(g.id)) fail(g.id, "duplicate guide id");
  gids.add(g.id);
  if (!["algo", "sd"].includes(g.track)) fail(g.id, "bad guide track");
  const guideProse = (g.title + g.summary + g.body).replace(/^~~~[\s\S]*?^~~~/gm, "").replace(/`[^`]*`/g, "");
  if (/—|--/.test(guideProse)) fail(g.id, "guide contains a dash pair or em dash");
  if ((g.body.match(/^~~~/gm) || []).length % 2) fail(g.id, "unclosed ~~~ code fence");
  for (const m of g.body.matchAll(/^::viz (\w+)/gm)) if (!vizNames.has(m[1])) fail(g.id, `unknown viz ${m[1]}`);
  g.topics.forEach(t => covered.add(t));
}
for (const t of new Set(LESSONS.map(l => l.topic))) if (!covered.has(t)) fail(t, "topic has no study guide");

const count = (pred) => LESSONS.filter(pred).length;
console.log(`${GUIDES.length} guides, ${vizNames.size} interactive widgets`);
console.log(`\n${LESSONS.length} lessons, ${count(l => l.type === "code")} coding challenges`);
for (const t of ["algo", "sd"])
  console.log(t, [1, 2, 3, 4, 5].map(L => `L${L}:${count(l => l.track === t && l.level === L)}`).join(" "));
console.log(failures ? `\n${failures} problem(s)` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
