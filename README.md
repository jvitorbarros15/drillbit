# Drillbit

Daily reps for algorithms and system design. Study a topic, play with it, then drill it. Five challenges a day, five levels per track, a streak to protect.

## What's inside

- **Learn**: 18 study guides that cover every topic in the question bank. Each has the core idea, a code template, common traps, and a button to drill only that topic. Reading one is worth 20 XP.
- **Interactive visualizers** inside the guides: a Big O growth lab, step-through binary search, sliding window, monotonic stack, min heap, BFS on a grid you can draw walls on, a coin change DP table, a back of the envelope estimator, an LRU cache simulator, and a consistent hashing ring with virtual nodes.
- **Daily run**: 5 challenges picked for your current level (2 algorithm, 2 system design, plus a review of something you missed). Finishing it extends your streak.
- **Weak spot**: the home screen points you to the guide for the topic you've missed most.
- **Streak + freezes**: every 7 day streak earns a freeze (max 2). A freeze covers a missed day automatically.
- **Levels**: L1 Warm-up, L2 Solid, L3 Hard, L4 Senior, L5 Brutal. Clear 60% of a level to unlock the next one, separately for each track. Topic drills from the guides ignore locks.
- **Real coding**: 32 challenges run in your browser against tests, with a 4 second time limit. Many tests use 100k+ inputs, so slow solutions fail.
- **Estimation drills**: back of the envelope questions (QPS, storage, bandwidth) that accept a sensible range.
- **Review queue**: anything you miss comes back after 1, 3, 7 and 16 days until you get it right.
- **XP and ranks**: Intern, Junior, Mid-level, Senior, Staff, Principal, Distinguished. Combos and streaks multiply XP.

Progress is saved in your browser's localStorage. Use Export / Import at the bottom of the home screen to move it between devices.

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
- `app.js`: the app
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

Then run the checker. It runs every reference solution against its tests and checks the guides (topic coverage, code fences, widget names):

```bash
node scripts/verify.js
```
