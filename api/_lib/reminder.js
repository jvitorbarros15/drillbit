const CORE = require("../../core.js");

const weekday = d => CORE.parse(d).toLocaleDateString("en-US", { weekday: "long" });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function contentFor(paid) {
  const full = { lessons: require("../../data.js"), patterns: require("../../patterns.js"), guides: require("../../guides.js") };
  if (paid) return full;
  const { split, FREE_PATTERNS } = require("./split");
  return { ...full, lessons: split(full).freeLessons.filter(l => FREE_PATTERNS.includes(CORE.patternOf(l, full))) };
}

function buildReminder(progress, ctx, localDate, allowedPatterns = null) {
  const state = { ...CORE.blankState(), ...(progress || {}) };
  const labels = {};
  const patternOfTag = {};
  ctx.patterns.forEach(p => p.misconceptions.forEach(m => { labels[m.id] = m.label; patternOfTag[m.id] = p.id; }));
  const tags = CORE.dueTags(state, localDate).filter(t => !allowedPatterns || allowedPatterns.includes(patternOfTag[t])).slice(0, 3);
  const lines = [];
  if (tags.length) tags.forEach(t => lines.push(`Bring back: ${labels[t] || t} (missed ${weekday(state.misses[t].lastMiss)})`));
  else {
    const p = ctx.patterns.find(x => x.id === CORE.schedule(state, ctx, localDate).current);
    if (p) lines.push(`Next step: ${p.name}`);
  }
  if (state.streak > 0) lines.push(`Streak: ${state.streak} day${state.streak === 1 ? "" : "s"}`);
  return { subject: tags.length ? `Drillbit: ${tags.length} to review today` : "Your Drillbit session for today", lines };
}

function compose({ lines }, appUrl, unsubUrl) {
  const text = [...lines, "", `Open Drillbit: ${appUrl}`, "", `Unsubscribe: ${unsubUrl}`].join("\n");
  const html = lines.map(l => `<p>${esc(l)}</p>`).join("") +
    `<p><a href="${esc(appUrl)}">Open Drillbit</a></p><p><small><a href="${esc(unsubUrl)}">Unsubscribe</a></small></p>`;
  return { text, html };
}

module.exports = { buildReminder, compose, contentFor };
