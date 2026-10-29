const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { createAnalytics } = require("./analytics");

function buildDeps(env = process.env) {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-09-30.endive" });
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const rpc = async (fn, args) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw error;
    return data;
  };
  const db = {
    async userFromToken(jwt) {
      const { data, error } = await sb.auth.getUser(jwt);
      return error || !data || !data.user ? null : { id: data.user.id, email: data.user.email };
    },
    async grant(userId, session, paymentIntent, product, days) {
      await rpc("grant_entitlement", { p_user: userId, p_session: session, p_payment_intent: paymentIntent, p_product: product, p_days: days });
    },
    async revoke(paymentIntent) {
      return rpc("revoke_entitlement", { p_payment_intent: paymentIntent });
    },
    async access(userId) {
      const active = !!(await rpc("has_access", { p_user: userId }));
      if (!active) return { active: false, expiresAt: null };
      const { data, error } = await sb.from("entitlements").select("expires_at").eq("user_id", userId)
        .is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: false }).limit(1);
      if (error) throw error;
      return { active: true, expiresAt: data && data[0] ? data[0].expires_at : null };
    }
  };
  return {
    stripe, db,
    analytics: createAnalytics({ key: env.POSTHOG_KEY, host: env.POSTHOG_HOST }),
    config: { webhookSecret: env.STRIPE_WEBHOOK_SECRET, priceSprint: env.STRIPE_PRICE_SPRINT, appUrl: env.APP_URL }
  };
}

let cached = null;
const getDeps = () => cached || (cached = buildDeps());

module.exports = { buildDeps, getDeps };
