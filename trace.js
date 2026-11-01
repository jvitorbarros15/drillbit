// Execution trace capture. Rewrites JS source so each loop body and each return records the watched variables.
(() => {
  "use strict";
  const MAX_STEPS = 500, MAX_ITEMS = 200;
  const REGEX_AFTER = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
  const NOT_STMT_START = new Set(["in", "of", "instanceof", "else"]);

  const PRELUDE = `var __trace=[],__trunc=false;
function __cl(v,d){
if(v===null||typeof v!=="object")return typeof v==="function"||typeof v==="symbol"?undefined:v;
if(d>3)return undefined;
if(v instanceof Set)v=Array.from(v);
if(v instanceof Map){var o={},n=0;for(var e of v){if(n++>=${MAX_ITEMS})break;o[String(e[0])]=__cl(e[1],d+1)}return o}
if(Array.isArray(v)){var a=[],m=Math.min(v.length,${MAX_ITEMS});for(var i=0;i<m;i++)a.push(__cl(v[i],d+1));return a}
var o={},n=0;for(var k of Object.keys(v)){if(n++>=${MAX_ITEMS})break;o[k]=__cl(v[k],d+1)}return o}
function __rec(o){
if(__trace.length>=${MAX_STEPS}){__trunc=true;return}
try{var s={};for(var k in o)s[k]=__cl(o[k],0);__trace.push(s)}catch(e){}}
`;

  function skipStr(src, i) {
    const q = src[i];
    let j = i + 1;
    while (j < src.length) {
      const c = src[j];
      if (c === "\\") j += 2;
      else if (c === q) return j + 1;
      else if (c === "\n") return j;
      else j++;
    }
    return src.length;
  }

  function skipBraces(src, j) {
    let d = 1;
    while (j < src.length) {
      const c = src[j];
      if (c === '"' || c === "'") j = skipStr(src, j);
      else if (c === "`") j = skipTpl(src, j);
      else if (c === "/" && src[j + 1] === "/") { while (j < src.length && src[j] !== "\n") j++; }
      else if (c === "/" && src[j + 1] === "*") { const e = src.indexOf("*/", j + 2); j = e < 0 ? src.length : e + 2; }
      else {
        if (c === "{") d++;
        else if (c === "}" && --d === 0) return j + 1;
        j++;
      }
    }
    return src.length;
  }

  function skipTpl(src, i) {
    let j = i + 1;
    while (j < src.length) {
      const c = src[j];
      if (c === "\\") j += 2;
      else if (c === "`") return j + 1;
      else if (c === "$" && src[j + 1] === "{") j = skipBraces(src, j + 2);
      else j++;
    }
    return src.length;
  }

  function skipRegex(src, i) {
    let j = i + 1, cls = false;
    while (j < src.length) {
      const c = src[j];
      if (c === "\\") j += 2;
      else if (c === "\n") return -1;
      else if (cls) { if (c === "]") cls = false; j++; }
      else if (c === "[") { cls = true; j++; }
      else if (c === "/") {
        j++;
        while (j < src.length && /[a-z]/i.test(src[j])) j++;
        return j;
      } else j++;
    }
    return -1;
  }

  const regexOk = prev => !prev || (prev.k === "id" ? REGEX_AFTER.has(prev.v) : prev.k === "p" && prev.v !== ")" && prev.v !== "]");

  function lex(src) {
    const t = [];
    let i = 0, nl = false;
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") { nl = true; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") {
        const e = src.indexOf("*/", i + 2), end = e < 0 ? src.length : e + 2;
        if (src.slice(i, end).includes("\n")) nl = true;
        i = end;
        continue;
      }
      const s = i;
      let k = "p";
      if (c === '"' || c === "'") { i = skipStr(src, i); k = "s"; }
      else if (c === "`") { i = skipTpl(src, i); k = "s"; }
      else if (/[\w$]/.test(c)) { while (i < src.length && /[\w$]/.test(src[i])) i++; k = "id"; }
      else if (c === "/" && regexOk(t[t.length - 1])) {
        const e = skipRegex(src, i);
        if (e > 0) { i = e; k = "s"; } else i++;
      } else i++;
      t.push({ k, v: src.slice(s, i), s, e: i, nl });
      nl = false;
    }
    return t;
  }

  function match(t, i) {
    let d = 0;
    for (let j = i; j < t.length; j++) {
      if (t[j].k !== "p") continue;
      if ("([{".includes(t[j].v)) d++;
      else if (")]}".includes(t[j].v) && --d === 0) return j;
    }
    return t.length - 1;
  }

  // Index of the last token of the statement starting at token i.
  function stmtEnd(t, i) {
    const x = t[i];
    if (x.v === "{") return match(t, i);
    if (x.k === "id") {
      if (x.v === "if") {
        let e = stmtEnd(t, match(t, i + 1) + 1);
        if (t[e + 1] && t[e + 1].v === "else") e = stmtEnd(t, e + 2);
        return e;
      }
      if (x.v === "for" || x.v === "while") return stmtEnd(t, match(t, t[i + 1].v === "await" ? i + 2 : i + 1) + 1);
      if (x.v === "do") {
        let c = match(t, stmtEnd(t, i + 1) + 2);
        if (t[c + 1] && t[c + 1].v === ";") c++;
        return c;
      }
      if (x.v === "try") {
        let e = match(t, i + 1);
        while (t[e + 1] && (t[e + 1].v === "catch" || t[e + 1].v === "finally")) {
          let j = e + 2;
          if (t[j].v === "(") j = match(t, j) + 1;
          e = match(t, j);
        }
        return e;
      }
    }
    let d = 0;
    for (let j = i; j < t.length; j++) {
      const v = t[j];
      if (v.k === "p") {
        if ("([{".includes(v.v)) d++;
        else if (")]}".includes(v.v)) { if (d === 0) return j - 1; d--; }
        else if (v.v === ";" && d === 0) return j;
      }
      const nx = t[j + 1];
      if (d === 0 && nx && nx.nl && (v.k !== "p" || ")]}".includes(v.v)) && (nx.k === "s" || (nx.k === "id" && !NOT_STMT_START.has(nx.v)))) return j;
    }
    return t.length - 1;
  }

  function instrument(code, watch) {
    for (const w of watch) if (!/^[A-Za-z_$][\w$]*$/.test(w)) throw new Error("Bad watch name: " + w);
    const t = lex(code);
    const snap = "__rec({" + watch.map(w => `${JSON.stringify(w)}:(() => { try { return ${w} } catch (e) { return undefined } })()`).join(",") + "})";
    const ins = [];
    const doTail = new Set();
    const body = b => {
      if (t[b].v === "{") { ins.push({ at: t[b].e, text: ` ${snap};` }); return match(t, b); }
      const end = stmtEnd(t, b);
      ins.push({ at: t[b].s, text: `{ ${snap}; ` }, { at: t[end].e, text: " }" });
      return end;
    };
    for (let i = 0; i < t.length; i++) {
      const x = t[i];
      if (x.k !== "id" || (t[i - 1] && t[i - 1].v === ".")) continue;
      if (x.v === "return") {
        const n = t[i + 1];
        ins.push({ at: x.e, text: ` ${snap},` + (!n || n.nl || n.v === ";" || n.v === "}" ? " void 0" : "") });
      } else if (x.v === "do" && t[i + 1]) {
        doTail.add(body(i + 1) + 1);
      } else if ((x.v === "for" || x.v === "while") && !doTail.has(i) && t[i + 1]) {
        const open = t[i + 1].v === "await" ? i + 2 : i + 1;
        if (!t[open] || t[open].v !== "(") continue;
        const b = match(t, open) + 1;
        if (t[b]) body(b);
      }
    }
    ins.sort((a, b) => a.at - b.at);
    let out = "", pos = 0;
    for (const x of ins) { out += code.slice(pos, x.at) + x.text; pos = x.at; }
    return PRELUDE + out + code.slice(pos);
  }

  function run(code, fn, args, watch) {
    let get;
    try {
      get = new Function(instrument(code, watch) + `\n;return [typeof ${fn} === "function" ? ${fn} : undefined, __trace, () => __trunc];`)();
    } catch (e) {
      return { result: undefined, steps: [], truncated: false, error: "Syntax error: " + e.message };
    }
    const [f, steps, trunc] = get;
    if (!f) return { result: undefined, steps: [], truncated: false, error: "Could not find a function named " + fn };
    let result, error;
    try { result = f(...JSON.parse(JSON.stringify(args))); } catch (e) { error = String(e && e.message || e); }
    return { result, steps, truncated: trunc(), error };
  }

  const api = { instrument, run, MAX_STEPS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else self.TRACE = api;
})();
