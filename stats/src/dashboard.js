/**
 * The dashboard: one server-rendered page, no script. Everything that came
 * from a visitor (paths, sources, places, links) is escaped on the way out.
 *
 * Days are counted in the viewer's time zone, which Cloudflare reports from
 * their connection; the digest reuses the last one seen.
 */
import { DAY, change, esc, fmtPercent, fmtSeconds, getMeta, offsetSeconds, setMeta, zone } from './util.js';
import { page } from './page.js';
import { MAP, SHAPES } from './world.js';

export const RANGES = [1, 7, 30, 90, 365];
const READ = 'avg(CASE WHEN depth IS NULL THEN NULL WHEN depth >= 90 THEN 1.0 ELSE 0.0 END)';

/**
 * Filters a dashboard view can narrow to, from its query string: a country
 * (ISO alpha-2, as tapped on the map or the list) and a page path. Both are
 * bound as parameters, never spliced into SQL.
 */
export function filters(params) {
  const country = params.get('country');
  const path = params.get('path');
  return {
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    path: path && path.startsWith('/') ? path.slice(0, 200) : null,
  };
}

export async function stats(db, { days, now, tz, filter = {} }) {
  // The range is whole local days: today so far plus the days - 1 before it,
  // so the totals and the chart cover the same views.
  const off = offsetSeconds(tz, now);
  const midnight = Math.floor((now + off * 1000) / DAY) * DAY - off * 1000;
  const start = midnight - (days - 1) * DAY;
  const prev = start - days * DAY;
  const q = (sql, args) => db.prepare(sql).bind(...args);
  const all = async (sql, ...args) => (await q(sql, args.flat()).all()).results;

  // `AND ...` clauses for the active filters, on a table alias. The map's own
  // country query skips the country filter so the other countries stay visible.
  const where = (alias = '', { country = true } = {}) => {
    const a = alias ? `${alias}.` : '';
    const sql = [];
    const args = [];
    if (country && filter.country) sql.push(`AND ${a}country = ?`), args.push(filter.country);
    if (filter.path) sql.push(`AND ${a}path = ?`), args.push(filter.path);
    return [sql.join(' '), args];
  };
  const [f, fa] = where();
  const [fv, fva] = where('v');
  const [fm, fma] = where('', { country: false });

  const totals = (from, to) =>
    q(
      `SELECT count(*) AS views, count(DISTINCT visitor) AS visits, avg(seconds) AS seconds, ${READ} AS read
       FROM views WHERE ts >= ? AND ts < ? ${f}`,
      [from, to, ...fa],
    ).first();

  const [now_, before, daily, pages, sources, map, cities, devices, browsers, outbound, recent, clicks] =
    await Promise.all([
      totals(start, now + 1),
      totals(prev, start),
      all(
        `SELECT date(ts / 1000 + ?, 'unixepoch') AS day, count(*) AS views, count(DISTINCT visitor) AS visits
         FROM views WHERE ts >= ? ${f} GROUP BY day ORDER BY day`,
        off,
        start,
        fa,
      ),
      all(
        `SELECT path, count(*) AS views, count(DISTINCT visitor) AS visits, avg(seconds) AS seconds, ${READ} AS read
         FROM views WHERE ts >= ? ${f} GROUP BY path ORDER BY views DESC, path LIMIT 30`,
        start,
        fa,
      ),
      all(
        `SELECT coalesce(ref, 'Direct') AS name, count(DISTINCT visitor) AS visits
         FROM views WHERE ts >= ? AND (ref IS NULL OR ref <> '') ${f}
         GROUP BY name ORDER BY visits DESC, name LIMIT 15`,
        start,
        fa,
      ),
      all(
        `SELECT coalesce(country, '??') AS name, count(DISTINCT visitor) AS visits
         FROM views WHERE ts >= ? ${fm} GROUP BY name ORDER BY visits DESC, name`,
        start,
        fma,
      ),
      all(
        `SELECT city, country, count(DISTINCT visitor) AS visits
         FROM views WHERE ts >= ? AND city IS NOT NULL ${f}
         GROUP BY city, country ORDER BY visits DESC, city LIMIT 15`,
        start,
        fa,
      ),
      all(
        `SELECT device AS name, count(DISTINCT visitor) AS visits
         FROM views WHERE ts >= ? ${f} GROUP BY name ORDER BY visits DESC`,
        start,
        fa,
      ),
      all(
        `SELECT browser || ' · ' || os AS name, count(DISTINCT visitor) AS visits
         FROM views WHERE ts >= ? ${f} GROUP BY name ORDER BY visits DESC LIMIT 10`,
        start,
        fa,
      ),
      all(
        `SELECT c.href AS name, count(*) AS clicks, count(DISTINCT v.visitor) AS visits
         FROM clicks c JOIN views v ON v.id = c.view WHERE c.ts >= ? ${fv}
         GROUP BY c.href ORDER BY clicks DESC, name LIMIT 15`,
        start,
        fva,
      ),
      all(
        `SELECT id, ts, visitor, path, ref, country, city, device, browser, os, seconds
         FROM views WHERE ts >= ? ${f} ORDER BY ts DESC LIMIT 500`,
        start,
        fa,
      ),
      all(`SELECT view, ts, href FROM clicks WHERE ts >= ? ORDER BY ts DESC LIMIT 500`, start),
    ]);

  return {
    days,
    tz,
    filter,
    totals: now_,
    before,
    daily: fillDays(daily, start, days, off),
    pages,
    sources,
    // Every country, for the map; the list shows the top ones.
    map,
    countries: filter.country ? map.filter((r) => r.name === filter.country) : map.slice(0, 15),
    cities,
    devices,
    browsers,
    outbound,
    visits: groupVisits(recent, clicks, 30),
  };
}

