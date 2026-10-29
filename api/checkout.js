const { bearer, send } = require("./_lib/http");

const create = ({ stripe, db, config }) => async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "Method not allowed" }); }
  const jwt = bearer(req);
  if (!jwt) return send(res, 401, { error: "Sign in first" });
  try {
    const user = await db.userFromToken(jwt);
    if (!user) return send(res, 401, { error: "Sign in first" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: config.priceSprint, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { user_id: user.id, product: "sprint_30" },
      payment_intent_data: { metadata: { user_id: user.id } },
      success_url: config.appUrl + "/?checkout=success",
      cancel_url: config.appUrl + "/?checkout=cancel",
      integration_identifier: "drillbit_sprint_qkzvhmtw"
    });
    return send(res, 200, { url: session.url });
  } catch (e) {
    console.error("checkout failed", e && e.message);
    return send(res, 500, { error: "Could not start checkout" });
  }
};

module.exports = async (req, res) => {
  try { return await create(require("./_lib/deps").getDeps())(req, res); }
  catch (e) { console.error("checkout not configured", e && e.message); return send(res, 500, { error: "Not configured" }); }
};
module.exports.create = create;
