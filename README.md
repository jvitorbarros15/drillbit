# Drillbit

Short daily sessions for algorithm patterns, plus system design practice. Take a diagnostic, see which patterns are shaky, then work through a three step session each day.

## What's inside

- **Diagnostic**: 8 questions across core patterns, no signup. Results show for every pattern it tested, with the mistake behind each miss. One question per pattern is a first signal, and the app says so.
- **Free repair**: a free user gets one repair sequence for the weakest paid pattern the diagnostic tested: the fix for their mistake, a recognition question and a different coding problem. The build ships one recognition item and one coding problem per diagnosed paid pattern for this.
- **Readiness map**: 13 algorithm patterns, each marked New, Learning, Shaky, Ready or Review due, with open misconceptions and the date of the latest evidence. Ready needs two different problems solved, then a coding problem solved alone (no hints, passing on the first test run) on a later day than the first win. The last unseen coding problem in each pattern is held back for that check. Once every problem has been seen, a retry of one never solved unaided counts, and is labeled a retry. Ready turns into Review due after 30 days. Click a pattern to open its guide.
- **Daily session**: three steps picked from your schedule: a review of something you missed, a recognition question, a concept guide or an exercise, and an independent check with no hints once you have solved something in the pattern. The session is fixed for the day, so a reload resumes where you left off. Finishing it extends your streak.
- **Misconception tracking**: a wrong answer is tagged with the mistake behind it, from the answer you picked, the failing test, or your own choice. Tagged misses come back after 1, 3 and 7 days until you get them right. A coding answer that passes after failing runs counts as practice, not an unaided solve; if a failing run showed a known mistake, it goes in the notebook and comes back in 3 days. Syntax and runtime errors don't count as conceptual misses.
- **Interview date**: optional. The plan shows a countdown, your current focus pattern, and a final review week.
- **Learn**: 18 study guides that cover every topic in the question bank. Each has the core idea, a code template, common traps, and a button to drill only that topic.
- **Interactive visualizers** inside the guides: a Big O growth lab, step-through binary search, sliding window, monotonic stack, min heap, BFS on a grid you can draw walls on, a coin change DP table, a back of the envelope estimator, an LRU cache simulator, and a consistent hashing ring with virtual nodes.
- **Practice**: five levels per track (L1 Warm-up to L5 Brutal). Clear 60% of a level to unlock the next one, separately for each track. Topic drills from the guides ignore locks. System design lives here and in Learn, and is not part of the daily session or the readiness map.
- **Real coding**: 32 challenges run in your browser against tests, with a 4 second time limit. Many tests use 100k+ inputs, so slow solutions fail.
- **Estimation drills**: back of the envelope questions (QPS, storage, bandwidth) that accept a sensible range.
- **Streak + freezes**: every 7 day streak earns a freeze (max 2). A freeze covers a missed day automatically.

Progress is saved in your browser's localStorage. Use Export / Import at the bottom of the home screen to move it between devices. Progress from the earlier version is migrated on first load.

## Accounts (optional)

The app works without an account, with progress in your browser. Sync replays each attempt by id, so work on two devices on the same day is kept. Progress claimed by one account is never merged into a different account that signs in on the same browser; it is set aside on the device until that account signs in again. The account page shows the last sync time and a Sync now button. To add sign-in and sync across devices:

1. Create a Supabase project.
2. Run every file in `supabase/migrations/` in name order in the SQL editor (or with the Supabase CLI).
3. In Authentication, Providers, enable Email and Google.
4. Copy `config.example.js` to `config.js` and fill in the project URL and the anon key. `config.js` is gitignored. The anon key is meant to be public, row level security protects the data.
5. In Authentication, URL Configuration, add the site URL you serve the app from (for example `http://localhost:8000` locally and your deployed URL) to the redirect URLs, since sign-in links and Google return there.

Without `config.js` nothing account related loads. With it, the page loads `@supabase/supabase-js` 2.117.1 from jsDelivr.

## Payments (Sprint Pass, test mode first)

A 30 day Sprint Pass is sold through Stripe Checkout (`mode: "payment"`). Access is granted only by the webhook, never by the success page, and stored in the `entitlements` table. Buying again extends access from the current expiry. A full refund or a dispute revokes it.

Server routes live in `api/`: `checkout.js` (needs a Supabase access token), `stripe-webhook.js` and `access.js`.

