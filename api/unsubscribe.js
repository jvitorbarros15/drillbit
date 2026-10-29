const { readRaw } = require("./_lib/http");

const page = (res, code, title, body) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>${title} | Drillbit</title><link rel="stylesheet" href="/styles.css" /></head><body><main class="legal"><h1>${title}</h1>${body}</main></body></html>`);
};

const create = ({ db, unsubscribe }) => async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return page(res, 405, "Not allowed", ""); }
  const q = new URL(req.url, "http://x").searchParams;
  const u = q.get("u"), t = q.get("t");
  let ok = false;
  try { ok = unsubscribe.verify(u, t); } catch (e) { ok = false; }
  if (!ok) return page(res, 400, "Invalid link", "<p>This unsubscribe link is not valid.</p>");
  if (req.method === "GET") {
    return page(res, 200, "Unsubscribe", `<p>Stop the daily reminder emails?</p><form method="post" action="/api/unsubscribe?u=${encodeURIComponent(u)}&amp;t=${encodeURIComponent(t)}"><button class="btn primary" type="submit">Unsubscribe</button></form>`);
  }
  try {
    await readRaw(req);
    await db.disableReminders(u);
    return page(res, 200, "You are unsubscribed", "<p>You will not get more reminder emails. You can turn them back on from your account page.</p>");
  } catch (e) {
    console.error("unsubscribe failed", e && e.message);
    return page(res, 500, "Something went wrong", "<p>Try the link again in a minute.</p>");
  }
};

module.exports = async (req, res) => {
  try { return await create(require("./_lib/deps").getDeps())(req, res); }
  catch (e) { console.error("unsubscribe not configured", e && e.message); return page(res, 500, "Not configured", ""); }
};
module.exports.create = create;
