const CORE = require("../core.js");
const { bearer, send, same } = require("./_lib/http");
const { buildReminder, compose } = require("./_lib/reminder");
const { FREE_PATTERNS } = require("./_lib/split");


const formatters = new Map();
const formatter = zone => {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }));
  return formatters.get(zone);
};
const localParts = (now, timeZone) => {
  const parts = zone => formatter(zone).formatToParts(now);
  let p;
  try { p = parts(timeZone || "UTC"); } catch (e) { p = parts("UTC"); }
  const get = type => p.find(x => x.type === type).value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
};

const BATCH = 5; // users handled at once, so one slow email or push call doesn't hold up the whole hour

const create = ({ db, sendEmail, sendPush = null, unsubscribe, config, contentFor, now = () => new Date() }) => async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "Method not allowed" }); }
  const given = bearer(req);
  if (!config.cronSecret || !given || !same(given, config.cronSecret)) return send(res, 401, { error: "Unauthorized" });
  let rows;
  try { rows = await db.reminderCandidates(); }
  catch (e) { console.error("reminder query failed", e && e.message); return send(res, 500, { error: "Could not load reminders" }); }
  const base = String(config.appUrl || "").replace(/\/+$/, "");
  let sent = 0, skipped = 0;
  // candidates carry no progress; it's loaded only for users whose local reminder hour is now
  const due = [];
  for (const row of rows) {
    const { date, hour } = localParts(now(), row.timezone);
    if (hour !== row.reminder_hour || row.last_reminder_on === date) skipped++;
    else due.push({ row, date });
  }
  const one = async ({ row, date }) => {
    let claimed = false;
    try {
      // a failed access check throws to the catch below rather than sending a free-tier message to a paying user
      const [progress, { active }] = await Promise.all([db.progressOf(row.id), db.access(row.id)]);
      const day = progress && progress.days && progress.days[date];
      if (day && day.done) { skipped++; return; }
      const msg = buildReminder(progress, contentFor(active), date, active ? null : FREE_PATTERNS);
      if (!msg) { skipped++; return; }
      // free sessions used up: no "today's session" nudges for a session the app won't start
      if (!active && CORE.sessionsDone({ days: (progress && progress.days) || {} }) >= CORE.FREE_SESSIONS && (msg.kind === "daily" || msg.kind === "winback")) { skipped++; return; }
      // claim the day first so an overlapping run can't send the same reminder twice
      if (!(await db.claimReminder(row.id, date))) { skipped++; return; }
      claimed = true;
      let delivered = false;
      if (row.reminders_enabled !== false) {
        try {
          const to = await db.emailOf(row.id);
          if (to) {
            const unsubUrl = `${base}/api/unsubscribe?u=${encodeURIComponent(row.id)}&t=${unsubscribe.token(row.id)}`;
            const { text, html } = compose(msg, base, unsubUrl);
            await sendEmail({
              to, subject: msg.subject, text, html,
              headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
            });
            delivered = true;
          }
        } catch (e) { console.error("reminder email failed", row.id, e && e.message); }
      }
      if (row.push_enabled && sendPush) {
        const payload = { title: msg.subject.replace(/^Algostead: /, ""), body: msg.lines[0] || "", url: base || "/" };
        const subs = await db.pushSubscriptions(row.id).catch(e => { console.error("push lookup failed", row.id, e && e.message); return []; });
        for (const sub of subs) {
          try {
            const r = await sendPush(sub, payload);
            if (r && r.gone) await db.deletePushSubscription(sub.endpoint);
            else if (!(r && r.mocked)) delivered = true;
          } catch (e) { console.error("reminder push failed", row.id, e && e.message); }
        }
      }
      if (!delivered) { await db.releaseReminder(row.id, row.last_reminder_on); skipped++; return; }
      sent++;
    } catch (e) {
      console.error("reminder failed", row.id, e && e.message);
      if (claimed) await db.releaseReminder(row.id, row.last_reminder_on).catch(() => {});
      skipped++;
    }
  };
  for (let i = 0; i < due.length; i += BATCH) await Promise.all(due.slice(i, i + BATCH).map(one));
  return send(res, 200, { checked: rows.length, sent, skipped });
};

module.exports = async (req, res) => {
  try { return await create(require("./_lib/deps").getDeps())(req, res); }
  catch (e) { console.error("cron not configured", e && e.message); return send(res, 500, { error: "Not configured" }); }
};
module.exports.create = create;
