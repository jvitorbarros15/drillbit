const { bearer, send } = require("./_lib/http");

let cached = null;
const loadContent = () => {
  if (!cached) {
    const { split } = require("./_lib/split");
    const s = split({ lessons: require("../data.js"), patterns: require("../patterns.js"), guides: require("../guides.js") });
    cached = { lessons: s.paidLessons, guides: s.paidGuides };
  }
  return cached;
};

const create = ({ db, content }) => async (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(res, 405, { error: "Method not allowed" }); }
  const jwt = bearer(req);
  if (!jwt) return send(res, 401, { error: "Sign in first" });
  try {
    const user = await db.userFromToken(jwt);
    if (!user) return send(res, 401, { error: "Sign in first" });
    const { active } = await db.access(user.id);
    if (!active) return send(res, 403, { error: "Sprint Pass required" });
    res.setHeader("Cache-Control", "private, no-store");
    return send(res, 200, content());
  } catch (e) {
    console.error("content failed", e && e.message);
    return send(res, 500, { error: "Could not load content" });
  }
};

module.exports = async (req, res) => {
  try { return await create({ ...require("./_lib/deps").getDeps(), content: loadContent })(req, res); }
  catch (e) { console.error("content not configured", e && e.message); return send(res, 500, { error: "Not configured" }); }
};
module.exports.create = create;
module.exports.loadContent = loadContent;
