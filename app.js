(() => {
  "use strict";

  // ---------- constants ----------
  let LESSONS = window.LESSONS;
  let GUIDES = window.GUIDES;
  let BY_ID, GUIDE_BY_ID, GUIDE_FOR, ctx, sctx;
  const META = window.CONTENT_META || null;
  const PASS_PRICE = "$29";
  const FREE_SESSIONS = 3;
  const PATTERNS = window.PATTERNS;
  const COMPANIES = window.COMPANIES || [];
  const PAT_BY_ID = Object.fromEntries(PATTERNS.map(p => [p.id, p]));
  const MISC = {};
  PATTERNS.forEach(p => p.misconceptions.forEach(m => (MISC[m.id] = m)));
  const CORE = window.CORE;
  let access = null;
  const gated = () => !!META && !(access && access.active);
  function indexContent() {
    BY_ID = Object.fromEntries(LESSONS.map(l => [l.id, l]));
    GUIDE_BY_ID = Object.fromEntries(GUIDES.map(g => [g.id, g]));
    GUIDE_FOR = {};
    GUIDES.forEach(g => g.topics.forEach(t => (GUIDE_FOR[t] = g)));
    ctx = { lessons: LESSONS, patterns: PATTERNS, guides: GUIDES, companies: COMPANIES };
    sctx = gated() ? { lessons: LESSONS.filter(l => META.freePatterns.includes(CORE.patternOf(l, ctx))), patterns: PATTERNS, guides: GUIDES, companies: COMPANIES } : ctx;
  }
  indexContent();
  const KEY = "drillbit.v2";
  const OLD_KEY = "goatgym.v1";
  const LEVEL_NAMES = ["", "Warm-up", "Solid", "Hard", "Senior", "Brutal"];
  const TRACKS = { algo: "Algorithms", sd: "System Design" };
  const UNLOCK = 0.6;          // share of a level you must clear to unlock the next
  const MAX_FREEZES = 2;
  const TIME_LIMIT = 4000;
  const KIND = { review: "Review", recognition: "Recognition", concept: "Concept", exercise: "Exercise" };
  const STATUS = { new: "New", learning: "Learning", shaky: "Shaky", ready: "Ready", due: "Review due" };

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
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function save() {
    S.updatedAt = new Date().toISOString();
    persist();
    AUTH.push(S);
    AUTH.syncQueue(S.misses);
  }

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

  const TRACE_WORKER_SRC = `
    self.onmessage = (e) => {
      const { url, code, fn, args, watch } = e.data;
      try { importScripts(url); self.postMessage(self.TRACE.run(code, fn, args, watch)); }
      catch (err) { self.postMessage({ error: String(err && err.message || err) }); }
    };`;
  let traceWorkerUrl = null;
  function traceInWorker(code, item, args, watch) {
    if (!traceWorkerUrl) traceWorkerUrl = URL.createObjectURL(new Blob([TRACE_WORKER_SRC], { type: "text/javascript" }));
    return new Promise(resolve => {
      let w;
      try { w = new Worker(traceWorkerUrl); } catch (e) { resolve({ error: "Your browser blocked the code runner." }); return; }
      const timer = setTimeout(() => { w.terminate(); resolve({ error: `Time limit exceeded (${TIME_LIMIT / 1000}s).` }); }, TIME_LIMIT);
      w.onmessage = e => { clearTimeout(timer); w.terminate(); resolve(e.data); };
      w.onerror = e => { clearTimeout(timer); w.terminate(); e.preventDefault(); resolve({ error: e.message || "Runtime error" }); };
      w.postMessage({ url: new URL("trace.js", location.href).href, code, fn: item.fn, args, watch });
    });
  }

  async function watchReference() {
    const item = cur && cur.item, box = $("#watch");
    if (!item || !item.viz || !box) return;
    const btn = document.querySelector('[data-act="watch-ref"]');
    btn.disabled = true;
    const t = item.tests.find(x => x.args);
    const res = await traceInWorker(item.solution, item, t.args, item.viz.watch);
    btn.disabled = false;
    if (!cur || cur.item !== item || !document.body.contains(box)) return;
    if (res.error || !res.steps.length) { toast(res.error || "Nothing to show for this one."); return; }
    ANIM.player(box, { steps: res.steps, view: item.viz, input: t.args[item.viz.arrayArg], result: res.result, truncated: res.truncated });
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
    const co = S.profile.company;
    const date = left !== null && left > 0
      ? `<button class="chip" data-act="interview" title="Interview details"><b>${left}</b> day${left > 1 ? "s" : ""} to ${co ? esc(co.name) + " " : ""}interview</button>`
      : `<button class="chip" data-act="interview">Set interview</button>`;
    $("#chips").innerHTML = `
      <span class="chip flame ${doneToday ? "lit" : ""}" title="Day streak">${flameSvg()}<b>${S.streak}</b></span>
      <span class="chip ice" title="Streak freezes">${iceSvg()}<b>${S.freezes}</b></span>
      ${access && access.active ? `<button class="chip" data-act="pass" title="Sprint Pass"><b>Pass:</b> ${passDaysLeft()} day${passDaysLeft() > 1 ? "s" : ""} left</button>` : ""}
      ${date}${AUTH.enabled ? accountChips() : ""}`;
  }
  const passDaysLeft = () => Math.max(1, Math.ceil((Date.parse(access.expiresAt) - Date.now()) / 86400000));
  function accountChips() {
    const u = AUTH.user();
    return u
      ? `<span class="chip who" title="${esc(u.email || "")}">${esc(u.email || "Signed in")}</span><button class="chip" data-act="sign-out">Sign out</button>`
      : `<button class="chip" data-act="sign-in">Sign in</button>`;
  }
  const authBox = () => `
    <div class="panel auth-box">
      <h3>Save your progress</h3>
      <p class="muted small">Sign in to keep your progress across devices. Playing without an account still works.</p>
      <div class="auth-row">
        <input id="auth-email" class="date-input" type="email" autocomplete="email" placeholder="you@example.com" aria-label="Email" />
        <button class="btn primary" data-act="auth-email">Email me a link</button>
      </div>
      <div class="auth-row"><button class="btn ghost" data-act="auth-google">Continue with Google</button></div>
    </div>`;
  let reminder = null;
  const browserZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; } };
  const hourLabel = h => `${h}:00`;
  const reminderPanel = () => {
    const r = reminder || { enabled: false, hour: 8 };
    const hour = r.hour == null ? 8 : r.hour;
    return `
      <section class="panel">
        <div class="panel-head"><h3>Daily reminder</h3></div>
        <div class="auth-row">
          <label><input type="checkbox" id="rem-on" ${r.enabled ? "checked" : ""} /> Email me a reminder</label>
          <select id="rem-hour" class="date-input" aria-label="Reminder hour">${Array.from({ length: 16 }, (_, i) => i + 7).map(h => `<option value="${h}" ${h === hour ? "selected" : ""}>${hourLabel(h)}</option>`).join("")}</select>
          <span class="muted small">${esc(browserZone())}</span>
          <button class="btn primary" data-act="save-reminder">Save</button>
        </div>
        <p class="muted small">One message a day at most, at this hour. If you stop for a while, you'll only hear from us after 3, 7, 14 and 30 days, plus 14, 7, 3 and 1 days before your interview. Unsubscribe from any email.</p>
        <div class="auth-row push-row">${pushControl(r)}</div>
      </section>`;
  };
  const pushControl = r => !AUTH.pushSupported()
    ? `<span class="muted small">Browser notifications aren't available in this browser. On iPhone, add Drillbit to your home screen first.</span>`
    : r.push
    ? `<span class="muted">Browser notifications are on for this device.</span><button class="btn ghost" data-act="push-off">Turn off</button>`
    : `<span class="muted">Get the same reminder as a browser notification on this device.</span><button class="btn ghost" data-act="push-on">Turn on notifications</button>`;
  async function loadReminder() {
    reminder = await AUTH.loadReminder();
    if (location.hash === "#account" && AUTH.user()) renderAccount();
  }
  function renderAccount() {
    run = null; cur = null;
    setNav("");
    renderChips();
    const u = AUTH.user();
    app.innerHTML = `
      <section class="learn-head">
        <p class="eyebrow">Account</p>
        <h1>${u ? "You're signed in." : "Sign in."}</h1>
        ${u ? `<p class="muted">${esc(u.email || "")}. Your progress syncs to this account.</p>` : ""}
      </section>
      ${u ? syncPanel() + reminderPanel() : authBox()}`;
  }
  function syncPanel() {
    const at = AUTH.lastSync();
    const line = AUTH.syncFailed() ? "The last sync failed. Your progress is safe on this device."
      : at ? `Last synced ${new Date(at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
      : "Not synced yet.";
    return `
      <section class="panel">
        <div class="panel-head"><h3>Sync</h3></div>
        <div class="auth-row"><span class="muted">${line}</span><button class="btn ghost" data-act="sync-now">Sync now</button></div>
      </section>`;
  }
  const flameSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>`;
  const iceSvg = () => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  // ---------- interview: date, company, and what the company publishes about its process ----------
  const companyById = id => COMPANIES.find(c => c.id === id) || null;
  function interviewFields() {
    const co = S.profile.company;
    const sel = co ? co.id : "";
    return `
      <div class="iv-fields">
        <label class="iv-field">Interview date<input id="iv-date" class="date-input" type="date" value="${S.profile.interviewDate || ""}" /></label>
        <label class="iv-field">Company<select id="iv-company" class="date-input">
          <option value="" ${sel ? "" : "selected"}>Not sure yet</option>
          ${COMPANIES.map(c => `<option value="${c.id}" ${sel === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
          <option value="other" ${sel === "other" ? "selected" : ""}>Other</option>
        </select></label>
        <label class="iv-field iv-other ${sel === "other" ? "" : "hidden"}">Company name<input id="iv-other" class="date-input" type="text" maxlength="60" value="${sel === "other" ? esc(co.name) : ""}" /></label>
      </div>`;
  }
  function readInterview() {
    const date = $("#iv-date").value || null;
    const id = $("#iv-company").value;
    const other = ($("#iv-other").value || "").trim();
    const c = companyById(id);
    S.profile.interviewDate = date;
    S.profile.company = c ? { id: c.id, name: c.name } : id === "other" && other ? { id: "other", name: other } : null;
    save();
    ANALYTICS.track("interview_set", { company: S.profile.company ? S.profile.company.id : null, hasDate: !!date });
  }
  function companyCard(id) {
    const c = companyById(id);
    if (!c) return id === "other"
      ? `<div class="panel"><p class="muted">We don't have a profile for this company. Your plan stays balanced and starts from your weak spots. Ask your recruiter what each round covers.</p></div>`
      : "";
    return `
      <section class="panel company">
        <div class="panel-head"><h3>What ${esc(c.name)} says about its interviews</h3><span class="muted small">checked ${shortDate(c.checked)}</span></div>
        <p>${esc(c.summary)}</p>
        <ul class="diag-list">${c.facts.map(f => `<li>${esc(f.text)} <a class="link src" href="${esc(c.sources[f.source].url)}" target="_blank" rel="noopener">source</a></li>`).join("")}</ul>
        ${c.focusNote ? `<p class="muted small">${esc(c.focusNote)}</p>` : ""}
        <p class="muted small">Only from ${esc(c.name)}'s own pages. Formats change, so confirm with your recruiter.</p>
      </section>`;
  }
  function renderInterview() {
    run = null; cur = null;
    setNav("");
    renderChips();
    app.innerHTML = `
      <section class="learn-head">
        <p class="eyebrow">Interview</p>
        <h1>When and where?</h1>
        <p class="muted">The date sets the pace of your plan. The company moves the patterns it names to the front, right after your weak spots.</p>
      </section>
      <section class="panel">
        ${interviewFields()}
        <div class="hero-cta"><button class="btn primary" data-act="save-interview">Save</button></div>
      </section>
      <div id="iv-card">${companyCard(S.profile.company && S.profile.company.id)}</div>`;
  }
  function interviewCard() {
    const co = S.profile.company;
    if (!co) return "";
    const c = companyById(co.id);
    const left = CORE.schedule(S, ctx, today()).daysLeft;
    return `
      <section class="panel study algo">
        <div>
          <p class="eyebrow">${left !== null && left > 0 ? `${left} day${left > 1 ? "s" : ""} to go` : "Interview"}</p>
          <h3>${esc(co.name)}</h3>
          <p class="muted small">${c ? esc(c.summary) : "No company profile, so your plan stays balanced."}</p>
        </div>
        <div class="hero-cta"><button class="btn ghost" data-act="interview">What to expect</button><button class="btn ghost" data-act="mock">Mock interview</button></div>
      </section>`;
  }

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
    const sch = CORE.schedule(S, sctx, today());
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

  const shortDate = d => CORE.parse(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  function evidence(r) {
    if (r.check) return `${r.check.kind === "fresh" ? "New problem" : "Retry"} solved alone ${shortDate(r.check.at)}${r.status === "due" ? ", check again" : ""}`;
    if (r.lastWin) return `Last solved ${shortDate(r.lastWin)}, no independent check yet`;
    return "";
  }

  function readinessPanel() {
    const cells = CORE.readiness(S, ctx, today()).map(r => {
      const g = GUIDE_BY_ID[PAT_BY_ID[r.id].guide];
      const locked = gated() && CORE.patternLocked(META, r.id);
      const known = !!(S.diagnostic && S.diagnostic.results[r.id]) || !!(S.repair && S.repair.pattern === r.id);
      const hidden = locked && !known;
      const inner = hidden
        ? `<span class="rd-name">${esc(r.name)}</span><span class="rd-status"><i class="rd-dot"></i>Sprint Pass</span>`
        : r.hasContent
        ? `<span class="rd-name">${esc(r.name)}</span><span class="rd-status"><i class="rd-dot"></i>${STATUS[r.status]}</span>${r.openMisses ? `<span class="muted small">${r.openMisses} open miss${r.openMisses > 1 ? "es" : ""}</span>` : ""}${evidence(r) ? `<span class="muted small rd-ev">${evidence(r)}</span>` : ""}${locked ? `<span class="muted small">More practice with the Sprint Pass</span>` : ""}`
        : `<span class="rd-name">${esc(r.name)}</span><span class="muted small">Coming soon</span>`;
      const cls = `rd-cell ${hidden ? "locked" : r.hasContent ? r.status : "soon"}`;
      return g ? `<button class="${cls}" data-act="guide" data-id="${g.id}">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
    }).join("");
    return `
      <section class="panel">
        <div class="panel-head"><h3>Readiness map</h3><span class="muted small">${PATTERNS.length} patterns</span></div>
        <p class="muted small">Ready means two different problems solved, then a problem solved alone with no hints on a later day. It reflects your practice here, not a hiring prediction.</p>
        <div class="rd-grid">${cells}</div>
      </section>`;
  }

  // ---------- repair: a free user's one guided fix for the weakest paid pattern the diagnostic tested ----------
  const openTags = pid => Object.entries(S.misses).filter(([t, m]) => !m.resolved && MISC[t] && PAT_BY_ID[pid].misconceptions.some(x => x.id === t)).map(([t]) => t);
  function repairTarget() {
    if (!gated() || !S.diagnostic || !META.samples) return null;
    if (S.repair) return S.repair.done ? null : S.repair.pattern;
    const res = S.diagnostic.results;
    return PATTERNS.map(p => p.id).find(pid => META.samples[pid] && res[pid] && res[pid].correct < res[pid].total) || null;
  }
  function repairPanel() {
    const pid = repairTarget();
    if (!pid) return "";
    const tags = openTags(pid);
    return `
      <section class="panel study algo">
        <div>
          <p class="eyebrow">Free repair</p>
          <h3>${esc(PAT_BY_ID[pid].name)}</h3>
          <p class="muted small">Your diagnostic missed this one${tags.length ? `: ${esc(MISC[tags[0]].label.toLowerCase())}` : ""}. See the fix, practice it, then try a different problem. About 10 minutes.</p>
        </div>
        <div class="hero-cta"><button class="btn primary" data-act="repair">${S.repair ? "Continue the repair" : "Start the repair"}</button></div>
      </section>`;
  }
  function diagFindings() {
    const res = S.diagnostic.results;
    const rows = PATTERNS.filter(p => res[p.id]).map(p => {
      const r = res[p.id], tags = openTags(p.id), m = tags.length && MISC[tags[0]];
      return `<li><strong>${esc(p.name)}</strong>: ${r.correct === r.total ? "correct" : "missed"}${m ? `. ${esc(m.label)}. ${esc(m.fix)}` : ""}</li>`;
    }).join("");
    return `
      <div class="panel">
        <div class="panel-head"><h3>What the diagnostic found</h3></div>
        <ul class="diag-list">${rows}</ul>
        <p class="muted small">One question per pattern. It's a first signal about where to start, not a full assessment.</p>
      </div>`;
  }
  function startRepair() {
    const pid = repairTarget();
    if (!pid) return;
    const [recog, code] = META.samples[pid];
    if (!BY_ID[recog] || !BY_ID[code]) { toast("This repair isn't available right now."); return; }
    if (!S.repair) { S.repair = { pattern: pid, done: false, at: today() }; save(); ANALYTICS.track("repair_started", { pattern: pid }); }
    clearHash();
    run = {
      mode: "repair", label: `Repair: ${PAT_BY_ID[pid].name}`, idx: 0, results: [],
      entries: [{ kind: "concept", patternId: pid, guideId: null, repair: true }, { kind: "recognition", lessonId: recog }, { kind: "exercise", lessonId: code, independent: false }]
    };
    renderRun();
  }
  function renderRepairSummary() {
    renderChips();
    const p = PAT_BY_ID[S.repair.pattern];
    const asked = run.results.filter(r => r.correct !== null);
    app.innerHTML = `
      <section class="summary">
        <p class="eyebrow">Repair complete</p>
        <h1>${asked.every(r => r.correct) ? "Fixed, for now." : "Good work. It's not fixed yet."}</h1>
        <div class="sum-grid"><div class="sum-stat"><b>${asked.filter(r => r.correct).length}/${asked.length}</b><span>correct</span></div></div>
        <div class="panel">${sessionRows(run.entries, run.results)}</div>
        <div class="panel">
          <h3>What comes next in ${esc(p.name)}</h3>
          <p class="muted">A fix sticks when you solve a different problem alone a few days later. The Sprint Pass gives you the full guide, guided practice, a fresh check with no hints, and spaced review of this mistake. Hashing and Two pointers stay free.</p>
        </div>
        <div class="hero-cta center">
          <button class="btn primary big" data-act="pass">See the Sprint Pass</button>
          <button class="btn ghost" data-act="home">Back to base</button>
        </div>
      </section>`;
    run = null; cur = null;
  }

  let unlockMsg = null;
  function sessionBlocked() {
    const ex = S.days[today()] && S.days[today()].session;
    return gated() && CORE.sessionsDone(S) >= FREE_SESSIONS && !(ex && ex.done.length > 0);
  }

  function getSession() {
    const t = today();
    const day = S.days[t] || (S.days[t] = { answered: 0, correct: 0 });
    if (!day.session) { day.session = { entries: CORE.composeSession(S, sctx, t), done: [] }; save(); }
    return day.session;
  }

  function renderHome() {
    run = null; cur = null;
    setNav("home");
    renderChips();
    const t = today();
    const doneToday = S.lastDone === t;
    const blocked = !!S.diagnostic && !doneToday && sessionBlocked();
    const sess = S.diagnostic && !blocked ? getSession() : null;
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
    } else if (blocked) {
      title = "Free sessions used.";
      sub = "Your 3 free sessions are done.";
      cta = `<button class="btn big primary" data-act="pass">Get the Sprint Pass</button><button class="btn big ghost" data-act="practice-nav">Practice</button>`;
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
      ${unlockMsg ? `<div class="notice good">${esc(unlockMsg)}</div>` : ""}
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
      </section>` : blocked ? `
      <section class="panel">
        <div class="panel-head"><h3>Today's session</h3></div>
        <p>Your 3 free sessions are done. Practice Hashing and Two pointers anytime, or get the Sprint Pass for the full plan.</p>
        <button class="btn primary" data-act="pass">Get the Sprint Pass</button>
      </section>` : ""}

      ${repairPanel()}
      ${interviewCard()}
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
        <span class="legal-links"><a class="link" href="/terms">Terms</a><a class="link" href="/privacy">Privacy</a><a class="link" href="/refund">Refunds</a></span>
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
      <section class="panel study algo">
        <div>
          <p class="eyebrow">Mock interview</p>
          <h3>Two problems, ${CORE.MOCK_MINUTES} minutes, no hints.</h3>
          <p class="muted small">Plan each one out loud, code it, then take the follow-ups. Problems you haven't seen come first, from two different patterns.</p>
        </div>
        <div class="hero-cta"><button class="btn primary" data-act="mock">Start the clock</button></div>
      </section>
      <div class="tracks">
        ${trackPanel("algo")}
        ${trackPanel("sd")}
      </div>`;
  }

  const RETURN_KEY = "drillbit.return";
  function renderPass() {
    run = null; cur = null;
    setNav("");
    renderChips();
    const active = access && access.active;
    const buy = active
      ? `<p class="muted">Your pass is active until ${esc(new Date(access.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}. Buying again adds 30 days after that.</p><button class="btn ghost" data-act="buy">Extend by 30 days</button>`
      : "";
    const button = !AUTH.enabled
      ? `<button class="btn primary big" disabled>Checkout is not set up yet</button>`
      : `<button class="btn primary big" data-act="buy">Get the Sprint Pass</button>`;
    app.innerHTML = `
      <section class="learn-head">
        <p class="eyebrow">Structured practice</p>
        <h1>Sprint Pass</h1>
        <p class="muted"><b>${PASS_PRICE} one-time. No subscription.</b> 30 days of full access.</p>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>What's included</h3></div>
        <ul class="pass-list">
          <li>Full access for 30 days</li>
          <li>All ${META ? META.patternsWithContent : new Set(LESSONS.map(l => CORE.patternOf(l, ctx)).filter(Boolean)).size} patterns available now, with their guides and questions</li>
          <li>A plan that counts down to your interview date</li>
          <li>The mistake queue, which brings back what you missed</li>
          <li>The readiness map</li>
          <li>System design, as a bonus</li>
        </ul>
        <p class="muted small">Free without a pass: the diagnostic, your first ${FREE_SESSIONS} sessions, and unlimited Hashing and Two pointers.</p>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Refunds</h3></div>
        <p class="muted">Full refund for any reason within 7 days of purchase. Email support from the address on the refund page.</p>
        <p class="muted small"><a class="link" href="/terms">Terms</a> <a class="link" href="/privacy">Privacy</a> <a class="link" href="/refund">Refunds</a></p>
      </section>
      <div class="hero-cta">${active ? buy : button}</div>`;
  }

  async function refreshAccess() {
    if (!META || !AUTH.enabled) return false;
    const a = await AUTH.access();
    if (!a || !a.active) return false;
    if (gated()) {
      const c = await AUTH.content();
      if (!c) return false;
      const have = new Set(LESSONS.map(l => l.id));
      LESSONS = LESSONS.concat(c.lessons.filter(l => !have.has(l.id)));
      const full = new Map(c.guides.map(g => [g.id, g]));
      GUIDES = GUIDES.map(g => full.get(g.id) || g).concat(c.guides.filter(g => !GUIDES.some(x => x.id === g.id)));
    }
    access = a;
    indexContent();
    renderChips();
    return true;
  }

  function pollUnlock() {
    unlockMsg = "Payment received. Unlocking your pass.";
    const t0 = Date.now();
    const tick = async () => {
      if (await refreshAccess()) { ANALYTICS.track("purchase_completed"); unlockMsg = null; toast("Sprint Pass unlocked."); if (!run) route(); return; }
      if (Date.now() - t0 >= 30000) { unlockMsg = "Your payment is being confirmed. Refresh in a minute."; if (!run) route(); return; }
      setTimeout(tick, 2000);
    };
    tick();
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
        <button class="guide-card ${g.track} ${S.read[g.id] ? "read" : ""} ${g.locked ? "locked" : ""}" data-act="guide" data-id="${g.id}">
          <span class="gc-top">
            <span class="gc-title">${esc(g.title)}</span>
            ${S.read[g.id] ? `<span class="gc-check" title="Read">&#10003;</span>` : ""}
          </span>
          <span class="gc-sum">${esc(g.summary)}</span>
          <span class="gc-meta">
            ${g.locked ? `<span class="gc-miss">Sprint Pass</span>` : `<span>${done}/${ls.length} cleared</span>`}
            ${missed ? `<span class="gc-miss">${missed} to redo</span>` : ""}
            ${g.body && g.body.includes("::viz") ? `<span class="gc-int">interactive</span>` : ""}
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
    if (g.locked) {
      app.innerHTML = `
        <article class="guide ${g.track}">
          <button class="link back" data-act="learn">&larr; All guides</button>
          <div class="meta"><span class="tag ${g.track}">${TRACKS[g.track]}</span><span class="topic">${g.topics.map(esc).join(" &middot; ")}</span></div>
          <h1>${esc(g.title)}</h1>
          <p class="lede">${esc(g.summary)}</p>
          <section class="guide-end panel">
            <div><h3>Part of the Sprint Pass</h3><p class="muted small">The full guide and its questions unlock with the pass.</p></div>
            <div class="hero-cta"><button class="btn primary" data-act="pass">Unlock with the Sprint Pass</button></div>
          </section>
          <nav class="guide-nav">
            ${prev ? `<button class="link" data-act="guide" data-id="${prev.id}">&larr; ${esc(prev.title)}</button>` : "<span></span>"}
            ${next ? `<button class="link" data-act="guide" data-id="${next.id}">${esc(next.title)} &rarr;</button>` : ""}
          </nav>
        </article>`;
      return;
    }
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
    else if (h === "account") renderAccount();
    else if (h === "pass") renderPass();
    else if (h === "interview") renderInterview();
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
    ANALYTICS.track("diagnostic_started");
    renderRun();
  }

  function startSession() {
    if (S.lastDone !== today() && sessionBlocked()) { go("#pass"); return; }
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

  function startMock() {
    const ids = CORE.pickMock(S, ctx, Math.random);
    if (ids.length < 2) { toast("A mock needs coding problems from two patterns."); return; }
    clearHash();
    run = {
      mode: "mock", label: "Mock interview", idx: 0, results: [], deadline: Date.now() + CORE.MOCK_MINUTES * 60000,
      entries: ids.map(id => ({ kind: "exercise", lessonId: id, independent: true, mock: true }))
    };
    ANALYTICS.track("mock_started", { lessons: ids });
    renderRun();
    if (!timer) timer = setInterval(tick, 1000);
  }

  let timer = null;
  const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  function tick() {
    if (!run || !run.deadline) { clearInterval(timer); timer = null; return; }
    const left = run.deadline - Date.now();
    const el = $("#timer");
    if (el) { el.textContent = clock(left); el.classList.toggle("low", left < 5 * 60000); }
    if (left <= 0 && cur && cur.item && !cur.answered) {
      cur.timedOut = true;
      finish(false, "Time's up. In a real interview, say where you got stuck and what you'd try next.");
    }
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
          <div class="run-label">${esc(run.label)}${run.deadline ? ` <span class="timer" id="timer">${clock(run.deadline - Date.now())}</span>` : ""}</div>
          <div class="dots">${dots}</div>
        </div>`;
    if (entry.kind === "concept") { renderConcept(entry, top); return; }

    const item = BY_ID[entry.lessonId];
    const noHint = run.mode === "diagnostic" || !!entry.independent;
    cur = { item, entry, startedAt: Date.now(), answered: false, sel: new Set(), hinted: false, noHint, response: null, firstFail: null, asking: false, firstRun: null, failedRuns: 0, errorRuns: 0, revealed: false, planned: undefined, picks: {}, planMiss: [], fu: {} };
    const planFirst = item.type === "code" && item.plan && run.mode !== "diagnostic";

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
          ${entry.mock ? `<div class="notice ice">Problem ${run.idx + 1} of ${run.entries.length}. No hints, and the clock keeps running. Plan it, code it, then take the follow-ups.</div>` : ""}
          ${entry.independent && !entry.mock ? `<div class="notice good">Independent check: no hints. ${planFirst ? "A correct plan plus a pass on the first run" : "Passing on the first run"} counts as evidence for this pattern.</div>` : ""}
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
    } else if (planFirst) {
      body.innerHTML = `${planForm(item)}<div id="editor-slot"></div>`;
    } else if (item.type === "code") {
      body.innerHTML = editorHtml(item, noHint);
      setupEditor(item);
    }
  }

  // Interview habit: say the approach and its cost before writing code. Option order is shuffled per lesson.
  const PLAN_PARTS = [["approach", null], ["time", "Time complexity"], ["space", "Extra space"]];
  const PLAN_NAMES = { approach: "the approach", time: "the time complexity", space: "the space" };
  const order = (key, n) => shuffle(Array.from({ length: n }, (_, i) => i), CORE.seededRng(key));
  function planForm(item) {
    return `
      <div class="plan" id="plan">
        <p class="plan-lead"><strong>Plan it first.</strong> Say it out loud like you would to an interviewer, then pick. Skipping is fine for practice, but only a correct plan plus a first-run pass counts as evidence.</p>
        ${PLAN_PARTS.map(([k, label]) => {
          const c = item.plan[k];
          return `<div class="plan-q">
            <p class="plan-label">${esc(label || item.plan.q || "Which approach would you pitch?")}</p>
            <div class="opts plan-opts">${order(item.id + k, c.options.length).map(i => `<button class="opt" data-act="plan-pick" data-k="${k}" data-i="${i}"><span>${rich(c.options[i])}</span></button>`).join("")}</div>
          </div>`;
        }).join("")}
        <div class="code-actions" id="plan-actions">
          <button class="btn primary" data-act="plan-lock" disabled>Lock in plan</button>
          <button class="btn ghost" data-act="plan-skip">Skip to code</button>
        </div>
      </div>`;
  }

  function pickPlan(k, i) {
    if (!cur || cur.planned !== undefined) return;
    cur.picks[k] = i;
    document.querySelectorAll(`[data-act="plan-pick"][data-k="${k}"]`).forEach(b => b.classList.toggle("sel", Number(b.dataset.i) === i));
    const lock = document.querySelector('[data-act="plan-lock"]');
    if (lock) lock.disabled = PLAN_PARTS.some(([p]) => cur.picks[p] === undefined);
  }

  function lockPlan(skip) {
    if (!cur || cur.planned !== undefined) return;
    const item = cur.item;
    cur.planMiss = skip ? [] : PLAN_PARTS.map(([k]) => k).filter(k => cur.picks[k] !== item.plan[k].answer);
    cur.planned = !skip && !cur.planMiss.length;
    cur.planSkipped = !!skip;
    document.querySelectorAll('[data-act="plan-pick"]').forEach(b => {
      const k = b.dataset.k, i = Number(b.dataset.i);
      b.disabled = true;
      if (skip) b.classList.add("dim");
      else if (i === item.plan[k].answer) b.classList.add(cur.picks[k] === i ? "right" : "missed");
      else if (cur.picks[k] === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });
    $("#plan-actions").innerHTML = skip
      ? `<p class="muted small">Plan skipped. This solve counts as practice.</p>`
      : cur.planned
      ? `<p class="plan-ok">Plan locked in. Now write it.</p>`
      : `<p class="muted small">Your plan missed ${cur.planMiss.map(k => PLAN_NAMES[k]).join(" and ")}. The right picks are outlined. Solving still counts as practice.</p>`;
    ANALYTICS.track("plan_locked", { lesson: item.id, ok: cur.planned, skipped: !!skip });
    $("#editor-slot").innerHTML = editorHtml(item, cur.noHint);
    setupEditor(item);
    setTimeout(() => { const ta = $("#code"); if (ta) ta.focus(); }, 30);
  }

  function editorHtml(item, noHint) {
    const draft = S.drafts[item.id] ? S.drafts[item.id].code : item.starter;
    return `
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
  }

  function renderConcept(entry, top) {
    const p = PAT_BY_ID[entry.patternId];
    const g = entry.guideId && GUIDE_BY_ID[entry.guideId];
    const full = g && !g.locked;
    cur = { concept: true };
    app.innerHTML = `
      <div class="run">
        ${top}
        <article class="card q algo">
          <div class="meta"><span class="tag algo">Concept</span><span class="topic">${esc(p.name)}</span></div>
          ${full
            ? `<h2>${esc(g.title)}</h2><div class="guide-body">${md(g.body)}</div>`
            : `<h2>${esc(p.name)}</h2><p class="prompt">Watch for these mistakes.</p>
               ${entry.repair && openTags(p.id).length ? `<div class="hint"><strong>Your diagnostic answer pointed to: ${esc(MISC[openTags(p.id)[0]].label)}</strong><br>${esc(MISC[openTags(p.id)[0]].fix)}</div>` : ""}
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
      draftTimer = setTimeout(() => { S.drafts[item.id] = { code: ta.value, ts: new Date().toISOString() }; save(); }, 300);
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
    S.drafts[cur.item.id] = { code, ts: new Date().toISOString() }; save();
    const res = await runInWorker(code, cur.item);
    if (!cur || cur.answered) return;
    btn.disabled = false; btn.textContent = "Run tests";
    const box = $("#tests");
    if (res.error) {
      cur.errorRuns++;
      if (!cur.firstRun) cur.firstRun = "error";
      box.innerHTML = `<div class="tests"><div class="test fail"><span class="mark">!</span><span>${esc(res.error)}</span></div></div>`;
      shake(box);
      return;
    }
    const passed = res.results.filter(r => r.pass).length;
    if (!cur.firstRun) cur.firstRun = passed === res.results.length ? "pass" : "fail";
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
      cur.failedRuns++;
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

    const tag = correct
      ? (item.type === "code" && cur.firstFail ? CORE.inferMiss(item, { results: cur.firstFail }) : null)
      : CORE.inferMiss(item, item.type === "code" ? { results: cur.firstFail || [] } : cur.response);
    const pid = CORE.patternOf(item, ctx);
    if (!correct && !tag && pid) { cur.asking = true; cur.pid = pid; renderFeedback(); }
    else commit(tag);
    setTimeout(() => $("#feedback").scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function commit(tag) {
    cur.asking = false;
    cur.tag = tag;
    const { item, entry, correct } = cur;
    const durationMs = Date.now() - cur.startedAt;
    const a = { lessonId: item.id, correct, tag, hinted: cur.hinted, failedRuns: cur.failedRuns, errorRuns: cur.errorRuns, revealed: cur.revealed, firstRun: cur.firstRun, planned: cur.planned, id: newId(), ts: new Date().toISOString(), durationMs };
    if (run.mode === "diagnostic") run.answers.push(a);
    else {
      const pid = CORE.patternOf(item, ctx);
      const status = () => { const r = pid && CORE.readiness(S, ctx, today()).find(x => x.id === pid); return r ? r.status : null; };
      const was = status();
      CORE.recordAttempt(S, ctx, today(), { ...a, reviewOf: entry.kind === "review" ? entry.tag : undefined });
      if (correct && entry.kind === "review") ANALYTICS.track("review_item_passed", { tag: entry.tag });
      if (was !== "ready" && status() === "ready") ANALYTICS.track("pattern_mastered", { pattern: pid, evidence: S.patterns[pid].check.kind });
      AUTH.logAttempt(attemptRow(a));
    }
    run.results.push(run.mode === "mock"
      ? { correct, planned: cur.planned, failedRuns: cur.failedRuns, revealed: cur.revealed, timedOut: !!cur.timedOut, durationMs }
      : { correct });
    save();
    renderChips();
    renderFeedback();
  }

  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const attemptRow = a => ({
    item_id: a.lessonId, correct: a.correct, misconception_tag: a.tag || null, duration_ms: a.durationMs,
    client_id: a.id, first_run: a.firstRun || null, failed_runs: a.failedRuns || 0, error_runs: a.errorRuns || 0, hinted: !!a.hinted, revealed: !!a.revealed,
    planned: typeof a.planned === "boolean" ? a.planned : null
  });

  function renderFeedback() {
    const { item, correct, tag } = cur;
    const m = tag && MISC[tag];
    const last = run.idx >= run.entries.length - 1;
    const nextLabel = last ? (run.mode === "session" ? "Finish" : "See results") : "Next";
    $("#feedback").innerHTML = `
      <div class="fb ${correct ? "good" : "bad"}">
        <div class="fb-head">
          <strong>${cur.head}</strong>
          ${tag && run.mode !== "diagnostic" ? `<span class="muted small">${correct ? "Fixed, back in 3 days" : "Comes back in review"}</span>` : ""}
        </div>
        ${cur.extra ? `<p class="fb-extra">${esc(cur.extra)}</p>` : ""}
        ${m ? `<div class="hint">${correct ? "Your first failing run showed this mistake. Passing counts as practice, and it goes in your notebook.<br>" : ""}<strong>${esc(m.label)}</strong><br>${esc(m.fix)}</div>` : ""}
        ${correct && !m && cur.failedRuns ? `<p class="muted small">Passed after ${cur.failedRuns} failing run${cur.failedRuns > 1 ? "s" : ""}. That counts as practice, not as an unaided solve.</p>` : ""}
        ${correct && !m && !cur.failedRuns && cur.planned === false ? `<p class="muted small">${cur.planSkipped ? "You skipped the plan" : `Your plan missed ${cur.planMiss.map(k => PLAN_NAMES[k]).join(" and ")}`}. The code passed, so this counts as practice, not as an unaided solve.</p>` : ""}
        <p>${rich(item.explain)}</p>
        ${item.type === "code" && item.viz ? `<button class="btn ghost small watch-ref" data-act="watch-ref">Watch the reference solution</button><div id="watch"></div>` : ""}
        ${item.type === "code" ? `<details ${correct ? "" : "open"}><summary>Reference solution</summary><pre class="sol"><code>${esc(item.solution)}</code></pre></details>` : ""}
        ${item.followups && run.mode !== "diagnostic" ? `<div class="followups" id="followups">${followupsHtml(item)}</div>` : ""}
        ${cur.asking ? `
          <p><strong>What went wrong?</strong></p>
          <div class="code-actions">
            ${PAT_BY_ID[cur.pid].misconceptions.map(x => `<button class="btn ghost small" data-act="pick-miss" data-tag="${x.id}">${esc(x.label)}</button>`).join("")}
            <button class="btn ghost small" data-act="pick-miss" data-tag="">Not sure</button>
          </div>` : `<button class="btn primary" data-act="next">${nextLabel} <kbd>Enter</kbd></button>`}
      </div>`;
  }

  // What an interviewer asks after a working solve. Practice only, not part of the evidence.
  function followupsHtml(item) {
    return `
      <p class="fu-head"><strong>The interviewer follows up</strong> <span class="muted small">Not graded. Answer before you look.</span></p>
      ${item.followups.map((f, q) => {
        const got = cur.fu[q];
        const done = got !== undefined;
        return `<div class="fu">
          <p>${rich(f.q)}</p>
          <div class="opts">${order(item.id + "fu" + q, f.options.length).map(i => {
            const cls = !done ? "" : i === f.answer ? "right" : i === got ? "wrong" : "dim";
            return `<button class="opt ${cls}" data-act="fu-pick" data-q="${q}" data-i="${i}" ${done ? "disabled" : ""}><span>${rich(f.options[i])}</span></button>`;
          }).join("")}</div>
          ${done ? `<p class="fu-explain">${rich(f.explain)}</p>` : ""}
        </div>`;
      }).join("")}`;
  }

  function pickFollowup(q, i) {
    if (!cur || !cur.answered || !cur.item.followups || cur.fu[q] !== undefined) return;
    cur.fu[q] = i;
    ANALYTICS.track("followup_answered", { lesson: cur.item.id, q, correct: i === cur.item.followups[q].answer });
    $("#followups").innerHTML = followupsHtml(cur.item);
  }

  function next() {
    if (!run || !cur || !cur.answered || cur.asking) return;
    advance();
  }

  function advance() {
    if (run.mode === "mock" && Date.now() >= run.deadline) {
      while (run.results.length < run.entries.length) run.results.push({ correct: null });
      run.idx = run.entries.length;
      completeRun();
      return;
    }
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
    if (run.mode === "mock") { renderMockSummary(); return; }
    if (run.mode === "repair") {
      S.repair.done = true;
      save();
      ANALYTICS.track("repair_completed", { pattern: S.repair.pattern, correct: run.results.filter(r => r.correct).length });
      renderRepairSummary();
      return;
    }
    if (run.mode === "diagnostic") {
      CORE.recordDiagnostic(S, ctx, t, run.answers);
      ANALYTICS.track("diagnostic_completed", { correct: run.answers.filter(a => a.correct).length, total: run.answers.length });
      run.answers.forEach(a => AUTH.logAttempt(attemptRow(a)));
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
      ANALYTICS.track("session_completed", { correct: run.results.filter(r => r.correct).length, phase: CORE.schedule(S, sctx, t).phase });
    }
    renderSummary(streakUp, freezeEarned);
  }

  function mockLine(r) {
    if (r.correct === null) return "Not reached";
    if (r.timedOut) return "Ran out of time";
    if (r.revealed) return "Opened the solution";
    if (!r.correct) return "Not solved";
    const notes = [];
    if (r.planned === false) notes.push("plan missed or skipped");
    if (r.failedRuns) notes.push(`${r.failedRuns} failing run${r.failedRuns > 1 ? "s" : ""}`);
    return notes.length ? `Solved, with ${notes.join(" and ")}` : "Solved alone: right plan, passed on the first run";
  }

  function renderMockSummary() {
    renderChips();
    const n = run.entries.length;
    const solved = run.results.filter(r => r.correct).length;
    const clean = run.results.filter(r => r.correct && r.planned !== false && !r.failedRuns).length;
    const used = Math.min(Date.now(), run.deadline) - (run.deadline - CORE.MOCK_MINUTES * 60000);
    const tips = [];
    if (run.results.some(r => r.planned === false)) tips.push("Your plan was off on at least one problem. Interviewers listen for the approach and its cost before you code, so practice saying them first.");
    if (run.results.some(r => r.failedRuns)) tips.push("Failing runs are fine in practice, but in an interview, walk through a small example by hand before you run anything.");
    if (run.results.some(r => r.timedOut || r.correct === null)) tips.push("You ran out of time. Aim to have a working brute force in the first 15 minutes, then improve it.");
    if (!tips.length) tips.push("Clean run. Clean solves count as evidence on your readiness map, so this may have moved a pattern toward Ready.");
    ANALYTICS.track("mock_completed", { solved, clean, total: n });
    app.innerHTML = `
      <section class="summary">
        <p class="eyebrow">Mock interview complete</p>
        <h1>${solved === n ? "Both solved." : solved ? `${solved} of ${n} solved.` : "Not this time."}</h1>
        <div class="sum-grid">
          <div class="sum-stat"><b>${clean}/${n}</b><span>solved alone</span></div>
          <div class="sum-stat"><b>${clock(used)}</b><span>of ${CORE.MOCK_MINUTES}:00 used</span></div>
        </div>
        <div class="panel"><ol class="sess-list">${run.entries.map((e, i) => {
          const l = BY_ID[e.lessonId], r = run.results[i] || { correct: null }, p = PAT_BY_ID[CORE.patternOf(l, ctx)];
          return `<li class="sess-row done"><span class="tag">${esc(p ? p.name : l.topic)}</span><span class="sess-title">${esc(l.title)}</span><span class="muted small">${mockLine(r)}${r.durationMs ? `, ${clock(r.durationMs)}` : ""}</span></li>`;
        }).join("")}</ol></div>
        <div class="panel">${tips.map(t => `<p class="muted">${t}</p>`).join("")}</div>
        <div class="hero-cta center">
          <button class="btn primary big" data-act="mock">Another mock</button>
          <button class="btn ghost" data-act="home">Back to base</button>
        </div>
      </section>`;
    run = null; cur = null;
  }

  function renderDiagResults() {
    renderChips();
    app.innerHTML = `
      <section class="summary">
        <p class="eyebrow">Diagnostic complete</p>
        <h1>Here is where you stand.</h1>
        ${diagFindings()}
        ${repairPanel()}
        ${readinessPanel()}
        ${AUTH.enabled && !AUTH.user() ? authBox() : ""}
        <div class="panel">
          <h3>Your first session is ready</h3>
          <p class="muted small">Interview date and company (optional). They set the pace and focus of your plan.</p>
          ${interviewFields()}
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
    const p = PAT_BY_ID[CORE.schedule(S, sctx, CORE.addDays(t, 1)).current];
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
          if (!data || ![1, 2, 3].includes(data.v) || !data.items) throw new Error();
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
      case "mock": startMock(); window.scrollTo(0, 0); break;
      case "guide": go("#learn/" + el.dataset.id); break;
      case "jump": { const t = document.getElementById(el.dataset.to); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); break; }
      case "drill": startDrill(GUIDE_BY_ID[el.dataset.id]); window.scrollTo(0, 0); break;
      case "mark-read": markRead(GUIDE_BY_ID[el.dataset.id]); break;
      case "diag": startDiagnostic(); window.scrollTo(0, 0); break;
      case "diag-start": {
        readInterview();
        startSession(); window.scrollTo(0, 0); break;
      }
      case "session": startSession(); window.scrollTo(0, 0); break;
      case "repair": startRepair(); window.scrollTo(0, 0); break;
      case "concept-next": conceptNext(); break;
      case "watch-ref": watchReference(); break;
      case "sign-in": go("#account"); break;
      case "pass": go("#pass"); break;
      case "save-reminder": {
        const next = { enabled: $("#rem-on").checked, hour: Number($("#rem-hour").value), timezone: browserZone() };
        AUTH.saveReminder(next).then(r => { if (r) { reminder = next; toast("Reminder saved."); } else toast("Couldn't save the reminder. Try again."); });
        break;
      }
      case "buy":
        if (!AUTH.user()) {
          try { localStorage.setItem(RETURN_KEY, "#pass"); } catch (err) { /* ignore */ }
          go("#account");
        } else {
          ANALYTICS.track("checkout_started");
          AUTH.checkout().then(r => { if (r && r.url) location.href = r.url; else toast("Couldn't start checkout. Try again."); });
        }
        break;
      case "sign-out": {
        const had = access && access.active;
        AUTH.signOut().then(() => { if (had) location.reload(); else toast("Signed out. Progress stays on this device."); });
        break;
      }
      case "auth-email": {
        const v = $("#auth-email").value.trim();
        if (!v) { toast("Enter your email."); break; }
        AUTH.signInWithEmail(v).then(r => toast(r && r.ok ? "Check your email for the sign-in link." : "Couldn't send the link. Try again."));
        break;
      }
      case "auth-google": AUTH.signInWithGoogle(); break;
      case "push-on":
        el.disabled = true;
        AUTH.enablePush({ hour: Number($("#rem-hour").value), timezone: browserZone() }).then(r => {
          if (r && r.ok) { reminder = Object.assign({}, reminder, { push: true, hour: Number($("#rem-hour").value) }); toast("Notifications are on."); ANALYTICS.track("push_enabled"); }
          else toast(r && r.reason === "denied" ? "Notifications are blocked. Allow them in your browser settings to turn them on." : "Couldn't turn on notifications.");
          if (location.hash === "#account") renderAccount();
        });
        break;
      case "push-off":
        el.disabled = true;
        AUTH.disablePush().then(r => { if (r && r.ok) { reminder = Object.assign({}, reminder, { push: false }); toast("Notifications are off for this device."); } if (location.hash === "#account") renderAccount(); });
        break;
      case "sync-now":
        el.disabled = true;
        AUTH.sync().then(() => { if (location.hash === "#account") renderAccount(); if (!AUTH.syncFailed()) toast("Synced."); });
        break;
      case "interview": go("#interview"); break;
      case "save-interview": readInterview(); renderInterview(); toast("Saved."); break;
      case "practice":
        if (el.classList.contains("locked")) { toast(`Clear ${Math.round(UNLOCK * 100)}% of the level below to unlock this one.`); return; }
        startLevel(el.dataset.track, Number(el.dataset.level)); window.scrollTo(0, 0); break;
      case "opt": chooseOption(Number(el.dataset.i)); break;
      case "submit-multi": submitMulti(); break;
      case "run-tests": runTests(); break;
      case "plan-pick": pickPlan(el.dataset.k, Number(el.dataset.i)); break;
      case "plan-lock": lockPlan(false); break;
      case "plan-skip": lockPlan(true); break;
      case "fu-pick": pickFollowup(Number(el.dataset.q), Number(el.dataset.i)); break;
      case "hint": if (cur && !cur.noHint) { cur.hinted = true; $("#hint").innerHTML = `<div class="hint">${rich(cur.item.hint || "No hint for this one. Trust yourself.")}</div>`; } break;
      case "give-up": if (cur && !cur.answered) { cur.revealed = true; finish(false); } break;
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
    if (e.target.id !== "iv-company") return;
    const other = document.querySelector(".iv-other");
    if (other) other.classList.toggle("hidden", e.target.value !== "other");
    const card = $("#iv-card");
    if (card) card.innerHTML = companyCard(e.target.value);
  });

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
  const STASH = "drillbit.stash.";
  AUTH.attach({
    get: () => S, set: s => { S = s; persist(); }, notify: toast, ctx: () => ctx,
    stash: s => { try { localStorage.setItem(STASH + s.owner, JSON.stringify(s)); } catch (err) { /* ignore */ } },
    unstash: id => {
      try { const raw = localStorage.getItem(STASH + id); localStorage.removeItem(STASH + id); return raw ? CORE.migrate(JSON.parse(raw)) : null; }
      catch (err) { return null; }
    }
  });
  const takeReturn = () => {
    try { const r = localStorage.getItem(RETURN_KEY); localStorage.removeItem(RETURN_KEY); return r; } catch (err) { return null; }
  };
  AUTH.onChange(async what => {
    renderChips();
    if (what === "user") {
      if (AUTH.user()) { ANALYTICS.identify(AUTH.user().id); loadReminder(); }
      else reminder = null;
    }
    if (what !== "synced") return;
    await refreshAccess();
    const back = takeReturn();
    if (back) go(back);
    else if (!run) route();
  });
  const returned = new URLSearchParams(location.search).get("checkout");
  if (returned) {
    history.replaceState(null, "", location.pathname + location.hash);
    if (returned === "cancel") toast("Checkout canceled.");
    else if (returned === "success" && META && AUTH.enabled) pollUnlock();
  }
  reconcileStreak();
  route();
  document.addEventListener("visibilitychange", () => {
    // if the tab sat open past midnight, refresh the home screen
    if (document.visibilityState === "visible" && !run) { reconcileStreak(); if (!location.hash) renderHome(); }
  });
})();
