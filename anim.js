// views are { setup(svg, input, spec, steps), frame(svg, step, prev, ms) }; ms 0 jumps straight to the state
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const STEP_MS = 260, TICK_MS = 700;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const mk = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const label = (parent, x, y, s, cls) => { const t = mk("text", { x, y, class: cls || "" }, parent); t.textContent = s; return t; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const has = v => v !== undefined && v !== null;
  const STATE = new WeakMap();

  const place = (el, tf, ms) => {
    const from = el.style.transform;
    el.style.transform = tf;
    if (ms && from && from !== tf) el.animate([{ transform: from }, { transform: tf }], { duration: ms, easing: "ease-out" });
  };
  const fade = (el, to, ms) => {
    const from = el.style.opacity === "" ? 1 : +el.style.opacity;
    el.style.opacity = to;
    if (ms && from !== to) el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: "ease-out" });
  };
  const pop = (el, ms) => { if (ms) el.animate([{ transform: "scale(0.6)", opacity: 0.2 }, { transform: "scale(1)", opacity: 1 }], { duration: ms, easing: "ease-out" }); };
  const size = (svg, w, h) => { svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("width", w); svg.setAttribute("height", h); };
  const seq = input => typeof input === "string" ? [...input] : Array.isArray(input) ? input : [];
  const up = tf => tf.replace(/, (-?[\d.]+)px\)/, (m, y) => `, ${y - 16}px)`);
  const short = v => { const s = String(v); return s.length > 4 ? s.slice(0, 3) + "~" : s; };

  // ---------- array-pointers and binary-search ----------
  const P = 44, CELL = 40, CY = 12, LANE0 = 66, LANE = 24;

  const arrayView = search => ({
    setup(svg, input, spec) {
      const vals = seq(input), n = vals.length;
      const names = spec.pointers || [];
      const ptr = names.map(name => ({ name })).concat(search ? [{ name: "mid", derived: true }] : []);
      size(svg, (n + 2) * P, LANE0 + ptr.length * LANE);
      const win = spec.window ? mk("rect", { class: "an-win", width: 1, height: CELL + 8, y: CY - 4 }, svg) : null;
      if (win) win.style.opacity = 0;
      const cells = vals.map((v, i) => {
        const g = mk("g", { class: "an-cell" }, svg);
        mk("rect", { x: P + i * P, y: CY, width: CELL, height: CELL, rx: 8 }, g);
        label(g, P + i * P + CELL / 2, CY + CELL / 2 + 5, short(v));
        label(svg, P + i * P + CELL / 2, CY + CELL + 14, i, "an-idx");
        return g;
      });
      ptr.forEach((m, k) => {
        m.y = LANE0 + k * LANE;
        m.el = mk("g", { class: `an-ptr p${k}` }, svg);
        m.el.style.opacity = 0;
        mk("polygon", { points: "0,-8 -5,0 5,0" }, m.el);
        label(m.el, 0, 13, m.name);
      });
      STATE.set(svg, { n, ptr, win, cells, names, search, spec });
    },
    frame(svg, step, prev, ms) {
      const s = STATE.get(svg), { n } = s;
      const x = i => P + clamp(i, -1, n) * P + CELL / 2;
      const lo = step[s.names[0]], hi = step[s.names[1]];
      const live = s.search && Number.isInteger(lo) && Number.isInteger(hi) && lo < hi;
      s.ptr.forEach(m => {
        const i = m.derived ? (live ? (lo + hi) >> 1 : undefined) : step[m.name];
        const ok = Number.isInteger(i);
        fade(m.el, ok ? 1 : 0, ms);
        if (ok) place(m.el, `translate(${x(i)}px, ${m.y}px)`, ms);
      });
      const mid = live ? (lo + hi) >> 1 : -1;
      if (s.win) {
        const [a, b] = s.spec.window.map(w => step[w]);
        const ok = Number.isInteger(a) && Number.isInteger(b) && a <= b;
        fade(s.win, ok ? 1 : 0, ms);
        if (ok) place(s.win, `translate(${P + a * P - 4}px, 0px) scale(${(b - a) * P + CELL + 8}, 1)`, ms);
      }
      s.cells.forEach((g, i) => {
        const inWin = s.win && Number.isInteger(step[s.spec.window[0]]) && i >= step[s.spec.window[0]] && i <= step[s.spec.window[1]];
        g.classList.toggle("in", !!inWin);
        if (!s.search) return;
        const alive = live && i >= lo && i < hi;
        g.classList.toggle("mid", i === mid);
        g.classList.toggle("hit", !live && Number.isInteger(lo) && i === lo);
        fade(g, alive || (!live && i === lo) ? 1 : 0.28, ms);
      });
    }
  });

  // ---------- stack ----------
  const SW = 150, SH = 30, SG = 4, MAX_STACK = 12;

  const stackView = {
    setup(svg, input, spec, steps) {
      const name = spec.watch[0];
      const depth = clamp(Math.max(1, ...steps.map(st => Array.isArray(st[name]) ? st[name].length : 0)), 1, MAX_STACK);
      const h = depth * (SH + SG) + 26;
      size(svg, SW + 90, h);
      mk("line", { class: "an-base", x1: 40, x2: 40 + SW, y1: h - 14, y2: h - 14 }, svg);
      const empty = label(svg, 40 + SW / 2, h - 14 - SH / 2 - 2, "empty", "an-idx");
      empty.style.opacity = 0;
      label(svg, 40 + SW + 12, h - 14 - SH / 2 + 4, "bottom", "an-idx an-side");
      STATE.set(svg, { name, h, els: [], empty });
    },
    frame(svg, step, prev, ms) {
      const s = STATE.get(svg);
      const arr = (Array.isArray(step[s.name]) ? step[s.name] : []).slice(0, MAX_STACK);
      const at = i => `translate(40px, ${s.h - 14 - (i + 1) * (SH + SG) + SG}px)`;
      while (s.els.length > arr.length) {
        const e = s.els.pop();
        if (ms) {
          const tf = e.g.style.transform;
          e.g.animate([{ transform: tf, opacity: 1 }, { transform: up(tf), opacity: 0 }], { duration: ms, easing: "ease-in" }).onfinish = () => e.g.remove();
        } else e.g.remove();
      }
      arr.forEach((v, i) => {
        let e = s.els[i];
        if (!e) {
          const g = mk("g", { class: "an-slot" }, svg);
          mk("rect", { width: SW, height: SH, rx: 8 }, g);
          e = s.els[i] = { g, t: label(g, SW / 2, SH / 2 + 5, ""), v: undefined };
          g.style.transform = at(i);
          if (ms) g.animate([{ transform: up(at(i)), opacity: 0 }, { transform: at(i), opacity: 1 }], { duration: ms, easing: "ease-out" });
        } else if (e.v !== v && ms) e.g.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: ms, easing: "ease-out" });
        if (e.v !== v) e.t.textContent = String(v);
        e.v = v;
        e.g.classList.toggle("top", i === arr.length - 1);
      });
      fade(s.empty, arr.length ? 0 : 1, ms);
    }
  };

  // ---------- dp-table ----------
  const TW = 48, TH = 34, GUT = 64;

  const dpView = {
    setup(svg, input, spec, steps) {
      const name = spec.watch[0];
      const grid = steps.some(st => Array.isArray(st[name]) && Array.isArray(st[name][0]));
      const arrayMode = grid || steps.some(st => Array.isArray(st[name]));
      const rows = grid ? Math.max(...steps.map(st => Array.isArray(st[name]) ? st[name].length : 0)) : 1;
      const cols = grid ? Math.max(...steps.map(st => Array.isArray(st[name]) ? Math.max(0, ...st[name].map(r => Array.isArray(r) ? r.length : 0)) : 0))
        : arrayMode ? Math.max(...steps.map(st => Array.isArray(st[name]) ? st[name].length : 0)) : steps.length;
      const vals = grid ? [] : seq(input);
      const off = cols - vals.length;
      const top = vals.length && (off === 0 || off === 1) ? 1 : 0;
      const y0 = top ? TH + 14 : 4;
      size(svg, GUT + cols * TW + 8, y0 + rows * (TH + 6) + 22);
      if (top) {
        label(svg, GUT - 10, 4 + TH / 2 + 5, "input", "an-idx an-side-r");
        vals.forEach((v, i) => label(svg, GUT + (i + off) * TW + (TW - 6) / 2, 4 + TH / 2 + 5, short(v), "an-in"));
      }
      label(svg, GUT - 10, y0 + TH / 2 + 5, name, "an-idx an-side-r");
      const cells = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const g = mk("g", { class: "an-cell" }, svg);
        mk("rect", { x: GUT + c * TW, y: y0 + r * (TH + 6), width: TW - 6, height: TH, rx: 7 }, g);
        const t = label(g, GUT + c * TW + (TW - 6) / 2, y0 + r * (TH + 6) + TH / 2 + 5, "");
        cells.push({ g, t, v: undefined });
      }
      if (!grid) for (let c = 0; c < cols; c++) label(svg, GUT + c * TW + (TW - 6) / 2, y0 + TH + 16, c, "an-idx");
      STATE.set(svg, { name, grid, arrayMode, cols, cells, steps });
    },
    frame(svg, step, prev, ms) {
      const s = STATE.get(svg), k = s.steps.indexOf(step);
      s.cells.forEach((cell, n) => {
        let v;
        if (s.grid) { const r = step[s.name]; v = Array.isArray(r) && Array.isArray(r[Math.floor(n / s.cols)]) ? r[Math.floor(n / s.cols)][n % s.cols] : undefined; }
        else if (s.arrayMode) v = Array.isArray(step[s.name]) ? step[s.name][n] : undefined;
        else v = n <= k ? s.steps[n][s.name] : undefined;
        const changed = v !== cell.v;
        if (changed) { cell.t.textContent = has(v) ? short(v) : ""; if (has(v)) pop(cell.g, ms); }
        cell.v = v;
        cell.g.classList.toggle("on", has(v));
        cell.g.classList.toggle("cur", has(v) && changed);
      });
    }
  };

  const VIEWS = { "array-pointers": arrayView(false), "binary-search": arrayView(true), stack: stackView, "dp-table": dpView };

  // ---------- player ----------
  const fmt = v => {
    if (v === undefined) return "–";
    let s;
    try { s = JSON.stringify(v); } catch (e) { s = String(v); }
    return s.length > 48 ? s.slice(0, 47) + "…" : s;
  };

  function player(box, { steps, view: spec, input, result, truncated }) {
    box.innerHTML = `
      <div class="anim" tabindex="0" role="group" aria-label="Reference solution walkthrough. Space plays or pauses, arrow keys step.">
        <div class="anim-stage"><svg class="anim-svg" aria-hidden="true"></svg></div>
        <p class="anim-vals"></p>
        <div class="anim-controls">
          <button class="btn primary small" data-a="play">Play</button>
          <button class="btn ghost small" data-a="back" aria-label="Previous step">Back</button>
          <button class="btn ghost small" data-a="fwd" aria-label="Next step">Next</button>
          <input class="anim-scrub" type="range" min="0" max="${steps.length - 1}" value="0" aria-label="Step" />
          <select class="viz-input anim-speed" aria-label="Speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select>
          <span class="anim-count muted small"></span>
        </div>
      </div>`;
    const root = box.firstElementChild, svg = root.querySelector("svg");
    const vals = root.querySelector(".anim-vals"), count = root.querySelector(".anim-count");
    const scrub = root.querySelector(".anim-scrub"), playBtn = root.querySelector('[data-a="play"]');
    const view = VIEWS[spec.view], last = steps.length - 1;
    view.setup(svg, input, spec, steps);

    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = mq.matches, speed = 1, timer = null, shown = -1;
    const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = shown >= last ? "Replay" : "Play"; };
    const show = n => {
      n = clamp(n, 0, last);
      view.frame(svg, steps[n], steps[shown], !reduced && shown >= 0 && n === shown + 1 ? STEP_MS / speed : 0);
      shown = n;
      scrub.value = n;
      count.textContent = `Step ${n + 1} of ${steps.length}${truncated ? " (trace cut off)" : ""}`;
      vals.innerHTML = spec.watch.map(w => `<span><b>${esc(w)}</b> ${esc(fmt(steps[n][w]))}</span>`).join("") + (n === last && result !== undefined ? `<span><b>returns</b> ${esc(fmt(result))}</span>` : "");
      if (!timer) playBtn.textContent = n >= last ? "Replay" : "Play";
    };
    const tick = () => {
      if (!root.isConnected || shown >= last) { stop(); return; }
      show(shown + 1);
      if (shown >= last) stop();
    };
    const start = () => {
      if (shown >= last) show(0);
      clearInterval(timer);
      timer = setInterval(tick, TICK_MS / speed);
      playBtn.textContent = "Pause";
    };
    const toggle = () => timer ? stop() : start();
    const onMotion = () => {
      if (!root.isConnected) { mq.removeEventListener("change", onMotion); return; }
      reduced = mq.matches;
      if (reduced) stop();
    };
    mq.addEventListener("change", onMotion);

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-a]");
      if (!b) return;
      if (b.dataset.a === "play") toggle();
      else { stop(); show(shown + (b.dataset.a === "fwd" ? 1 : -1)); }
      root.focus({ preventScroll: true });
    });
    scrub.addEventListener("input", () => { stop(); show(+scrub.value); });
    root.querySelector(".anim-speed").addEventListener("change", e => { speed = +e.target.value; if (timer) start(); });
    root.addEventListener("keydown", e => {
      if (e.key === "Enter") e.stopPropagation();
      if (e.target.matches("input, select")) return;
      if (e.key === " " && e.target === root) { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); stop(); show(shown + (e.key === "ArrowRight" ? 1 : -1)); }
    });

    show(0);
    root.focus({ preventScroll: true });
    if (!reduced && last > 0) start();
  }

  window.ANIM = { player };
})();
