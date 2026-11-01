const EMPTY_OK = new Set(["Trees", "Intervals"]);
const DASH = /—|--/;

function patternOf(patterns, topic) {
  return patterns.filter(p => p.topics.includes(topic));
}

function checkPatterns(patterns, lessons, guides) {
  const e = [];
  const guideIds = new Set(guides.map(g => g.id));
  const algo = lessons.filter(l => l.track === "algo");
  const miscIds = new Set();
  const pids = new Set();
  for (const p of patterns) {
    if (pids.has(p.id)) e.push(`${p.id}: duplicate pattern id`);
    pids.add(p.id);
    if (DASH.test(p.name)) e.push(`${p.id}: name contains a dash pair or em dash`);
    if (p.guide !== null && !guideIds.has(p.guide)) e.push(`${p.id}: unknown guide ${p.guide}`);
    const ms = p.misconceptions || [];
    if (ms.length < 3 || ms.length > 5) e.push(`${p.id}: has ${ms.length} misconceptions, need 3 to 5`);
    for (const m of ms) {
      if (miscIds.has(m.id)) e.push(`${m.id}: duplicate misconception id`);
      miscIds.add(m.id);
      if (!String(m.id).startsWith(p.id + ".")) e.push(`${m.id}: id must start with ${p.id}.`);
      if (!m.label || m.label.length > 60) e.push(`${m.id}: label must be 1 to 60 chars`);
      if (!m.fix || m.fix.length < 80) e.push(`${m.id}: fix shorter than 80 chars`);
      if (DASH.test(m.label || "") || DASH.test(m.fix || "")) e.push(`${m.id}: label or fix contains a dash pair or em dash`);
    }
    const used = algo.some(l => p.topics.some(t => t === l.topic));
    if (!used && !p.topics.every(t => EMPTY_OK.has(t))) e.push(`${p.id}: no lesson uses any of its topics`);
    for (const t of p.topics) if (!EMPTY_OK.has(t) && !algo.some(l => l.topic === t)) e.push(`${p.id}: topic ${t} is not used by any lesson`);
  }
  for (const t of new Set(algo.map(l => l.topic))) {
    const n = patternOf(patterns, t).length;
    if (n !== 1) e.push(`topic ${t}: belongs to ${n} patterns, need exactly 1`);
  }
  for (const l of algo) {
    const own = patternOf(patterns, l.topic)[0];
    const ids = new Set(own ? own.misconceptions.map(m => m.id) : []);
    const chk = (m, where) => { if (!ids.has(m)) e.push(`${l.id}: ${where} ${m} is not a misconception of ${own ? own.id : "any pattern"}`); };
    if (l.type === "mcq") {
      if (!Array.isArray(l.misses)) e.push(`${l.id}: mcq without misses`);
      else if (l.misses.length !== l.options.length) e.push(`${l.id}: misses length ${l.misses.length} does not match options ${l.options.length}`);
      else l.misses.forEach((m, i) => {
        if (i === l.answer) { if (m !== null) e.push(`${l.id}: misses[${i}] must be null at the answer index`); }
        else if (m === null) e.push(`${l.id}: misses[${i}] is null but option ${i} is wrong`);
        else chk(m, `misses[${i}]`);
      });
    } else if (l.type === "multi") {
      if (!l.miss) e.push(`${l.id}: multi without miss`); else chk(l.miss, "miss");
    } else if (l.type === "number") {
      if (!l.miss) e.push(`${l.id}: number without miss`); else chk(l.miss, "miss");
    } else if (l.type === "code") {
      const tagged = l.tests.filter(t => t.miss);
      if (!tagged.length) e.push(`${l.id}: code lesson has no test with miss`);
      l.tests.forEach((t, i) => { if (t.miss) chk(t.miss, `tests[${i}].miss`); });
    }
  }
  return e;
}

function unusedTopics(patterns, lessons) {
  const used = new Set(lessons.filter(l => l.track === "algo").map(l => l.topic));
  return patterns.flatMap(p => p.topics.filter(t => !used.has(t) && EMPTY_OK.has(t)).map(t => `${p.id}: topic ${t} has no lessons yet`));
}

function contentBar(patterns, lessons) {
  return patterns.map(p => {
    const mine = lessons.filter(l => l.track === "algo" && p.topics.includes(l.topic));
    return { id: p.id, code: mine.filter(l => l.type === "code").length, recognition: mine.filter(l => l.type === "mcq" || l.type === "multi").length, misconceptions: p.misconceptions.length };
  });
}

module.exports = { checkPatterns, unusedTopics, contentBar };
