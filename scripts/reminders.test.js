const test = require("node:test");
const assert = require("node:assert");
const { Readable } = require("node:stream");
const { createSendEmail } = require("../api/_lib/email.js");
const { createUnsubscribe } = require("../api/_lib/unsubscribe.js");
const { buildReminder, compose, contentFor } = require("../api/_lib/reminder.js");
const cron = require("../api/cron-reminders.js");
const unsub = require("../api/unsubscribe.js");
const CORE = require("../core.js");

const ctx = { lessons: require("../data.js"), patterns: require("../patterns.js"), guides: require("../guides.js") };
const TAG = ctx.patterns[0].misconceptions[0];
const U = createUnsubscribe("s3cret");

const state = over => ({ ...CORE.blankState(), ...over });
const miss = (lastMiss, due) => ({ box: 0, due, lastMiss, items: [], count: 1, resolved: false });

test("email: without a key it mocks and never calls fetch", async () => {
  let called = false;
  const send = createSendEmail({ from: "a@b.test", fetch: async () => { called = true; } });
  assert.deepStrictEqual(await send({ to: "u@x.test", subject: "s", text: "t" }), { mocked: true });
  assert.strictEqual(called, false);
});

test("email: posts a well formed Resend request", async () => {
  const seen = [];
  const send = createSendEmail({ key: "re_k", from: "Drillbit <r@x.test>", fetch: async (url, init) => { seen.push([url, init]); return { ok: true, json: async () => ({ id: "m1" }) }; } });
  const r = await send({ to: "u@x.test", subject: "s", html: "<p>h</p>", text: "t", headers: { "List-Unsubscribe": "<u>" } });
  assert.deepStrictEqual(r, { mocked: false, id: "m1" });
  assert.strictEqual(seen[0][0], "https://api.resend.com/emails");
  assert.strictEqual(seen[0][1].method, "POST");
  assert.strictEqual(seen[0][1].headers.Authorization, "Bearer re_k");
  assert.deepStrictEqual(JSON.parse(seen[0][1].body), { from: "Drillbit <r@x.test>", to: ["u@x.test"], subject: "s", html: "<p>h</p>", text: "t", headers: { "List-Unsubscribe": "<u>" } });
});

test("email: a non-2xx response throws", async () => {
  const send = createSendEmail({ key: "k", fetch: async () => ({ ok: false, status: 422 }) });
  await assert.rejects(send({ to: "u", subject: "s" }), /422/);
});

test("unsubscribe token: round trip, tampered and other user rejected", () => {
  const t = U.token("u1");
  assert.ok(U.verify("u1", t));
  assert.ok(!U.verify("u1", t.slice(0, -1) + (t.endsWith("A") ? "B" : "A")));
  assert.ok(!U.verify("u2", t));
  assert.ok(!U.verify("u1", "short"));
  assert.ok(!createUnsubscribe("other").verify("u1", t));
});

const makeReq = (method, url, body = "") => {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  req.method = method;
  req.url = url;
  req.headers = {};
  return req;
};
const call = async (handler, req) => {
  const res = { statusCode: 0, headers: {}, body: "", setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler(req, res);
  return res;
};

test("unsubscribe route: GET shows a confirm page that posts", async () => {
  const disabled = [];
  const h = unsub.create({ db: { disableReminders: async id => disabled.push(id) }, unsubscribe: U });
  const res = await call(h, makeReq("GET", `/api/unsubscribe?u=u1&t=${U.token("u1")}`));
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.body, /<form method="post"/);
  assert.deepStrictEqual(disabled, []);
});

test("unsubscribe route: POST disables, including a one-click body", async () => {
  const disabled = [];
  const h = unsub.create({ db: { disableReminders: async id => disabled.push(id) }, unsubscribe: U });
  const url = `/api/unsubscribe?u=u1&t=${U.token("u1")}`;
  assert.match((await call(h, makeReq("POST", url))).body, /You are unsubscribed/);
  assert.strictEqual((await call(h, makeReq("POST", url, "List-Unsubscribe=One-Click"))).statusCode, 200);
  assert.deepStrictEqual(disabled, ["u1", "u1"]);
});

test("unsubscribe route: a bad token gives 400 and disables nothing", async () => {
  const disabled = [];
  const h = unsub.create({ db: { disableReminders: async id => disabled.push(id) }, unsubscribe: U });
  for (const m of ["GET", "POST"]) {
    assert.strictEqual((await call(h, makeReq(m, `/api/unsubscribe?u=u1&t=${U.token("u2")}`))).statusCode, 400);
    assert.strictEqual((await call(h, makeReq(m, "/api/unsubscribe"))).statusCode, 400);
  }
  assert.deepStrictEqual(disabled, []);
});

