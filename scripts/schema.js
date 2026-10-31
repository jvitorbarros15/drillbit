const str = v => typeof v === "string" && v.trim() !== "";
const idx = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = v => v && typeof v === "object" && !Array.isArray(v);

const COMMON = ["id", "track", "level", "topic", "type", "title", "prompt", "explain", "hint"];
const EXTRA = { mcq: ["options", "answer", "misses"], multi: ["options", "answers", "miss"], number: ["answer", "min", "max", "unit", "miss"], code: ["fn", "starter", "solution", "tests", "viz", "plan", "followups"] };
const VIZ_KEYS = ["view", "watch", "pointers", "window", "arrayArg"];
const VIZ_VIEWS = ["array-pointers", "stack", "dp-table", "binary-search"];
const IDENT = /^[A-Za-z_$][\w$]*$/;
const TEST_KEYS = ["args", "argsCode", "expected", "expectedCode", "label", "miss"];

function validateLesson(l) {
  if (!isObj(l)) return ["lesson is not an object"];
  const e = [];
  for (const k of ["id", "topic", "title", "prompt", "explain"]) if (!str(l[k])) e.push(`${k} must be a non-empty string`);
  if (!["algo", "sd"].includes(l.track)) e.push("track must be algo or sd");
  if (!Number.isInteger(l.level) || l.level < 1 || l.level > 5) e.push("level must be an integer 1 to 5");
  if (has(l, "hint") && typeof l.hint !== "string") e.push("hint must be a string");
  if (!EXTRA[l.type]) { e.push("type must be mcq, multi, number or code"); return e; }
  for (const k of Object.keys(l)) if (!COMMON.includes(k) && !EXTRA[l.type].includes(k)) e.push(`unknown key ${k}`);

  const opts = () => {
    if (!Array.isArray(l.options) || l.options.length < 2 || !l.options.every(str)) { e.push("options must be an array of at least 2 non-empty strings"); return 0; }
    return l.options.length;
  };
  if (l.type === "mcq") {
    const n = opts();
    if (!idx(l.answer, n)) e.push("answer must be an integer index into options");
    if (has(l, "misses") && (!Array.isArray(l.misses) || l.misses.length !== n || !l.misses.every(m => m === null || str(m)))) e.push("misses must be an array the same length as options of null or non-empty strings");
  } else if (l.type === "multi") {
    const n = opts();
    if (!Array.isArray(l.answers) || !l.answers.length || !l.answers.every(i => idx(i, n)) || new Set(l.answers).size !== l.answers.length)
      e.push("answers must be a non-empty array of unique in-range integer indexes");
    if (has(l, "miss") && !str(l.miss)) e.push("miss must be a non-empty string");
  } else if (l.type === "number") {
    const fin = ["answer", "min", "max"].filter(k => Number.isFinite(l[k]) && typeof l[k] === "number");
    for (const k of ["answer", "min", "max"]) if (!fin.includes(k)) e.push(`${k} must be a finite number`);
    if (fin.length === 3 && !(l.min <= l.answer && l.answer <= l.max)) e.push("answer must satisfy min <= answer <= max");
    if (has(l, "unit") && typeof l.unit !== "string") e.push("unit must be a string");
    if (has(l, "miss") && !str(l.miss)) e.push("miss must be a non-empty string");
  } else {
    if (!str(l.fn) || !/^[A-Za-z_$][\w$]*$/.test(l.fn)) e.push("fn must be a valid JS identifier");
    for (const k of ["starter", "solution"]) if (!str(l[k])) e.push(`${k} must be a non-empty string`);
    if (has(l, "viz")) e.push(...validateViz(l.viz));
    if (has(l, "plan")) e.push(...validatePlan(l.plan));
    if (has(l, "followups")) e.push(...validateFollowups(l.followups));
    if (!Array.isArray(l.tests) || !l.tests.length) e.push("tests must be a non-empty array");
    else l.tests.forEach((t, i) => {
      const p = `tests[${i}]`;
      if (!isObj(t)) { e.push(`${p} must be an object`); return; }
      for (const k of Object.keys(t)) if (!TEST_KEYS.includes(k)) e.push(`${p} unknown key ${k}`);
      const a = has(t, "args"), ac = has(t, "argsCode");
      if (a === ac) e.push(`${p} needs exactly one of args or argsCode`);
      else if (a && !Array.isArray(t.args)) e.push(`${p}.args must be an array`);
      else if (ac && !str(t.argsCode)) e.push(`${p}.argsCode must be a non-empty string`);
      const x = has(t, "expected"), xc = has(t, "expectedCode");
      if (x === xc) e.push(`${p} needs exactly one of expected or expectedCode`);
      else if (xc && !str(t.expectedCode)) e.push(`${p}.expectedCode must be a non-empty string`);
      if (has(t, "label") && typeof t.label !== "string") e.push(`${p}.label must be a string`);
      if (has(t, "miss") && !str(t.miss)) e.push(`${p}.miss must be a non-empty string`);
    });
  }
  return e;
}

