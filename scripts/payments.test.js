const test = require("node:test");
const assert = require("node:assert");
const { Readable } = require("node:stream");
const Stripe = require("stripe");
const checkout = require("../api/checkout.js");
const webhook = require("../api/stripe-webhook.js");
const access = require("../api/access.js");
const content = require("../api/content.js");
const { split } = require("../api/_lib/split.js");

const SECRET = "whsec_test_secret";
const real = new Stripe("sk_test_fake", { apiVersion: "2026-09-30.endive" });
const config = { webhookSecret: SECRET, priceSprint: "price_sprint", appUrl: "https://drillbit.test" };

const makeReq = (method, { headers = {}, body = null, chunks } = {}) => {
  const parts = chunks || (body == null ? [] : [Buffer.from(body)]);
  const req = Readable.from(parts);
  req.method = method;
  req.headers = headers;
  Object.defineProperty(req, "body", { get() { throw new Error("req.body must not be touched"); } });
  return req;
};
const call = async (handler, req) => {
  const res = { statusCode: 0, headers: {}, body: null, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b ? JSON.parse(b) : null; } };
  await handler(req, res);
  return res;
};

const fakeDb = (over = {}) => {
  const calls = { grant: [], revoke: [] };
  return {
    calls,
    userFromToken: async jwt => (jwt === "good" ? { id: "u1", email: "u1@x.test" } : null),
    grant: async (...a) => { calls.grant.push(a); },
    revoke: async pi => { calls.revoke.push(pi); return 1; },
    userForPayment: async pi => (pi === "pi_9" ? "u9" : null),
    access: async () => ({ active: true, expiresAt: "2026-12-01T00:00:00Z" }),
    ...over
  };
};
const fakeAnalytics = (over = {}) => {
  const calls = [];
  return { calls, capture: async (...a) => { calls.push(a); }, ...over };
};
const deps = (db, createSession, analytics = fakeAnalytics()) => ({
  stripe: { webhooks: real.webhooks, checkout: { sessions: { create: createSession || (async () => ({ url: "https://checkout.test/s" })) } } },
  db,
  analytics,
  config
});

test("checkout: 405 on GET and 401 without a token or with a bad one", async () => {
  const h = checkout.create(deps(fakeDb()));
  assert.strictEqual((await call(h, makeReq("GET"))).statusCode, 405);
  assert.strictEqual((await call(h, makeReq("POST"))).statusCode, 401);
  assert.strictEqual((await call(h, makeReq("POST", { headers: { authorization: "Bearer nope" } }))).statusCode, 401);
});

test("checkout: creates a payment session with exactly the expected params", async () => {
  let params;
  const h = checkout.create(deps(fakeDb(), async p => { params = p; return { url: "https://checkout.test/s" }; }));
  const res = await call(h, makeReq("POST", { headers: { authorization: "Bearer good", host: "evil.test", origin: "https://evil.test" } }));
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { url: "https://checkout.test/s" });
  assert.ok(!("payment_method_types" in params));
  assert.match(params.integration_identifier, /^drillbit_sprint_[a-z]{8}$/);
  const { integration_identifier, ...rest } = params;
  assert.deepStrictEqual(rest, {
    mode: "payment",
    line_items: [{ price: "price_sprint", quantity: 1 }],
    client_reference_id: "u1",
    customer_email: "u1@x.test",
    metadata: { user_id: "u1", product: "sprint_30" },
    payment_intent_data: { metadata: { user_id: "u1" } },
    success_url: "https://drillbit.test/?checkout=success",
    cancel_url: "https://drillbit.test/?checkout=cancel"
  });
});

test("checkout: a Stripe failure returns 500", async () => {
  const h = checkout.create(deps(fakeDb(), async () => { throw new Error("stripe down"); }));
  assert.strictEqual((await call(h, makeReq("POST", { headers: { authorization: "Bearer good" } }))).statusCode, 500);
});