/** Every day in the range, with zeros where nothing happened. */
function fillDays(rows, start, days, off) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  for (let i = 0, t = start + DAY / 2; t < start + days * DAY; i++, t = start + i * DAY + DAY / 2) {
    const day = new Date(t + off * 1000).toISOString().slice(0, 10);
    if (out.length && out.at(-1).day === day) continue;
    out.push(byDay.get(day) ?? { day, views: 0, visits: 0 });
  }
  return out;
}

/** The latest visits, newest first, each with its pages and outbound clicks in order. */
export function groupVisits(views, clicks, limit) {
  const clicksByView = new Map();
  for (const c of clicks) {
    if (!clicksByView.has(c.view)) clicksByView.set(c.view, []);
    clicksByView.get(c.view).push(c);
  }
  const visits = new Map();
  for (const v of views) {
    if (!visits.has(v.visitor)) {
      if (visits.size >= limit) continue;
      visits.set(v.visitor, { ...v, steps: [] });
    }
    const visit = visits.get(v.visitor);
    visit.start = v.ts;
    // Views arrive newest first; the oldest one decides the source.
    if (v.ref !== '') visit.ref = v.ref;
    visit.steps.push({ path: v.path, seconds: v.seconds, ts: v.ts, out: (clicksByView.get(v.id) ?? []).map((c) => c.href).reverse() });
  }
  return [...visits.values()].map((v) => ({ ...v, steps: v.steps.reverse() }));
}

export async function dashboard(request, env, url, now = Date.now()) {
  const days = RANGES.includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
  const filter = filters(url.searchParams);
  const tz = zone(request.cf?.timezone ?? (await getMeta(env.DB, 'tz')) ?? 'UTC');
  if (request.cf?.timezone && (await getMeta(env.DB, 'tz')) !== tz) await setMeta(env.DB, 'tz', tz);
  const s = await stats(env.DB, { days, now, tz, filter });
  return render(s, { site: siteName(env), now });
}

