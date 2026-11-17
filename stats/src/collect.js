/**
 * The beacon endpoint. The site's head script sends three kinds of event with
 * navigator.sendBeacon (text/plain JSON, so no CORS preflight):
 *
 *   { t: 'view',  id, p, r, s }   a page was opened: path, document.referrer, campaign source
 *   { t: 'leave', id, sec, d }    the page was hidden: visible seconds, furthest scroll in %
 *   { t: 'out',   id, h }         a link off the site was clicked
 *
 * Nothing about the reader is stored that could name them: no cookies, no IP.
 * The visitor key is a hash of IP and user agent with a salt that lives one
 * UTC day, so it counts visits within a day and does not link days together.
 */
import { HOUR, randomToken, readCapped, sha256, origins, siteHosts } from './util.js';

export const LIMITS = { body: 2048, path: 200, href: 400, source: 60, seconds: 1800 };

const ID = /^[0-9a-f]{32}$/;
// Link-preview fetchers run no script, so they never get here; this catches
// crawlers and automation that do.
const BOT =
  /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|python|curl|wget|httpclient|go-http|java\/|okhttp|axios|node-fetch|phantom|selenium|puppeteer|playwright/i;

export async function collect(request, env, now = Date.now()) {
  const done = (status) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return done(405);
  if (!origins(env).includes(request.headers.get('Origin'))) return done(403);

  const ua = request.headers.get('User-Agent') ?? '';
  // Accepted and dropped, so a crawler that runs scripts learns nothing.
  if (!ua || BOT.test(ua)) return done(204);

  const raw = await readCapped(request, LIMITS.body);
  if (raw === null) return done(413);
  let e;
  try {
    e = JSON.parse(raw);
  } catch {
    return done(400);
  }
  if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !ID.test(e.id)) return done(400);

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (env.LIMITER) {
    const { success } = await env.LIMITER.limit({ key: ip || 'unknown' });
    if (!success) return done(429);
  }

  if (e.t === 'view') {
    const path = cleanPath(e.p);
    if (!path) return done(400);
    const cf = request.cf ?? {};
    const salt = await daySalt(env.DB, now);
    const visitor = (await sha256(`${salt}|${ip}|${ua}`)).slice(0, 16);
    const { device, browser, os } = parseUA(ua);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO views (id, ts, visitor, path, ref, country, region, city, device, browser, os)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        e.id,
        now,
        visitor,
        path,
        source(e.r, e.s, ua, siteHosts(env)),
        short(cf.country, 2),
        short(cf.region, 60),
        short(cf.city, 60),
        device,
        browser,
        os,
      )
      .run();
    return done(204);
  }

  if (e.t === 'leave') {
    const seconds = clamp(e.sec, 0, LIMITS.seconds);
    const depth = clamp(e.d, 0, 100);
    if (seconds === null || depth === null) return done(400);
    // A page can be hidden and shown many times; keep the largest of each.
    await env.DB.prepare(
      `UPDATE views SET seconds = max(coalesce(seconds, 0), ?), depth = max(coalesce(depth, 0), ?)
       WHERE id = ? AND ts > ?`,
    )
      .bind(seconds, depth, e.id, now - 12 * HOUR)
      .run();
    return done(204);
  }

  if (e.t === 'out') {
    const href = cleanHref(e.h);
    if (!href) return done(400);
    await env.DB.prepare(
      `INSERT INTO clicks (view, ts, href) SELECT id, ?, ? FROM views WHERE id = ? AND ts > ?`,
    )
      .bind(now, href, e.id, now - 12 * HOUR)
      .run();
    return done(204);
  }

  return done(400);
}

/** Today's salt (UTC), made on first use. Yesterday's is deleted with it. */
export async function daySalt(db, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  let salt = await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first('salt');
  if (salt) return salt;
  await db.prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?, ?)').bind(day, randomToken()).run();
  await db.prepare('DELETE FROM salts WHERE day < ?').bind(day).run();
  // Re-read: two first-of-the-day requests may race, and only one insert wins.
  salt = await db.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first('salt');
  return salt;
}

function short(value, max) {
  return typeof value === 'string' && value ? value.slice(0, max) : null;
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(max, Math.max(min, n)));
}

/** A site path: starts with one slash, no query or fragment, bounded. */
export function cleanPath(p) {
  if (typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//')) return null;
  let path = p.split(/[?#]/)[0];
  try {
    path = decodeURI(path);
  } catch {}
  return path.slice(0, LIMITS.path);
}

/** An outbound link, reduced to origin and path so query strings don't split counts. */
export function cleanHref(h) {
  if (typeof h !== 'string') return null;
  try {
    const u = new URL(h);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.replace(/^www\./, '');
    return `${host}${u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')}`.slice(0, LIMITS.href);
  } catch {
    return null;
  }
}

/**
 * Where the visit came from. NULL is a direct visit, '' a page reached from
 * another page of this site (so source counts see only entries), otherwise a
 * short host or campaign name.
 */
export function source(referrer, campaign, ua, ownHosts) {
  if (typeof referrer === 'string' && referrer) {
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, '');
      if (ownHosts.includes(host)) return '';
      return normalizeHost(host);
    } catch {}
  }
  if (typeof campaign === 'string' && campaign.trim()) {
    return campaign.trim().toLowerCase().slice(0, LIMITS.source);
  }
  // In-app browsers often send no referrer but name themselves.
  if (/LinkedInApp/i.test(ua)) return 'linkedin.com';
  if (/FBAN|FBAV/.test(ua)) return 'facebook.com';
  if (/Instagram/.test(ua)) return 'instagram.com';
  return null;
}

const HOSTS = [
  [/(^|\.)linkedin\.com$|^lnkd\.in$|^com\.linkedin\.android$/, 'linkedin.com'],
  [/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'x.com'],
  [/(^|\.)google\.[a-z.]+$|^com\.google\./, 'google'],
  [/(^|\.)bing\.com$/, 'bing.com'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo.com'],
  [/(^|\.)facebook\.com$/, 'facebook.com'],
  [/(^|\.)reddit\.com$/, 'reddit.com'],
  [/^github\.com$/, 'github.com'],
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'chatgpt.com'],
  [/(^|\.)claude\.ai$/, 'claude.ai'],
  [/(^|\.)perplexity\.ai$/, 'perplexity.ai'],
];

export function normalizeHost(host) {
  for (const [pattern, name] of HOSTS) if (pattern.test(host)) return name;
  return host.slice(0, LIMITS.source);
}

export function parseUA(ua) {
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)
    ? 'tablet'
    : /Mobi|iPhone|iPod|Android/i.test(ua)
      ? 'phone'
      : 'desktop';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung'
        : /Firefox|FxiOS/.test(ua)
          ? 'Firefox'
          : /Chrome|CriOS|Chromium/.test(ua)
            ? 'Chrome'
            : /Safari/.test(ua)
              ? 'Safari'
              : 'Other';
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /CrOS/.test(ua)
        ? 'ChromeOS'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Other';
  return { device, browser, os };
}

