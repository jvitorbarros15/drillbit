# Drillbit

Short daily sessions for algorithm patterns, plus system design practice. Take a diagnostic, see which patterns are shaky, then work through a three step session each day.

## What's inside

- **Diagnostic**: 8 questions across core patterns, no signup. It produces a readiness map and sets where your plan starts.
- **Readiness map**: 13 algorithm patterns, each marked New, Learning, Shaky or Ready, with a count of open misconceptions. Click a pattern to open its guide. Patterns without questions yet say "Coming soon".
- **Daily session**: three steps picked from your schedule: a review of something you missed, a recognition question, a concept guide or an exercise, and an independent check with no hints once you have solved something in the pattern. The session is fixed for the day, so a reload resumes where you left off. Finishing it extends your streak.
- **Misconception tracking**: a wrong answer is tagged with the mistake behind it, from the answer you picked, the failing test, or your own choice. Tagged misses come back after 1, 3 and 7 days until you get them right.
- **Interview date**: optional. The plan shows a countdown, your current focus pattern, and a final review week.
- **Learn**: 18 study guides that cover every topic in the question bank. Each has the core idea, a code template, common traps, and a button to drill only that topic.
- **Interactive visualizers** inside the guides: a Big O growth lab, step-through binary search, sliding window, monotonic stack, min heap, BFS on a grid you can draw walls on, a coin change DP table, a back of the envelope estimator, an LRU cache simulator, and a consistent hashing ring with virtual nodes.
- **Practice**: five levels per track (L1 Warm-up to L5 Brutal). Clear 60% of a level to unlock the next one, separately for each track. Topic drills from the guides ignore locks. System design lives here and in Learn, and is not part of the daily session or the readiness map.
- **Real coding**: 32 challenges run in your browser against tests, with a 4 second time limit. Many tests use 100k+ inputs, so slow solutions fail.
- **Estimation drills**: back of the envelope questions (QPS, storage, bandwidth) that accept a sensible range.
- **Streak + freezes**: every 7 day streak earns a freeze (max 2). A freeze covers a missed day automatically.

Progress is saved in your browser's localStorage. Use Export / Import at the bottom of the home screen to move it between devices. Progress from the earlier version is migrated on first load.

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