const send = async (type, object, { db = fakeDb(), secret = SECRET, chunks, analytics = fakeAnalytics() } = {}) => {
  const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });
  const header = real.webhooks.generateTestHeaderString({ payload, secret });
  const buf = Buffer.from(payload);
  const req = makeReq("POST", { headers: { "stripe-signature": header }, chunks: chunks ? chunks(buf) : [buf] });
  const res = await call(webhook.create(deps(db, undefined, analytics)), req);
  return { res, db, analytics };
};
const session = over => ({ id: "cs_1", payment_status: "paid", payment_intent: "pi_1", client_reference_id: "u1", metadata: { user_id: "u1" }, ...over });

test("webhook: a bad signature gives 400 and grants nothing", async () => {
  const { res, db } = await send("checkout.session.completed", session(), { secret: "whsec_wrong" });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(db.calls.grant.length, 0);
});

test("webhook: reads the raw body from the stream in chunks and never touches req.body", async () => {
  const { res, db } = await send("checkout.session.completed", session(), { chunks: b => [b.subarray(0, 10), b.subarray(10, 40), b.subarray(40)] });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(db.calls.grant.length, 1);
});

test("webhook: a paid completed session grants 30 days", async () => {
  const { res, db } = await send("checkout.session.completed", session());
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(db.calls.grant, [["u1", "cs_1", "pi_1", "sprint_30", 30]]);
});

test("webhook: falls back to client_reference_id for the user", async () => {
  const { db } = await send("checkout.session.completed", session({ metadata: {} }));
  assert.strictEqual(db.calls.grant[0][0], "u1");
});

test("webhook: an unpaid completed session does not grant", async () => {
  const { res, db } = await send("checkout.session.completed", session({ payment_status: "unpaid" }));
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(db.calls.grant.length, 0);
});

test("webhook: async_payment_succeeded grants and async_payment_failed does not", async () => {
  assert.strictEqual((await send("checkout.session.async_payment_succeeded", session())).db.calls.grant.length, 1);
  const failed = await send("checkout.session.async_payment_failed", session());
  assert.strictEqual(failed.res.statusCode, 200);
  assert.strictEqual(failed.db.calls.grant.length, 0);
});

test("webhook: the same event delivered twice calls grant twice (the DB dedupes)", async () => {
  const db = fakeDb();
  await send("checkout.session.completed", session(), { db });
  await send("checkout.session.completed", session(), { db });
  assert.strictEqual(db.calls.grant.length, 2);
  assert.deepStrictEqual(db.calls.grant[0], db.calls.grant[1]);
});

test("webhook: a full refund revokes and a partial refund does not", async () => {
  const full = await send("charge.refunded", { id: "ch_1", refunded: true, payment_intent: "pi_1" });
  assert.deepStrictEqual(full.db.calls.revoke, ["pi_1"]);
  const partial = await send("charge.refunded", { id: "ch_1", refunded: false, payment_intent: "pi_1" });
  assert.strictEqual(partial.res.statusCode, 200);
  assert.strictEqual(partial.db.calls.revoke.length, 0);
});

test("webhook: a dispute revokes the payment intent", async () => {
  const { db } = await send("charge.dispute.created", { id: "dp_1", payment_intent: "pi_9" });
  assert.deepStrictEqual(db.calls.revoke, ["pi_9"]);
});

test("webhook: a full refund and a dispute send the refund event", async () => {
  const full = await send("charge.refunded", { id: "ch_1", refunded: true, payment_intent: "pi_1" });
  assert.deepStrictEqual(full.analytics.calls, [["refund", "pi_1", { kind: "refund" }]]);
  const partial = await send("charge.refunded", { id: "ch_1", refunded: false, payment_intent: "pi_1" });
  assert.strictEqual(partial.analytics.calls.length, 0);
  const dispute = await send("charge.dispute.created", { id: "dp_1", payment_intent: "pi_9" });
  assert.deepStrictEqual(dispute.analytics.calls, [["refund", "u9", { kind: "dispute" }]], "a dispute is attributed to the buyer");
  const unknown = await send("charge.dispute.created", { id: "dp_2", payment_intent: "pi_x" });
  assert.deepStrictEqual(unknown.analytics.calls, [["refund", "pi_x", { kind: "dispute" }]]);
});

test("webhook: a grant sends purchase_completed_server for the user", async () => {
  const { analytics } = await send("checkout.session.completed", session());
  assert.deepStrictEqual(analytics.calls, [["purchase_completed_server", "u1", { product: "sprint_30" }]]);
});

