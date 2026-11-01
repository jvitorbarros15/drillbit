const { bearer, send } = require("./_lib/http");

const create = ({ db }) => async (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(res, 405, { error: "Method not allowed" }); }
  const jwt = bearer(req);
  if (!jwt) return send(res, 401, { error: "Sign in first" });
  try {
    const user = await db.userFromToken(jwt);
    if (!user) return send(res, 401, { error: "Sign in first" });
    const { active, expiresAt } = await db.access(user.id);
    return send(res, 200, { active, expiresAt });
  } catch (e) {
    console.error("access check failed", e && e.message);
    return send(res, 500, { error: "Could not check access" });
  }
};

module.exports = async (req, res) => {
  try { return await create(require("./_lib/deps").getDeps())(req, res); }
  catch (e) { console.error("access not configured", e && e.message); return send(res, 500, { error: "Not configured" }); }
};
module.exports.create = create;
