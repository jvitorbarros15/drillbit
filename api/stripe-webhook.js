const { readRaw, send } = require("./_lib/http");

const PRODUCT = "sprint_30";
const DAYS = 30;

const create = ({ stripe, db, config, analytics }) => async (req, res) => {
  const track = (event, distinctId, props) => Promise.resolve().then(() => analytics.capture(event, distinctId, props)).catch(() => {});
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "Method not allowed" }); }
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], config.webhookSecret);
  } catch (e) {
    return send(res, 400, { error: "Bad signature" });
  }
  try {
    const obj = event.data.object;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        if (obj.payment_status === "unpaid") break;
        const userId = (obj.metadata && obj.metadata.user_id) || obj.client_reference_id;
        if (!userId) { console.error("paid session without a user", obj.id); break; }
        await db.grant(userId, obj.id, obj.payment_intent, PRODUCT, DAYS);
        await track("purchase_completed_server", userId, { product: PRODUCT });
        break;
      }
      case "checkout.session.async_payment_failed":
        console.error("async payment failed", obj.id);
        break;
      case "charge.refunded":
        if (obj.refunded === true && obj.payment_intent) {
          await db.revoke(obj.payment_intent);
          await track("refund", (obj.metadata && obj.metadata.user_id) || obj.payment_intent, { kind: "refund" });
        }
        break;
      case "charge.dispute.created":
        if (obj.payment_intent) {
          await db.revoke(obj.payment_intent);
          // a Dispute carries no checkout metadata, so the buyer comes from the entitlement
          const uid = await db.userForPayment(obj.payment_intent).catch(() => null);
          await track("refund", uid || obj.payment_intent, { kind: "dispute" });
        }
        break;
    }
    return send(res, 200, { received: true });
  } catch (e) {
    console.error("webhook handling failed", event.type, e && e.message);
    return send(res, 500, { error: "Handler failed" });
  }
};

module.exports = async (req, res) => {
  try { return await create(require("./_lib/deps").getDeps())(req, res); }
  catch (e) { console.error("webhook not configured", e && e.message); return send(res, 500, { error: "Not configured" }); }
};
module.exports.create = create;
