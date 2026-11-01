const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { createAnalytics } = require("./analytics");
const { createSendEmail } = require("./email");
const { createSendPush } = require("./push");
const { createUnsubscribe } = require("./unsubscribe");
const { contentFor } = require("./reminder");

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
    async reminderCandidates() {
      // paged, since PostgREST caps a single response at max-rows
      const PAGE = 1000, out = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await sb.from("profiles").select("id, reminder_hour, timezone, last_reminder_on, reminders_enabled, push_enabled")
          .or("reminders_enabled.eq.true,push_enabled.eq.true").not("reminder_hour", "is", null).order("id").range(from, from + PAGE - 1);
        if (error) throw error;
        out.push(...(data || []));
        if (!data || data.length < PAGE) return out;
      }
    },
    async userForPayment(paymentIntent) {
      const { data, error } = await sb.from("entitlements").select("user_id").eq("stripe_payment_intent", paymentIntent).limit(1);
      if (error) throw error;
      return data && data[0] ? data[0].user_id : null;
    },
    async progressOf(userId) {
      const { data, error } = await sb.from("profiles").select("progress").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data ? data.progress : null;
    },
    async emailOf(userId) {
      const { data, error } = await sb.auth.admin.getUserById(userId);
      if (error) throw error;
      return data && data.user ? data.user.email : null;
    },
    async pushSubscriptions(userId) {
      const { data, error } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
    async deletePushSubscription(endpoint) {
      const { error } = await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) throw error;
    },
    async markReminded(userId, date) {
      const { error } = await sb.from("profiles").update({ last_reminder_on: date }).eq("id", userId);
      if (error) throw error;
    },
    async disableReminders(userId) {
      const { error } = await sb.from("profiles").update({ reminders_enabled: false }).eq("id", userId);
      if (error) throw error;
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
    sendEmail: createSendEmail({ key: env.RESEND_API_KEY, from: env.RESEND_FROM }),
    sendPush: createSendPush({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT }),
    unsubscribe: createUnsubscribe(env.UNSUBSCRIBE_SECRET),
    contentFor,
    config: { webhookSecret: env.STRIPE_WEBHOOK_SECRET, priceSprint: env.STRIPE_PRICE_SPRINT, appUrl: env.APP_URL, cronSecret: env.CRON_SECRET }
  };
}

let cached = null;
const getDeps = () => cached || (cached = buildDeps());

module.exports = { buildDeps, getDeps };
