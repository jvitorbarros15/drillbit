const test = require("node:test");
const assert = require("node:assert");
const COMPANIES = require("../companies.js");
const PATTERNS = require("../patterns.js");

const patternIds = new Set(PATTERNS.map(p => p.id));

test("every company profile is well formed and every fact cites a source", () => {
  const ids = new Set();
  for (const c of COMPANIES) {
    assert.ok(/^[a-z]+$/.test(c.id) && !ids.has(c.id), c.id);
    ids.add(c.id);
    assert.notStrictEqual(c.id, "other", "other is reserved for a typed company name");
    assert.ok(c.name && c.summary, c.id);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(c.checked), c.id + " checked date");
    assert.ok(Array.isArray(c.sources) && c.sources.length, c.id);
    for (const s of c.sources) assert.ok(s.label && /^https:\/\//.test(s.url), c.id + " source " + s.url);
    assert.ok(c.facts.length, c.id);
    for (const f of c.facts) assert.ok(Number.isInteger(f.source) && c.sources[f.source], c.id + ": " + f.text);
    for (const p of c.focus) assert.ok(patternIds.has(p), c.id + " focus " + p);
    if (c.focus.length) assert.ok(c.focusNote, c.id + " explains its focus");
  }
});

test("profile text has no dash pairs or em dashes", () => {
  for (const c of COMPANIES) {
    const prose = [c.summary, c.focusNote || "", ...c.facts.map(f => f.text), ...c.sources.map(s => s.label)].join(" ");
    assert.ok(!/—|--/.test(prose), c.id);
  }
});
