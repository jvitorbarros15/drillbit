const fs = require("node:fs");
const path = require("node:path");
const { split } = require("../api/_lib/split.js");

const ROOT = path.join(__dirname, "..");
const COPY = ["index.html", "styles.css", "learn.css", "viz.js", "anim.js", "trace.js", "patterns.js", "core.js", "auth.js", "analytics.js", "app.js", "terms.html", "privacy.html", "refund.html"];

function build(out = process.env.BUILD_OUT || process.argv[2] || path.join(ROOT, "public"), env = process.env) {
  out = path.resolve(out);
  if (out === ROOT || ROOT.startsWith(out + path.sep)) throw new Error("refusing to build into " + out);
  fs.mkdirSync(out, { recursive: true });
  for (const e of fs.readdirSync(out)) fs.rmSync(path.join(out, e), { recursive: true, force: true });
  for (const f of COPY) fs.copyFileSync(path.join(ROOT, f), path.join(out, f));

  const s = split({ lessons: require("../data.js"), patterns: require("../patterns.js"), guides: require("../guides.js") });
  const free = new Set(s.freeGuides.map(g => g.id));
  const guides = require("../guides.js").map(g => (free.has(g.id) ? g : s.stubs.find(x => x.id === g.id)));
  fs.writeFileSync(path.join(out, "content-free.js"),
    `window.LESSONS = ${JSON.stringify(s.freeLessons)};\nwindow.GUIDES = ${JSON.stringify(guides)};\nwindow.CONTENT_META = ${JSON.stringify(s.meta)};\n`);

  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
    .replace('<script src="data.js"></script>', '<script src="content-free.js"></script>')
    .replace(/\s*<script src="guides.js"><\/script>/, "");
  fs.writeFileSync(path.join(out, "index.html"), html);

  const config = {};
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) Object.assign(config, { supabaseUrl: env.SUPABASE_URL, supabaseAnonKey: env.SUPABASE_ANON_KEY });
  if (env.POSTHOG_KEY) Object.assign(config, { posthogKey: env.POSTHOG_KEY }, env.POSTHOG_HOST && { posthogHost: env.POSTHOG_HOST });
  if (Object.keys(config).length) fs.writeFileSync(path.join(out, "config.js"), `window.DRILLBIT_CONFIG = ${JSON.stringify(config)};\n`);
  return { out, free: s.freeLessons.length, paid: s.paidLessons.length };
}

if (require.main === module) {
  const r = build();
  console.log(`built ${r.out}: ${r.free} free lessons, ${r.paid} paid lessons`);
}

module.exports = { build };