export function siteName(env) {
  const first = (env.ALLOWED_ORIGINS ?? '').split(',')[0]?.trim();
  try {
    return new URL(first).hostname;
  } catch {
    return 'site';
  }
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

export function countryName(code) {
  if (!code || code === '??' || code === 'XX' || code === 'T1') return 'Unknown';
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

function flag(code) {
  if (!/^[A-Z]{2}$/.test(code ?? '') || code === 'XX' || code === 'T1') return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) + ' ';
}

function table(rows, columns, { label, weight = 'visits', empty = 'Nothing yet.' }) {
  if (!rows.length) return `<p class="muted small">${empty}</p>`;
  const max = Math.max(...rows.map((r) => r[weight] || 0), 1);
  const head = `<tr><th>${esc(label)}</th>${columns.map((c) => `<th>${esc(c.title)}</th>`).join('')}</tr>`;
  const body = rows
    .map((r) => {
      const w = Math.round(((r[weight] || 0) / max) * 100);
      return `<tr><td style="--w:${w}%"><span>${r.label}</span></td>${columns
        .map((c) => `<td>${esc(c.value(r))}</td>`)
        .join('')}</tr>`;
    })
    .join('');
  return `<table>${head}${body}</table>`;
}

/** A dashboard URL with the current range and filters, changed by `next`. */
export function link(s, next = {}) {
  const v = { days: s.days, country: s.filter.country, path: s.filter.path, ...next };
  const params = new URLSearchParams();
  if (v.days !== 30) params.set('days', String(v.days));
  if (v.country) params.set('country', v.country);
  if (v.path) params.set('path', v.path);
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

/**
 * Countries shaded by visits (square-root scale, so one big country does not
 * wash out the rest). Each shape is a link that filters the page to it.
 */
function worldMap(s) {
  const visits = new Map(s.map.map((r) => [r.name, r.visits]));
  const max = Math.max(...visits.values(), 1);
  const shapes = SHAPES.map(([code, name, d]) => {
    const n = visits.get(code) ?? 0;
    const title = `${countryName(code) === 'Unknown' ? name : countryName(code)}: ${n} visit${n === 1 ? '' : 's'}`;
    const selected = code && code === s.filter.country;
    const style = n ? ` style="fill-opacity:${(0.25 + 0.75 * Math.sqrt(n / max)).toFixed(2)}"` : '';
    const cls = `${n ? 'on' : 'off'}${selected ? ' sel' : ''}`;
    const shape = `<path class="${cls}" d="${d}"${style}><title>${esc(title)}</title></path>`;
    if (!code) return shape;
    const target = selected ? link(s, { country: null }) : link(s, { country: code });
    return `<a href="${esc(target)}" aria-label="${esc(title)}">${shape}</a>`;
  }).join('');
  const total = [...visits.values()].reduce((a, b) => a + b, 0);
  const placed = visits.size - (visits.has('??') ? 1 : 0);
  return `<div class="map">
    <svg viewBox="0 0 ${MAP.width} ${MAP.height}" role="img" aria-label="Visits by country">${shapes}</svg>
  </div>
  <p class="muted small">${total} visit${total === 1 ? '' : 's'} from ${placed} countr${placed === 1 ? 'y' : 'ies'}. Tap a country to see only its visits.</p>`;
}

function chart(daily) {
  const W = 1000;
  const H = 120;
  const max = Math.max(...daily.map((d) => d.views), 1);
  const step = W / daily.length;
  const gap = daily.length > 60 ? 0 : step * 0.18;
  const bars = daily
    .map((d, i) => {
      const x = (i * step + gap / 2).toFixed(1);
      const w = (step - gap).toFixed(1);
      const hv = ((d.views / max) * (H - 4)).toFixed(1);
      const hu = ((d.visits / max) * (H - 4)).toFixed(1);
      return `<rect class="v" x="${x}" y="${(H - hv).toFixed(1)}" width="${w}" height="${hv}"><title>${esc(d.day)}: ${d.views} views, ${d.visits} visits</title></rect><rect class="u" x="${x}" y="${(H - hu).toFixed(1)}" width="${w}" height="${hu}"/>`;
    })
    .join('');
  const fmt = (day) =>
    new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `<div class="chart">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Page views and visits per day">${bars}</svg>
    <div class="axis"><span>${esc(fmt(daily[0].day))}</span><span>peak ${max}</span><span>${esc(fmt(daily.at(-1).day))}</span></div>
  </div>
  <p class="legend"><s style="background:var(--bar)"></s>page views<s style="background:var(--accent)"></s>visits</p>`;
}

function when(ts, tz, now) {
  const opts = { timeZone: tz, hour: 'numeric', minute: '2-digit' };
  const day = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: tz });
  if (day(ts) === day(now)) return `Today ${new Date(ts).toLocaleTimeString('en-US', opts)}`;
  if (day(ts) === day(now - DAY)) return `Yesterday ${new Date(ts).toLocaleTimeString('en-US', opts)}`;
  return new Date(ts).toLocaleString('en-US', { ...opts, weekday: 'short', month: 'short', day: 'numeric' });
}

function visitList(visits, tz, now) {
  if (!visits.length) return '<p class="muted small">No visits yet.</p>';
  return `<ol class="visits">${visits
    .map((v) => {
      const place = [v.city, countryName(v.country)].filter(Boolean).join(', ');
      const from = v.ref == null ? 'direct' : `from ${v.ref}`;
      const trail = v.steps
        .map(
          (s) =>
            `${esc(s.path)}${s.seconds ? ` <span class="muted small">${esc(fmtSeconds(s.seconds))}</span>` : ''}${s.out
              .map((h) => ` <span class="out">↗ ${esc(h)}</span>`)
              .join('')}`,
        )
        .join(' → ');
      return `<li><div class="who">${esc(when(v.start, tz, now))} · ${flag(v.country)}${esc(place)} · ${esc(
        `${v.device}, ${v.browser}`,
      )} · ${esc(from)}</div><div class="trail">${trail}</div></li>`;
    })
    .join('')}</ol>`;
}

