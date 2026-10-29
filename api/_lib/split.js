const CORE = require("../../core.js");

const FREE_PATTERNS = ["hashing", "two-pointers"];

function split({ lessons, patterns, guides }) {
  const ctx = { lessons, patterns, guides };
  const diag = new Set(CORE.buildDiagnostic(ctx));
  const isFree = l => diag.has(l.id) || FREE_PATTERNS.includes(CORE.patternOf(l, ctx));
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
    freePatterns: FREE_PATTERNS
  };
  return { freeLessons, paidLessons, freeGuides, paidGuides, stubs, meta };
}

module.exports = { split, FREE_PATTERNS };
