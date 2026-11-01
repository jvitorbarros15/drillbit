const CORE = require("../../core.js");

const FREE_PATTERNS = ["hashing", "two-pointers"];

// one free recognition item and coding problem per diagnosed paid pattern, for the free repair
function samplesFor(ctx, diag) {
  const out = {};
  const byLevel = (a, b) => a.level - b.level || (a.id < b.id ? -1 : 1);
  for (const id of diag) {
    const pid = CORE.patternOf(ctx.lessons.find(l => l.id === id), ctx);
    if (!pid || FREE_PATTERNS.includes(pid) || out[pid]) continue;
    const pool = ctx.lessons.filter(l => CORE.patternOf(l, ctx) === pid && !diag.has(l.id)).sort(byLevel);
    const recog = pool.find(l => l.type === "mcq" || l.type === "multi");
    const code = pool.find(l => l.type === "code");
    if (recog && code) out[pid] = [recog.id, code.id];
  }
  return out;
}

function split({ lessons, patterns, guides }) {
  const ctx = { lessons, patterns, guides };
  const diag = new Set(CORE.buildDiagnostic(ctx));
  const samples = samplesFor(ctx, diag);
  const sampleIds = new Set(Object.values(samples).flat());
  const isFree = l => diag.has(l.id) || sampleIds.has(l.id) || FREE_PATTERNS.includes(CORE.patternOf(l, ctx));
  const freeLessons = lessons.filter(isFree);
  const paidLessons = lessons.filter(l => !isFree(l));
  const freeGuideIds = new Set(patterns.filter(p => FREE_PATTERNS.includes(p.id) && p.guide).map(p => p.guide));
  const freeGuides = guides.filter(g => freeGuideIds.has(g.id));
  const paidGuides = guides.filter(g => !freeGuideIds.has(g.id));
  const paidPatterns = new Set(paidLessons.map(l => CORE.patternOf(l, ctx)));
  const stubs = paidGuides.map(({ id, track, title, topics, summary }) => ({ id, track, title, topics, summary, locked: true }));
  const meta = {
    lockedPatterns: patterns.filter(p => paidPatterns.has(p.id)).map(p => p.id),
    paidLessons: paidLessons.length,
    patternsWithContent: new Set(lessons.map(l => CORE.patternOf(l, ctx)).filter(Boolean)).size,
    freePatterns: FREE_PATTERNS,
    samples
  };
  return { freeLessons, paidLessons, freeGuides, paidGuides, stubs, meta };
}

module.exports = { split, FREE_PATTERNS };
