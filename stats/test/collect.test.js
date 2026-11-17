import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collect, source, parseUA, cleanPath, cleanHref, daySalt } from '../src/collect.js';
import { d1 } from './d1.js';

const ORIGIN = 'https://site.example';
const SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ID = 'a'.repeat(32);
const T0 = Date.UTC(2026, 10, 16, 12);

function env() {
  return { ALLOWED_ORIGINS: ORIGIN, DB: d1() };
}

function beacon(body, { origin = ORIGIN, ua = SAFARI, ip = '203.0.113.9', cf = { country: 'US', region: 'Washington', city: 'Seattle' } } = {}) {
  const req = new Request('https://pulse.example/p', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      ...(origin ? { Origin: origin } : {}),
      'User-Agent': ua,
      'CF-Connecting-IP': ip,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  Object.defineProperty(req, 'cf', { value: cf });
  return req;
}

const rows = (e, sql = 'SELECT * FROM views') => e.DB.sqlite.prepare(sql).all();

test('a view is stored with place, device and source, and no IP', async () => {
  const e = env();
  const res = await collect(beacon({ t: 'view', id: ID, p: '/writing/hello/', r: 'https://www.linkedin.com/feed/' }), e, T0);
  assert.equal(res.status, 204);
  const [v] = rows(e);
  assert.equal(v.path, '/writing/hello/');
  assert.equal(v.ref, 'linkedin.com');
  assert.equal(v.country, 'US');
  assert.equal(v.city, 'Seattle');
  assert.equal(v.device, 'phone');
  assert.equal(v.browser, 'Safari');
  assert.equal(v.os, 'iOS');
  assert.match(v.visitor, /^[0-9a-f]{16}$/);
  assert.ok(!JSON.stringify(v).includes('203.0.113.9'));
});

test('beacons from other origins, without an origin, or from bots are not stored', async () => {
  const e = env();
  assert.equal((await collect(beacon({ t: 'view', id: ID, p: '/' }, { origin: 'https://evil.example' }), e, T0)).status, 403);
  assert.equal((await collect(beacon({ t: 'view', id: ID, p: '/' }, { origin: null }), e, T0)).status, 403);
  const bot = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/140.0 Safari/537.36';
  assert.equal((await collect(beacon({ t: 'view', id: ID, p: '/' }, { ua: bot }), e, T0)).status, 204);
  assert.equal(rows(e).length, 0);
  const get = new Request('https://pulse.example/p', { headers: { Origin: ORIGIN } });
  assert.equal((await collect(get, e, T0)).status, 405);
});

test('malformed beacons are refused', async () => {
  const e = env();
  for (const body of ['nope', '{}', { t: 'view', id: 'short', p: '/' }, { t: 'view', id: ID, p: 'https://x/' }, { t: 'view', id: ID, p: '//x' }, { t: 'other', id: ID }, 'x'.repeat(3000)]) {
    const res = await collect(beacon(body), e, T0);
    assert.ok(res.status === 400 || res.status === 413, `${JSON.stringify(body).slice(0, 40)} -> ${res.status}`);
  }
  assert.equal(rows(e).length, 0);
});

test('leave keeps the largest time and depth, capped, and only for recent views', async () => {
  const e = env();
  await collect(beacon({ t: 'view', id: ID, p: '/' }), e, T0);
  await collect(beacon({ t: 'leave', id: ID, sec: 40, d: 55 }), e, T0 + 40_000);
  await collect(beacon({ t: 'leave', id: ID, sec: 12, d: 30 }), e, T0 + 50_000);
  let [v] = rows(e);
  assert.equal(v.seconds, 40);
  assert.equal(v.depth, 55);
  await collect(beacon({ t: 'leave', id: ID, sec: 99999, d: 400 }), e, T0 + 60_000);
  [v] = rows(e);
  assert.equal(v.seconds, 1800);
  assert.equal(v.depth, 100);
  assert.equal((await collect(beacon({ t: 'leave', id: ID, sec: 'x', d: 1 }), e, T0)).status, 400);
});

test('outbound clicks attach to their view; unknown views are ignored', async () => {
  const e = env();
  await collect(beacon({ t: 'view', id: ID, p: '/projects/i-inc/' }), e, T0);
  await collect(beacon({ t: 'out', id: ID, h: 'https://github.com/firstprateek/i-inc/?tab=readme#x' }), e, T0 + 1000);
  await collect(beacon({ t: 'out', id: 'b'.repeat(32), h: 'https://github.com/' }), e, T0 + 1000);
  assert.equal((await collect(beacon({ t: 'out', id: ID, h: 'javascript:alert(1)' }), e, T0)).status, 400);
  const clicks = rows(e, 'SELECT * FROM clicks');
  assert.equal(clicks.length, 1);
  assert.equal(clicks[0].href, 'github.com/firstprateek/i-inc');
});

test('the visitor key holds within a day and changes the next day; old salts are deleted', async () => {
  const e = env();
  await collect(beacon({ t: 'view', id: 'a'.repeat(32), p: '/' }), e, T0);
  await collect(beacon({ t: 'view', id: 'b'.repeat(32), p: '/about/' }), e, T0 + 3600_000);
  await collect(beacon({ t: 'view', id: 'c'.repeat(32), p: '/' }), e, T0 + 86400_000);
  const [a, b, c] = rows(e, 'SELECT visitor FROM views ORDER BY ts');
  assert.equal(a.visitor, b.visitor);
  assert.notEqual(a.visitor, c.visitor);
  assert.equal(rows(e, 'SELECT * FROM salts').length, 1);
  assert.equal(await daySalt(e.DB, T0 + 86400_000), rows(e, 'SELECT salt FROM salts')[0].salt);
});

test('sources: own site, hosts, campaigns, in-app browsers, direct', () => {
  const own = ['site.example'];
  assert.equal(source('https://site.example/about/', '', SAFARI, own), '');
  assert.equal(source('https://www.google.co.uk/', '', SAFARI, own), 'google');
  assert.equal(source('https://t.co/abc', '', SAFARI, own), 'x.com');
  assert.equal(source('android-app://com.linkedin.android/', '', SAFARI, own), 'linkedin.com');
  assert.equal(source('https://news.ycombinator.com/item?id=1', '', SAFARI, own), 'news.ycombinator.com');
  assert.equal(source('', 'Newsletter', SAFARI, own), 'newsletter');
  assert.equal(source('', '', `${SAFARI} LinkedInApp`, own), 'linkedin.com');
  assert.equal(source('', '', SAFARI, own), null);
});

test('user agents', () => {
  assert.deepEqual(parseUA(SAFARI), { device: 'phone', browser: 'Safari', os: 'iOS' });
  assert.deepEqual(
    parseUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'),
    { device: 'desktop', browser: 'Chrome', os: 'macOS' },
  );
  assert.deepEqual(
    parseUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0'),
    { device: 'desktop', browser: 'Edge', os: 'Windows' },
  );
  assert.equal(parseUA('Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 Chrome/141.0 Safari/537.36').device, 'tablet');
});

test('paths and links are cleaned', () => {
  assert.equal(cleanPath('/writing/a/?utm=1#top'), '/writing/a/');
  assert.equal(cleanPath('/caf%C3%A9/'), '/café/');
  assert.equal(cleanPath('x'), null);
  assert.equal(cleanHref('https://www.linkedin.com/in/x/'), 'linkedin.com/in/x');
  assert.equal(cleanHref('mailto:a@b.c'), null);
});
