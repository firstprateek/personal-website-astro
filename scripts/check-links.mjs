// Checks every internal link and asset in dist/ resolves to a built file.
// Internal means same-origin: a path under the site's base, or a full URL on
// the site's own origin + base. External links are not fetched (the build and
// its checks make no network requests).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const config = readFileSync(new URL('../src/site.config.ts', import.meta.url), 'utf8');
const fixtures = process.env.INCLUDE_FIXTURES === '1';
const urls = [...config.matchAll(/^\s*url: '([^']+)'/gm)].map((m) => m[1]);
const site = new URL(fixtures ? urls[1] : urls[0]);
const base = site.pathname.endsWith('/') ? site.pathname : `${site.pathname}/`;

const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) htmlFiles.push(p);
  }
})(DIST);

function resolve(pathname) {
  if (!pathname.startsWith(base)) return null;
  const rel = decodeURIComponent(pathname.slice(base.length));
  const target = join(DIST, rel);
  if (existsSync(target) && statSync(target).isFile()) return target;
  if (existsSync(join(target, 'index.html'))) return target;
  return null;
}

const broken = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const [, attr, value] of html.matchAll(/\b(href|src|poster|content)="([^"]*)"/g)) {
    if (attr === 'content' && !value.startsWith(site.origin)) continue;
    if (/^(mailto:|tel:|#|data:|javascript:)/.test(value)) continue;
    let url;
    try { url = new URL(value, site.origin + '/' + relative(DIST, file)); } catch { continue; }
    if (url.origin !== site.origin) continue;
    if (!url.pathname.startsWith(base) && url.pathname !== base.slice(0, -1)) {
      broken.push(`${relative(DIST, file)}: ${value} (outside base ${base})`);
      continue;
    }
    // The 404 page's canonical/og:url name /404/, which Pages serves as 404.html.
    if (file.endsWith('/404.html') && url.pathname === `${base}404/`) continue;
    if (!resolve(url.pathname)) broken.push(`${relative(DIST, file)}: ${value}`);
  }
}

if (broken.length) {
  console.error(`Broken internal links (${broken.length}):\n  ${broken.join('\n  ')}`);
  process.exit(1);
}
console.log(`Links OK: ${htmlFiles.length} pages checked under ${site.origin}${base}`);