export function render(s, { site, now }) {
  const t = s.totals;
  const b = s.before;
  const tile = (value, label, delta = '') =>
    `<div class="tile"><b>${esc(value)}${delta ? `<i>${esc(delta)}</i>` : ''}</b><span>${esc(label)}</span></div>`;
  const rangeName = (d) => (d === 1 ? 'Today' : d === 365 ? '1 year' : `${d} days`);
  const ranges = RANGES.map(
    (d) => `<a href="${esc(link(s, { days: d }))}"${d === s.days ? ' aria-current="page"' : ''}>${rangeName(d)}</a>`,
  ).join('');
  const chips = [
    s.filter.country &&
      `<a class="chip" href="${esc(link(s, { country: null }))}">${flag(s.filter.country)}${esc(countryName(s.filter.country))} <span aria-label="remove">✕</span></a>`,
    s.filter.path &&
      `<a class="chip" href="${esc(link(s, { path: null }))}">${esc(s.filter.path)} <span aria-label="remove">✕</span></a>`,
  ].filter(Boolean);
  const versus = s.days === 1 ? 'yesterday' : `the ${s.days} days before`;

  const body = `
  <h1>${esc(site)}</h1>
  <nav class="ranges" aria-label="Range">${ranges}</nav>
  ${chips.length ? `<p class="chips">Showing only ${chips.join(' ')}</p>` : ''}
  <div class="tiles">
    ${tile(t.views, 'page views', change(t.views, b.views))}
    ${tile(t.visits, 'visits', change(t.visits, b.visits))}
    ${tile(fmtSeconds(t.seconds), 'avg time on a page')}
    ${tile(fmtPercent(t.read), 'read to the end')}
  </div>
  <p class="muted small">A visit is one person on one day. Today counts as a day. Change is against ${versus}.</p>

  <h2>Where readers are</h2>
  ${worldMap(s)}

  ${s.days > 1 ? `<h2>Per day</h2>\n  ${chart(s.daily)}` : ''}

  <h2>Content</h2>
  ${table(
    s.pages.map((r) => ({ ...r, label: `<a href="${esc(link(s, { path: r.path }))}">${esc(r.path)}</a>` })),
    [
      { title: 'views', value: (r) => r.views },
      { title: 'visits', value: (r) => r.visits },
      { title: 'time', value: (r) => fmtSeconds(r.seconds) },
      { title: 'read', value: (r) => fmtPercent(r.read) },
    ],
    { label: 'Page', weight: 'views' },
  )}
  <p class="muted small">Time is how long the page was on screen; read is the share of views scrolled to the end. Tap a page to see only its readers.</p>

  <h2>Links clicked off the site</h2>
  ${table(
    s.outbound.map((r) => ({ ...r, label: esc(r.name) })),
    [
      { title: 'clicks', value: (r) => r.clicks },
      { title: 'visits', value: (r) => r.visits },
    ],
    { label: 'Link', weight: 'clicks', empty: 'No clicks yet.' },
  )}

  <h2>Where visits came from</h2>
  ${table(
    s.sources.map((r) => ({ ...r, label: esc(r.name) })),
    [{ title: 'visits', value: (r) => r.visits }],
    { label: 'Source' },
  )}

  <h2>Countries</h2>
  ${table(
    s.countries.map((r) => ({
      ...r,
      label: /^[A-Z]{2}$/.test(r.name)
        ? `<a href="${esc(link(s, { country: r.name }))}">${flag(r.name)}${esc(countryName(r.name))}</a>`
        : esc(countryName(r.name)),
    })),
    [{ title: 'visits', value: (r) => r.visits }],
    { label: 'Country' },
  )}

  <h2>Cities</h2>
  ${table(
    s.cities.map((r) => ({ ...r, label: `${flag(r.country)}${esc(r.city)}` })),
    [{ title: 'visits', value: (r) => r.visits }],
    { label: 'City' },
  )}

  <h2>Devices</h2>
  ${table(
    s.devices.map((r) => ({ ...r, label: esc(r.name) })),
    [{ title: 'visits', value: (r) => r.visits }],
    { label: 'Device' },
  )}
  ${table(
    s.browsers.map((r) => ({ ...r, label: esc(r.name) })),
    [{ title: 'visits', value: (r) => r.visits }],
    { label: 'Browser' },
  )}

  <h2>Latest visits</h2>
  ${visitList(s.visits, s.tz, now)}

  <footer>
    <span>Times in ${esc(s.tz)}</span>
    <a href="https://${esc(site)}/?notrack">Stop counting this device</a>
    <form method="post" action="/logout"><button type="submit">Sign out</button></form>
  </footer>`;
  return page(`${site} stats`, body);
}