test("buildReminder: due tags use the Bring back phrasing, max 3", () => {
  const ids = ctx.patterns.flatMap(p => p.misconceptions.map(m => m.id)).slice(0, 4);
  const misses = Object.fromEntries(ids.map(id => [id, miss("2026-03-04", "2026-03-05")]));
  const r = buildReminder(state({ misses }), ctx, "2026-03-05");
  assert.strictEqual(r.lines.filter(l => l.startsWith("Bring back: ")).length, 3);
  assert.ok(r.lines.every(l => /^Bring back: .+ \(missed Wednesday\)$/.test(l)));
  assert.match(r.subject, /3 to review/);
});

test("buildReminder: with nothing due it names the current pattern", () => {
  const r = buildReminder(state(), ctx, "2026-03-05");
  const cur = ctx.patterns.find(p => p.id === CORE.schedule(state(), ctx, "2026-03-05").current);
  assert.deepStrictEqual(r.lines, [`Next step: ${cur.name}`]);
  assert.ok(!r.lines.some(l => l.startsWith("Bring back")));
});

test("buildReminder: the streak line appears only when the streak is above 0", () => {
  assert.ok(!buildReminder(state({ streak: 0 }), ctx, "2026-03-05").lines.some(l => l.startsWith("Streak")));
  assert.ok(buildReminder(state({ streak: 4 }), ctx, "2026-03-05").lines.includes("Streak: 4 days"));
  assert.ok(buildReminder(state({ streak: 1 }), ctx, "2026-03-05").lines.includes("Streak: 1 day"));
});

const active = (day, over = {}) => state({ lastDone: day, days: { [day]: { answered: 3, correct: 2, done: true } }, ...over });

