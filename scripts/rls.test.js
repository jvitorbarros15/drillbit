const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const read = p => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

let db;
test.before(async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  db = new PGlite();
  await db.exec(read("supabase/test/auth-stub.sql"));
  await db.exec(read("supabase/migrations/20261023000000_init.sql"));
  await db.exec(read("supabase/migrations/20261029000000_entitlement_functions.sql"));
  await db.exec(read("supabase/migrations/20261029010000_reminders.sql"));
  await db.exec(read("supabase/migrations/20261030000000_attempt_detail.sql"));
  await db.exec(read("supabase/migrations/20261030010000_push.sql"));
  await db.exec(read("supabase/migrations/20261031000000_attempt_plan.sql"));
  await db.exec(`
    insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test');
    insert into public.attempts (user_id, item_id, correct) values ('${A}', 'q1', true), ('${B}', 'q2', false);
    insert into public.review_queue (user_id, item_id, due_at, interval_days) values
      ('${A}', 'hashing.m1', '2026-11-01', 1), ('${B}', 'dp.m1', '2026-11-02', 3);
    insert into public.entitlements (user_id, product, starts_at, expires_at, stripe_session_id) values
      ('${A}', 'pro', now() - interval '1 day', now() + interval '30 days', 'cs_a'),
      ('${B}', 'pro', now() - interval '1 day', now() + interval '30 days', 'cs_b');
  `);
});
test.after(() => db.close());
test.afterEach(() => db.exec("reset role"));

const as = async (uid, role = "authenticated") => {
  await db.exec(`set role ${role}`);
  await db.exec(uid ? `set request.jwt.claim.sub = '${uid}'` : "reset request.jwt.claim.sub");
};
const rows = async sql => (await db.query(sql)).rows;

test("trigger creates a profile for each new user", async () => {
  const r = await rows("select id from public.profiles order by id");
  assert.deepStrictEqual(r.map(x => x.id), [A, B]);
});

test("each user sees only their own rows in every table", async () => {
  await as(A);
  for (const t of ["profiles", "attempts", "review_queue", "entitlements"]) {
    const r = await rows(`select * from public.${t}`);
    assert.strictEqual(r.length, 1, t);
    assert.strictEqual(r[0].user_id || r[0].id, A, t);
  }
  await as(B);
  const r = await rows("select item_id from public.review_queue");
  assert.deepStrictEqual(r.map(x => x.item_id), ["dp.m1"]);
});

test("A cannot update B's profile", async () => {
  await as(A);
  const r = await db.query(`update public.profiles set language = 'py' where id = '${B}'`);
  assert.strictEqual(r.affectedRows, 0);
  const own = await db.query(`update public.profiles set language = 'js' where id = '${A}'`);
  assert.strictEqual(own.affectedRows, 1);
});

test("A cannot insert an attempt for B but can for self", async () => {
  await as(A);
  await assert.rejects(db.query(`insert into public.attempts (user_id, item_id, correct) values ('${B}', 'q', true)`), /row-level security/);
  await db.query("insert into public.attempts (item_id, correct) values ('q3', false)");
  assert.strictEqual((await rows("select * from public.attempts")).length, 2);
});

test("attempts record how the attempt went", async () => {
  await as(A);
  await db.query("insert into public.attempts (item_id, correct, client_id, first_run, failed_runs, error_runs, hinted, revealed) values ('q4', true, 'c1', 'fail', 2, 1, false, false)");
  const r = (await rows("select first_run, failed_runs, error_runs from public.attempts where item_id = 'q4'"))[0];
  assert.deepStrictEqual([r.first_run, r.failed_runs, r.error_runs], ["fail", 2, 1]);
  await assert.rejects(db.query("insert into public.attempts (item_id, correct, first_run) values ('q5', true, 'maybe')"), /check constraint/);
  await assert.rejects(db.query("insert into public.attempts (item_id, correct, failed_runs) values ('q5', true, -1)"), /check constraint/);
  await db.query("insert into public.attempts (item_id, correct, planned) values ('q6', true, false), ('q7', true, null)");
  const p = await rows("select item_id, planned from public.attempts where item_id in ('q6', 'q7') order by item_id");
  assert.deepStrictEqual(p.map(r => r.planned), [false, null]);
});

