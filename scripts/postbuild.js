// After `vite build`: one HTML file per page in src/tools/pages.json (plus 404.html and aliases), so GitHub
// Pages answers those URLs with 200 and each link previews with its own title and description, and the sitemap.
const fs = require("fs");
const path = require("path");
const { site, pages, aliases } = require("../src/tools/pages.json");

const build = path.join(__dirname, "..", "build");
const html = fs.readFileSync(path.join(build, "index.html"), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const put = (route, doc) => {
  const f = path.join(build, `${route}.html`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, doc);
};
const set = (doc, re, value) => {
  if (!re.test(doc)) throw new Error(`postbuild: ${re} not found in index.html`);
  return doc.replace(re, (_, a, b) => a + value + b);
};

put("/404", html);
for (const a of aliases) put(a, html);
for (const p of pages) {
  const title = esc(`${p.title} – Murat Güven`), line = esc(p.line), url = site + p.path;
  let d = html;
  d = set(d, /(<title>)[^<]*(<\/title>)/, title);
  d = set(d, /(<meta name="description" content=")[^"]*(")/, line);
  d = set(d, /(<link rel="canonical" href=")[^"]*(")/, url);
  d = set(d, /(<meta property="og:url" content=")[^"]*(")/, url);
  d = set(d, /(<meta property="og:title" content=")[^"]*(")/, title);
  d = set(d, /(<meta property="og:description" content=")[^"]*(")/, line);
  d = set(d, /(<meta name="twitter:title" content=")[^"]*(")/, title);
  d = set(d, /(<meta name="twitter:description" content=")[^"]*(")/, line);
  put(p.path, d);
}

const day = new Date().toISOString().slice(0, 10);
const urls = ["/", ...pages.filter((p) => p.group !== "Other tools").map((p) => p.path)];
fs.writeFileSync(path.join(build, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${site}${u}</loc><lastmod>${day}</lastmod></url>`).join("\n")}
</urlset>
`);
console.log(`postbuild: ${pages.length} pages, ${aliases.length} aliases, sitemap with ${urls.length} URLs`);