test("buildReminder: win-back only on days 3, 7, 14 and 30 away, nothing in between", () => {
  const kinds = [1, 2, 3, 4, 6, 7, 10, 14, 20, 30, 31].map(n => {
    const r = buildReminder(active(CORE.addDays("2026-03-05", -n)), ctx, "2026-03-05");
    return r ? r.kind : null;
  });
  assert.deepStrictEqual(kinds, ["daily", "daily", "winback", null, null, "winback", null, "winback", null, "winback", null]);
  const r = buildReminder(active("2026-02-26", { streak: 5 }), ctx, "2026-03-05");
  assert.match(r.lines[0], /^It's been 7 days\./);
  assert.strictEqual(r.subject, "Drillbit: pick up where you left off");
  assert.ok(!r.lines.some(l => l.startsWith("Streak")), "no streak line when the streak is gone");
});

test("buildReminder: interview countdown at 14, 7, 3 and 1 days, even when away", () => {
  const at = left => buildReminder(active("2026-02-01", { profile: { interviewDate: CORE.addDays("2026-03-05", left), language: "js", company: { id: "meta", name: "Meta" } } }), ctx, "2026-03-05");
  assert.deepStrictEqual([14, 7, 3, 1].map(n => at(n).kind), ["countdown", "countdown", "countdown", "countdown"]);
  assert.strictEqual(at(10), null, "away 32 days and not a countdown day");
  assert.strictEqual(at(14).subject, "Drillbit: Meta interview in 14 days");
  assert.match(at(7).lines[0], /^Meta interview in 7 days\. Your plan is in final review mode\.$/);
  assert.match(at(1).lines[0], /^Meta interview in 1 day\. Keep today light/);
  const noCompany = buildReminder(active("2026-03-04", { profile: { interviewDate: "2026-03-08", language: "js", company: null } }), ctx, "2026-03-05");
  assert.strictEqual(noCompany.subject, "Drillbit: interview in 3 days");
});

test("buildReminder: debrief ask on days 1 and 3 after the interview, until one is saved", () => {
  const profile = { interviewDate: "2026-03-04", language: "js", company: { id: "amazon", name: "Amazon" }, debriefs: [] };
  const at = (day, over = {}) => buildReminder(active("2026-03-03", { profile: { ...profile, ...over } }), ctx, day);
  assert.deepStrictEqual(["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08"].map(d => (at(d) || {}).kind || null),
    ["daily", "debrief", "winback", "debrief", null], "interview day is a normal day; other days follow the win-back rules");
  assert.strictEqual(at("2026-03-05").subject, "Drillbit: how did the Amazon interview go?");
  assert.match(at("2026-03-05").lines[0], /^How did the Amazon interview go?/);
  assert.strictEqual(at("2026-03-05", { company: null }).subject, "Drillbit: how did your interview go?");
  const saved = at("2026-03-07", { debriefs: [{ id: "d", at: "2026-03-05", date: "2026-03-04", company: "Amazon", outcome: "waiting", came: [], hard: [], note: "" }] });
  assert.notStrictEqual(saved && saved.kind, "debrief", "a saved debrief stops the ask");
});

test("sample reminder", () => {
  const r = buildReminder(state({ streak: 4, misses: { [TAG.id]: miss("2026-03-02", "2026-03-04") } }), ctx, "2026-03-05");
  const { text } = compose(r, "https://drillbit.test", "https://drillbit.test/api/unsubscribe?u=u1&t=TOKEN");
  console.log("SUBJECT:", r.subject, "\n" + text);
  assert.match(text, /Unsubscribe: https:\/\/drillbit.test\/api\/unsubscribe/);
});

const NOW = new Date("2026-03-05T14:30:00Z");
const row = (id, over = {}) => ({ id, progress: state({ streak: 2 }), reminder_hour: 9, timezone: "America/New_York", last_reminder_on: null, reminders_enabled: true, push_enabled: false, ...over });
const harness = (rows, { fail = [], paid = [], subs = {}, gone = [], pushFail = [], accessFail = [], subsFail = [], taken = [], mockPush = [] } = {}) => {
  const sent = [], marked = [], pushed = [], deleted = [], loaded = [];
  const deps = {
    db: {
      reminderCandidates: async () => rows.map(({ progress, ...r }) => r),
      progressOf: async id => { loaded.push(id); return rows.find(r => r.id === id).progress; },
      emailOf: async id => id + "@x.test",
      claimReminder: async (id, date) => { if (taken.includes(id)) return false; marked.push([id, date]); return true; },
      releaseReminder: async id => { const i = marked.findIndex(m => m[0] === id); if (i >= 0) marked.splice(i, 1); },
      access: async id => { if (accessFail.includes(id)) throw new Error("rpc timeout"); return { active: paid.includes(id) }; },
      pushSubscriptions: async id => { if (subsFail.includes(id)) throw new Error("db down"); return subs[id] || []; },
      deletePushSubscription: async endpoint => deleted.push(endpoint)
    },
    sendEmail: async m => { if (fail.includes(m.to)) throw new Error("resend down"); sent.push(m); return { mocked: true }; },
    sendPush: async (sub, payload) => {
      if (pushFail.includes(sub.endpoint)) throw new Error("push down");
      if (gone.includes(sub.endpoint)) return { gone: true };
      if (mockPush.includes(sub.endpoint)) return { mocked: true };
      pushed.push([sub.endpoint, payload]);
      return { mocked: false };
    },
    unsubscribe: U,
    config: { cronSecret: "cron", appUrl: "https://drillbit.test/" },
    contentFor,
    now: () => NOW
  };
  const run = async (auth = "Bearer cron") => {
    const req = makeReq("POST", "/api/cron-reminders");
    if (auth) req.headers.authorization = auth;
    const res = await call(cron.create(deps), req);
    return { res, body: res.body ? JSON.parse(res.body) : null };
  };
  return { run, sent, marked, pushed, deleted, loaded };
};

test("cron: 401 without the secret or with a wrong one", async () => {
  const h = harness([row("u1")]);
  assert.strictEqual((await h.run(null)).res.statusCode, 401);
  assert.strictEqual((await h.run("Bearer nope")).res.statusCode, 401);
  assert.strictEqual(h.sent.length, 0);
});

test("cron: sends only to users at their local hour and sets last_reminder_on", async () => {
  const h = harness([
    row("ny"),
    row("la", { timezone: "America/Los_Angeles" }),
    row("utc", { timezone: "UTC", reminder_hour: 14 }),
    row("tokyo", { timezone: "Asia/Tokyo", reminder_hour: 23 })
  ]);
  const { body } = await h.run();
  assert.deepStrictEqual(body, { checked: 4, sent: 3, skipped: 1 });
  assert.deepStrictEqual(h.sent.map(m => m.to).sort(), ["ny@x.test", "tokyo@x.test", "utc@x.test"]);
  assert.deepStrictEqual(h.marked.map(m => m[0]).sort(), ["ny", "tokyo", "utc"]);
  assert.deepStrictEqual(h.marked.find(m => m[0] === "tokyo"), ["tokyo", "2026-03-05"]);
  assert.deepStrictEqual(h.loaded.sort(), ["ny", "tokyo", "utc"], "progress is loaded only for users due this hour");
});

test("cron: the message has the unsubscribe headers and links", async () => {
  const h = harness([row("ny")]);
  await h.run();
  const m = h.sent[0];
  const url = `https://drillbit.test/api/unsubscribe?u=ny&t=${U.token("ny")}`;
  assert.strictEqual(m.headers["List-Unsubscribe"], `<${url}>`);
  assert.strictEqual(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(m.text.includes(url) && m.html.includes("Unsubscribe") && m.text.includes("https://drillbit.test"));
});

test("cron: skips users already reminded today and users who finished today's session", async () => {
  const done = state({ days: { "2026-03-05": { answered: 5, correct: 4, done: true } } });
  const h = harness([row("a", { last_reminder_on: "2026-03-05" }), row("b", { progress: done }), row("c", { last_reminder_on: "2026-03-04" })]);
  const { body } = await h.run();
  assert.deepStrictEqual(body, { checked: 3, sent: 1, skipped: 2 });
  assert.deepStrictEqual(h.sent.map(m => m.to), ["c@x.test"]);
});

test("cron: an invalid timezone falls back to UTC", async () => {
  const h = harness([row("bad", { timezone: "Not/AZone", reminder_hour: 14 }), row("none", { timezone: null, reminder_hour: 14 })]);
  assert.strictEqual((await h.run()).body.sent, 2);
});

test("cron: one email failure does not stop the others", async () => {
  const h = harness([row("a"), row("b"), row("c")], { fail: ["b@x.test"] });
  const { res, body } = await h.run();
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(body, { checked: 3, sent: 2, skipped: 1 });
  assert.deepStrictEqual(h.marked.map(m => m[0]), ["a", "c"]);
});

test("cron: free users are not pointed at locked patterns, paid users are", async () => {
  const { split, FREE_PATTERNS } = require("../api/_lib/split.js");
  const lockedIds = split(ctx).meta.lockedPatterns;
  const locked = ctx.patterns.find(p => lockedIds.includes(p.id) && p.misconceptions.length);
  const lockedTag = locked.misconceptions[0];
  const freeTag = ctx.patterns.find(p => FREE_PATTERNS.includes(p.id)).misconceptions[0];
  const progress = state({
    diagnostic: { at: "2026-03-01", results: { [locked.id]: { correct: 0, total: 1 } } },
    misses: { [lockedTag.id]: miss("2026-03-02", "2026-03-04") }
  });
  assert.strictEqual(CORE.schedule(progress, ctx, "2026-03-05").current, locked.id);
  const h = harness([row("free", { progress }), row("paid", { progress })], { paid: ["paid"] });
  assert.strictEqual((await h.run()).body.sent, 2);
  const free = h.sent.find(m => m.to === "free@x.test").text;
  const paid = h.sent.find(m => m.to === "paid@x.test").text;
  assert.ok(!free.includes(lockedTag.label) && !free.includes(locked.name));
  const nextFree = free.match(/Next step: (.+)/)[1];
  assert.ok(ctx.patterns.some(p => FREE_PATTERNS.includes(p.id) && p.name === nextFree));
  assert.ok(paid.includes(`Bring back: ${lockedTag.label}`));
  const mixed = { ...progress, misses: { ...progress.misses, [freeTag.id]: miss("2026-03-03", "2026-03-04") } };
  const m = harness([row("free", { progress: mixed })]);
  await m.run();
  assert.ok(m.sent[0].text.includes(`Bring back: ${freeTag.label}`) && !m.sent[0].text.includes(lockedTag.label));
});

test("cron: push goes to every subscription, dead ones are deleted, and push alone counts as delivered", async () => {
  const sub = e => ({ endpoint: e, p256dh: "k", auth: "a" });
  const h = harness([
    row("both", { push_enabled: true }),
    row("pushonly", { reminders_enabled: false, push_enabled: true }),
    row("dead", { reminders_enabled: false, push_enabled: true })
  ], { subs: { both: [sub("p1"), sub("p2")], pushonly: [sub("p3")], dead: [sub("p4")] }, gone: ["p4"] });
  const { body } = await h.run();
  assert.deepStrictEqual(body, { checked: 3, sent: 2, skipped: 1 });
  assert.deepStrictEqual(h.sent.map(m => m.to), ["both@x.test"]);
  assert.deepStrictEqual(h.pushed.map(p => p[0]).sort(), ["p1", "p2", "p3"]);
  assert.deepStrictEqual(h.deleted, ["p4"]);
  assert.deepStrictEqual(h.marked.map(m => m[0]).sort(), ["both", "pushonly"]);
  const p = h.pushed[0][1];
  assert.ok(p.title && !p.title.startsWith("Drillbit:") && p.url === "https://drillbit.test");
});

test("cron: a push failure doesn't block email, and an email failure doesn't block push", async () => {
  const sub = e => ({ endpoint: e, p256dh: "k", auth: "a" });
  const h = harness([row("a", { push_enabled: true }), row("b", { push_enabled: true })], { subs: { a: [sub("pa")], b: [sub("pb")] }, pushFail: ["pa"], fail: ["b@x.test"] });
  const { body } = await h.run();
  assert.deepStrictEqual(body, { checked: 2, sent: 2, skipped: 0 });
  assert.deepStrictEqual([h.sent.map(m => m.to), h.pushed.map(p => p[0])], [["a@x.test"], ["pb"]]);
});

test("cron: no message on an in-between inactive day, and the day isn't marked", async () => {
  const h = harness([row("away", { progress: active("2026-02-28") })]);
  const { body } = await h.run();
  assert.deepStrictEqual([body.sent, h.marked.length], [0, 0]);
});

test("push sender mocks without keys and reports gone subscriptions", async () => {
  const { createSendPush } = require("../api/_lib/push.js");
  assert.deepStrictEqual(await createSendPush({})({ endpoint: "e" }, { title: "t" }), { mocked: true });
  const calls = [];
  const fake = code => ({ setVapidDetails: (...a) => calls.push(["vapid", ...a]), sendNotification: async (sub, body) => { calls.push(["send", sub.endpoint, JSON.parse(body).title]); if (code) throw Object.assign(new Error("x"), { statusCode: code }); } });
  const ok = createSendPush({ publicKey: "pub", privateKey: "priv", subject: "mailto:a@x.test", webpush: fake(0) });
  assert.deepStrictEqual(await ok({ endpoint: "e1", p256dh: "k", auth: "a" }, { title: "hi" }), { mocked: false });
  assert.deepStrictEqual(calls, [["vapid", "mailto:a@x.test", "pub", "priv"], ["send", "e1", "hi"]]);
  assert.deepStrictEqual(await createSendPush({ publicKey: "p", privateKey: "q", webpush: fake(410) })({ endpoint: "e" }, { title: "t" }), { gone: true });
  await assert.rejects(createSendPush({ publicKey: "p", privateKey: "q", webpush: fake(500) })({ endpoint: "e" }, { title: "t" }));
});

test("cron: free users with no free sessions left get no daily or win-back nudge, but still get the countdown", async () => {
  const used = { "2026-03-01": { answered: 3, done: true }, "2026-03-02": { answered: 3, done: true }, "2026-03-03": { answered: 3, done: true } };
  const h = harness([
    row("out", { progress: state({ days: used, lastDone: "2026-03-04" }) }),
    row("paid", { progress: state({ days: used, lastDone: "2026-03-04" }) }),
    row("soon", { progress: state({ days: used, lastDone: "2026-03-04", profile: { interviewDate: "2026-03-12", language: "js", company: null } }) })
  ], { paid: ["paid"] });
  await h.run();
  assert.deepStrictEqual(h.sent.map(m => m.to).sort(), ["paid@x.test", "soon@x.test"]);
  assert.match(h.sent.find(m => m.to === "soon@x.test").subject, /interview in 7 days/);
});

test("cron: a failed access check sends nothing and leaves the day unmarked", async () => {
  const h = harness([row("u1")], { accessFail: ["u1"] });
  const { body } = await h.run();
  assert.deepStrictEqual([h.sent.length, h.marked.length, body.skipped], [0, 0, 1]);
});

test("cron: a failed push lookup after the email still marks the day", async () => {
  const h = harness([row("u1", { push_enabled: true })], { subsFail: ["u1"] });
  await h.run();
  assert.deepStrictEqual([h.sent.length, h.marked.map(m => m[0])], [1, ["u1"]]);
});

test("cron: null progress still gets a reminder, and a mocked push doesn't count as sent", async () => {
  const h = harness([row("fresh", { progress: null }), row("mock", { reminders_enabled: false, push_enabled: true })], { subs: { mock: [{ endpoint: "mocked" }] }, mockPush: ["mocked"] });
  await h.run();
  assert.deepStrictEqual([h.sent.map(m => m.to), h.marked.map(m => m[0])], [["fresh@x.test"], ["fresh"]]);
});

test("cron: a day another run already claimed isn't sent again", async () => {
  const h = harness([row("u1"), row("u2")], { taken: ["u1"] });
  const { body } = await h.run();
  assert.deepStrictEqual([h.sent.map(m => m.to), body.sent, body.skipped], [["u2@x.test"], 1, 1]);
});