test("push subscriptions: own insert, select and delete only", async () => {
  await as(A);
  await db.query("insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.test/a', 'k', 's')");
  await assert.rejects(db.query(`insert into public.push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://push.test/x', '${B}', 'k', 's')`), /row-level security/);
  assert.strictEqual((await rows("select * from public.push_subscriptions")).length, 1);
  assert.strictEqual((await db.query("update public.push_subscriptions set auth = 'z'")).affectedRows, 0, "no update policy");
  await as(B);
  assert.strictEqual((await rows("select * from public.push_subscriptions")).length, 0);
  assert.strictEqual((await db.query("delete from public.push_subscriptions")).affectedRows, 0);
  await as(A);
  assert.strictEqual((await db.query(`update public.profiles set push_enabled = true where id = '${A}'`)).affectedRows, 1);
  assert.strictEqual((await db.query("delete from public.push_subscriptions")).affectedRows, 1);
});

test("attempts cannot be updated or deleted", async () => {
  await as(A);
  assert.strictEqual((await db.query("update public.attempts set correct = false")).affectedRows, 0);
  assert.strictEqual((await db.query("delete from public.attempts")).affectedRows, 0);
});

test("review_queue allows own insert, update and delete only", async () => {
  await as(A);
  await db.query("insert into public.review_queue (item_id, due_at, interval_days) values ('x.m1', '2026-11-05', 1)");
  assert.strictEqual((await db.query("update public.review_queue set interval_days = 7")).affectedRows, 2);
  assert.strictEqual((await db.query(`delete from public.review_queue where user_id = '${B}'`)).affectedRows, 0);
  assert.strictEqual((await db.query("delete from public.review_queue where item_id = 'x.m1'")).affectedRows, 1);
  await assert.rejects(db.query(`insert into public.review_queue (user_id, item_id, due_at, interval_days) values ('${B}', 'y', '2026-11-05', 1)`), /row-level security/);
});

test("A cannot insert, update or delete entitlements, even their own", async () => {
  await as(A);
  await assert.rejects(db.query(`insert into public.entitlements (user_id, product, starts_at, expires_at, stripe_session_id) values ('${A}', 'pro', now(), now() + interval '1 day', 'cs_new')`), /row-level security|permission denied/);
  assert.strictEqual((await db.query("update public.entitlements set expires_at = now() + interval '999 days'")).affectedRows, 0);
  assert.strictEqual((await db.query("delete from public.entitlements")).affectedRows, 0);
});

test("A can set their own reminder fields but not B's", async () => {
  await as(A);
  const own = await db.query(`update public.profiles set reminders_enabled = true, reminder_hour = 8, timezone = 'America/New_York' where id = '${A}'`);
  assert.strictEqual(own.affectedRows, 1);
  const other = await db.query(`update public.profiles set reminders_enabled = true, reminder_hour = 8, timezone = 'UTC' where id = '${B}'`);
  assert.strictEqual(other.affectedRows, 0);
  await assert.rejects(db.query(`update public.profiles set reminder_hour = 24 where id = '${A}'`), /check/);
  await db.exec("reset role");
  const r = await rows(`select id, reminders_enabled, reminder_hour from public.profiles order by id`);
  assert.deepStrictEqual(r, [{ id: A, reminders_enabled: true, reminder_hour: 8 }, { id: B, reminders_enabled: false, reminder_hour: null }]);
});

test("anon sees nothing from any table", async () => {
  await as(null, "anon");
  for (const t of ["profiles", "attempts", "review_queue", "entitlements", "push_subscriptions"]) {
    assert.strictEqual((await rows(`select * from public.${t}`)).length, 0, t);
  }
});

test("authenticated and anon cannot execute has_access", async () => {
  await as(A);
  await assert.rejects(db.query(`select public.has_access('${A}')`), /permission denied/);
  await as(null, "anon");
  await assert.rejects(db.query(`select public.has_access('${A}')`), /permission denied/);
});