test("webhook: still returns 200 when analytics throws or rejects", async () => {
  for (const capture of [async () => { throw new Error("down"); }, () => { throw new Error("sync"); }]) {
    const analytics = fakeAnalytics({ capture });
    assert.strictEqual((await send("charge.refunded", { refunded: true, payment_intent: "pi_1" }, { analytics })).res.statusCode, 200);
    const grant = await send("checkout.session.completed", session(), { analytics });
    assert.strictEqual(grant.res.statusCode, 200);
    assert.strictEqual(grant.db.calls.grant.length, 1);
  }
});

test("webhook: an unknown event type returns 200", async () => {
  const { res, db } = await send("customer.created", { id: "cus_1" });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(db.calls.grant.length + db.calls.revoke.length, 0);
});

test("webhook: a db failure returns 500 so Stripe retries", async () => {
  const db = fakeDb({ grant: async () => { throw new Error("db down"); }, revoke: async () => { throw new Error("db down"); } });
  assert.strictEqual((await send("checkout.session.completed", session(), { db })).res.statusCode, 500);
  assert.strictEqual((await send("charge.refunded", { refunded: true, payment_intent: "pi_1" }, { db })).res.statusCode, 500);
});

test("webhook: 405 on GET", async () => {
  assert.strictEqual((await call(webhook.create(deps(fakeDb())), makeReq("GET"))).statusCode, 405);
});

test("access: 401 without a token, 405 on POST, passthrough of active and inactive", async () => {
  assert.strictEqual((await call(access.create(deps(fakeDb())), makeReq("GET"))).statusCode, 401);
  assert.strictEqual((await call(access.create(deps(fakeDb())), makeReq("POST"))).statusCode, 405);
  const auth = { headers: { authorization: "Bearer good" } };
  const on = await call(access.create(deps(fakeDb())), makeReq("GET", auth));
  assert.deepStrictEqual(on.body, { active: true, expiresAt: "2026-12-01T00:00:00Z" });
  const off = await call(access.create(deps(fakeDb({ access: async () => ({ active: false, expiresAt: null }) }))), makeReq("GET", auth));
  assert.deepStrictEqual(off.body, { active: false, expiresAt: null });
});

test("content: 401 without a token, 403 without access, 405 on POST", async () => {
  const d = deps(fakeDb({ access: async () => ({ active: false, expiresAt: null }) }));
  const h = content.create({ ...d, content: content.loadContent });
  assert.strictEqual((await call(h, makeReq("GET"))).statusCode, 401);
  assert.strictEqual((await call(h, makeReq("GET", { headers: { authorization: "Bearer nope" } }))).statusCode, 401);
  const denied = await call(h, makeReq("GET", { headers: { authorization: "Bearer good" } }));
  assert.strictEqual(denied.statusCode, 403);
  assert.strictEqual(denied.body.lessons, undefined);
  assert.strictEqual((await call(h, makeReq("POST", { headers: { authorization: "Bearer good" } }))).statusCode, 405);
});

test("content: 200 returns only paid lessons and non-free guides with no-store", async () => {
  const h = content.create({ ...deps(fakeDb()), content: content.loadContent });
  const res = await call(h, makeReq("GET", { headers: { authorization: "Bearer good" } }));
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers["Cache-Control"], "private, no-store");
  const s = split({ lessons: require("../data.js"), patterns: require("../patterns.js"), guides: require("../guides.js") });
  const free = new Set(s.freeLessons.map(l => l.id));
  assert.strictEqual(res.body.lessons.length, s.paidLessons.length);
  assert.ok(res.body.lessons.every(l => !free.has(l.id)));
  const freeGuides = new Set(s.freeGuides.map(g => g.id));
  assert.ok(res.body.guides.length > 0 && res.body.guides.every(g => !freeGuides.has(g.id) && g.body));
});

test("content: a db failure returns 500", async () => {
  const h = content.create({ ...deps(fakeDb({ access: async () => { throw new Error("db"); } })), content: content.loadContent });
  assert.strictEqual((await call(h, makeReq("GET", { headers: { authorization: "Bearer good" } }))).statusCode, 500);
});
