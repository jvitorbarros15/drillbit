const CORE = require("../../core.js");

const weekday = d => CORE.parse(d).toLocaleDateString("en-US", { weekday: "long" });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function contentFor(paid) {
  const full = { lessons: require("../../data.js"), patterns: require("../../patterns.js"), guides: require("../../guides.js"), companies: require("../../companies.js") };
  if (paid) return full;
  const { split, FREE_PATTERNS } = require("./split");
  return { ...full, lessons: split(full).freeLessons.filter(l => FREE_PATTERNS.includes(CORE.patternOf(l, full))) };
}

const COUNTDOWN = [14, 7, 3, 1];      // days before the interview that always get a message
const WINBACK = [3, 7, 14, 30];       // days away that get a come-back message; other inactive days get nothing

// Last day with any practice: a finished session, an answered question or a logged attempt.
function lastActive(state) {
  const dates = [state.lastDone];
  for (const [d, v] of Object.entries(state.days || {})) if (v && (v.answered || v.done)) dates.push(d);
  for (const e of state.events || []) dates.push(e.at);
  for (const it of Object.values(state.items || {})) if (it) dates.push(it.last);
  for (const m of Object.values(state.misses || {})) if (m) dates.push(m.lastMiss);
  if (state.diagnostic) dates.push(state.diagnostic.at);
  return dates.filter(Boolean).sort().pop() || null;
}

// Returns null when nothing should be sent today.
function buildReminder(progress, ctx, localDate, allowedPatterns = null) {
  const state = { ...CORE.blankState(), ...(progress || {}) };
  const labels = {};
  const patternOfTag = {};
  ctx.patterns.forEach(p => p.misconceptions.forEach(m => { labels[m.id] = m.label; patternOfTag[m.id] = p.id; }));
  const tags = CORE.dueTags(state, localDate).filter(t => !allowedPatterns || allowedPatterns.includes(patternOfTag[t])).slice(0, 3);
  const sch = CORE.schedule(state, ctx, localDate);
  const company = state.profile && state.profile.company ? state.profile.company.name : null;
  const active = lastActive(state);
  const away = active ? CORE.diffDays(localDate, active) : 0;
  const countdown = sch.daysLeft !== null && COUNTDOWN.includes(sch.daysLeft);
  const kind = countdown ? "countdown" : away >= WINBACK[0] ? (WINBACK.includes(away) ? "winback" : null) : "daily";
  if (!kind) return null;

  const lines = [];
  const interview = `${company ? company + " interview" : "Interview"} in ${sch.daysLeft} day${sch.daysLeft === 1 ? "" : "s"}`;
  if (kind === "countdown") lines.push(sch.daysLeft === 1 ? `${interview}. Keep today light: one review, then rest.` : `${interview}.${sch.daysLeft <= 7 ? " Your plan is in final review mode." : ""}`);
  if (kind === "winback") lines.push(`It's been ${away} days. Your plan picks up where you left off, and one session takes about 15 minutes.`);
  if (tags.length) tags.forEach(t => lines.push(`Bring back: ${labels[t] || t} (missed ${weekday(state.misses[t].lastMiss)})`));
  else {
    const p = ctx.patterns.find(x => x.id === sch.current);
    if (p) lines.push(`Next step: ${p.name}`);
  }
  if (state.streak > 0 && kind !== "winback") lines.push(`Streak: ${state.streak} day${state.streak === 1 ? "" : "s"}`);
  const subject = kind === "countdown" ? `Drillbit: ${company ? interview : interview.replace(/^Interview/, "interview")}`
    : kind === "winback" ? "Drillbit: pick up where you left off"
    : tags.length ? `Drillbit: ${tags.length} to review today` : "Your Drillbit session for today";
  return { kind, subject, lines };
}

function compose({ lines }, appUrl, unsubUrl) {
  const text = [...lines, "", `Open Drillbit: ${appUrl}`, "", `Unsubscribe: ${unsubUrl}`].join("\n");
  const html = lines.map(l => `<p>${esc(l)}</p>`).join("") +
    `<p><a href="${esc(appUrl)}">Open Drillbit</a></p><p><small><a href="${esc(unsubUrl)}">Unsubscribe</a></small></p>`;
  return { text, html };
}

module.exports = { buildReminder, compose, contentFor, lastActive };
