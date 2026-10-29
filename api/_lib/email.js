const RESEND_URL = "https://api.resend.com/emails";

function createSendEmail({ key, from, fetch: doFetch = globalThis.fetch } = {}) {
  return async ({ to, subject, html, text, headers }) => {
    if (!key) {
      console.log("email not sent, RESEND_API_KEY is unset:", subject);
      return { mocked: true };
    }
    const res = await doFetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text, headers })
    });
    if (!res.ok) throw new Error("Resend responded " + res.status);
    const body = await res.json().catch(() => ({}));
    return { mocked: false, id: body.id };
  };
}

module.exports = { createSendEmail };
