(() => {
  "use strict";

  // ---------- constants ----------
  const LESSONS = window.LESSONS;
  const BY_ID = Object.fromEntries(LESSONS.map(l => [l.id, l]));
  const GUIDES = window.GUIDES;
  const GUIDE_BY_ID = Object.fromEntries(GUIDES.map(g => [g.id, g]));
  const GUIDE_FOR = {};
  GUIDES.forEach(g => g.topics.forEach(t => (GUIDE_FOR[t] = g)));
  const PATTERNS = window.PATTERNS;
  const PAT_BY_ID = Object.fromEntries(PATTERNS.map(p => [p.id, p]));
  const MISC = {};
  PATTERNS.forEach(p => p.misconceptions.forEach(m => (MISC[m.id] = m)));
  const CORE = window.CORE;
  const ctx = { lessons: LESSONS, patterns: PATTERNS, guides: GUIDES };
  const KEY = "drillbit.v2";
  const OLD_KEY = "goatgym.v1";
  const LEVEL_NAMES = ["", "Warm-up", "Solid", "Hard", "Senior", "Brutal"];
  const TRACKS = { algo: "Algorithms", sd: "System Design" };
  const UNLOCK = 0.6;          // share of a level you must clear to unlock the next
  const MAX_FREEZES = 2;
  const TIME_LIMIT = 4000;
  const KIND = { review: "Review", recognition: "Recognition", concept: "Concept", exercise: "Exercise" };
  const STATUS = { new: "New", learning: "Learning", shaky: "Shaky", ready: "Ready" };

  // ---------- state ----------
  const today = () => CORE.fmt(new Date());
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return CORE.migrate(JSON.parse(raw));
      const old = localStorage.getItem(OLD_KEY);
      if (old) {
        const s = CORE.migrate(JSON.parse(old));
        localStorage.setItem(KEY, JSON.stringify(s));
        return s;
      }
    } catch (e) { /* private mode or bad json */ }
    return CORE.blankState();
  }
  function save() { S.updatedAt = new Date().toISOString(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  let notice = null;
  function reconcileStreak() {
    const t = today();
    if (!S.lastDone || S.lastDone === t) return;
    const gap = CORE.diffDays(t, S.lastDone);
    if (gap <= 1) return;
    const missed = gap - 1;
    if (S.streak > 0 && S.freezes >= missed) {
      for (let i = 1; i <= missed; i++) {
        const d = CORE.addDays(S.lastDone, i);
        S.days[d] = Object.assign({}, S.days[d], { frozen: true });
      }
      S.freezes -= missed;
      S.lastDone = CORE.addDays(t, -1);
      notice = { kind: "ice", text: `Streak saved. ${missed} freeze${missed > 1 ? "s" : ""} melted to cover the days you missed.` };
    } else if (S.streak > 0) {
      notice = { kind: "bad", text: `Your ${S.streak} day streak ended. Start a new one today.` };
      S.streak = 0;
    }
    save();
  }

  // ---------- helpers ----------
  const $ = sel => document.querySelector(sel);
  const app = $("#app");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rich = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\n/g, "<br>");
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
  const num = n => n.toLocaleString("en-US");
  const weekday = d => CORE.parse(d).toLocaleDateString("en-US", { weekday: "long" });

  function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const cleared = id => !!(S.items[id] && S.items[id].correct > 0);
  function levelStats(track, level) {
    const items = LESSONS.filter(l => l.track === track && l.level === level);
    return { done: items.filter(l => cleared(l.id)).length, total: items.length };
  }
  function unlockedLevel(track) {
    let L = 1;
    while (L < 5) {
      const s = levelStats(track, L);
      if (s.total && s.done / s.total >= UNLOCK) L++; else break;
    }
    return L;
  }

  // ---------- code runner (Web Worker, killed on timeout) ----------
  const WORKER_SRC = `
    function eq(a, b) {
      if (a === b) return true;
      if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
      if (a && b && typeof a === 'object' && typeof b === 'object') {
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        const ka = Object.keys(a), kb = Object.keys(b);
        return ka.length === kb.length && ka.every(k => eq(a[k], b[k]));
      }
      return false;
    }
    function show(v) {
      let s;
      try { s = JSON.stringify(v); } catch (e) { s = String(v); }
      if (s === undefined) s = String(v);
      return s.length > 140 ? s.slice(0, 140) + ' ...' : s;
    }
    const logs = [];
    console.log = (...a) => { if (logs.length < 40) logs.push(a.map(x => typeof x === 'string' ? x : show(x)).join(' ')); };
    self.onmessage = (e) => {
      const { code, fn, tests } = e.data;
      let f;
      try { f = new Function(code + '\\n;return typeof ' + fn + ' === "function" ? ' + fn + ' : undefined;')(); }
      catch (err) { self.postMessage({ error: 'Syntax error: ' + err.message }); return; }
      if (typeof f !== 'function') { self.postMessage({ error: 'Could not find a function named ' + fn + '. Keep the original function name.' }); return; }
      const results = [];
      for (const t of tests) {
        const args = t.argsCode ? (new Function('return ' + t.argsCode))() : JSON.parse(JSON.stringify(t.args));
        const expected = t.expectedCode ? (new Function('return ' + t.expectedCode))() : t.expected;
        const label = t.label || show(t.args).slice(1, -1);
        const start = performance.now();
        try {
          const out = f(...args);
          results.push({ pass: eq(out, expected), got: show(out), expected: show(expected), ms: performance.now() - start, label });
        } catch (err) {
          results.push({ pass: false, err: String(err && err.message || err), expected: show(expected), label });
        }
      }
      self.postMessage({ results, logs });
    };`;
  let workerUrl = null;
  function runInWorker(code, item) {
    if (!workerUrl) workerUrl = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    return new Promise(resolve => {
      let w;
      try { w = new Worker(workerUrl); } catch (e) { resolve({ error: "Your browser blocked the code runner. Serve the site over http(s) instead of opening the file directly." }); return; }
      const timer = setTimeout(() => { w.terminate(); resolve({ error: `Time limit exceeded (${TIME_LIMIT / 1000}s). Infinite loop, or too slow for the big test?` }); }, TIME_LIMIT);
      w.onmessage = e => { clearTimeout(timer); w.terminate(); resolve(e.data); };
      w.onerror = e => { clearTimeout(timer); w.terminate(); e.preventDefault(); resolve({ error: e.message || "Runtime error" }); };
      w.postMessage({ code, fn: item.fn, tests: item.tests });
    });
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---------- top chips ----------
  function renderChips() {
    const doneToday = S.lastDone === today();
    const left = CORE.schedule(S, ctx, today()).daysLeft;
    const date = left !== null && left > 0
      ? `<button class="chip" data-act="set-date" title="Change interview date"><b>${left}</b> day${left > 1 ? "s" : ""} to interview</button>`
      : `<button class="chip" data-act="set-date">Set interview date</button>`;
    $("#chips").innerHTML = `
      <span class="chip flame ${doneToday ? "lit" : ""}" title="Day streak">${flameSvg()}<b>${S.streak}</b></span>
      <span class="chip ice" title="Streak freezes">${iceSvg()}<b>${S.freezes}</b></span>
      ${date}`;
  }
  const flameSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>`;
  const iceSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  // ---------- home ----------
  function heatmap() {
    const t = today();
    const weeks = 52;
    const dow = CORE.parse(t).getDay();
    const start = CORE.addDays(t, -(7 * (weeks - 1) + dow));
    let cells = "";
    for (let w = 0; w < weeks; w++) {
      cells += `<div class="hm-col">`;
      for (let d = 0; d < 7; d++) {
        const day = CORE.addDays(start, w * 7 + d);
        const info = S.days[day];
        const n = (info && info.answered) || 0;
        let cls = "";
        if (CORE.diffDays(day, t) > 0) cls = "future";
        else if (info && info.frozen && !n) cls = "frozen";
        else if (n) cls = n >= 12 ? "h4" : n >= 8 ? "h3" : n >= 4 ? "h2" : "h1";
        if (day === t) cls += " today";
        const tip = info ? `${day}: ${n} answered${info.frozen ? " (freeze)" : ""}` : day;
        cells += `<span class="hm ${cls}" title="${tip}"></span>`;
      }
      cells += `</div>`;
    }
    return `<div class="heatmap">${cells}</div>`;
  }

  function trackPanel(track) {
    const top = unlockedLevel(track);
    let rows = "";
    for (let L = 1; L <= 5; L++) {
      const s = levelStats(track, L);
      const locked = L > top;
      const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
      rows += `
        <button class="lvl-row ${locked ? "locked" : ""} ${L === top ? "current" : ""}" data-act="practice" data-track="${track}" data-level="${L}" ${locked ? 'aria-disabled="true"' : ""}>
          <span class="lvl-num">L${L}</span>
          <span class="lvl-main">
            <span class="lvl-name">${LEVEL_NAMES[L]}${locked ? ` <em>clear ${Math.round(UNLOCK * 100)}% of L${L - 1} to unlock</em>` : ""}</span>
            <span class="bar"><span style="width:${pct}%"></span></span>
          </span>
          <span class="lvl-count">${s.done}/${s.total}</span>
        </button>`;
    }
    return `
      <section class="panel track ${track}">
        <div class="panel-head">
          <h3>${TRACKS[track]}</h3>
          <span class="muted">Level ${top} unlocked</span>
        </div>
        ${rows}
      </section>`;
  }

  function phaseLine() {
    const sch = CORE.schedule(S, ctx, today());
    if (sch.phase === "final-review") return "Final review week.";
    if (sch.phase === "past") return "Interview day has passed. Set a new date or keep practicing.";
    const p = PAT_BY_ID[sch.current];
    return p ? `Current focus: ${esc(p.name)}. ${sch.remaining} pattern${sch.remaining === 1 ? "" : "s"} left.` : "";
  }

  const kindLabel = e => (e.independent ? "Independent check" : KIND[e.kind]);
  const entryTitle = e => (e.kind === "concept" ? PAT_BY_ID[e.patternId].name : BY_ID[e.lessonId].title);
  function sessionRows(entries, done) {
    return `<ol class="sess-list">${entries.map((e, i) => {
      const r = done[i];
      const state = !r ? "" : r.correct === null ? "Read" : r.correct ? "Correct" : "Missed";
      return `<li class="sess-row ${r ? "done" : ""}"><span class="tag">${kindLabel(e)}</span><span class="sess-title">${esc(entryTitle(e))}</span><span class="muted small">${state}</span></li>`;
    }).join("")}</ol>`;
  }

  function readinessPanel() {
    const cells = CORE.readiness(S, ctx, today()).map(r => {
      const g = GUIDE_BY_ID[PAT_BY_ID[r.id].guide];
      const inner = r.hasContent
        ? `<span class="rd-name">${esc(r.name)}</span><span class="rd-status"><i class="rd-dot"></i>${STATUS[r.status]}</span>${r.openMisses ? `<span class="muted small">${r.openMisses} open miss${r.openMisses > 1 ? "es" : ""}</span>` : ""}`
        : `<span class="rd-name">${esc(r.name)}</span><span class="muted small">Coming soon</span>`;
      const cls = `rd-cell ${r.hasContent ? r.status : "soon"}`;
      return g ? `<button class="${cls}" data-act="guide" data-id="${g.id}">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
    }).join("");
    return `
      <section class="panel">
        <div class="panel-head"><h3>Readiness map</h3><span class="muted small">${PATTERNS.length} patterns</span></div>
        <div class="rd-grid">${cells}</div>
      </section>`;
  }

  function getSession() {
    const t = today();
    const day = S.days[t] || (S.days[t] = { answered: 0, correct: 0 });
    if (!day.session) { day.session = { entries: CORE.composeSession(S, ctx, t), done: [] }; save(); }
    return day.session;
  }

  function renderHome() {
    run = null; cur = null;
    setNav("home");
    renderChips();
    const t = today();
    const doneToday = S.lastDone === t;
    const sess = S.diagnostic ? getSession() : null;
    const progress = sess ? sess.done.length : 0;
    const totalAnswered = Object.values(S.items).reduce((a, v) => a + v.seen, 0);
    const totalCorrect = Object.values(S.items).reduce((a, v) => a + v.correct, 0);
    const acc = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const mastered = LESSONS.filter(l => cleared(l.id)).length;
    const phase = S.diagnostic ? phaseLine() : "";

    let title, sub, cta;
    if (!S.diagnostic) {
      title = "Find your weak patterns.";
      sub = "8 questions, about 10 minutes, no signup";
      cta = `<button class="btn big primary" data-act="diag">Start diagnostic</button>`;
    } else if (doneToday) {
      title = "Locked in for today.";
      sub = "Today's session is done. The flame is safe until tomorrow.";
      cta = `<button class="btn big ghost" data-act="practice-nav">Practice</button>`;
    } else if (progress) {
      title = S.streak ? "Keep the flame alive." : "Day one starts now.";
      sub = "You're mid-session. Finish it to keep the streak.";
      cta = `<button class="btn big primary" data-act="session">Continue session (${progress}/${sess.entries.length})</button>`;
    } else {
      title = S.streak ? "Keep the flame alive." : "Day one starts now.";
      sub = `${sess.entries.length} steps picked from what you missed and what's next.`;
      cta = `<button class="btn big primary" data-act="session">Start session</button>`;
    }

    app.innerHTML = `
      ${notice ? `<div class="notice ${notice.kind}">${esc(notice.text)}</div>` : ""}
      <section class="hero">
        <div class="hero-flame-wrap">
          <div class="hero-flame ${doneToday ? "lit" : ""}">${flameSvg()}<b>${S.streak}</b></div>
          <span class="hero-label">day streak</span>
        </div>
        <div class="hero-main">
          <p class="eyebrow">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
          <h1>${title}</h1>
          <p class="muted">${sub}</p>
          ${phase ? `<p class="muted">${phase}</p>` : ""}
          <div class="hero-cta">${cta}</div>
        </div>
      </section>

      <section class="stats">
        <div class="stat"><span class="muted">Best streak</span><b>${S.best}</b></div>
        <div class="stat"><span class="muted">Freezes</span><b>${S.freezes}/${MAX_FREEZES}</b><span class="muted small">earn 1 every 7 days</span></div>
        <div class="stat"><span class="muted">Accuracy</span><b>${acc}%</b></div>
        <div class="stat"><span class="muted">Cleared</span><b>${mastered}/${LESSONS.length}</b></div>
      </section>

      ${sess ? `
      <section class="panel">
        <div class="panel-head"><h3>Today's session</h3><span class="muted small">${progress}/${sess.entries.length} done</span></div>
        ${sessionRows(sess.entries, sess.done)}
      </section>` : ""}

      ${readinessPanel()}

      <section class="panel">
        <div class="panel-head"><h3>Last 12 months</h3><span class="muted small">brighter = more answered, blue = freeze</span></div>
        ${heatmap()}
      </section>

      <footer class="foot">
        <button class="link" data-act="export">Export progress</button>
        <button class="link" data-act="import">Import progress</button>
        <button class="link danger" data-act="reset">Reset</button>
        <span class="muted small">Progress lives in this browser. Export it to move devices.</span>
      </footer>`;
    notice = null;
    const hm = document.querySelector(".heatmap");
    if (hm) hm.scrollLeft = hm.scrollWidth;
  }

  function renderPractice() {
    run = null; cur = null;
    setNav("practice");
    renderChips();
    app.innerHTML = `
      <section class="learn-head">
        <p class="eyebrow">Practice</p>
        <h1>Pick a level.</h1>
        <p class="muted">Clear ${Math.round(UNLOCK * 100)}% of a level to unlock the next one, separately for each track. Topic drills are at the end of each guide.</p>
      </section>
      <div class="tracks">
        ${trackPanel("algo")}
        ${trackPanel("sd")}
      </div>`;
  }

  // ---------- runs ----------
  let run = null;   // { mode, label, entries, idx, results, answers?, sess?, before? }
  let cur = null;   // current entry state

  function setNav(view) {
    document.querySelectorAll("[data-nav]").forEach(b => b.classList.toggle("on", b.dataset.nav === view));
  }

  // ---------- learn ----------
  const guideLessons = g => LESSONS.filter(l => g.topics.includes(l.topic));
  const stillMissed = g => guideLessons(g).filter(l => S.items[l.id] && S.items[l.id].wrong && !S.items[l.id].correct).length;
  const slug = h => "sec-" + h.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // tiny markdown: ## headings, - bullets, ~~~ code fences, `code`, **bold**, ::viz widgets
  function md(src) {
    const inline = t => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    const lines = src.split("\n");
    let html = "", para = [], list = [];
    const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
    const flushList = () => { if (list.length) { html += `<ul>${list.map(li => `<li>${inline(li)}</li>`).join("")}</ul>`; list = []; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("- ")) { flushPara(); list.push(line.slice(2)); continue; }
      flushList();
      if (line.startsWith("~~~")) {
        flushPara();
        const code = [];
        while (++i < lines.length && !lines[i].startsWith("~~~")) code.push(lines[i]);
        html += `<pre class="sol"><code>${esc(code.join("\n"))}</code></pre>`;
      } else if (line.startsWith("## ")) {
        flushPara();
        html += `<h3 id="${slug(line.slice(3))}">${inline(line.slice(3))}</h3>`;
      } else if (line.startsWith("::viz ")) {
        flushPara();
        html += `<div class="viz" data-viz="${esc(line.slice(6).trim())}"></div>`;
      } else if (!line.trim()) flushPara();
      else para.push(line.trim());
    }
    flushPara(); flushList();
    return html;
  }

  function mountViz(root) {
    root.querySelectorAll("[data-viz]").forEach(el => {
      const mount = window.VIZ && window.VIZ[el.dataset.viz];
      if (mount) mount(el); else el.remove();
    });
  }

  function renderLearn() {
    run = null; cur = null;
    setNav("learn");
    renderChips();
    const read = GUIDES.filter(g => S.read[g.id]).length;
    const card = g => {
      const ls = guideLessons(g);
      const done = ls.filter(l => cleared(l.id)).length;
      const missed = stillMissed(g);
      return `
        <button class="guide-card ${g.track} ${S.read[g.id] ? "read" : ""}" data-act="guide" data-id="${g.id}">
          <span class="gc-top">
            <span class="gc-title">${esc(g.title)}</span>
            ${S.read[g.id] ? `<span class="gc-check" title="Read">&#10003;</span>` : ""}
          </span>
          <span class="gc-sum">${esc(g.summary)}</span>
          <span class="gc-meta">
            <span>${done}/${ls.length} cleared</span>
            ${missed ? `<span class="gc-miss">${missed} to redo</span>` : ""}
            ${g.body.includes("::viz") ? `<span class="gc-int">interactive</span>` : ""}
          </span>
          <span class="bar"><span style="width:${ls.length ? Math.round((done / ls.length) * 100) : 0}%"></span></span>
        </button>`;
    };
    app.innerHTML = `
      <section class="learn-head">
        <p class="eyebrow">Study hall</p>
        <h1>Learn it, then drill it.</h1>
        <p class="muted">${GUIDES.length} short guides covering every topic in the question bank. Each has the core idea, a code template, the traps, and a button to practice only that topic. Most have something you can play with.</p>
        <div class="learn-progress"><span class="bar"><span style="width:${Math.round((read / GUIDES.length) * 100)}%"></span></span><span class="muted small">${read}/${GUIDES.length} read</span></div>
      </section>
      ${["algo", "sd"].map(tk => `
        <section class="learn-track track ${tk}">
          <h3>${TRACKS[tk]}</h3>
          <div class="guide-grid">${GUIDES.filter(g => g.track === tk).map(card).join("")}</div>
        </section>`).join("")}`;
  }

  function renderGuide(id) {
    const g = GUIDE_BY_ID[id];
    if (!g) { go("#learn"); return; }
    run = null; cur = null;
    setNav("learn");
    renderChips();
    const list = GUIDES.filter(x => x.track === g.track);
    const i = list.indexOf(g);
    const prev = list[i - 1], next = list[i + 1];
    const ls = guideLessons(g);
    const fresh = ls.filter(l => !cleared(l.id)).length;
    const heads = [...g.body.matchAll(/^## (.+)$/gm)].map(m => m[1]);
    app.innerHTML = `
      <article class="guide ${g.track}">
        <button class="link back" data-act="learn">&larr; All guides</button>
        <div class="meta"><span class="tag ${g.track}">${TRACKS[g.track]}</span><span class="topic">${g.topics.map(esc).join(" &middot; ")}</span></div>
        <h1>${esc(g.title)}</h1>
        <p class="lede">${esc(g.summary)}</p>
        <nav class="toc" aria-label="Sections">${heads.map(h => `<button class="toc-item" data-act="jump" data-to="${slug(h)}">${esc(h)}</button>`).join("")}</nav>
        <div class="guide-body">${md(g.body)}</div>
        <section class="guide-end panel">
          <div>
            <h3>Now drill it</h3>
            <p class="muted small">${ls.length} questions on these topics${fresh ? `, ${fresh} not cleared yet` : ", all cleared"}. Drills ignore level locks.</p>
          </div>
          <div class="hero-cta">
            <button class="btn primary" data-act="drill" data-id="${g.id}">Practice ${Math.min(6, ls.length)} questions</button>
            ${S.read[g.id] ? `<span class="read-done">&#10003; Read</span>` : `<button class="btn ghost" data-act="mark-read" data-id="${g.id}">Mark as read</button>`}
          </div>
        </section>
        <nav class="guide-nav">
          ${prev ? `<button class="link" data-act="guide" data-id="${prev.id}">&larr; ${esc(prev.title)}</button>` : "<span></span>"}
          ${next ? `<button class="link" data-act="guide" data-id="${next.id}">${esc(next.title)} &rarr;</button>` : ""}
        </nav>
      </article>`;
    mountViz(app);
  }

  function startDrill(g) {
    const ls = guideLessons(g);
    const fresh = shuffle(ls.filter(l => !cleared(l.id))).sort((a, b) => a.level - b.level);
    const old = shuffle(ls.filter(l => cleared(l.id)));
    clearHash();
    startPractice(fresh.concat(old).slice(0, 6).map(l => l.id), `Drill: ${g.title}`);
  }

  function markRead(g) {
    if (S.read[g.id]) return;
    S.read[g.id] = today();
    save();
    const btn = document.querySelector('[data-act="mark-read"]');
    if (btn) btn.outerHTML = `<span class="read-done">&#10003; Read</span>`;
    toast(`${GUIDES.filter(x => S.read[x.id]).length}/${GUIDES.length} guides read.`);
  }

  // ---------- routing: "" home, #practice, #learn, #learn/<guide id>. Runs live outside the hash. ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    if (h === "learn") renderLearn();
    else if (h.startsWith("learn/")) renderGuide(h.slice(6));
    else if (h === "practice") renderPractice();
    else renderHome();
    window.scrollTo(0, 0);
  }
  function go(hash) {
    if (location.hash === hash || (!hash && !location.hash)) route();
    else location.hash = hash;
  }
  function clearHash() { if (location.hash) history.replaceState(null, "", location.pathname + location.search); }

  const qEntries = ids => ids.filter(id => BY_ID[id]).map(id => ({ kind: "q", lessonId: id }));

  function startDiagnostic() {
    clearHash();
    run = { mode: "diagnostic", label: "Diagnostic", entries: qEntries(CORE.buildDiagnostic(ctx)), idx: 0, results: [], answers: [] };
    if (!run.entries.length) { run = null; toast("Nothing to test yet."); return; }
    renderRun();
  }

  function startSession() {
    const sess = getSession();
    if (!sess.entries.length) { toast("Nothing to practice yet."); return; }
    clearHash();
    run = { mode: "session", label: "Today's session", entries: sess.entries, idx: sess.done.length, results: sess.done };
    if (run.idx >= run.entries.length) { completeRun(); return; }
    renderRun();
  }

  function startPractice(ids, label) {
    if (!ids.length) { toast("Nothing to practice here yet."); return; }
    run = { mode: "practice", label, entries: qEntries(ids), idx: 0, results: [], before: { algo: unlockedLevel("algo"), sd: unlockedLevel("sd") } };
    renderRun();
  }

  function startLevel(track, level) {
    const pool = LESSONS.filter(l => l.track === track && l.level === level);
    const fresh = shuffle(pool.filter(l => !cleared(l.id)));
    const old = shuffle(pool.filter(l => cleared(l.id)));
    clearHash();
    startPractice(fresh.concat(old).slice(0, 5).map(l => l.id), `${TRACKS[track]} L${level}, ${LEVEL_NAMES[level]}`);
  }

  function renderRun() {
    renderChips();
    const entry = run.entries[run.idx];
    const dots = run.entries.map((e, i) => {
      const r = run.results[i];
      const cls = r ? (r.correct === false ? "bad" : "ok") : i === run.idx ? "cur" : "";
      return `<span class="dot ${cls}"></span>`;
    }).join("");
    const top = `
        <div class="run-top">
          <button class="btn ghost small" data-act="quit">Quit</button>
          <div class="run-label">${esc(run.label)}</div>
          <div class="dots">${dots}</div>
        </div>`;
    if (entry.kind === "concept") { renderConcept(entry, top); return; }

    const item = BY_ID[entry.lessonId];
    const noHint = run.mode === "diagnostic" || !!entry.independent;
    cur = { item, entry, answered: false, sel: new Set(), hinted: false, noHint, response: null, firstFail: null, asking: false };

    app.innerHTML = `
      <div class="run">
        ${top}
        <article class="card q ${item.track}">
          <div class="meta">
            ${run.mode === "session" ? `<span class="tag ${item.track}">${kindLabel(entry)}</span>` : ""}
            <span class="tag ${item.track}">${TRACKS[item.track]}</span>
            <span class="tag lvl l${item.level}">L${item.level} ${LEVEL_NAMES[item.level]}</span>
            <span class="topic">${esc(item.topic)}</span>
            ${S.items[item.id] && S.items[item.id].wrong && !S.items[item.id].correct ? `<span class="tag redo">Review</span>` : ""}
          </div>
          ${entry.kind === "review" && MISC[entry.tag] ? `<div class="notice ice">Bringing back: ${esc(MISC[entry.tag].label)}</div>` : ""}
          ${entry.independent ? `<div class="notice good">Independent check: no hints. Solve it alone to master this pattern.</div>` : ""}
          <h2>${esc(item.title)}</h2>
          <p class="prompt">${rich(item.prompt)}</p>
          <div id="body"></div>
          <div id="feedback"></div>
        </article>
      </div>`;

    const body = $("#body");
    if (item.type === "mcq" || item.type === "multi") {
      body.innerHTML = `
        ${item.type === "multi" ? `<p class="muted small">Select all that apply, then submit.</p>` : ""}
        <div class="opts">${item.options.map((o, i) => `
          <button class="opt" data-act="opt" data-i="${i}"><kbd>${i + 1}</kbd><span>${rich(o)}</span></button>`).join("")}
        </div>
        ${item.type === "multi" ? `<button class="btn primary" data-act="submit-multi">Submit</button>` : ""}`;
    } else if (item.type === "number") {
      body.innerHTML = `
        <form class="num-form" data-form="number">
          <input id="num" type="text" inputmode="decimal" autocomplete="off" placeholder="Your estimate" />
          <span class="unit">${esc(item.unit)}</span>
          <button class="btn primary" type="submit">Lock it in</button>
        </form>
        <p class="muted small">Ballpark counts. Anything in a sensible range passes.</p>`;
      setTimeout(() => $("#num") && $("#num").focus(), 30);
    } else if (item.type === "code") {
      const draft = S.drafts[item.id] != null ? S.drafts[item.id] : item.starter;
      body.innerHTML = `
        <div class="editor">
          <div class="editor-head"><span>solution.js</span><span class="muted small">Tab indents. Ctrl/Cmd + Enter runs.</span></div>
          <div class="editor-body">
            <pre class="gutter" id="gutter" aria-hidden="true"></pre>
            <textarea id="code" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off">${esc(draft)}</textarea>
          </div>
        </div>
        <div class="code-actions">
          <button class="btn primary" data-act="run-tests">Run tests</button>
          ${noHint ? "" : `<button class="btn ghost" data-act="hint">Hint</button>`}
          <button class="btn ghost" data-act="give-up">Show solution</button>
          <button class="btn ghost small touch-only" data-act="tab">Indent</button>
          <button class="btn ghost small" data-act="reset-code">Reset code</button>
        </div>
        <div id="hint"></div>
        <div id="tests"></div>`;
      setupEditor(item);
    }
  }

  function renderConcept(entry, top) {
    const p = PAT_BY_ID[entry.patternId];
    const g = entry.guideId && GUIDE_BY_ID[entry.guideId];
    cur = { concept: true };
    app.innerHTML = `
      <div class="run">
        ${top}
        <article class="card q algo">
          <div class="meta"><span class="tag algo">Concept</span><span class="topic">${esc(p.name)}</span></div>
          ${g
            ? `<h2>${esc(g.title)}</h2><div class="guide-body">${md(g.body)}</div>`
            : `<h2>${esc(p.name)}</h2><p class="prompt">Watch for these mistakes.</p>
               <div class="guide-body"><ul>${p.misconceptions.map(m => `<li><strong>${esc(m.label)}</strong> ${esc(m.fix)}</li>`).join("")}</ul></div>`}
          <div class="hero-cta"><button class="btn primary" data-act="concept-next">Continue</button></div>
        </article>
      </div>`;
    mountViz(app);
  }

  function setupEditor(item) {
    const ta = $("#code"), gutter = $("#gutter");
    const syncGutter = () => {
      const n = ta.value.split("\n").length;
      gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
      ta.style.height = "auto";
      ta.style.height = Math.max(220, ta.scrollHeight) + "px";
    };
    let draftTimer;
    ta.addEventListener("input", () => {
      syncGutter();
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => { S.drafts[item.id] = ta.value; save(); }, 300);
    });
    ta.addEventListener("keydown", e => {
      if (ta.readOnly) return;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runTests(); return; }
      if (e.key === "Tab") {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: en, value: v } = ta;
        ta.value = v.slice(0, s) + "  " + v.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 2;
        ta.dispatchEvent(new Event("input"));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: en, value: v } = ta;
        const lineStart = v.lastIndexOf("\n", s - 1) + 1;
        let indent = (v.slice(lineStart, s).match(/^\s*/) || [""])[0];
        if (/[{[(]\s*$/.test(v.slice(lineStart, s))) indent += "  ";
        ta.value = v.slice(0, s) + "\n" + indent + v.slice(en);
        ta.selectionStart = ta.selectionEnd = s + 1 + indent.length;
        ta.dispatchEvent(new Event("input"));
      }
    });
    syncGutter();
    // put cursor on the empty line inside the function
    const idx = ta.value.indexOf("\n  \n");
    setTimeout(() => { ta.focus(); if (idx >= 0) ta.selectionStart = ta.selectionEnd = idx + 3; }, 30);
  }

  async function runTests() {
    if (!cur || cur.answered) return;
    const btn = document.querySelector('[data-act="run-tests"]');
    btn.disabled = true; btn.textContent = "Running...";
    const code = $("#code").value;
    S.drafts[cur.item.id] = code; save();
    const res = await runInWorker(code, cur.item);
    if (!cur || cur.answered) return;
    btn.disabled = false; btn.textContent = "Run tests";
    const box = $("#tests");
    if (res.error) {
      box.innerHTML = `<div class="tests"><div class="test fail"><span class="mark">!</span><span>${esc(res.error)}</span></div></div>`;
      shake(box);
      return;
    }
    const passed = res.results.filter(r => r.pass).length;
    box.innerHTML = `
      <div class="tests">
        <div class="tests-head ${passed === res.results.length ? "good" : "bad"}">${passed}/${res.results.length} tests passing</div>
        ${res.results.map(r => `
          <div class="test ${r.pass ? "pass" : "fail"}">
            <span class="mark">${r.pass ? "&#10003;" : "&#10007;"}</span>
            <span class="t-label"><code>${esc(r.label)}</code></span>
            <span class="t-detail">${r.err ? `threw: ${esc(r.err)}` : r.pass ? `${r.ms.toFixed(1)} ms` : `got <code>${esc(r.got)}</code>, expected <code>${esc(r.expected)}</code>`}</span>
          </div>`).join("")}
        ${res.logs && res.logs.length ? `<pre class="logs">${esc(res.logs.join("\n"))}</pre>` : ""}
      </div>`;
    if (passed === res.results.length) finish(true);
    else {
      if (!cur.firstFail) cur.firstFail = res.results.map(r => ({ pass: r.pass }));
      shake(box);
    }
  }

  function shake(el) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

  function chooseOption(i) {
    if (!cur || cur.answered) return;
    const item = cur.item;
    if (item.type === "multi") {
      cur.sel.has(i) ? cur.sel.delete(i) : cur.sel.add(i);
      document.querySelectorAll(".opt").forEach((b, j) => b.classList.toggle("sel", cur.sel.has(j)));
      return;
    }
    const correct = i === item.answer;
    document.querySelectorAll(".opt").forEach((b, j) => {
      b.disabled = true;
      if (j === item.answer) b.classList.add("right");
      else if (j === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });
    cur.response = { picked: i };
    finish(correct);
  }

  function submitMulti() {
    if (!cur || cur.answered) return;
    const item = cur.item;
    const want = new Set(item.answers);
    const correct = want.size === cur.sel.size && [...want].every(i => cur.sel.has(i));
    document.querySelectorAll(".opt").forEach((b, j) => {
      b.disabled = true;
      if (want.has(j) && cur.sel.has(j)) b.classList.add("right");
      else if (want.has(j)) b.classList.add("missed");
      else if (cur.sel.has(j)) b.classList.add("wrong");
      else b.classList.add("dim");
    });
    const sub = document.querySelector('[data-act="submit-multi"]');
    if (sub) sub.remove();
    cur.response = { picked: [...cur.sel] };
    finish(correct);
  }

  function submitNumber() {
    if (!cur || cur.answered) return;
    const raw = $("#num").value.replace(/[, _]/g, "").toLowerCase();
    const m = raw.match(/^(-?\d*\.?\d+)(k|m|b)?$/);
    if (!m) { toast("Enter a number, like 12, 7.5 or 70k."); return; }
    const v = parseFloat(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1);
    const item = cur.item;
    const correct = v >= item.min && v <= item.max;
    $("#num").disabled = true;
    document.querySelector(".num-form button").disabled = true;
    $("#num").classList.add(correct ? "right" : "wrong");
    cur.response = {};
    finish(correct, `You said ${num(v)}. Target is about ${num(item.answer)} ${item.unit} (accepted ${num(item.min)} to ${num(item.max)}).`);
  }

  function finish(correct, extra) {
    const item = cur.item;
    cur.answered = true;
    cur.correct = correct;
    cur.extra = extra;
    cur.head = correct
      ? pickOne(["Clean.", "Nailed it.", "That's the one.", "Locked in.", "Senior energy."])
      : pickOne(["Not quite.", "Close, but no.", "Good one to learn.", "That's how you learn it."]);
    if (item.type === "code") {
      const ta = $("#code");
      if (ta) ta.readOnly = true;
      document.querySelectorAll(".code-actions .btn").forEach(b => (b.disabled = true));
    }
    const dots = document.querySelectorAll(".dot");
    if (dots[run.idx]) { dots[run.idx].classList.remove("cur"); dots[run.idx].classList.add(correct ? "ok" : "bad"); }

    const tag = correct ? null : CORE.inferMiss(item, item.type === "code" ? { results: cur.firstFail || [] } : cur.response);
    const pid = CORE.patternOf(item, ctx);
    if (!correct && !tag && pid) { cur.asking = true; cur.pid = pid; renderFeedback(); }
    else commit(tag);
    setTimeout(() => $("#feedback").scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function commit(tag) {
    cur.asking = false;
    cur.tag = tag;
    const { item, entry, correct } = cur;
    if (run.mode === "diagnostic") run.answers.push({ lessonId: item.id, correct, tag });
    else CORE.recordAttempt(S, ctx, today(), { lessonId: item.id, correct, tag, hinted: cur.hinted, reviewOf: entry.kind === "review" ? entry.tag : undefined });
    run.results.push({ correct });
    save();
    renderChips();
    renderFeedback();
  }

  function renderFeedback() {
    const { item, correct, tag } = cur;
    const m = tag && MISC[tag];
    const last = run.idx >= run.entries.length - 1;
    const nextLabel = last ? (run.mode === "session" ? "Finish" : "See results") : "Next";
    $("#feedback").innerHTML = `
      <div class="fb ${correct ? "good" : "bad"}">
        <div class="fb-head">
          <strong>${cur.head}</strong>
          ${tag && run.mode !== "diagnostic" ? `<span class="muted small">Comes back in review</span>` : ""}
        </div>
        ${cur.extra ? `<p class="fb-extra">${esc(cur.extra)}</p>` : ""}
        ${m ? `<div class="hint"><strong>${esc(m.label)}</strong><br>${esc(m.fix)}</div>` : ""}
        <p>${rich(item.explain)}</p>
        ${item.type === "code" ? `<details ${correct ? "" : "open"}><summary>Reference solution</summary><pre class="sol"><code>${esc(item.solution)}</code></pre></details>` : ""}
        ${cur.asking ? `
          <p><strong>What went wrong?</strong></p>
          <div class="code-actions">
            ${PAT_BY_ID[cur.pid].misconceptions.map(x => `<button class="btn ghost small" data-act="pick-miss" data-tag="${x.id}">${esc(x.label)}</button>`).join("")}
            <button class="btn ghost small" data-act="pick-miss" data-tag="">Not sure</button>
          </div>` : `<button class="btn primary" data-act="next">${nextLabel} <kbd>Enter</kbd></button>`}
      </div>`;
  }

  function next() {
    if (!run || !cur || !cur.answered || cur.asking) return;
    advance();
  }

  function advance() {
    run.idx++;
    if (run.idx >= run.entries.length) completeRun();
    else { renderRun(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function conceptNext() {
    run.results.push({ correct: null });
    save();
    advance();
  }

  function completeRun() {
    const t = today();
    if (run.mode === "diagnostic") {
      CORE.recordDiagnostic(S, ctx, t, run.answers);
      save();
      renderDiagResults();
      run = null; cur = null;
      return;
    }
    let streakUp = false, freezeEarned = false;
    if (run.mode === "session" && S.lastDone !== t) {
      S.streak = S.lastDone === CORE.addDays(t, -1) ? S.streak + 1 : 1;
      S.best = Math.max(S.best, S.streak);
      S.lastDone = t;
      streakUp = true;
      if (S.streak % 7 === 0 && S.freezes < MAX_FREEZES) { S.freezes++; freezeEarned = true; }
      S.days[t] = Object.assign({ answered: 0, correct: 0 }, S.days[t], { done: true });
      save();
    }
    renderSummary(streakUp, freezeEarned);
  }

  function renderDiagResults() {
    renderChips();
    app.innerHTML = `
      <section class="summary">
        <p class="eyebrow">Diagnostic complete</p>
        <h1>Here is where you stand.</h1>
        ${readinessPanel()}
        <div class="panel">
          <h3>Your first session is ready</h3>
          <p class="muted small">Interview date (optional). It sets the pace of your plan.</p>
          <input id="idate" class="date-input" type="date" aria-label="Interview date" value="${S.profile.interviewDate || ""}" />
        </div>
        <div class="hero-cta center">
          <button class="btn primary big" data-act="diag-start">Start session</button>
          <button class="btn ghost" data-act="home">Skip</button>
        </div>
      </section>`;
  }

  function tomorrowLines() {
    const t = today();
    const tags = CORE.dueTags(S, CORE.addDays(t, 1)).slice(0, 3);
    if (tags.length) return tags.map(tag => `Tomorrow: ${esc(MISC[tag] ? MISC[tag].label : tag)} (missed ${weekday(S.misses[tag].lastMiss)})`);
    const p = PAT_BY_ID[CORE.schedule(S, ctx, CORE.addDays(t, 1)).current];
    return p ? [`Tomorrow: next step in ${esc(p.name)}`] : [];
  }

  function renderSummary(streakUp, freezeEarned) {
    renderChips();
    const isSession = run.mode === "session";
    const asked = run.results.filter(r => r.correct !== null);
    const right = asked.filter(r => r.correct).length;
    const missed = run.entries.map((e, i) => [e, run.results[i]]).filter(([, r]) => r && r.correct === false).map(([e]) => BY_ID[e.lessonId]);
    const unlocks = run.before ? ["algo", "sd"].filter(tk => unlockedLevel(tk) > run.before[tk]) : [];
    const tomorrow = isSession ? tomorrowLines() : [];

    app.innerHTML = `
      <section class="summary">
        <p class="eyebrow">${esc(run.label)} complete</p>
        <h1>${isSession ? "Session done." : "Run done."}</h1>
        <div class="sum-grid">
          <div class="sum-stat"><b>${right}/${asked.length}</b><span>correct</span></div>
          <div class="sum-stat flame ${streakUp ? "bump" : ""}">${flameSvg()}<b>${S.streak}</b><span>${streakUp ? "streak extended" : "day streak"}</span></div>
        </div>
        ${freezeEarned ? `<div class="notice ice">7 days in a row. You earned a streak freeze, it covers a missed day automatically.</div>` : ""}
        ${unlocks.map(tk => `<div class="notice good">Level up. ${TRACKS[tk]} L${unlockedLevel(tk)} (${LEVEL_NAMES[unlockedLevel(tk)]}) is now unlocked.</div>`).join("")}
        ${isSession ? `<div class="panel"><div class="panel-head"><h3>What you did</h3></div>${sessionRows(run.entries, run.results)}</div>` : ""}
        ${missed.length ? `
          <div class="panel missed">
            <div class="panel-head"><h3>Worth another look</h3><span class="muted small">these come back in review</span></div>
            ${missed.map(m => `<details><summary><span class="tag ${m.track}">${TRACKS[m.track]}</span> ${esc(m.title)}</summary><p>${rich(m.explain)}</p>${GUIDE_FOR[m.topic] ? `<button class="link" data-act="guide" data-id="${GUIDE_FOR[m.topic].id}">Study the guide: ${esc(GUIDE_FOR[m.topic].title)}</button>` : ""}</details>`).join("")}
          </div>` : ""}
        ${tomorrow.length ? `<div class="panel">${tomorrow.map(l => `<p class="muted">${l}</p>`).join("")}</div>` : ""}
        <div class="hero-cta center">
          <button class="btn primary big" data-act="home">Back to base</button>
          ${isSession ? "" : `<button class="btn ghost" data-act="practice-nav">Practice more</button>`}
        </div>
      </section>`;
    run = null; cur = null;
  }

  // ---------- export / import ----------
  function exportProgress() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `drillbit-progress-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importProgress() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    input.onchange = () => {
      const f = input.files[0]; if (!f) return;
      f.text().then(txt => {
        try {
          const data = JSON.parse(txt);
          if (!data || (data.v !== 1 && data.v !== 2) || !data.items) throw new Error();
          S = CORE.migrate(data); save(); reconcileStreak(); go(""); toast("Progress imported.");
        } catch (e) { toast("That file doesn't look like a Drillbit export."); }
      });
    };
    input.click();
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (el.tagName === "A") e.preventDefault();
    switch (act) {
      case "home":
      case "quit": go(""); break;
      case "learn": go("#learn"); break;
      case "practice-nav": go("#practice"); break;
      case "guide": go("#learn/" + el.dataset.id); break;
      case "jump": { const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); break; }
      case "drill": startDrill(GUIDE_BY_ID[el.dataset.id]); window.scrollTo(0, 0); break;
      case "mark-read": markRead(GUIDE_BY_ID[el.dataset.id]); break;
      case "diag": startDiagnostic(); window.scrollTo(0, 0); break;
      case "diag-start": {
        const v = $("#idate").value;
        if (v) { S.profile.interviewDate = v; save(); }
        startSession(); window.scrollTo(0, 0); break;
      }
      case "session": startSession(); window.scrollTo(0, 0); break;
      case "concept-next": conceptNext(); break;
      case "set-date": {
        el.outerHTML = `<input class="chip date-input" type="date" id="chip-date" aria-label="Interview date" value="${S.profile.interviewDate || ""}" />`;
        const inp = $("#chip-date");
        inp.focus();
        try { inp.showPicker(); } catch (err) { /* needs a gesture */ }
        break;
      }
      case "practice":
        if (el.classList.contains("locked")) { toast(`Clear ${Math.round(UNLOCK * 100)}% of the level below to unlock this one.`); return; }
        startLevel(el.dataset.track, Number(el.dataset.level)); window.scrollTo(0, 0); break;
      case "opt": chooseOption(Number(el.dataset.i)); break;
      case "submit-multi": submitMulti(); break;
      case "run-tests": runTests(); break;
      case "hint": if (cur && !cur.noHint) { cur.hinted = true; $("#hint").innerHTML = `<div class="hint">${rich(cur.item.hint || "No hint for this one. Trust yourself.")}</div>`; } break;
      case "give-up": if (cur && !cur.answered) finish(false); break;
      case "pick-miss": if (cur && cur.asking) commit(el.dataset.tag || null); break;
      case "reset-code": if (cur && !cur.answered) { $("#code").value = cur.item.starter; $("#code").dispatchEvent(new Event("input")); } break;
      case "tab": {
        const ta = $("#code");
        if (ta && !ta.readOnly) {
          const s = ta.selectionStart;
          ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd);
          ta.focus(); ta.selectionStart = ta.selectionEnd = s + 2;
          ta.dispatchEvent(new Event("input"));
        }
        break;
      }
      case "next": next(); break;
      case "export": exportProgress(); break;
      case "import": importProgress(); break;
      case "reset":
        if (confirm("Wipe all progress and your streak? This can't be undone.")) { S = CORE.blankState(); save(); go(""); toast("Fresh start."); }
        break;
    }
  });

  document.addEventListener("submit", e => {
    if (e.target.dataset.form === "number") { e.preventDefault(); submitNumber(); }
  });

  document.addEventListener("change", e => {
    if (e.target.id !== "chip-date") return;
    S.profile.interviewDate = e.target.value || null;
    save();
    renderChips();
    if (!run && (!location.hash || location.hash === "#practice")) route();
  });
  document.addEventListener("focusout", e => { if (e.target.id === "chip-date") renderChips(); });

  document.addEventListener("keydown", e => {
    if (!cur || !run || !cur.item) return;
    const inField = /^(TEXTAREA|INPUT)$/.test(document.activeElement && document.activeElement.tagName);
    if (cur.answered && e.key === "Enter" && !(inField && document.activeElement.id === "code" && !document.activeElement.readOnly)) {
      e.preventDefault(); next(); return;
    }
    if (inField || cur.answered) return;
    if ((cur.item.type === "mcq" || cur.item.type === "multi") && /^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < cur.item.options.length) chooseOption(i);
    }
    if (cur.item.type === "multi" && e.key === "Enter") { e.preventDefault(); submitMulti(); }
  });

  // ---------- boot ----------
  window.addEventListener("hashchange", route);
  reconcileStreak();
  route();
  document.addEventListener("visibilitychange", () => {
    // if the tab sat open past midnight, refresh the home screen
    if (document.visibilityState === "visible" && !run) { reconcileStreak(); if (!location.hash) renderHome(); }
  });
})();
