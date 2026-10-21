// Interactive widgets for the study guides. Each VIZ.name(el) mounts into an empty element.
(() => {
  "use strict";
  const VIZ = {};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const si = (n, unit = "") => {
    const units = [[1e15, "P"], [1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"]];
    for (const [v, s] of units) if (Math.abs(n) >= v) return `${+(n / v).toFixed(n / v < 10 ? 1 : 0)} ${s}${unit}`;
    return `${+n.toFixed(n < 10 ? 1 : 0)} ${unit}`.trim();
  };
  const nums = s => s.split(/[\s,]+/).filter(Boolean).map(Number).filter(Number.isFinite);

  // Step player shared by the algorithm walkthroughs. build() returns frames, draw(frame) returns stage HTML.
  function stepper(root, build, draw) {
    root.insertAdjacentHTML("beforeend", `
      <div class="viz-stage"></div>
      <p class="viz-caption"></p>
      <div class="viz-controls">
        <button class="btn ghost small" data-v="prev" aria-label="Previous step">Back</button>
        <button class="btn primary small" data-v="play">Play</button>
        <button class="btn ghost small" data-v="next" aria-label="Next step">Step</button>
        <button class="btn ghost small" data-v="restart">Restart</button>
        <span class="viz-count muted small"></span>
      </div>`);
    const stage = root.querySelector(".viz-stage"), cap = root.querySelector(".viz-caption");
    const count = root.querySelector(".viz-count"), playBtn = root.querySelector('[data-v="play"]');
    let frames = [], i = 0, timer = null;
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = "Play"; };
    const show = () => {
      const f = frames[i];
      stage.innerHTML = draw(f);
      cap.innerHTML = f.msg || "";
      count.textContent = `step ${i + 1} / ${frames.length}`;
    };
    const go = d => { i = Math.max(0, Math.min(frames.length - 1, i + d)); show(); if (i === frames.length - 1) stop(); };
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-v]");
      if (!b) return;
      const v = b.dataset.v;
      if (v === "prev") { stop(); go(-1); }
      else if (v === "next") { stop(); go(1); }
      else if (v === "restart") { stop(); i = 0; show(); }
      else if (v === "play") {
        if (timer) { stop(); return; }
        if (i === frames.length - 1) i = 0;
        playBtn.textContent = "Pause";
        show();
        timer = setInterval(() => { if (!root.isConnected) { stop(); return; } go(1); }, 650);
      }
    });
    const reset = () => { stop(); frames = build(); i = 0; show(); };
    reset();
    return { reset };
  }

  const cells = (arr, cls = () => "", sub = () => "") =>
    `<div class="cells">${arr.map((v, i) => `<div class="cell ${cls(i)}"><b>${esc(v)}</b><span>${sub(i)}</span></div>`).join("")}</div>`;

  // ---------- complexity ----------
  VIZ.complexity = el => {
    el.innerHTML = `
      <div class="viz-head"><h4>Growth lab</h4><span class="muted small">at about 10^8 operations per second</span></div>
      <label class="viz-field wide">n = <b class="cx-n"></b><input type="range" min="0" max="9" step="0.1" value="5" class="cx-range" aria-label="Input size, log scale" /></label>
      <div class="cx-rows"></div>`;
    const range = el.querySelector(".cx-range");
    const fmtTime = s => {
      if (!isFinite(s) || s > 1e17) return "longer than the universe";
      const steps = [[3.15e7, "years"], [86400, "days"], [3600, "hours"], [60, "min"], [1, "s"], [1e-3, "ms"], [1e-6, "µs"]];
      for (const [v, u] of steps) if (s >= v) return `${+(s / v).toFixed(s / v < 10 ? 1 : 0)} ${u}`;
      return `${Math.max(1, Math.round(s * 1e9))} ns`;
    };
    const update = () => {
      const n = Math.max(1, Math.round(10 ** Number(range.value)));
      el.querySelector(".cx-n").textContent = n.toLocaleString("en-US");
      const lg = Math.max(1, Math.log2(n));
      const rows = [
        ["O(1)", 1, "hash lookup"], ["O(log n)", lg, "binary search"], ["O(n)", n, "one pass"],
        ["O(n log n)", n * lg, "sorting"], ["O(n²)", n * n, "all pairs"], ["O(2^n)", n > 1100 ? Infinity : 2 ** n, "all subsets"]
      ];
      el.querySelector(".cx-rows").innerHTML = rows.map(([name, ops, ex]) => {
        const t = ops / 1e8;
        const pct = isFinite(ops) ? Math.min(100, (Math.log10(Math.max(1, ops)) / 18) * 100) : 100;
        const cls = t < 1 ? "ok" : t < 60 ? "warn" : "bad";
        return `<div class="cx-row ${cls}">
          <code>${name}</code>
          <span class="cx-bar"><span style="width:${Math.max(2, pct)}%"></span></span>
          <span class="cx-time">${fmtTime(t)}</span>
          <span class="muted small cx-ex">${ex}</span></div>`;
      }).join("");
    };
    range.addEventListener("input", update);
    update();
  };

  // ---------- binary search ----------
  VIZ.bsearch = el => {
    const arr = [2, 5, 8, 12, 16, 23, 38, 42, 51, 56, 63, 72, 77, 85, 91, 99];
    el.innerHTML = `
      <div class="viz-head"><h4>Binary search</h4><span class="muted small">16 sorted numbers, at most 5 checks</span></div>
      <div class="viz-row">
        <label class="viz-field">Target <input type="number" class="viz-input bs-t" value="72" /></label>
        <button class="btn ghost small" data-x="rand">Random target</button>
      </div>`;
    const input = el.querySelector(".bs-t");
    const build = () => {
      const t = Number(input.value);
      const f = [];
      let lo = 0, hi = arr.length - 1, n = 0;
      f.push({ lo, hi, mid: -1, msg: `Looking for <b>${t}</b>. The whole array is still possible: lo = 0, hi = ${hi}.` });
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        n++;
        if (arr[mid] === t) { f.push({ lo, hi, mid, found: mid, msg: `Check ${n}: arr[${mid}] = ${arr[mid]}. Found it after ${n} comparison${n > 1 ? "s" : ""}.` }); return f; }
        if (arr[mid] < t) {
          f.push({ lo, hi, mid, msg: `Check ${n}: arr[${mid}] = ${arr[mid]} is less than ${t}, so everything left of it is out. lo = ${mid + 1}.` });
          lo = mid + 1;
        } else {
          f.push({ lo, hi, mid, msg: `Check ${n}: arr[${mid}] = ${arr[mid]} is greater than ${t}, so everything right of it is out. hi = ${mid - 1}.` });
          hi = mid - 1;
        }
        f.push({ lo, hi, mid: -1, msg: lo <= hi ? `${hi - lo + 1} candidate${hi - lo ? "s" : ""} left.` : `lo passed hi. ${t} isn't in the array, and lo = ${lo} is where it would be inserted.` });
      }
      return f;
    };
    const draw = f => cells(arr,
      i => [i < f.lo || i > f.hi ? "dead" : "", i === f.mid ? "mid" : "", i === f.found ? "hit" : ""].join(" "),
      i => [i === f.lo ? "lo" : "", i === f.hi ? "hi" : "", i === f.mid ? "mid" : ""].filter(Boolean).join(" ") || i);
    const s = stepper(el, build, draw);
    input.addEventListener("change", s.reset);
    el.querySelector('[data-x="rand"]').addEventListener("click", () => {
      input.value = Math.random() < 0.75 ? arr[Math.floor(Math.random() * arr.length)] : Math.floor(Math.random() * 100);
      s.reset();
    });
  };

  // ---------- sliding window ----------
  VIZ.window = el => {
    el.innerHTML = `
      <div class="viz-head"><h4>Sliding window</h4><span class="muted small">longest substring with no repeated character</span></div>
      <div class="viz-row"><label class="viz-field">String <input class="viz-input wide-in sw-s" value="abcabcbb" maxlength="24" spellcheck="false" /></label></div>`;
    const input = el.querySelector(".sw-s");
    const build = () => {
      const s = input.value || "a";
      const f = [];
      const inWin = new Set();
      let l = 0, best = 0, bestL = 0;
      for (let r = 0; r < s.length; r++) {
        while (inWin.has(s[r])) {
          f.push({ s, l, r, best, bestL, dup: r, msg: `'${esc(s[r])}' is already in the window, so shrink from the left: drop '${esc(s[l])}'.` });
          inWin.delete(s[l]); l++;
        }
        inWin.add(s[r]);
        const grew = r - l + 1 > best;
        if (grew) { best = r - l + 1; bestL = l; }
        f.push({ s, l, r, best, bestL, msg: `Add '${esc(s[r])}'. Window is "${esc(s.slice(l, r + 1))}", length ${r - l + 1}.${grew ? " New best." : ""}` });
      }
      f.push({ s, l: -1, r: -2, best, bestL, done: true, msg: `Done. Longest is "${esc(s.slice(bestL, bestL + best))}" with length <b>${best}</b>. Each character entered and left the window at most once: O(n).` });
      return f;
    };
    const draw = f => cells([...f.s],
      i => [i >= f.l && i <= f.r ? "in" : "", i === f.dup ? "bad" : "", f.done && i >= f.bestL && i < f.bestL + f.best ? "hit" : ""].join(" "),
      i => [i === f.l ? "l" : "", i === f.r ? "r" : ""].filter(Boolean).join(" ") || i)
      + `<div class="viz-stat">best so far: <b>${f.best}</b></div>`;
    const s = stepper(el, build, draw);
    input.addEventListener("input", s.reset);
  };

  // ---------- monotonic stack ----------
  VIZ.monostack = el => {
    el.innerHTML = `
      <div class="viz-head"><h4>Monotonic stack</h4><span class="muted small">next greater element for each position</span></div>
      <div class="viz-row"><label class="viz-field">Numbers <input class="viz-input wide-in ms-a" value="2, 1, 2, 4, 3, 1, 5, 2" spellcheck="false" /></label></div>`;
    const input = el.querySelector(".ms-a");
    const build = () => {
      const a = nums(input.value).slice(0, 14);
      if (!a.length) a.push(1);
      const res = new Array(a.length).fill("?");
      const st = [];
      const f = [{ a, i: -1, st: [], res: res.slice(), msg: "Scan left to right. The stack holds indices still waiting for a bigger number, values decreasing from bottom to top." }];
      for (let i = 0; i < a.length; i++) {
        while (st.length && a[st[st.length - 1]] < a[i]) {
          const j = st.pop();
          res[j] = a[i];
          f.push({ a, i, st: st.slice(), res: res.slice(), pop: j, msg: `${a[i]} is bigger than ${a[j]} at index ${j}, so ${a[i]} is its answer. Pop it.` });
        }
        st.push(i);
        f.push({ a, i, st: st.slice(), res: res.slice(), msg: `Push index ${i} (${a[i]}). It waits for something bigger.` });
      }
      st.forEach(j => (res[j] = -1));
      f.push({ a, i: -1, st: [], res: res.slice(), msg: `Anything left on the stack never found a bigger number, so it gets -1. Every index was pushed and popped once: O(n).` });
      return f;
    };
    const draw = f => cells(f.a, i => [i === f.i ? "mid" : "", f.st.includes(i) ? "in" : "", i === f.pop ? "hit" : ""].join(" "), i => i)
      + `<div class="viz-sub"><span class="muted small">answer</span>${cells(f.res, i => (f.res[i] === "?" ? "dead" : ""))}</div>`
      + `<div class="viz-sub"><span class="muted small">stack (bottom to top)</span><div class="stack">${f.st.map(j => `<span>${esc(f.a[j])}<i>@${j}</i></span>`).join("") || `<em class="muted small">empty</em>`}</div></div>`;
    const s = stepper(el, build, draw);
    input.addEventListener("change", s.reset);
  };

  // ---------- heap ----------
  VIZ.heap = el => {
    el.innerHTML = `
      <div class="viz-head"><h4>Min heap</h4><span class="muted small">a tree stored in an array, max 15 items</span></div>
      <div class="viz-row">
        <label class="viz-field">Value <input type="number" class="viz-input hp-v" value="7" /></label>
        <button class="btn primary small" data-h="push">Push</button>
        <button class="btn ghost small" data-h="rand">Push random</button>
        <button class="btn ghost small" data-h="pop">Pop min</button>
        <button class="btn ghost small" data-h="clear">Clear</button>
      </div>
      <div class="hp-stage"></div>
      <p class="viz-caption hp-cap">Push a few values. Each push sifts up, each pop sifts down, both O(log n).</p>`;
    let heap = [9, 14, 11, 20, 18, 30];
    let mark = [];
    let busy = false;
    const stage = el.querySelector(".hp-stage"), cap = el.querySelector(".hp-cap");
    const draw = () => {
      const W = 600, H = 210;
      const pos = i => {
        const lvl = Math.floor(Math.log2(i + 1)), idx = i - (2 ** lvl - 1), slots = 2 ** lvl;
        return [((idx + 0.5) / slots) * W, 28 + lvl * 52];
      };
      let lines = "", nodes = "";
      heap.forEach((v, i) => {
        const [x, y] = pos(i);
        if (i) { const [px, py] = pos((i - 1) >> 1); lines += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" />`; }
        nodes += `<g class="${mark.includes(i) ? "mark" : ""}"><circle cx="${x}" cy="${y}" r="18" /><text x="${x}" y="${y + 5}">${v}</text><text class="idx" x="${x}" y="${y + 32}">${i}</text></g>`;
      });
      stage.innerHTML = `<svg class="hp-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Heap as a tree">${lines}${nodes}</svg>`
        + cells(heap.length ? heap : ["empty"], i => (mark.includes(i) ? "mid" : ""), i => (heap.length ? i : ""));
    };
    const animate = (steps, done) => {
      busy = true;
      let k = 0;
      const tick = () => {
        if (k >= steps.length || !el.isConnected) { busy = false; mark = []; draw(); if (done) cap.innerHTML = done; return; }
        const s = steps[k++];
        heap = s.heap; mark = s.mark; cap.innerHTML = s.msg; draw();
        setTimeout(tick, 700);
      };
      tick();
    };
    const push = v => {
      if (busy) return;
      if (heap.length >= 15) { cap.textContent = "Heap is full for this demo. Pop something first."; return; }
      const h = heap.concat(v), steps = [];
      let i = h.length - 1;
      steps.push({ heap: h.slice(), mark: [i], msg: `Add ${v} at the end, index ${i}.` });
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (h[p] <= h[i]) { steps.push({ heap: h.slice(), mark: [i, p], msg: `Parent ${h[p]} at index ${p} is not bigger. Stop.` }); break; }
        steps.push({ heap: h.slice(), mark: [i, p], msg: `${h[i]} is smaller than its parent ${h[p]} at index ${p} = (${i} - 1) >> 1. Swap.` });
        [h[i], h[p]] = [h[p], h[i]]; i = p;
        steps.push({ heap: h.slice(), mark: [i], msg: `Now at index ${i}.` });
      }
      animate(steps, `Pushed ${v}. The minimum is always at index 0: ${h[0]}.`);
    };
    const pop = () => {
      if (busy) return;
      if (!heap.length) { cap.textContent = "Nothing to pop."; return; }
      const h = heap.slice(), min = h[0], last = h.pop(), steps = [];
      if (!h.length) { animate([{ heap: [], mark: [], msg: `Popped ${min}. Heap is empty.` }]); return; }
      h[0] = last;
      steps.push({ heap: h.slice(), mark: [0], msg: `Remove the min ${min}. Move the last item ${last} to the root.` });
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && h[l] < h[m]) m = l;
        if (r < h.length && h[r] < h[m]) m = r;
        if (m === i) { steps.push({ heap: h.slice(), mark: [i], msg: `No child is smaller. Done.` }); break; }
        steps.push({ heap: h.slice(), mark: [i, m], msg: `Smaller child is ${h[m]} at index ${m}. Swap down.` });
        [h[i], h[m]] = [h[m], h[i]]; i = m;
      }
      animate(steps, `Popped ${min}. New min: ${h[0]}.`);
    };
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-h]");
      if (!b) return;
      const a = b.dataset.h;
      if (a === "push") { const v = Number(el.querySelector(".hp-v").value); if (Number.isFinite(v)) push(v); }
      else if (a === "rand") push(Math.floor(Math.random() * 99) + 1);
      else if (a === "pop") pop();
      else if (a === "clear" && !busy) { heap = []; mark = []; draw(); cap.textContent = "Cleared."; }
    });
    draw();
  };

  // ---------- BFS on a grid ----------
  VIZ.bfs = el => {
    const R = 9, C = 15, start = [4, 1], goal = [4, 13];
    const walls = new Set(["1,4", "2,4", "3,4", "4,4", "5,4", "6,4", "3,8", "4,8", "5,8", "6,8", "7,8", "8,8", "0,11", "1,11", "2,11", "3,11", "4,11", "5,11"]);
    const key = (r, c) => `${r},${c}`;
    el.innerHTML = `
      <div class="viz-head"><h4>BFS on a grid</h4><span class="muted small">click cells to add or remove walls</span></div>`;
    const build = () => {
      const dist = new Map([[key(...start), 0]]), prev = new Map();
      let frontier = [start];
      const f = [{ dist: new Map(dist), frontier: frontier.map(p => key(...p)), msg: "Start at S, distance 0. The queue holds the frontier." }];
      let found = false, d = 0;
      while (frontier.length && !found) {
        d++;
        const nextF = [];
        for (const [r, c] of frontier) {
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc, k = key(nr, nc);
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || walls.has(k) || dist.has(k)) continue;
            dist.set(k, d); prev.set(k, key(r, c)); nextF.push([nr, nc]);
            if (nr === goal[0] && nc === goal[1]) found = true;
          }
        }
        frontier = nextF;
        if (nextF.length) f.push({ dist: new Map(dist), frontier: nextF.map(p => key(...p)), msg: `Ring ${d}: ${nextF.length} new cell${nextF.length > 1 ? "s" : ""} at distance ${d}. ${dist.size} visited so far.` });
      }
      const path = new Set();
      if (found) { let k = key(...goal); while (k) { path.add(k); k = prev.get(k); } }
      f.push({
        dist, frontier: [], path,
        msg: found ? `Reached G at distance <b>${dist.get(key(...goal))}</b>. Because BFS goes ring by ring, this is a shortest path. Following prev pointers back gives the route.` : "The queue ran dry before reaching G. There's no path, the walls cut it off."
      });
      return f;
    };
    const draw = f => {
      let h = `<div class="grid" style="grid-template-columns:repeat(${C},1fr)">`;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const k = key(r, c);
        const isS = r === start[0] && c === start[1], isG = r === goal[0] && c === goal[1];
        const cls = walls.has(k) ? "wall" : f.path && f.path.has(k) ? "path" : f.frontier.includes(k) ? "front" : f.dist.has(k) ? "seen" : "";
        h += `<button class="g ${cls}" data-cell="${k}" aria-label="cell ${r} ${c}">${isS ? "S" : isG ? "G" : f.dist.has(k) && !walls.has(k) ? f.dist.get(k) : ""}</button>`;
      }
      return h + `</div>`;
    };
    const s = stepper(el, build, draw);
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-cell]");
      if (!b) return;
      const k = b.dataset.cell;
      if (k === key(...start) || k === key(...goal)) return;
      walls.has(k) ? walls.delete(k) : walls.add(k);
      s.reset();
    });
  };

  // ---------- coin change DP ----------
  VIZ.dp = el => {
    el.innerHTML = `
      <div class="viz-head"><h4>Coin change table</h4><span class="muted small">dp[a] = fewest coins to make a</span></div>
      <div class="viz-row">
        <label class="viz-field">Coins <input class="viz-input dp-c" value="1, 3, 4" spellcheck="false" /></label>
        <label class="viz-field">Amount <input type="number" class="viz-input dp-a" value="6" min="1" max="20" /></label>
      </div>`;
    const build = () => {
      const coins = [...new Set(nums(el.querySelector(".dp-c").value).filter(c => c > 0 && Number.isInteger(c)))].sort((a, b) => a - b);
      const amount = Math.max(1, Math.min(20, Math.floor(Number(el.querySelector(".dp-a").value) || 6)));
      if (!coins.length) coins.push(1);
      const dp = new Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      const show = () => dp.map(v => (v === Infinity ? "∞" : v));
      const f = [{ dp: show(), a: 0, msg: `Base case: dp[0] = 0. Everything else starts at ∞ (impossible). Coins: ${coins.join(", ")}.` }];
      for (let a = 1; a <= amount; a++) {
        for (const c of coins) {
          if (c > a) continue;
          const cand = dp[a - c] + 1, better = cand < dp[a];
          if (better) dp[a] = cand;
          f.push({ dp: show(), a, from: a - c, msg: `dp[${a}] using coin ${c}: dp[${a - c}] + 1 = ${cand === Infinity ? "∞" : cand}. ${better ? `Better, dp[${a}] = ${cand}.` : `Not better than ${dp[a]}.`}` });
        }
      }
      f.push({ dp: show(), a: amount, done: true, msg: dp[amount] === Infinity ? `Amount ${amount} can't be made with these coins.` : `Answer: dp[${amount}] = <b>${dp[amount]}</b>. Each cell does one check per coin, so O(amount × coins).` });
      return f;
    };
    const draw = f => cells(f.dp, i => [i === f.a ? (f.done ? "hit" : "mid") : "", i === f.from ? "in" : "", i > f.a ? "dead" : ""].join(" "), i => i);
    const s = stepper(el, build, draw);
    el.querySelectorAll("input").forEach(i => i.addEventListener("change", s.reset));
  };

  // ---------- estimator ----------
  VIZ.estimator = el => {
    const fields = [
      ["dau", "Daily active users", 10000000],
      ["writes", "Writes per user per day", 2],
      ["ratio", "Reads per write", 10],
      ["size", "Bytes per write", 1000],
      ["peak", "Peak / average", 3],
      ["rep", "Replicas", 3]
    ];
    el.innerHTML = `
      <div class="viz-head"><h4>Estimator</h4><span class="muted small">assumes 10^5 seconds a day</span></div>
      <div class="est-grid">${fields.map(([k, label, v]) => `<label class="viz-field col">${label}<input type="number" min="0" class="viz-input" data-k="${k}" value="${v}" /></label>`).join("")}</div>
      <div class="est-out"></div>`;
    const update = () => {
      const g = k => Math.max(0, Number(el.querySelector(`[data-k="${k}"]`).value) || 0);
      const wDay = g("dau") * g("writes"), wQps = wDay / 1e5, rQps = wQps * g("ratio");
      const stDay = wDay * g("size"), stYear = stDay * 365 * Math.max(1, g("rep"));
      const out = [
        ["Write QPS", `${si(wQps)} avg, ${si(wQps * g("peak"))} peak`],
        ["Read QPS", `${si(rQps)} avg, ${si(rQps * g("peak"))} peak`],
        ["New data per day", si(stDay, "B")],
        ["Storage per year", `${si(stYear, "B")} with ${Math.max(1, g("rep"))}x replication`],
        ["Peak read bandwidth", si(rQps * g("peak") * g("size") * 8, "bps")]
      ];
      const peakRead = rQps * g("peak");
      const verdict = peakRead > 1e5 ? "That read load needs a cache tier and many app servers. Think sharding or replicas too." :
        peakRead > 5e3 ? "A handful of app servers plus a cache in front of the database." :
        "A couple of servers and one database with a replica can handle this.";
      el.querySelector(".est-out").innerHTML = out.map(([k, v]) => `<div class="est-row"><span class="muted">${k}</span><b>${v}</b></div>`).join("") + `<p class="viz-caption">${verdict}</p>`;
    };
    el.addEventListener("input", update);
    update();
  };

  // ---------- LRU cache ----------
  VIZ.lru = el => {
    const keys = ["A", "B", "C", "D", "E", "F", "G", "H"];
    el.innerHTML = `
      <div class="viz-head"><h4>LRU cache</h4><span class="muted small">click a key to read it, a miss loads it</span></div>
      <div class="viz-row">
        <label class="viz-field">Capacity <select class="viz-input lru-cap">${[2, 3, 4, 5, 6].map(n => `<option ${n === 4 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <button class="btn ghost small" data-l="loop">Play loop A to E</button>
        <button class="btn ghost small" data-l="skew">Play skewed traffic</button>
        <button class="btn ghost small" data-l="clear">Clear</button>
      </div>
      <div class="lru-keys">${keys.map(k => `<button class="btn small lru-k" data-key="${k}">${k}</button>`).join("")}</div>
      <div class="lru-stage"></div>`;
    let cache = [], hits = 0, misses = 0, log = [], timer = null, hot = null;
    const capEl = el.querySelector(".lru-cap");
    const draw = () => {
      const total = hits + misses;
      el.querySelector(".lru-stage").innerHTML = `
        <div class="lru-list"><span class="muted small">most recent</span>${cache.map(k => `<span class="lru-item ${k === hot ? "flash" : ""}">${k}</span>`).join("") || `<em class="muted small">empty</em>`}<span class="muted small">evicted next</span></div>
        <div class="lru-stats"><span>hits <b class="good">${hits}</b></span><span>misses <b class="bad">${misses}</b></span><span>hit rate <b>${total ? Math.round((hits / total) * 100) : 0}%</b></span></div>
        <div class="lru-log">${log.slice(-6).reverse().map(l => `<div>${l}</div>`).join("")}</div>`;
    };
    const access = k => {
      const cap = Number(capEl.value);
      const i = cache.indexOf(k);
      if (i >= 0) { cache.splice(i, 1); cache.unshift(k); hits++; log.push(`<b class="good">hit</b> ${k}, moved to front`); }
      else {
        misses++;
        cache.unshift(k);
        if (cache.length > cap) { const ev = cache.pop(); log.push(`<b class="bad">miss</b> ${k}, loaded. Evicted ${ev}`); }
        else log.push(`<b class="bad">miss</b> ${k}, loaded`);
      }
      hot = k;
      draw();
    };
    const play = seq => {
      clearInterval(timer);
      let i = 0;
      timer = setInterval(() => { if (i >= seq.length || !el.isConnected) { clearInterval(timer); return; } access(seq[i++]); }, 450);
    };
    const clear = () => { clearInterval(timer); cache = []; hits = 0; misses = 0; log = []; hot = null; draw(); };
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-key],[data-l]");
      if (!b) return;
      if (b.dataset.key) { clearInterval(timer); access(b.dataset.key); return; }
      const a = b.dataset.l;
      if (a === "clear") clear();
      else if (a === "loop") { clear(); play("ABCDEABCDEABCDE".split("")); }
      else if (a === "skew") { clear(); play("ABACADABAEABFACABAGBA".split("")); }
    });
    capEl.addEventListener("change", clear);
    draw();
  };

  // ---------- consistent hashing ring ----------
  VIZ.ring = el => {
    // FNV-1a plus a murmur finalizer: plain FNV clusters names that differ only in the last character
    const fnv = s => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
    const COLORS = ["#b6ff3b", "#5ee7ff", "#ffd166", "#ff7a3d", "#c89bff", "#3ddc97", "#ff5470", "#7cc4ff"];
    const KEYS = Array.from({ length: 200 }, (_, i) => ({ id: i, h: fnv("key-" + i) }));
    let servers = [1, 2, 3], vnodes = 1, owners = null, msg = "Each dot is a key, colored by the server that owns it: the next server point clockwise.";
    el.innerHTML = `
      <div class="viz-head"><h4>Consistent hashing ring</h4><span class="muted small">200 keys</span></div>
      <div class="viz-row">
        <button class="btn primary small" data-r="add">Add server</button>
        <button class="btn ghost small" data-r="remove">Remove a server</button>
        <label class="viz-field"><input type="checkbox" class="ring-v" /> Virtual nodes (40 per server)</label>
      </div>
      <div class="ring-wrap"><div class="ring-svg"></div><div class="ring-side"></div></div>
      <p class="viz-caption ring-cap"></p>`;
    const points = () => servers.flatMap(s => Array.from({ length: vnodes }, (_, v) => ({ s, h: fnv(`server-${s}#${v}`) }))).sort((a, b) => a.h - b.h);
    const assign = pts => KEYS.map(k => (pts.find(p => p.h >= k.h) || pts[0]).s);
    const color = s => COLORS[(s - 1) % COLORS.length];
    const draw = pts => {
      const own = assign(pts);
      const cx = 130, cy = 130, R = 100;
      const at = (h, r) => [cx + r * Math.sin(h * 2 * Math.PI), cy - r * Math.cos(h * 2 * Math.PI)];
      let svg = `<svg viewBox="0 0 260 260" role="img" aria-label="Hash ring"><circle cx="${cx}" cy="${cy}" r="${R}" class="ring-line" />`;
      KEYS.forEach((k, i) => { const [x, y] = at(k.h, R - 14); svg += `<circle cx="${x}" cy="${y}" r="2.4" fill="${color(own[i])}" />`; });
      pts.forEach(p => { const [x, y] = at(p.h, R); svg += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="${color(p.s)}" class="ring-node" />`; });
      el.querySelector(".ring-svg").innerHTML = svg + `</svg>`;
      const counts = servers.map(s => [s, own.filter(o => o === s).length]);
      const max = Math.max(...counts.map(c => c[1]), 1);
      el.querySelector(".ring-side").innerHTML = counts.map(([s, n]) => `
        <div class="ring-bar"><span style="color:${color(s)}">S${s}</span><span class="bar"><span style="width:${(n / max) * 100}%;background:${color(s)}"></span></span><b>${n}</b></div>`).join("")
        + `<p class="muted small">Ideal is ${Math.round(KEYS.length / servers.length)} keys each.</p>`;
      el.querySelector(".ring-cap").innerHTML = msg;
      return own;
    };
    const change = mutate => {
      const before = owners || assign(points());
      const nBefore = servers.length;
      mutate();
      const after = assign(points());
      const moved = after.filter((s, i) => s !== before[i]).length;
      const modMoved = KEYS.filter(k => Math.floor(k.h * 4294967296) % nBefore !== Math.floor(k.h * 4294967296) % servers.length).length;
      msg = `<b>${moved}</b> of ${KEYS.length} keys moved. With <code>hash % N</code> going from ${nBefore} to ${servers.length} servers, ${modMoved} would have moved.`;
      owners = draw(points());
    };
    el.addEventListener("click", e => {
      const b = e.target.closest("[data-r]");
      if (!b) return;
      if (b.dataset.r === "add") {
        if (servers.length >= 8) { el.querySelector(".ring-cap").textContent = "8 servers is the max for this demo."; return; }
        change(() => servers.push([1, 2, 3, 4, 5, 6, 7, 8].find(n => !servers.includes(n))));
      } else {
        if (servers.length <= 1) { el.querySelector(".ring-cap").textContent = "Keep at least one server."; return; }
        change(() => servers.splice(Math.floor(Math.random() * servers.length), 1));
      }
    });
    el.querySelector(".ring-v").addEventListener("change", e => {
      vnodes = e.target.checked ? 40 : 1;
      msg = vnodes > 1 ? "Each server now has 40 points on the ring. Load is much more even, and a removed server's keys spread across everyone." : "One point per server. Arcs are random sizes, so load is lopsided.";
      owners = draw(points());
    });
    owners = draw(points());
  };

  window.VIZ = VIZ;
})();
