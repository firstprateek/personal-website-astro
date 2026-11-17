import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { auth, signedIn, LINK_GAP } from '../src/auth.js';
import { stats, render, groupVisits } from '../src/dashboard.js';
import { hourly, digestText } from '../src/digest.js';
import { collect } from '../src/collect.js';
import { offsetSeconds, localClock } from '../src/util.js';
import { d1 } from './d1.js';

const SELF = 'https://pulse.example';
const SITE = 'https://site.example';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
let sent;
const realFetch = globalThis.fetch;

beforeEach(() => {
  sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ url: String(url), body: JSON.parse(init.body) });
    return new Response('{}');
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const env = () => ({ ALLOWED_ORIGINS: SITE, DB: d1(), TELEGRAM_BOT_TOKEN: '1:tok', TELEGRAM_CHAT_ID: '42' });
const post = (path, { origin = SELF, form, cookie } = {}) =>
  new Request(`${SELF}${path}`, {
    method: 'POST',
    headers: { ...(origin ? { Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: form ? new URLSearchParams(form) : undefined,
  });
const call = (req, e, now) => auth(req, e, new URL(req.url), now);
const T0 = Date.UTC(2026, 10, 16, 17); // Monday 09:00 in Los Angeles

async function signIn(e, now = T0) {
  await call(post('/login'), e, now);
  const link = new URL(sent.at(-1).body.text.split('\n').at(-1));
  const res = await call(post('/auth', { form: { t: link.searchParams.get('t') } }), e, now);
  return { res, link, cookie: res.headers.get('Set-Cookie')?.split(';')[0] };
}

test('the dashboard asks for sign-in, and shows nothing without it', async () => {
  const e = env();
  const res = await worker.fetch(new Request(`${SELF}/`), e);
  const body = await res.text();
  assert.match(body, /Send me a link/);
  assert.doesNotMatch(body, /page views/);
  assert.match(res.headers.get('Content-Security-Policy'), /default-src 'none'/);
});

test('a Telegram link signs in once, and the session opens the dashboard', async () => {
  const e = env();
  const { res, link, cookie } = await signIn(e);
  assert.equal(sent[0].body.chat_id, '42');
  assert.equal(sent[0].body.link_preview_options.is_disabled, true);
  assert.equal(link.origin, SELF);
  assert.equal(res.status, 303);
  assert.match(res.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
  assert.ok(await signedIn(new Request(`${SELF}/`, { headers: { Cookie: cookie } }), e, T0));

  // Opening the link only shows a button; it does not spend the token.
  const get = await call(new Request(link), e, T0);
  assert.match(await get.text(), /<form method="post" action="\/auth">/);
  // Spent: a second use is refused.
  const again = await call(post('/auth', { form: { t: link.searchParams.get('t') } }), e, T0);
  assert.equal(again.status, 403);

  const dash = await worker.fetch(new Request(`${SELF}/?days=7`, { headers: { Cookie: cookie } }), e);
  assert.match(await dash.text(), /page views/);

  const out = await call(post('/logout', { cookie }), e, T0);
  assert.match(out.headers.get('Set-Cookie'), /Max-Age=0/);
  assert.equal(await signedIn(new Request(`${SELF}/`, { headers: { Cookie: cookie } }), e, T0), false);
});

test('links expire, are rate limited, and cross-site forms are refused', async () => {
  const e = env();
  await call(post('/login'), e, T0);
  await call(post('/login'), e, T0 + 1000);
  assert.equal(sent.length, 1, 'second link within the gap is not sent');
  const t = new URL(sent[0].body.text.split('\n').at(-1)).searchParams.get('t');
  assert.equal((await call(post('/auth', { form: { t } }), e, T0 + 11 * 60_000)).status, 403);
  await call(post('/login'), e, T0 + LINK_GAP + 1);
  assert.equal(sent.length, 2);
  assert.equal((await call(post('/login', { origin: 'https://evil.example' }), e, T0)).status, 403);
  assert.equal((await call(post('/auth', { origin: null, form: { t } }), e, T0)).status, 403);
  assert.equal(await signedIn(new Request(`${SELF}/`, { headers: { Cookie: 'pulse_session=guess' } }), e, T0), false);
});

async function seed(e, now) {
  const view = (id, p, extra = {}, at = now) => {
    const req = new Request(`${SELF}/p`, {
      method: 'POST',
      headers: { Origin: SITE, 'User-Agent': extra.ua ?? UA, 'CF-Connecting-IP': extra.ip ?? '198.51.100.1' },
      body: JSON.stringify({ id, ...p }),
    });
    Object.defineProperty(req, 'cf', { value: { country: extra.country ?? 'IN', city: extra.city ?? 'Pune' } });
    return collect(req, e, at);
  };
  const id = (c) => c.repeat(32);
  await view(id('1'), { t: 'view', p: '/', r: 'https://lnkd.in/x' }, {}, now - 3000);
  await view(id('2'), { t: 'view', p: '/projects/i-inc/', r: `${SITE}/` }, {}, now - 2000);
  await view(id('2'), { t: 'leave', sec: 75, d: 100 }, {}, now - 1500);
  await view(id('2'), { t: 'out', h: 'https://github.com/firstprateek/i-inc' }, {}, now - 1000);
  await view(id('3'), { t: 'view', p: '/<script>alert(1)</script>/', r: 'https://evil.example/"><img>' }, { ip: '198.51.100.2', country: 'US', city: '<b>X</b>' }, now - 500);
  // Last week, for the change figures.
  await view(id('4'), { t: 'view', p: '/' }, { ip: '198.51.100.3' }, now - 9 * 86400_000);
}

test('stats count views, visits, sources, places and journeys', async () => {
  const e = env();
  await seed(e, T0);
  const s = await stats(e.DB, { days: 7, now: T0, tz: 'America/Los_Angeles' });
  assert.equal(s.totals.views, 3);
  assert.equal(s.totals.visits, 2);
  assert.equal(s.before.views, 1);
  assert.equal(s.daily.length, 7);
  assert.equal(s.daily.at(-1).views, 3);
  assert.deepEqual(s.sources.map((r) => [r.name, r.visits]).sort(), [['evil.example', 1], ['linkedin.com', 1]]);
  assert.equal(s.pages.find((p) => p.path === '/projects/i-inc/').read, 1);
  assert.equal(s.outbound[0].name, 'github.com/firstprateek/i-inc');
  const journey = s.visits.find((v) => v.country === 'IN');
  assert.equal(journey.ref, 'linkedin.com');
  assert.deepEqual(journey.steps.map((x) => x.path), ['/', '/projects/i-inc/']);
  assert.deepEqual(journey.steps[1].out, ['github.com/firstprateek/i-inc']);
});

test('visitor-supplied text is escaped in the dashboard', async () => {
  const e = env();
  await seed(e, T0);
  const s = await stats(e.DB, { days: 30, now: T0, tz: 'UTC' });
  const page = render(s, { site: 'site.example', now: T0 });
  assert.doesNotMatch(page, /<script>alert/);
  assert.doesNotMatch(page, /<b>X<\/b>/);
  assert.doesNotMatch(page, /"><img>/);
  assert.match(page, /&lt;script&gt;/);
});

test('the digest goes out on Monday 09:00 local, once a week', async () => {
  const e = env();
  await seed(e, T0);
  await e.DB.prepare(`INSERT INTO meta (k, v) VALUES ('tz', 'America/Los_Angeles')`).run();
  assert.equal(await hourly(e, T0 - 3600_000, SELF), false, '08:00 is too early');
  assert.equal(await hourly(e, T0, SELF), true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].body.text, /3 page views \(\+200%\), 2 visits/);
  assert.match(sent[0].body.text, /linkedin\.com 1/);
  assert.match(sent[0].body.text, /https:\/\/pulse\.example\/\?days=7/);
  assert.equal(await hourly(e, T0 + 3600_000, SELF), false, 'not twice');
  assert.equal(await hourly(e, T0 + 7 * 86400_000, SELF), true, 'next Monday');
});

test('an empty week still makes a short digest', async () => {
  const e = env();
  const s = await stats(e.DB, { days: 7, now: T0, tz: 'UTC' });
  assert.match(digestText(s, 'site.example', SELF), /No visits this week/);
});

test('time zone helpers', () => {
  assert.equal(offsetSeconds('America/Los_Angeles', T0), -8 * 3600);
  assert.equal(offsetSeconds('Asia/Kolkata', T0), 5.5 * 3600);
  assert.equal(offsetSeconds('Not/AZone', T0), 0);
  assert.deepEqual(localClock('America/Los_Angeles', T0), { weekday: 1, hour: 9 });
});

test('journeys group by visitor and keep the entry source', () => {
  const v = (id, visitor, ts, path, ref) => ({ id, visitor, ts, path, ref, seconds: null });
  const visits = groupVisits([v('b', 'x', 2, '/b/', ''), v('a', 'x', 1, '/', 'github.com'), v('c', 'y', 3, '/', null)], [{ view: 'b', ts: 2, href: 'github.com/z' }], 10);
  assert.equal(visits.length, 2);
  const x = visits.find((g) => g.visitor === 'x');
  assert.equal(x.ref, 'github.com');
  assert.deepEqual(x.steps.map((s) => s.path), ['/', '/b/']);
  assert.deepEqual(x.steps[1].out, ['github.com/z']);
});

test('filters narrow everything except the map, and only accept clean values', async () => {
  const { filters } = await import('../src/dashboard.js');
  assert.deepEqual(filters(new URLSearchParams('country=IN&path=/about/')), { country: 'IN', path: '/about/' });
  assert.deepEqual(filters(new URLSearchParams("country=IN' OR 1=1&path=javascript:x")), { country: null, path: null });

  const e = env();
  await seed(e, T0);
  const byCountry = await stats(e.DB, { days: 7, now: T0, tz: 'UTC', filter: { country: 'IN' } });
  assert.equal(byCountry.totals.views, 2);
  assert.deepEqual(byCountry.countries.map((r) => r.name), ['IN']);
  assert.deepEqual(byCountry.map.map((r) => r.name).sort(), ['IN', 'US'], 'map keeps other countries');
  const byPage = await stats(e.DB, { days: 7, now: T0, tz: 'UTC', filter: { path: '/projects/i-inc/' } });
  assert.equal(byPage.totals.views, 1);
  assert.equal(byPage.outbound.length, 1);
  assert.deepEqual(byPage.map.map((r) => r.name), ['IN']);
});

test('the map shades visited countries, links each to its filter, and keeps the range', async () => {
  const e = env();
  await seed(e, T0);
  const s = await stats(e.DB, { days: 7, now: T0, tz: 'UTC', filter: { country: 'IN' } });
  const html = render(s, { site: 'site.example', now: T0 });
  assert.match(html, /<a href="\/\?days=7" aria-label="India: 1 visit"><path class="on sel"/);
  assert.match(html, /<a href="\/\?days=7&amp;country=US" aria-label="United States: 1 visit"><path class="on"/);
  assert.match(html, /aria-label="Brazil: 0 visits"><path class="off"/);
  assert.match(html, /Showing only/);
  // Today has no per-day chart.
  const today = render(await stats(e.DB, { days: 1, now: T0, tz: 'UTC' }), { site: 'site.example', now: T0 });
  assert.doesNotMatch(today, /Per day/);
  assert.match(today, /against yesterday/);
});

test('a link burst sends one link, and overlapping digest runs send once', async () => {
  const e = env();
  await Promise.all([1, 2, 3, 4, 5].map(() => call(post('/login'), e, T0)));
  assert.equal(sent.length, 1);
  await e.DB.prepare(`INSERT INTO meta (k, v) VALUES ('tz', 'America/Los_Angeles')`).run();
  const runs = await Promise.all([hourly(e, T0, SELF), hourly(e, T0, SELF)]);
  assert.deepEqual(runs.sort(), [false, true]);
});
