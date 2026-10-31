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
  const STALE_DAYS = 30;     // a Ready pattern with an older independent check shows as review due
  const CHECK_GAP = 2;       // days between a miss (or the last try of a retried lesson) and an independent check
  const EVENT_CAP = 3000;

  // ---------- state ----------
  // legacy: counters predate the event log, so sync falls back to a field merge once.
  const blankState = () => ({
    v: 3, profile: { interviewDate: null, language: "js", company: null }, diagnostic: null,
    items: {}, misses: {}, patterns: {}, streak: 0, best: 0, freezes: 0, lastDone: null, days: {}, drafts: {}, read: {},
    events: [], legacy: false, owner: null, repair: null
  });

  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const draft = v => (typeof v === "string" ? { code: v, ts: "" } : isObj(v) && typeof v.code === "string" ? { code: v.code, ts: typeof v.ts === "string" ? v.ts : "" } : null);
  const drafts = raw => {
    const out = {};
    if (isObj(raw)) for (const [id, v] of Object.entries(raw)) { const d = draft(v); if (d) out[id] = d; }
    return out;
  };

  function migrate(raw) {
    if (!isObj(raw)) return blankState();
    const b = blankState();
    if (raw.v === 2 || raw.v === 3) {
      const s = Object.assign(b, raw, { v: 3, profile: Object.assign(b.profile, isObj(raw.profile) ? raw.profile : {}), drafts: drafts(raw.drafts) });
      if (!Array.isArray(s.events)) s.events = [];
      if (raw.v === 2) {
        s.legacy = true;
        // v2 marked a pattern mastered after one unaided answer, which is too little evidence to keep
        const pats = {};
        if (isObj(raw.patterns)) for (const [id, p] of Object.entries(raw.patterns)) if (isObj(p))
          pats[id] = { started: p.started || null, lastMiss: p.lastMiss || null, firstWin: null, lastWin: null, check: null };
        s.patterns = pats;
      }
      return s;
    }
    if (raw.v !== 1) return b;
    b.legacy = true;
    b.streak = num(raw.streak); b.best = num(raw.best); b.freezes = num(raw.freezes);
    b.lastDone = typeof raw.lastDone === "string" ? raw.lastDone : null;
    if (isObj(raw.days)) for (const [d, v] of Object.entries(raw.days)) if (isObj(v)) {
      const { xp, ...rest } = v;
      b.days[d] = rest;
    }
    b.drafts = drafts(raw.drafts);
    if (isObj(raw.read)) b.read = raw.read;
    if (isObj(raw.items)) for (const [id, it] of Object.entries(raw.items)) if (isObj(it))
      b.items[id] = { seen: num(it.seen), correct: num(it.correct), wrong: num(it.wrong), last: typeof it.last === "string" ? it.last : null, hinted: false, clean: 0 };
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
    if (lesson.pattern) return lesson.pattern;
    const p = idx(ctx).patByTopic.get(lesson.topic);
    return p ? p.id : null;
  }

  function inferMiss(lesson, response) {
    if (lesson.type === "mcq") return (lesson.misses && lesson.misses[response.picked]) || null;
    if (lesson.type === "multi" || lesson.type === "number") return lesson.miss || null;
    if (lesson.type === "code") {
      const res = (response && response.results) || [];
      if (!res.some(r => r && r.pass)) return null;
      for (let i = 0; i < lesson.tests.length; i++) if (res[i] && !res[i].pass && lesson.tests[i].miss) return lesson.tests[i].miss;
    }
    return null;
  }

  // ---------- recording ----------
  const seen = (state, id) => !!(state.items[id] && state.items[id].seen > 0);
  const solved = (state, id) => !!(state.items[id] && state.items[id].correct > 0);

  const evKey = e => `${e.ts || ""}|${e.id || ""}`;
  const byEvKey = (a, b) => (evKey(a) < evKey(b) ? -1 : evKey(a) > evKey(b) ? 1 : 0);

  // An attempt. failedRuns counts test runs with failing tests before the final one (syntax and runtime
  // errors are errorRuns and don't count against independence). revealed means the solution was shown.
  // id and ts identify the attempt so sync can replay it on another device exactly once.
  function recordAttempt(state, ctx, today, a) {
    const { lessonId, correct, tag, hinted, reviewOf, diagnostic } = a;
    const failedRuns = a.failedRuns || 0, errorRuns = a.errorRuns || 0, revealed = !!a.revealed;
    const I = idx(ctx);
    // a replayed attempt on a lesson this device can't see (paid content) still carries its pattern and type
    const lesson = I.byId.get(lessonId) || (a.pattern !== undefined ? { id: lessonId, track: a.pattern ? "algo" : "sd", type: a.type, pattern: a.pattern } : null);
    if (!lesson) return state;
    if (a.id && state.events.some(e => e.id === a.id)) return state;
    const prev = state.items[lessonId];
    const wasSeen = !!(prev && prev.seen > 0), prevLast = prev ? prev.last : null, prevClean = prev ? prev.clean || 0 : 0;
    const it = state.items[lessonId] || (state.items[lessonId] = { seen: 0, correct: 0, wrong: 0, last: null, hinted: false, clean: 0 });
    it.seen++; it.last = today;
    if (correct) it.correct++; else it.wrong++;
    if (hinted) it.hinted = true;
    const unaided = !!correct && !hinted && !revealed && failedRuns === 0;
    if (unaided) it.clean = (it.clean || 0) + 1;
    const d = state.days[today] || (state.days[today] = { answered: 0, correct: 0 });
    d.answered = (d.answered || 0) + 1;
    d.correct = (d.correct || 0) + (correct ? 1 : 0);

    const pid = patternOf(lesson, ctx);
    const ps = pid && (state.patterns[pid] || (state.patterns[pid] = { started: null, lastMiss: null, firstWin: null, lastWin: null, check: null }));
    if (ps && !ps.started) ps.started = today;
    const bank = (pid && I.byPattern.get(pid)) || [];
    const priorWin = ps && (ps.firstWin ? ps.firstWin < today : bank.some(l => l.id !== lessonId && solved(state, l.id)));

    const entry = t => state.misses[t] || (state.misses[t] = { box: 0, due: null, lastMiss: null, items: [], count: 0, resolved: false });
    const note = (m) => { m.count++; if (!m.items.includes(lessonId)) m.items.push(lessonId); };
    const miss = (t) => {
      const m = entry(t);
      m.box = 0; m.due = addDays(today, STEPS[0]); m.lastMiss = today; m.resolved = false;
      return m;
    };
    if (!correct) {
      if (ps) { ps.lastMiss = today; ps.check = null; }
      if (tag && ps) note(miss(tag));
      if (ps && reviewOf && state.misses[reviewOf]) miss(reviewOf);
    } else if (ps) {
      if (!ps.firstWin) ps.firstWin = today;
      ps.lastWin = today;
      if (tag) {
        // passed in the end, but an earlier run showed this mistake: keep it in the notebook, back in 3 days
        const m = entry(tag), due = addDays(today, STEPS[1]);
        if (m.resolved || !m.due) { m.box = 1; m.due = due; }
        else if (m.due > due) { m.box = Math.min(m.box, 1); m.due = due; }
        m.resolved = false; m.lastMiss = today;
        note(m);
      }
      const r = reviewOf && state.misses[reviewOf];
      if (r && !r.resolved && failedRuns === 0 && !hinted && tag !== reviewOf) {
        if (r.box >= 2) { r.box = 3; r.resolved = true; r.due = null; }
        else { r.box++; r.due = addDays(today, STEPS[r.box]); }
      }
      if (unaided && !diagnostic && lesson.type === "code" && priorWin && (!ps.lastMiss || diffDays(today, ps.lastMiss) >= CHECK_GAP)) {
        const unseenLeft = bank.some(l => l.type === "code" && l.id !== lessonId && !seen(state, l.id));
        if (!wasSeen) ps.check = { at: today, lessonId, kind: "fresh" };
        else if (!prevClean && prevLast && diffDays(today, prevLast) >= CHECK_GAP && !unseenLeft) ps.check = { at: today, lessonId, kind: "retry" };
      }
    }

    state.events.push({
      id: a.id || null, ts: a.ts || null, at: today, lessonId, pattern: pid || null, type: lesson.type,
      correct: !!correct, tag: tag || null, hinted: !!hinted, failedRuns, errorRuns, revealed,
      reviewOf: reviewOf || null, diagnostic: !!diagnostic
    });
    if (state.events.length > EVENT_CAP) state.events.splice(0, state.events.length - EVENT_CAP);
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
      const check = ps.check || null;
      // Ready needs two different solved problems and an unaided check on a later day than the first win
      const proven = !!check && correct >= 2;
      const status = openMisses ? "shaky" : proven ? (diffDays(today, check.at) > STALE_DAYS ? "due" : "ready") : attempted ? "learning" : "new";
      return { id: p.id, name: p.name, status, openMisses, attempted, correct, check, lastWin: ps.lastWin || null, hasContent: ls.length > 0 };
    });
  }

  // ctx.companies is optional. A chosen company's focus patterns come right after the diagnosed weak spots.
  function companyOf(state, ctx) {
    const c = state.profile && state.profile.company;
    return (c && (ctx.companies || []).find(x => x.id === c.id)) || null;
  }

  function schedule(state, ctx, today) {
    const date = state.profile && state.profile.interviewDate;
    const daysLeft = date ? diffDays(date, today) : null;
    const phase = daysLeft === null ? "no-date" : daysLeft <= 0 ? "past" : daysLeft <= 7 ? "final-review" : "learn";
    const open = readiness(state, ctx, today).filter(r => r.hasContent && r.status !== "ready");
    const res = (state.diagnostic && state.diagnostic.results) || {};
    const weak = r => res[r.id] && res[r.id].correct < res[r.id].total;
    const comp = companyOf(state, ctx);
    const focus = r => !!comp && comp.focus.includes(r.id);
    const current = (open.find(weak) || open.find(focus) || open[0] || {}).id || null;
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
    // The last unseen code lesson of a pattern is held back for the independent check, so ordinary
    // practice never uses up every fresh problem. Once the bank is seen, a lesson never solved unaided
    // and not tried for CHECK_GAP days can serve as a retry check.
    const codeOf = pid => lessonsOf(pid).filter(l => l.type === "code");
    const reservedFor = pid => { const un = codeOf(pid).filter(l => !seen(state, l.id)); return un.length ? un[un.length - 1] : null; };
    const retryFor = pid => codeOf(pid).find(l => {
      const it = state.items[l.id];
      return it && it.seen && !it.clean && it.last && diffDays(today, it.last) >= CHECK_GAP;
    });
    const checkFor = pid => {
      if (!pid) return null;
      const ps = state.patterns[pid] || {};
      const prior = ps.firstWin ? ps.firstWin < today : I.byPattern.get(pid).some(l => solved(state, l.id));
      if (!prior || (ps.lastMiss && diffDays(today, ps.lastMiss) < CHECK_GAP)) return null;
      return reservedFor(pid) || retryFor(pid) || null;
    };
    const exerciseFor = pid => {
      const held = reservedFor(pid);
      const code = codeOf(pid).filter(l => l !== held);
      if (code.length) return code.find(l => !seen(state, l.id)) || code.find(l => !solved(state, l.id)) || code[0];
      const rec = lessonsOf(pid).filter(isRecog);
      return rec.find(l => !seen(state, l.id)) || rec[0] || held;
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
      const chk = checkFor(cur);
      const ex = chk || exerciseFor(cur);
      if (ex) add({ kind: "exercise", lessonId: ex.id, independent: !!chk });
      return out;
    }

    for (const tag of dueTags(state, today)) {
      if (out.length >= 3) break;
      const r = reviewFor(state, ctx, rng, tag, used);
      if (r) add({ kind: "review", lessonId: r.lessonId, tag: r.tag });
    }
    const rank = { shaky: 0, learning: 1, new: 2 };
    const comp = companyOf(state, ctx);
    const focused = r => (comp && comp.focus.includes(r.id) ? 0 : 1);
    const order = open.slice().sort((a, b) => rank[a.status] - rank[b.status] || focused(a) - focused(b));
    for (let pass = 0; pass < 3 && out.length < 3; pass++)
      for (const r of order) {
        if (out.length >= 3) break;
        const ex = checkFor(r.id) || exerciseFor(r.id);
        if (ex) add({ kind: "exercise", lessonId: ex.id, independent: true });
      }
    return out;
  }

  // ---------- sync ----------
  const later = (a, b) => (a && (!b || a > b) ? a : null);
  const newest = (...xs) => xs.filter(Boolean).sort().pop() || null;
  const pick = (l, r, key) => (later(key(l), key(r)) ? l : r);
  const mergeBy = (a, b, key) => {
    const out = {};
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)]))
      out[id] = !(id in a) ? b[id] : !(id in b) ? a[id] : pick(a[id], b[id], key);
    return out;
  };

  const clone = x => JSON.parse(JSON.stringify(x));
  const doneCount = d => (d && d.session && Array.isArray(d.session.done) ? d.session.done.length : -1);

  // Days: counts come from the attempt merge; flags union; the same-day session with more progress wins.
  function mergeDays(l, r, counts) {
    const out = {};
    for (const date of new Set([...Object.keys(l), ...Object.keys(r), ...Object.keys(counts)])) {
      const a = l[date] || {}, b = r[date] || {};
      const d = Object.assign({}, b, counts[date] ? { answered: counts[date].answered, correct: counts[date].correct } : {});
      if (counts[date] === undefined && !(date in r)) Object.assign(d, { answered: a.answered || 0, correct: a.correct || 0 });
      if (a.done || b.done) d.done = true;
      if (a.frozen || b.frozen) d.frozen = true;
      const sa = doneCount(a), sb = doneCount(b);
      if (sa > sb) d.session = a.session;
      out[date] = d;
    }
    return out;
  }

  // Older states have counters but no event log, so the only option is to pick a side per entry.
  function fieldMerge(l, r) {
    return {
      items: mergeBy(l.items, r.items, x => x.last),
      misses: mergeBy(l.misses, r.misses, x => x.lastMiss),
      patterns: mergeBy(l.patterns, r.patterns, x => newest(x.lastWin, x.lastMiss, x.started)),
      days: mergeDays(l.days, r.days, {}),
      events: unionEvents(l.events, r.events)
    };
  }

  function unionEvents(a, b) {
    const seenIds = new Set(), out = [];
    for (const e of [...a, ...b]) {
      if (e.id) { if (seenIds.has(e.id)) continue; seenIds.add(e.id); }
      out.push(e);
    }
    out.sort(byEvKey);
    return out.slice(-EVENT_CAP);
  }

  // Remote is the base. Every local attempt the remote hasn't seen is replayed on top of it, so work done
  // on two devices on the same day keeps every attempt. Replays are skipped below the remote's oldest kept
  // event when its log is full, since those may have been trimmed rather than missing.
  function replayMerge(l, r, ctx) {
    const base = clone(r);
    const have = new Set(base.events.map(e => e.id).filter(Boolean));
    const floor = base.events.length >= EVENT_CAP ? evKey(base.events[0]) : "";
    const missing = l.events.filter(e => e.id && !have.has(e.id) && evKey(e) >= floor).sort(byEvKey);
    const counts = {};
    for (const [date, d] of Object.entries(base.days)) counts[date] = { answered: d.answered || 0, correct: d.correct || 0 };
    for (const e of missing) {
      recordAttempt(base, ctx, e.at, e);
      const c = counts[e.at] || (counts[e.at] = { answered: 0, correct: 0 });
      c.answered++; if (e.correct) c.correct++;
    }
    base.events.sort(byEvKey);
    return { items: base.items, misses: base.misses, patterns: base.patterns, days: mergeDays(l.days, r.days, counts), events: base.events };
  }

  function mergeProgress(local, remote, ctx) {
    const l = migrate(local), r = migrate(remote);
    const localWins = later(l.lastDone, r.lastDone) !== null;
    const live = localWins ? l : r;
    const core = !ctx || l.legacy || r.legacy ? fieldMerge(l, r) : replayMerge(l, r, ctx);
    const diag = !l.diagnostic ? r.diagnostic : !r.diagnostic ? l.diagnostic : l.diagnostic.at > r.diagnostic.at ? l.diagnostic : r.diagnostic;
    const ds = {};
    for (const id of new Set([...Object.keys(l.drafts), ...Object.keys(r.drafts)]))
      ds[id] = !r.drafts[id] ? l.drafts[id] : !l.drafts[id] ? r.drafts[id] : l.drafts[id].ts > r.drafts[id].ts ? l.drafts[id] : r.drafts[id];
    return clone({
      v: 3,
      profile: r.profile.interviewDate ? { ...r.profile } : { ...l.profile },
      diagnostic: diag,
      items: core.items, misses: core.misses, patterns: core.patterns,
      streak: live.streak, freezes: live.freezes, lastDone: live.lastDone,
      best: Math.max(l.best, r.best),
      days: core.days,
      drafts: ds,
      read: { ...l.read, ...r.read },
      events: core.events,
      repair: (l.repair && l.repair.done) || !r.repair ? l.repair : r.repair,
      legacy: false,
      owner: r.owner || l.owner || null,
      updatedAt: newest(l.updatedAt, r.updatedAt)
    });
  }

  function queueRows(misses) {
    const upsert = [], remove = [];
    for (const [tag, m] of Object.entries(misses)) {
      if (m.resolved) remove.push(tag);
      else if (m.due) upsert.push({ item_id: tag, due_at: m.due, interval_days: STEPS[m.box] });
    }
    return { upsert, remove };
  }

  const sessionsDone = state => Object.values(state.days).filter(d => d && d.done).length;
  const patternLocked = (meta, pid) => !!meta && meta.lockedPatterns.includes(pid);

  const CORE = {
    fmt, parse, addDays, diffDays, seededRng, blankState, migrate, patternOf, inferMiss, recordAttempt,
    dueTags, pickReview, readiness, schedule, companyOf, buildDiagnostic, recordDiagnostic, composeSession, mergeProgress, queueRows, sessionsDone, patternLocked, STALE_DAYS
  };
  if (typeof module !== "undefined") module.exports = CORE;
  else window.CORE = CORE;
})();
