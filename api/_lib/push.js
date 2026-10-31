// Web push sender. Without VAPID keys it only logs, like the email sender without a Resend key.
// Returns { gone: true } when the push service says the subscription no longer exists, so it can be deleted.
function createSendPush({ publicKey, privateKey, subject, webpush = null } = {}) {
  let lib = null;
  return async (sub, payload) => {
    if (!publicKey || !privateKey) {
      console.log("push not sent, VAPID keys are unset:", payload.title);
      return { mocked: true };
    }
    if (!lib) {
      lib = webpush || require("web-push");
      lib.setVapidDetails(subject || "mailto:support@example.com", publicKey, privateKey);
    }
    try {
      await lib.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 });
      return { mocked: false };
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) return { gone: true };
      throw e;
    }
  };
}

module.exports = { createSendPush };