const choiceErrors = (c, p) => {
  if (!isObj(c)) return [`${p} must be an object`];
  const e = [];
  for (const k of Object.keys(c)) if (!["options", "answer"].includes(k)) e.push(`${p} unknown key ${k}`);
  const ok = Array.isArray(c.options) && c.options.length >= 2 && c.options.every(str) && new Set(c.options).size === c.options.length;
  if (!ok) e.push(`${p}.options must be at least 2 unique non-empty strings`);
  else if (!idx(c.answer, c.options.length)) e.push(`${p}.answer must be an integer index into options`);
  return e;
};

function validatePlan(p) {
  if (!isObj(p)) return ["plan must be an object"];
  const e = [];
  for (const k of Object.keys(p)) if (!["q", "approach", "time", "space"].includes(k)) e.push(`plan unknown key ${k}`);
  if (has(p, "q") && !str(p.q)) e.push("plan.q must be a non-empty string");
  for (const k of ["approach", "time", "space"]) e.push(...choiceErrors(p[k], `plan.${k}`));
  return e;
}

function validateFollowups(f) {
  if (!Array.isArray(f) || !f.length) return ["followups must be a non-empty array"];
  const e = [];
  f.forEach((x, i) => {
    const p = `followups[${i}]`;
    if (!isObj(x)) { e.push(`${p} must be an object`); return; }
    for (const k of Object.keys(x)) if (!["q", "options", "answer", "explain"].includes(k)) e.push(`${p} unknown key ${k}`);
    for (const k of ["q", "explain"]) if (!str(x[k])) e.push(`${p}.${k} must be a non-empty string`);
    e.push(...choiceErrors({ options: x.options, answer: x.answer }, p));
  });
  return e;
}

function validateViz(v) {
  if (!isObj(v)) return ["viz must be an object"];
  const e = [];
  for (const k of Object.keys(v)) if (!VIZ_KEYS.includes(k)) e.push(`viz unknown key ${k}`);
  if (!VIZ_VIEWS.includes(v.view)) e.push(`viz.view must be one of ${VIZ_VIEWS.join(", ")}`);
  const names = a => Array.isArray(a) && a.every(x => typeof x === "string" && IDENT.test(x));
  const watch = names(v.watch) && v.watch.length && new Set(v.watch).size === v.watch.length ? v.watch : null;
  if (!watch) e.push("viz.watch must be a non-empty array of unique identifiers");
  const pointed = v.view === "array-pointers" || v.view === "binary-search";
  if (has(v, "pointers")) {
    if (!pointed) e.push("viz.pointers only applies to array-pointers and binary-search");
    else if (!names(v.pointers) || !v.pointers.length || (watch && !v.pointers.every(p => watch.includes(p)))) e.push("viz.pointers must be a non-empty array of watched names");
  }
  if (has(v, "window")) {
    if (v.view !== "array-pointers") e.push("viz.window only applies to array-pointers");
    else if (!names(v.window) || v.window.length !== 2 || (watch && !v.window.every(p => watch.includes(p)))) e.push("viz.window must be two watched names");
  }
  if (has(v, "arrayArg") ? !Number.isInteger(v.arrayArg) || v.arrayArg < 0 : pointed) e.push("viz.arrayArg must be a non-negative integer argument index" + (pointed ? " (required for this view)" : ""));
  return e;
}

const GUIDE_KEYS = ["id", "track", "title", "summary", "body", "topics"];

function validateGuide(g) {
  if (!isObj(g)) return ["guide is not an object"];
  const e = [];
  for (const k of ["id", "title", "summary", "body"]) if (!str(g[k])) e.push(`${k} must be a non-empty string`);
  if (!["algo", "sd"].includes(g.track)) e.push("track must be algo or sd");
  if (!Array.isArray(g.topics) || !g.topics.length || !g.topics.every(str)) e.push("topics must be a non-empty array of strings");
  for (const k of Object.keys(g)) if (!GUIDE_KEYS.includes(k)) e.push(`unknown key ${k}`);
  return e;
}

module.exports = { validateLesson, validateGuide };
