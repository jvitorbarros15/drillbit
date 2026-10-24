// Pure learning logic. No Date.now, no localStorage. State functions mutate the state they are given and return it.
// ctx = { lessons, patterns, guides }, today = "YYYY-MM-DD".
(function () {
  // ---------- dates (local time) ----------
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return fmt(d); };
  const diffDays = (a, b) => {
    const u = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((u(a) - u(b)) / 86400000);
  };

  // ---------- seeded rng ----------
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
  const seededRng = str => mulberry32(seedFrom(str));

  const STEPS = [1, 3, 7];
  const DIAG_PATTERNS = ["hashing", "two-pointers", "sliding-window", "stacks", "binary-search", "heaps", "graphs", "dp"];

  // ---------- state ----------
  const blankState = () => ({
    v: 2, profile: { interviewDate: null, language: "js" }, diagnostic: null,
    items: {}, misses: {}, patterns: {}, streak: 0, best: 0, freezes: 0, lastDone: null, days: {}, drafts: {}, read: {}
  });

  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

  function migrate(raw) {
    if (!isObj(raw)) return blankState();
    const b = blankState();
    if (raw.v === 2) return Object.assign(b, raw, { profile: Object.assign(b.profile, isObj(raw.profile) ? raw.profile : {}) });
    if (raw.v !== 1) return b;
    b.streak = num(raw.streak); b.best = num(raw.best); b.freezes = num(raw.freezes);
    b.lastDone = typeof raw.lastDone === "string" ? raw.lastDone : null;
    if (isObj(raw.days)) for (const [d, v] of Object.entries(raw.days)) if (isObj(v)) {
      const { xp, ...rest } = v;
      b.days[d] = rest;
    }
    if (isObj(raw.drafts)) b.drafts = raw.drafts;
    if (isObj(raw.read)) b.read = raw.read;
    if (isObj(raw.items)) for (const [id, it] of Object.entries(raw.items)) if (isObj(it))
      b.items[id] = { seen: num(it.seen), correct: num(it.correct), wrong: num(it.wrong), last: typeof it.last === "string" ? it.last : null, hinted: false };
    return b;
  }

  // ---------- lookups ----------
  const byLevelId = (a, b) => a.level - b.level || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const isRecog = l => l.type === "mcq" || l.type === "multi";
  const cache = new WeakMap();
  function idx(ctx) {
    let I = cache.get(ctx);
    if (I) return I;
    I = { byId: new Map(), patByTopic: new Map(), patByTag: new Map(), byPattern: new Map(), tags: new Map() };
    for (const p of ctx.patterns) {
      for (const t of p.topics) I.patByTopic.set(t, p);
      for (const m of p.misconceptions) I.patByTag.set(m.id, p.id);
      I.byPattern.set(p.id, []);
    }
    for (const l of ctx.lessons) {
      I.byId.set(l.id, l);
      const p = l.track === "algo" ? I.patByTopic.get(l.topic) : null;
      if (p) I.byPattern.get(p.id).push(l);
      const s = new Set();
      if (l.misses) l.misses.forEach(m => m && s.add(m));
      if (l.miss) s.add(l.miss);
      if (l.tests) l.tests.forEach(t => t.miss && s.add(t.miss));
      I.tags.set(l.id, s);
    }
    for (const arr of I.byPattern.values()) arr.sort(byLevelId);
    cache.set(ctx, I);
    return I;
  }

  function patternOf(lesson, ctx) {
    if (!lesson || lesson.track !== "algo") return null;
    const p = idx(ctx).patByTopic.get(lesson.topic);
    return p ? p.id : null;
  }

  function inferMiss(lesson, response) {
    if (lesson.type === "mcq") return (lesson.misses && lesson.misses[response.picked]) || null;
    if (lesson.type === "multi" || lesson.type === "number") return lesson.miss || null;
    if (lesson.type === "code") {
      const res = (response && response.results) || [];
      for (let i = 0; i < lesson.tests.length; i++) if (res[i] && !res[i].pass && lesson.tests[i].miss) return lesson.tests[i].miss;
    }
    return null;
  }

  // ---------- recording ----------
  const seen = (state, id) => !!(state.items[id] && state.items[id].seen > 0);
  const solved = (state, id) => !!(state.items[id] && state.items[id].correct > 0);

  function recordAttempt(state, ctx, today, { lessonId, correct, tag, hinted, reviewOf, diagnostic }) {
    const lesson = idx(ctx).byId.get(lessonId);
    if (!lesson) return state;
    const wasSeen = seen(state, lessonId);
    const it = state.items[lessonId] || (state.items[lessonId] = { seen: 0, correct: 0, wrong: 0, last: null, hinted: false });
    it.seen++; it.last = today;
    if (correct) it.correct++; else it.wrong++;
    if (hinted) it.hinted = true;
    const d = state.days[today] || (state.days[today] = { answered: 0, correct: 0 });
    d.answered = (d.answered || 0) + 1;
    d.correct = (d.correct || 0) + (correct ? 1 : 0);

    const pid = patternOf(lesson, ctx);
    const ps = pid && (state.patterns[pid] || (state.patterns[pid] = { started: null, lastMiss: null, mastered: null }));
    if (ps && !ps.started) ps.started = today;

    const miss = (t) => {
      const m = state.misses[t] || (state.misses[t] = { box: 0, due: null, lastMiss: null, items: [], count: 0, resolved: false });
      m.box = 0; m.due = addDays(today, STEPS[0]); m.lastMiss = today; m.resolved = false;
      return m;
    };
    if (!correct) {
      if (ps) { ps.lastMiss = today; ps.mastered = null; }
      if (tag && ps) {
        const m = miss(tag);
        m.count++;
        if (!m.items.includes(lessonId)) m.items.push(lessonId);
      }
      if (ps && reviewOf && state.misses[reviewOf]) miss(reviewOf);
    } else if (reviewOf && state.misses[reviewOf] && !state.misses[reviewOf].resolved) {
      const m = state.misses[reviewOf];
      if (m.box >= 2) { m.box = 3; m.resolved = true; m.due = null; }
      else { m.box++; m.due = addDays(today, STEPS[m.box]); }
    }

    if (ps && correct && !hinted && !diagnostic && !wasSeen && lesson.type === "code" && (!ps.lastMiss || diffDays(today, ps.lastMiss) >= 2))
      ps.mastered = today;
    return state;
  }

  function dueTags(state, today) {
    return Object.entries(state.misses)
      .filter(([, m]) => !m.resolved && m.due && m.due <= today)
      .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : a[0] < b[0] ? -1 : 1))
      .map(([t]) => t);
  }

  function reviewFor(state, ctx, rng, tag, used) {
    const I = idx(ctx), pid = I.patByTag.get(tag), m = state.misses[tag];
    if (!pid || !m) return null;
    const pool = I.byPattern.get(pid).filter(l => I.tags.get(l.id).has(tag) && !used.has(l.id));
    const fresh = pool.filter(l => !m.items.includes(l.id));
    const list = fresh.length ? fresh : pool;
    if (!list.length) return null;
    const key = l => (state.items[l.id] && state.items[l.id].last) || "";
    const min = list.reduce((a, l) => (key(l) < a ? key(l) : a), key(list[0]));
    const ties = list.filter(l => key(l) === min);
    return { lessonId: ties[Math.floor(rng() * ties.length)].id, tag };
  }

  function pickReview(state, ctx, today, rng = seededRng("review-" + today)) {
    for (const tag of dueTags(state, today)) {
      const r = reviewFor(state, ctx, rng, tag, new Set());
      if (r) return r;
    }
    return null;
  }

  // ---------- readiness and schedule ----------
  function readiness(state, ctx, today) {
    const I = idx(ctx);
    return ctx.patterns.map(p => {
      const ls = I.byPattern.get(p.id);
      const ps = state.patterns[p.id] || {};
      const tagSet = new Set(p.misconceptions.map(m => m.id));
      const openMisses = Object.entries(state.misses).filter(([t, m]) => !m.resolved && tagSet.has(t)).length;
      const attempted = ls.filter(l => seen(state, l.id)).length;
      const correct = ls.filter(l => solved(state, l.id)).length;
      const status = ps.mastered && !openMisses ? "ready" : openMisses ? "shaky" : attempted ? "learning" : "new";
      return { id: p.id, name: p.name, status, openMisses, attempted, correct, hasContent: ls.length > 0 };
    });
  }

  function schedule(state, ctx, today) {
    const date = state.profile && state.profile.interviewDate;
    const daysLeft = date ? diffDays(date, today) : null;
    const phase = daysLeft === null ? "no-date" : daysLeft <= 0 ? "past" : daysLeft <= 7 ? "final-review" : "learn";
    const open = readiness(state, ctx, today).filter(r => r.hasContent && r.status !== "ready");
    const res = (state.diagnostic && state.diagnostic.results) || {};
    const weak = r => res[r.id] && res[r.id].correct < res[r.id].total;
    const current = (open.find(weak) || open[0] || {}).id || null;
    return { daysLeft, phase, current, remaining: open.length };
  }

  // ---------- diagnostic ----------
  function buildDiagnostic(ctx) {
    const I = idx(ctx);
    const ids = [];
    for (const pid of DIAG_PATTERNS) {
      const ls = I.byPattern.get(pid);
      if (!ls || !ls.length) continue;
      const pick = pid === "hashing" ? ls.find(l => l.type === "code") : ls.find(isRecog) || ls.find(l => l.type === "code");
      if (pick) ids.push(pick.id);
    }
    return ids;
  }

  function recordDiagnostic(state, ctx, today, answers) {
    const results = {};
    for (const a of answers) {
      const pid = patternOf(idx(ctx).byId.get(a.lessonId), ctx);
      if (pid) {
        const r = results[pid] || (results[pid] = { correct: 0, total: 0 });
        r.total++; if (a.correct) r.correct++;
      }
      recordAttempt(state, ctx, today, { lessonId: a.lessonId, correct: a.correct, tag: a.tag, hinted: false, diagnostic: true });
    }
    state.diagnostic = { at: today, results };
    return state;
  }

  // ---------- session ----------
  function composeSession(state, ctx, today, rng = seededRng("session-" + today)) {
    const I = idx(ctx);
    const sch = schedule(state, ctx, today);
    const rd = readiness(state, ctx, today);
    const used = new Set();
    const out = [];
    const add = e => { out.push(e); if (e.lessonId) used.add(e.lessonId); };
    const free = l => !used.has(l.id);
    const lessonsOf = pid => (pid ? I.byPattern.get(pid) : []).filter(free);
    const recogFor = pid => {
      const list = lessonsOf(pid).filter(isRecog);
      return list.find(l => !solved(state, l.id)) || list[0];
    };
    const exerciseFor = pid => {
      const code = lessonsOf(pid).filter(l => l.type === "code");
      if (code.length) return code.find(l => !seen(state, l.id)) || code.find(l => !solved(state, l.id)) || code[0];
      const rec = lessonsOf(pid).filter(isRecog);
      return rec.find(l => !seen(state, l.id)) || rec[0];
    };
    const open = rd.filter(r => r.hasContent && r.status !== "ready");

    if (sch.phase === "no-date" || sch.phase === "learn") {
      const cur = sch.current || (rd.find(r => r.hasContent) || {}).id || null;
      const rev = pickReview(state, ctx, today, rng);
      if (rev) add({ kind: "review", lessonId: rev.lessonId, tag: rev.tag });
      else {
        const rec = recogFor(cur) || ctx.patterns.map(p => recogFor(p.id)).find(Boolean);
        if (rec) add({ kind: "recognition", lessonId: rec.id });
      }
      const pat = ctx.patterns.find(p => p.id === cur);
      if (pat) add({ kind: "concept", patternId: pat.id, guideId: pat.guide });
      const ex = exerciseFor(cur);
      if (ex) {
        const ps = state.patterns[cur] || {};
        const hasCorrect = I.byPattern.get(cur).some(l => solved(state, l.id));
        const independent = ex.type === "code" && hasCorrect && !seen(state, ex.id) && (!ps.lastMiss || diffDays(today, ps.lastMiss) >= 2);
        add({ kind: "exercise", lessonId: ex.id, independent });
      }
      return out;
    }

    for (const tag of dueTags(state, today)) {
      if (out.length >= 3) break;
      const r = reviewFor(state, ctx, rng, tag, used);
      if (r) add({ kind: "review", lessonId: r.lessonId, tag: r.tag });
    }
    const rank = { shaky: 0, learning: 1, new: 2 };
    const order = open.slice().sort((a, b) => rank[a.status] - rank[b.status]);
    for (let pass = 0; pass < 3 && out.length < 3; pass++)
      for (const r of order) {
        if (out.length >= 3) break;
        const ex = exerciseFor(r.id);
        if (ex) add({ kind: "exercise", lessonId: ex.id, independent: true });
      }
    return out;
  }

  const CORE = {
    fmt, parse, addDays, diffDays, seededRng, blankState, migrate, patternOf, inferMiss, recordAttempt,
    dueTags, pickReview, readiness, schedule, buildDiagnostic, recordDiagnostic, composeSession
  };
  if (typeof module !== "undefined") module.exports = CORE;
  else window.CORE = CORE;
})();
