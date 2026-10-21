(() => {
  "use strict";

  // ---------- constants ----------
  const LESSONS = window.LESSONS;
  const BY_ID = Object.fromEntries(LESSONS.map(l => [l.id, l]));
  const GUIDES = window.GUIDES;
  const GUIDE_BY_ID = Object.fromEntries(GUIDES.map(g => [g.id, g]));
  const GUIDE_FOR = {};
  GUIDES.forEach(g => g.topics.forEach(t => (GUIDE_FOR[t] = g)));
  const READ_XP = 20;
  const KEY = "goatgym.v1";
  const LEVEL_NAMES = ["", "Warm-up", "Solid", "Hard", "Senior", "Brutal"];
  const TRACKS = { algo: "Algorithms", sd: "System Design" };
  const RANKS = [[0, "Intern"], [300, "Junior"], [1000, "Mid-level"], [2500, "Senior"], [5000, "Staff"], [9000, "Principal"], [15000, "Distinguished"]];
  const UNLOCK = 0.6;          // share of a level you must clear to unlock the next
  const DAILY_SIZE = 5;
  const REVIEW_STEPS = [1, 3, 7, 16]; // days between reviews of a missed item
  const MAX_FREEZES = 2;
  const TIME_LIMIT = 4000;

  // ---------- dates (local time) ----------
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = () => fmt(new Date());
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
  const diffDays = (a, b) => {
    const u = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((u(a) - u(b)) / 86400000);
  };

  // ---------- state ----------
  const blank = () => ({ v: 1, xp: 0, streak: 0, best: 0, freezes: 0, lastDone: null, days: {}, items: {}, daily: null, drafts: {}, read: {} });
  let S = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* private mode */ }
    return blank();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  let notice = null;
  function reconcileStreak() {
    const t = today();
    if (!S.lastDone || S.lastDone === t) return;
    const gap = diffDays(t, S.lastDone);
    if (gap <= 1) return;
    const missed = gap - 1;
    if (S.streak > 0 && S.freezes >= missed) {
      for (let i = 1; i <= missed; i++) {
        const d = addDays(S.lastDone, i);
        S.days[d] = Object.assign({}, S.days[d], { frozen: true });
      }
      S.freezes -= missed;
      S.lastDone = addDays(t, -1);
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

  function rankFor(xp) {
    let i = 0;
    while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
    const [floor, name] = RANKS[i];
    const next = RANKS[i + 1];
    return { name, floor, next: next ? next[0] : null, nextName: next ? next[1] : null, idx: i };
  }

  function levelStats(track, level) {
    const items = LESSONS.filter(l => l.track === track && l.level === level);
    const done = items.filter(l => S.items[l.id] && S.items[l.id].correct > 0).length;
    return { done, total: items.length };
  }
  function unlockedLevel(track) {
    let L = 1;
    while (L < 5) {
      const s = levelStats(track, L);
      if (s.total && s.done / s.total >= UNLOCK) L++; else break;
    }
    return L;
  }
  const dueItems = () => Object.entries(S.items)
    .filter(([id, v]) => v.due && v.due <= today() && BY_ID[id])
    .map(([id]) => id);

  // seeded RNG so a day's run is stable across reloads and devices with the same progress
  function seedFrom(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function weight(l) {
    const st = S.items[l.id];
    let w = !st ? 4 : !st.correct ? 3 : 0.4;
    if (l.level === unlockedLevel(l.track)) w *= 2.5;
    return w;
  }
  function weightedPick(pool, rng, taken) {
    const c = pool.filter(l => !taken.has(l.id));
    if (!c.length) return null;
    const ws = c.map(weight);
    let r = rng() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < c.length; i++) { r -= ws[i]; if (r <= 0) return c[i]; }
    return c[c.length - 1];
  }

  function buildDaily() {
    const rng = mulberry32(seedFrom("goat-" + today()));
    const taken = new Set();
    const out = [];
    const add = l => { if (l && !taken.has(l.id)) { taken.add(l.id); out.push(l.id); } };
    const pool = (track, pred = () => true) => LESSONS.filter(l => l.track === track && l.level <= unlockedLevel(track) && pred(l));

    add(weightedPick(pool("algo", l => l.type !== "code"), rng, taken));
    add(weightedPick(pool("sd"), rng, taken));
    add(weightedPick(pool("algo", l => l.type === "code"), rng, taken));
    add(weightedPick(pool("sd", l => l.type !== "code"), rng, taken));
    const due = shuffle(dueItems(), rng).filter(id => !taken.has(id));
    if (due.length) add(BY_ID[due[0]]);
    while (out.length < DAILY_SIZE) {
      const l = weightedPick(LESSONS.filter(x => x.level <= unlockedLevel(x.track)), rng, taken);
      if (!l) break;
      add(l);
    }
    return out;
  }

  // ---------- XP and recording ----------
  function xpFor(item, attempts, combo) {
    const base = (item.type === "code" ? 25 : 10) * item.level;
    const tryFactor = item.type === "code" ? Math.max(0.5, 1 - 0.2 * (attempts - 1)) : 1;
    const comboBonus = Math.max(0, combo - 1) * 5;
    const streakMult = 1 + Math.min(S.streak, 10) * 0.05;
    return Math.round((base * tryFactor + comboBonus) * streakMult);
  }

  function record(item, correct, xp) {
    const t = today();
    const st = S.items[item.id] || (S.items[item.id] = { seen: 0, correct: 0, wrong: 0, box: 0, due: null });
    st.seen++;
    st.last = t;
    if (correct) {
      st.correct++;
      if (st.wrong) {
        st.box = Math.min(st.box + 1, REVIEW_STEPS.length);
        st.due = st.box >= REVIEW_STEPS.length ? null : addDays(t, REVIEW_STEPS[st.box]);
      }
    } else {
      st.wrong++;
      st.box = 0;
      st.due = addDays(t, REVIEW_STEPS[0]);
    }
    const d = S.days[t] || (S.days[t] = { xp: 0, answered: 0, correct: 0 });
    d.xp = (d.xp || 0) + xp;
    d.answered = (d.answered || 0) + 1;
    d.correct = (d.correct || 0) + (correct ? 1 : 0);
    S.xp += xp;
    save();
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
    const r = rankFor(S.xp);
    const doneToday = S.lastDone === today();
    $("#chips").innerHTML = `
      <span class="chip flame ${doneToday ? "lit" : ""}" title="Day streak">${flameSvg()}<b>${S.streak}</b></span>
      <span class="chip ice" title="Streak freezes">${iceSvg()}<b>${S.freezes}</b></span>
      <span class="chip xp" title="Total XP"><b>${num(S.xp)}</b> XP</span>
      <span class="chip rank r${r.idx}" title="Rank">${r.name}</span>`;
  }
  const flameSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>`;
  const iceSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  // ---------- home ----------
  function heatmap() {
    const t = today();
    const weeks = 52;
    const dow = parse(t).getDay();
    const start = addDays(t, -(7 * (weeks - 1) + dow));
    let cells = "";
    for (let w = 0; w < weeks; w++) {
      cells += `<div class="hm-col">`;
      for (let d = 0; d < 7; d++) {
        const day = addDays(start, w * 7 + d);
        const info = S.days[day];
        let cls = "";
        if (diffDays(day, t) > 0) cls = "future";
        else if (info && info.frozen && !info.xp) cls = "frozen";
        else if (info && info.xp) cls = info.xp >= 400 ? "h4" : info.xp >= 200 ? "h3" : info.xp >= 80 ? "h2" : "h1";
        if (day === t) cls += " today";
        const tip = info ? `${day}: ${info.xp ? info.xp + " XP" : ""}${info.frozen ? " (freeze)" : ""}` : day;
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

  function renderHome() {
    run = null; cur = null;
    setNav("home");
    renderChips();
    const t = today();
    const d = S.daily && S.daily.date === t ? S.daily : null;
    const doneToday = S.lastDone === t;
    const progress = d ? d.results.length : 0;
    const r = rankFor(S.xp);
    const rankPct = r.next ? Math.round(((S.xp - r.floor) / (r.next - r.floor)) * 100) : 100;
    const due = dueItems().length;
    const totalAnswered = Object.values(S.items).reduce((a, v) => a + v.seen, 0);
    const totalCorrect = Object.values(S.items).reduce((a, v) => a + v.correct, 0);
    const acc = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const mastered = LESSONS.filter(l => S.items[l.id] && S.items[l.id].correct).length;

    let cta, sub;
    if (doneToday) { cta = `<button class="btn big ghost" data-act="bonus">Bonus round</button>`; sub = "Today's run is done. The flame is safe until tomorrow."; }
    else if (progress) { cta = `<button class="btn big primary" data-act="daily">Continue run (${progress}/${DAILY_SIZE})</button>`; sub = "You're mid-run. Finish it to keep the streak."; }
    else { cta = `<button class="btn big primary" data-act="daily">Start today's run</button>`; sub = `${DAILY_SIZE} challenges, mixed algorithms and system design. About 15 minutes.`; }

    app.innerHTML = `
      ${notice ? `<div class="notice ${notice.kind}">${esc(notice.text)}</div>` : ""}
      <section class="hero">
        <div class="hero-flame-wrap">
          <div class="hero-flame ${doneToday ? "lit" : ""}">${flameSvg()}<b>${S.streak}</b></div>
          <span class="hero-label">day streak</span>
        </div>
        <div class="hero-main">
          <p class="eyebrow">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
          <h1>${doneToday ? "Locked in for today." : S.streak ? "Keep the flame alive." : "Day one starts now."}</h1>
          <p class="muted">${sub}</p>
          <div class="hero-cta">${cta}${due ? `<button class="btn ghost" data-act="review">Review ${due} missed</button>` : ""}</div>
        </div>
      </section>

      <section class="stats">
        <div class="stat wide">
          <div class="stat-top"><span class="muted">Rank</span><b>${r.name}</b></div>
          <div class="bar gold"><span style="width:${rankPct}%"></span></div>
          <div class="muted small">${r.next ? `${num(r.next - S.xp)} XP to ${r.nextName}` : "Top of the mountain. Stay there."}</div>
        </div>
        <div class="stat"><span class="muted">Best streak</span><b>${S.best}</b></div>
        <div class="stat"><span class="muted">Freezes</span><b>${S.freezes}/${MAX_FREEZES}</b><span class="muted small">earn 1 every 7 days</span></div>
        <div class="stat"><span class="muted">Accuracy</span><b>${acc}%</b></div>
        <div class="stat"><span class="muted">Cleared</span><b>${mastered}/${LESSONS.length}</b></div>
      </section>

      ${studyPanel()}

      <section class="panel">
        <div class="panel-head"><h3>Last 12 months</h3><span class="muted small">brighter = more XP, blue = freeze</span></div>
        ${heatmap()}
      </section>

      <div class="tracks">
        ${trackPanel("algo")}
        ${trackPanel("sd")}
      </div>

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

  // ---------- runs ----------
  let run = null;   // active session
  let cur = null;   // current item state

  function setNav(view) {
    document.querySelectorAll("[data-nav]").forEach(b => b.classList.toggle("on", b.dataset.nav === view));
  }

  // ---------- learn ----------
  const guideLessons = g => LESSONS.filter(l => g.topics.includes(l.topic));
  const stillMissed = g => guideLessons(g).filter(l => S.items[l.id] && S.items[l.id].wrong && !S.items[l.id].correct).length;
  const slug = h => "sec-" + h.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  function studyPanel() {
    const weak = GUIDES.map(g => [g, stillMissed(g)]).filter(([, n]) => n).sort((a, b) => b[1] - a[1])[0];
    const g = weak ? weak[0] : GUIDES.find(x => !S.read[x.id]);
    if (!g) return "";
    return `
      <section class="panel study ${g.track}">
        <div>
          <p class="eyebrow">${weak ? "Weak spot" : "Next to study"}</p>
          <h3>${esc(g.title)}</h3>
          <p class="muted small">${weak ? `You've missed ${weak[1]} question${weak[1] > 1 ? "s" : ""} here and haven't cleared ${weak[1] > 1 ? "them" : "it"} yet.` : esc(g.summary)}</p>
        </div>
        <div class="hero-cta">
          <button class="btn primary" data-act="guide" data-id="${g.id}">Read the guide</button>
          <button class="btn ghost" data-act="learn">All guides</button>
        </div>
      </section>`;
  }

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

  function renderLearn() {
    run = null; cur = null;
    setNav("learn");
    renderChips();
    const read = GUIDES.filter(g => S.read[g.id]).length;
    const card = g => {
      const ls = guideLessons(g);
      const cleared = ls.filter(l => S.items[l.id] && S.items[l.id].correct).length;
      const missed = stillMissed(g);
      return `
        <button class="guide-card ${g.track} ${S.read[g.id] ? "read" : ""}" data-act="guide" data-id="${g.id}">
          <span class="gc-top">
            <span class="gc-title">${esc(g.title)}</span>
            ${S.read[g.id] ? `<span class="gc-check" title="Read">&#10003;</span>` : ""}
          </span>
          <span class="gc-sum">${esc(g.summary)}</span>
          <span class="gc-meta">
            <span>${cleared}/${ls.length} cleared</span>
            ${missed ? `<span class="gc-miss">${missed} to redo</span>` : ""}
            ${g.body.includes("::viz") ? `<span class="gc-int">interactive</span>` : ""}
          </span>
          <span class="bar"><span style="width:${ls.length ? Math.round((cleared / ls.length) * 100) : 0}%"></span></span>
        </button>`;
    };
    app.innerHTML = `
      <section class="learn-head">
        <p class="eyebrow">Study hall</p>
        <h1>Learn it, then drill it.</h1>
        <p class="muted">${GUIDES.length} short guides covering every topic in the question bank. Each has the core idea, a code template, the traps, and a button to practice only that topic. Most have something you can play with.</p>
        <div class="learn-progress"><span class="bar"><span style="width:${Math.round((read / GUIDES.length) * 100)}%"></span></span><span class="muted small">${read}/${GUIDES.length} read, +${READ_XP} XP each</span></div>
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
    const fresh = ls.filter(l => !(S.items[l.id] && S.items[l.id].correct)).length;
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
            ${S.read[g.id] ? `<span class="read-done">&#10003; Read</span>` : `<button class="btn ghost" data-act="mark-read" data-id="${g.id}">Mark as read, +${READ_XP} XP</button>`}
          </div>
        </section>
        <nav class="guide-nav">
          ${prev ? `<button class="link" data-act="guide" data-id="${prev.id}">&larr; ${esc(prev.title)}</button>` : "<span></span>"}
          ${next ? `<button class="link" data-act="guide" data-id="${next.id}">${esc(next.title)} &rarr;</button>` : ""}
        </nav>
      </article>`;
    app.querySelectorAll("[data-viz]").forEach(el => {
      const mount = window.VIZ && window.VIZ[el.dataset.viz];
      if (mount) mount(el); else el.remove();
    });
  }

  function startDrill(g) {
    const ls = guideLessons(g);
    const fresh = shuffle(ls.filter(l => !(S.items[l.id] && S.items[l.id].correct))).sort((a, b) => a.level - b.level);
    const old = shuffle(ls.filter(l => S.items[l.id] && S.items[l.id].correct));
    clearHash();
    startSession(fresh.concat(old).slice(0, 6).map(l => l.id), `Drill: ${g.title}`);
  }

  function markRead(g) {
    if (S.read[g.id]) return;
    const t = today();
    S.read[g.id] = t;
    S.xp += READ_XP;
    const d = S.days[t] || (S.days[t] = { xp: 0, answered: 0, correct: 0 });
    d.xp = (d.xp || 0) + READ_XP;
    save();
    renderChips();
    const btn = document.querySelector('[data-act="mark-read"]');
    if (btn) btn.outerHTML = `<span class="read-done">&#10003; Read</span>`;
    toast(`+${READ_XP} XP. ${GUIDES.filter(x => S.read[x.id]).length}/${GUIDES.length} guides read.`);
  }

  // ---------- routing: "" home, #learn, #learn/<guide id>. Runs live outside the hash. ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    if (h === "learn") renderLearn();
    else if (h.startsWith("learn/")) renderGuide(h.slice(6));
    else renderHome();
    window.scrollTo(0, 0);
  }
  function go(hash) {
    if (location.hash === hash || (!hash && !location.hash)) route();
    else location.hash = hash;
  }
  function clearHash() { if (location.hash) history.replaceState(null, "", location.pathname + location.search); }

  function startDaily() {
    const t = today();
    if (!S.daily || S.daily.date !== t) {
      S.daily = { date: t, ids: buildDaily(), idx: 0, results: [], combo: 0, xp: 0 };
      save();
    }
    run = S.daily;
    run.ids = run.ids.filter(id => BY_ID[id]);
    run.mode = "daily";
    run.label = "Daily run";
    run.before = { algo: unlockedLevel("algo"), sd: unlockedLevel("sd") };
    run.idx = Math.max(run.idx, run.results.length);
    if (run.idx >= run.ids.length) { completeRun(); return; }
    renderRun();
  }

  function startSession(ids, label, mode = "practice") {
    if (!ids.length) { toast("Nothing to practice here yet."); return; }
    run = { mode, label, ids, idx: 0, results: [], combo: 0, xp: 0, before: { algo: unlockedLevel("algo"), sd: unlockedLevel("sd") } };
    renderRun();
  }

  function startPractice(track, level) {
    const pool = LESSONS.filter(l => l.track === track && l.level === level);
    const fresh = shuffle(pool.filter(l => !(S.items[l.id] && S.items[l.id].correct)));
    const old = shuffle(pool.filter(l => S.items[l.id] && S.items[l.id].correct));
    startSession(fresh.concat(old).slice(0, 5).map(l => l.id), `${TRACKS[track]} L${level}, ${LEVEL_NAMES[level]}`);
  }

  function startBonus() {
    const rng = Math.random;
    const taken = new Set(), ids = [];
    const pool = LESSONS.filter(l => l.level <= unlockedLevel(l.track));
    for (let i = 0; i < 5; i++) { const l = weightedPick(pool, rng, taken); if (!l) break; taken.add(l.id); ids.push(l.id); }
    startSession(ids, "Bonus round");
  }

  function renderRun() {
    renderChips();
    const item = BY_ID[run.ids[run.idx]];
    cur = { item, answered: false, attempts: 0, sel: new Set() };
    const dots = run.ids.map((id, i) => {
      const r = run.results[i];
      const cls = r ? (r.correct ? "ok" : "bad") : i === run.idx ? "cur" : "";
      return `<span class="dot ${cls}"></span>`;
    }).join("");

    app.innerHTML = `
      <div class="run">
        <div class="run-top">
          <button class="btn ghost small" data-act="quit">Quit</button>
          <div class="run-label">${esc(run.label)}</div>
          <div class="dots">${dots}</div>
          <div class="combo ${run.combo > 1 ? "on" : ""}">${run.combo > 1 ? `${run.combo}x combo` : ""}</div>
        </div>
        <article class="card q ${item.track}">
          <div class="meta">
            <span class="tag ${item.track}">${TRACKS[item.track]}</span>
            <span class="tag lvl l${item.level}">L${item.level} ${LEVEL_NAMES[item.level]}</span>
            <span class="topic">${esc(item.topic)}</span>
            ${S.items[item.id] && S.items[item.id].wrong && !S.items[item.id].correct ? `<span class="tag redo">Review</span>` : ""}
          </div>
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
          <button class="btn ghost" data-act="hint">Hint</button>
          <button class="btn ghost" data-act="give-up">Show solution</button>
          <button class="btn ghost small touch-only" data-act="tab">Indent</button>
          <button class="btn ghost small" data-act="reset-code">Reset code</button>
        </div>
        <div id="hint"></div>
        <div id="tests"></div>`;
      setupEditor(item);
    }
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
    cur.attempts++;
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
    else shake(box);
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
    finish(correct, `You said ${num(v)}. Target is about ${num(item.answer)} ${item.unit} (accepted ${num(item.min)} to ${num(item.max)}).`);
  }

  function finish(correct, extra) {
    const item = cur.item;
    cur.answered = true;
    run.combo = correct ? run.combo + 1 : 0;
    const xp = correct ? xpFor(item, Math.max(1, cur.attempts), run.combo) : 0;
    run.xp = (run.xp || 0) + xp;
    run.results.push({ id: item.id, correct, xp });
    record(item, correct, xp);
    renderChips();

    const last = run.idx >= run.ids.length - 1;
    const head = correct
      ? pickOne(["Clean.", "Nailed it.", "That's the one.", "Locked in.", "Easy money.", "Senior energy."])
      : pickOne(["Not quite.", "Close, but no.", "Good one to learn.", "That's how you learn it."]);
    const fb = $("#feedback");
    fb.innerHTML = `
      <div class="fb ${correct ? "good" : "bad"}">
        <div class="fb-head">
          <strong>${head}</strong>
          ${correct ? `<span class="xp-pop">+${xp} XP</span>` : `<span class="muted small">Back in your review queue tomorrow</span>`}
        </div>
        ${extra ? `<p class="fb-extra">${esc(extra)}</p>` : ""}
        <p>${rich(item.explain)}</p>
        ${item.type === "code" ? `<details ${correct ? "" : "open"}><summary>Reference solution</summary><pre class="sol"><code>${esc(item.solution)}</code></pre></details>` : ""}
        <button class="btn primary" data-act="next">${last ? "See results" : "Next"} <kbd>Enter</kbd></button>
      </div>`;
    if (item.type === "code") {
      const ta = $("#code");
      if (ta) ta.readOnly = true;
      document.querySelectorAll(".code-actions .btn").forEach(b => (b.disabled = true));
    }
    if (run.combo > 1) { const c = document.querySelector(".combo"); if (c) { c.textContent = `${run.combo}x combo`; c.classList.add("on"); shake(c); } }
    const dots = document.querySelectorAll(".dot");
    if (dots[run.idx]) { dots[run.idx].classList.remove("cur"); dots[run.idx].classList.add(correct ? "ok" : "bad"); }
    if (run.mode === "daily") save();
    setTimeout(() => fb.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function next() {
    if (!run || !cur || !cur.answered) return;
    run.idx++;
    if (run.mode === "daily") save();
    if (run.idx >= run.ids.length) completeRun();
    else { renderRun(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function completeRun() {
    const t = today();
    let streakUp = false, freezeEarned = false;
    if (run.mode === "daily" && S.lastDone !== t) {
      S.streak = S.lastDone === addDays(t, -1) ? S.streak + 1 : 1;
      S.best = Math.max(S.best, S.streak);
      S.lastDone = t;
      streakUp = true;
      if (S.streak % 7 === 0 && S.freezes < MAX_FREEZES) { S.freezes++; freezeEarned = true; }
      S.days[t] = Object.assign({ xp: 0 }, S.days[t], { done: true });
      save();
    }
    renderSummary(streakUp, freezeEarned);
  }

  function renderSummary(streakUp, freezeEarned) {
    renderChips();
    const correct = run.results.filter(r => r.correct).length;
    const total = run.results.length;
    const missed = run.results.filter(r => !r.correct).map(r => BY_ID[r.id]);
    const unlocks = ["algo", "sd"].filter(tk => unlockedLevel(tk) > run.before[tk]);
    const perfect = total && correct === total;
    const r = rankFor(S.xp);
    const title = perfect ? "Perfect run." : correct / total >= 0.6 ? "Solid work." : "You showed up. That counts.";

    app.innerHTML = `
      <section class="summary">
        <p class="eyebrow">${esc(run.label)} complete</p>
        <h1>${title}</h1>
        <div class="sum-grid">
          <div class="sum-stat"><b>${correct}/${total}</b><span>correct</span></div>
          <div class="sum-stat xp"><b>+${num(run.xp || 0)}</b><span>XP earned</span></div>
          <div class="sum-stat flame ${streakUp ? "bump" : ""}">${flameSvg()}<b>${S.streak}</b><span>${streakUp ? "streak extended" : "day streak"}</span></div>
        </div>
        ${freezeEarned ? `<div class="notice ice">7 days in a row. You earned a streak freeze, it covers a missed day automatically.</div>` : ""}
        ${unlocks.map(tk => `<div class="notice good">Level up. ${TRACKS[tk]} L${unlockedLevel(tk)} (${LEVEL_NAMES[unlockedLevel(tk)]}) is now unlocked.</div>`).join("")}
        <div class="muted">Rank: <b class="rank-name">${r.name}</b>${r.next ? `, ${num(r.next - S.xp)} XP to ${r.nextName}` : ""}</div>
        ${missed.length ? `
          <div class="panel missed">
            <div class="panel-head"><h3>Worth another look</h3><span class="muted small">these come back in review</span></div>
            ${missed.map(m => `<details><summary><span class="tag ${m.track}">${TRACKS[m.track]}</span> ${esc(m.title)}</summary><p>${rich(m.explain)}</p>${GUIDE_FOR[m.topic] ? `<button class="link" data-act="guide" data-id="${GUIDE_FOR[m.topic].id}">Study the guide: ${esc(GUIDE_FOR[m.topic].title)}</button>` : ""}</details>`).join("")}
          </div>` : ""}
        <div class="hero-cta center">
          <button class="btn primary big" data-act="home">Back to base</button>
          <button class="btn ghost" data-act="bonus">One more round</button>
        </div>
      </section>`;
    if (perfect || streakUp) confetti(perfect ? 70 : 30);
    run = null; cur = null;
  }

  function confetti(n) {
    const colors = ["#b6ff3b", "#5ee7ff", "#ffd166", "#ff6b3d", "#c89bff"];
    const wrap = document.createElement("div");
    wrap.className = "confetti";
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "vw";
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.6 + "s";
      s.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      wrap.appendChild(s);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4200);
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
          if (typeof data.xp !== "number" || !data.items) throw new Error();
          S = Object.assign(blank(), data); save(); reconcileStreak(); go(""); toast("Progress imported.");
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
      case "guide": go("#learn/" + el.dataset.id); break;
      case "jump": { const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); break; }
      case "drill": startDrill(GUIDE_BY_ID[el.dataset.id]); window.scrollTo(0, 0); break;
      case "mark-read": markRead(GUIDE_BY_ID[el.dataset.id]); break;
      case "daily": clearHash(); startDaily(); window.scrollTo(0, 0); break;
      case "bonus": clearHash(); startBonus(); window.scrollTo(0, 0); break;
      case "review": clearHash(); startSession(shuffle(dueItems()).slice(0, 8), "Review", "review"); window.scrollTo(0, 0); break;
      case "practice":
        if (el.classList.contains("locked")) { toast(`Clear ${Math.round(UNLOCK * 100)}% of the level below to unlock this one.`); return; }
        startPractice(el.dataset.track, Number(el.dataset.level)); window.scrollTo(0, 0); break;
      case "opt": chooseOption(Number(el.dataset.i)); break;
      case "submit-multi": submitMulti(); break;
      case "run-tests": runTests(); break;
      case "hint": $("#hint").innerHTML = `<div class="hint">${rich(cur.item.hint || "No hint for this one. Trust yourself.")}</div>`; break;
      case "give-up": if (cur && !cur.answered) finish(false); break;
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
        if (confirm("Wipe all progress, XP and your streak? This can't be undone.")) { S = blank(); save(); go(""); toast("Fresh start."); }
        break;
    }
  });

  document.addEventListener("submit", e => {
    if (e.target.dataset.form === "number") { e.preventDefault(); submitNumber(); }
  });

  document.addEventListener("keydown", e => {
    if (!cur || !run) return;
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