1. Run every migration in `supabase/migrations/`.
2. In Stripe (test mode), create a one-time Price for the pass.
3. Use a restricted key (`rk_test_...`) instead of the full secret key, with only Checkout Sessions: write and Prices: read. Store it, and every other value below, in Vercel environment variables. Never commit them. `.env.example` lists the names.
4. Create a webhook endpoint at `<APP_URL>/api/stripe-webhook` listening for exactly these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed` (logged only)
   - `charge.refunded`
   - `charge.dispute.created`
5. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SPRINT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `APP_URL` (no trailing slash). The service role key bypasses RLS, so keep it server side only.

## Free and paid content

`npm run build` writes `public/` (gitignored), which is what Vercel serves. The public bundle (`content-free.js`) holds only the free lessons (the diagnostic questions plus every Hashing and Two pointers question) and the full Hashing and Two pointers guides. Every other guide is a stub with no body. Paid lessons and guides are returned by `api/content.js` only to a signed-in user with an active pass. The root `index.html` is the dev mode with all content and no gating.

The Sprint Pass is $29, one-time, for 30 days of full access. Free: the diagnostic, the first 3 completed sessions, and unlimited Hashing and Two pointers. Refunds are handled in the Stripe dashboard: a full refund for any reason within 7 days of purchase. The webhook revokes access on a full refund.

For the build, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` so it writes `public/config.js`.

## Run locally

No build step. Any static server works (the code runner uses a Web Worker, so opening the file directly won't run code):

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Deploy to Vercel

Option A, CLI:

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

Option B, GitHub: push this folder to a repo, then on vercel.com click Add New > Project, import the repo, set Framework Preset to "Other", leave the build command empty, and deploy.

## Files

- `data.js`: the question bank
- `guides.js`: study guides
- `viz.js`: interactive widgets used by the guides
- `patterns.js`: the algorithm patterns and their misconception tags
- `core.js`: learning logic (misses, schedule, readiness, session)
- `auth.js`: optional Supabase sign-in and sync
- `api/`: checkout, Stripe webhook, access check and gated content (Vercel functions)
- `scripts/build.js`: builds the free `public/` bundle
- `.env.example`: server environment variable names
- `config.example.js`: template for `config.js`
- `analytics.js`: optional PostHog events, off without a key or when Do Not Track is on
- `api/cron-reminders.js`, `api/unsubscribe.js`: daily reminder emails and one-click unsubscribe
- `terms.html`, `privacy.html`, `refund.html`: legal pages
- `supabase/`: the migrations and the test bootstrap for them
- `app.js`: the UI
- `styles.css`, `learn.css`: styles

## Add your own questions

Copy an existing item in `data.js`, give it a unique `id`, a `track` (`algo` or `sd`), a `level` (1 to 5) and a `topic`. Types:

- `mcq`: `options` + `answer` (index)
- `multi`: `options` + `answers` (array of indexes)
- `number`: `answer`, `min`, `max`, `unit`
- `code`: `fn`, `starter`, `tests` (`args` + `expected`, or `argsCode` / `expectedCode` for big generated inputs), `solution`, `hint`

Every topic must be listed in some guide's `topics` in `guides.js`, so missed questions can link to a guide.

## Add a guide

Add an entry to `guides.js` with `id`, `track`, `title`, `topics`, `summary` and `body`. The body supports `## ` headings, `- ` bullets, `~~~` code fences, inline code, `**bold**`, and `::viz name` to drop in a widget from `viz.js`.

Then run `npm test`. CI runs it on every push and pull request. It validates every lesson and guide against a strict schema (unknown keys fail), runs every reference solution against its tests and checks that each starter fails its own tests and the guides (topic coverage, code fences, widget names):

```bash
npm test
```

## Legal pages

`terms.html`, `privacy.html` and `refund.html` are templates, not legal advice. Fill in the bracketed placeholders (`[Operator legal name]`, `[Support email]`, `[Mailing address]`, `[Governing law jurisdiction]`) and have them reviewed before launch.

## Analytics

Set `POSTHOG_KEY` (and optionally `POSTHOG_HOST`) at build time for the browser events and in the server environment for the webhook events. Without a key every call is a no-op.

## Reminder emails

Users can turn on one email a day at an hour they pick (account page). Emails go out through Resend. Without `RESEND_API_KEY` the sender only logs, so everything runs locally. The privacy page already mentions Resend.

1. In Resend, add and verify your sending domain (the DNS records Resend shows you), then create an API key.
2. Set these on the server: `RESEND_API_KEY`, `RESEND_FROM` (for example `Drillbit <reminders@yourdomain.com>`), `UNSUBSCRIBE_SECRET` (a long random string; changing it invalidates old unsubscribe links), `CRON_SECRET` (another long random string) and `APP_URL`.
3. Apply `supabase/migrations/20261029010000_reminders.sql`.
4. Vercel Hobby crons run once a day, so call the endpoint every hour from Supabase instead. Enable the `pg_cron` and `pg_net` extensions, then run this yourself in the SQL editor with your real URL and secret:

```sql
select cron.schedule(
  'drillbit-reminders',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://YOUR-APP.vercel.app/api/cron-reminders',
       headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET', 'Content-Type', 'application/json'),
       body := '{}'::jsonb
     ) $$
);
```

The endpoint sends to users whose local hour equals their chosen hour, at most once per local day, and skips anyone who already finished today's session.
