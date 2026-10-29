const crypto = require("node:crypto");
const { bearer, send } = require("./_lib/http");
const { buildReminder, compose } = require("./_lib/reminder");
const { FREE_PATTERNS } = require("./_lib/split");

const same = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const localParts = (now, timeZone) => {
  const parts = zone => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  let p;
  try { p = parts(timeZone || "UTC"); } catch (e) { p = parts("UTC"); }
  const get = type => p.find(x => x.type === type).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
};

const create = ({ db, sendEmail, unsubscribe, config, contentFor, now = () => new Date() }) => async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "Method not allowed" }); }
  const given = bearer(req);
  if (!config.cronSecret || !given || !same(given, config.cronSecret)) return send(res, 401, { error: "Unauthorized" });
  let rows;
  try { rows = await db.reminderCandidates(); }
  catch (e) { console.error("reminder query failed", e && e.message); return send(res, 500, { error: "Could not load reminders" }); }
  const base = String(config.appUrl || "").replace(/\/+$/, "");
  let sent = 0, skipped = 0;
  for (const row of rows) {
    const { date, hour } = localParts(now(), row.timezone);
    const day = row.progress && row.progress.days && row.progress.days[date];
    if (hour !== row.reminder_hour || row.last_reminder_on === date || (day && day.done)) { skipped++; continue; }
    try {
      const to = await db.emailOf(row.id);
      if (!to) { skipped++; continue; }
      const { active } = await db.access(row.id).catch(() => ({ active: false }));
      const msg = buildReminder(row.progress, contentFor(active), date, active ? null : FREE_PATTERNS);
      const unsubUrl = `${base}/api/unsubscribe?u=${encodeURIComponent(row.id)}&t=${unsubscribe.token(row.id)}`;
      const { text, html } = compose(msg, base, unsubUrl);
      await sendEmail({
        to, subject: msg.subject, text, html,
        headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      });
      await db.markReminded(row.id, date);
      sent++;
    } catch (e) {
      console.error("reminder failed", row.id, e && e.message);
      skipped++;
    }
  }
  return send(res, 200, { checked: rows.length, sent, skipped });
};

module.exports = async (req, res) => {
  try { return await create(require("./_lib/deps").getDeps())(req, res); }
  catch (e) { console.error("cron not configured", e && e.message); return send(res, 500, { error: "Not configured" }); }
};
module.exports.create = create;
