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

test("anon sees nothing from any table", async () => {
  await as(null, "anon");
  for (const t of ["profiles", "attempts", "review_queue", "entitlements"]) {
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
