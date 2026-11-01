const crypto = require("node:crypto");
const { same } = require("./http");

function createUnsubscribe(secret) {
  const sign = userId => {
    if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not set");
    return crypto.createHmac("sha256", secret).update(String(userId)).digest("base64url");
  };
  const verify = (userId, token) => {
    if (!secret || !userId || typeof token !== "string") return false;
    const a = Buffer.from(sign(userId));
    const b = Buffer.from(token);
    return same(a, b);
  };
  return { token: sign, verify };
}

module.exports = { createUnsubscribe };