test("service_role has_access: active true, revoked false, expired false", async () => {
  await as(null, "service_role");
  assert.strictEqual((await rows(`select public.has_access('${A}') as ok`))[0].ok, true);
  await db.exec("reset role");
  await db.exec(`update public.entitlements set revoked_at = now() where user_id = '${A}'`);
  await as(null, "service_role");
  assert.strictEqual((await rows(`select public.has_access('${A}') as ok`))[0].ok, false);
  await db.exec("reset role");
  await db.exec(`update public.entitlements set revoked_at = null, expires_at = now() - interval '1 hour' where user_id = '${A}'`);
  await as(null, "service_role");
  assert.strictEqual((await rows(`select public.has_access('${A}') as ok`))[0].ok, false);
  assert.strictEqual((await rows(`select public.has_access('${B}') as ok`))[0].ok, true);
});

const C = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const D = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const grant = (u, session, pi = "pi_x") => db.query(`select public.grant_entitlement('${u}', '${session}', '${pi}', 'sprint_30', 30)`);
const asService = () => as(null, "service_role");

test("grant_entitlement creates a 30 day row", async () => {
  await db.exec(`insert into auth.users (id, email) values ('${C}', 'c@x.test'), ('${D}', 'd@x.test')`);
  await asService();
  await grant(C, "cs_c1", "pi_c1");
  const r = await rows(`select extract(epoch from expires_at - starts_at) / 86400 as d, product, stripe_payment_intent as pi from public.entitlements where user_id = '${C}'`);
  assert.deepStrictEqual(r.map(x => [Number(x.d), x.product, x.pi]), [[30, "sprint_30", "pi_c1"]]);
  assert.strictEqual((await rows(`select public.has_access('${C}') as ok`))[0].ok, true);
});

test("grant_entitlement is idempotent on the session id", async () => {
  await asService();
  await grant(C, "cs_c1", "pi_c1");
  await grant(C, "cs_c1", "pi_c1");
  assert.strictEqual((await rows(`select * from public.entitlements where user_id = '${C}'`)).length, 1);
});

test("a second session starts at the first one's expiry", async () => {
  await asService();
  await grant(C, "cs_c2", "pi_c2");
  const r = await rows(`select stripe_session_id as s, starts_at, expires_at from public.entitlements where user_id = '${C}' order by id`);
  assert.strictEqual(r.length, 2);
  assert.strictEqual(+r[1].starts_at, +r[0].expires_at);
  assert.strictEqual(Math.round((r[1].expires_at - r[1].starts_at) / 86400000), 30);
});

test("concurrent grants for one user stay consistent", async () => {
  await asService();
  await Promise.all([grant(D, "cs_d1", "pi_d1"), grant(D, "cs_d1", "pi_d1"), grant(D, "cs_d2", "pi_d2")]);
  const r = await rows(`select stripe_session_id as s from public.entitlements where user_id = '${D}'`);
  assert.deepStrictEqual(r.map(x => x.s).sort(), ["cs_d1", "cs_d2"]);
});

test("revoke_entitlement sets revoked_at and has_access turns false", async () => {
  await asService();
  assert.strictEqual((await rows("select public.revoke_entitlement('pi_d1') as n"))[0].n, 1);
  assert.strictEqual((await rows("select public.revoke_entitlement('pi_d1') as n"))[0].n, 0);
  assert.strictEqual((await rows(`select count(*)::int as n from public.entitlements where stripe_payment_intent = 'pi_d1' and revoked_at is not null`))[0].n, 1);
  await db.exec(`update public.entitlements set revoked_at = now() where user_id = '${D}'`);
  assert.strictEqual((await rows(`select public.has_access('${D}') as ok`))[0].ok, false);
});

test("grant and revoke are not executable by authenticated or anon", async () => {
  for (const [uid, role] of [[A, "authenticated"], [null, "anon"]]) {
    await as(uid, role);
    await assert.rejects(grant(A, "cs_evil"), /permission denied/);
    await assert.rejects(db.query("select public.revoke_entitlement('pi_x')"), /permission denied/);
    await db.exec("reset role");
  }
});
