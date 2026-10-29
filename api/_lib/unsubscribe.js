const crypto = require("node:crypto");

function createUnsubscribe(secret) {
  const sign = userId => {
    if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not set");
    return crypto.createHmac("sha256", secret).update(String(userId)).digest("base64url");
  };
  const verify = (userId, token) => {
    if (!secret || !userId || typeof token !== "string") return false;
    const a = Buffer.from(sign(userId));
    const b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  return { token: sign, verify };
}

module.exports = { createUnsubscribe };
