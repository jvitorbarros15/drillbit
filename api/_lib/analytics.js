const TIMEOUT_MS = 1500;

function createAnalytics({ key, host, fetch: doFetch = globalThis.fetch } = {}) {
  const base = (host || "https://us.i.posthog.com").replace(/\/+$/, "");
  const capture = async (event, distinctId, properties = {}) => {
    if (!key || !distinctId) return;
    let timer;
    try {
      const ctl = new AbortController();
      const post = doFetch(`${base}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties }),
        signal: ctl.signal
      });
      const timeout = new Promise(resolve => { timer = setTimeout(() => { ctl.abort(); resolve(); }, TIMEOUT_MS); });
      await Promise.race([post, timeout]);
    } catch (e) {
      console.error("analytics capture failed", event, e && e.message);
    } finally {
      clearTimeout(timer);
    }
  };
  return { capture };
}

module.exports = { createAnalytics };
