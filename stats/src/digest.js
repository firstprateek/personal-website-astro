/**
 * The hourly cron: tidies expired sign-in tokens and old salts, and on Monday at 09:00 in the
 * owner's time zone (the last one the dashboard saw) sends the week's digest
 * to Telegram.
 */
import { DAY, change, claim, getMeta, localClock, sendTelegram } from './util.js';
import { countryName, siteName, stats } from './dashboard.js';

export const DIGEST = { weekday: 1, hour: 9 };

export async function hourly(env, now, origin) {
  await env.DB.prepare('DELETE FROM tokens WHERE expires < ?').bind(now).run();
  // Yesterday's salt goes within the hour after midnight UTC, even on a day
  // with no visits to trigger it.
  await env.DB.prepare('DELETE FROM salts WHERE day < ?').bind(new Date(now).toISOString().slice(0, 10)).run();

  const tz = (await getMeta(env.DB, 'tz')) ?? 'UTC';
  const { weekday, hour } = localClock(tz, now);
  if (weekday !== DIGEST.weekday || hour !== DIGEST.hour) return false;
  // Claimed before sending, in one statement so overlapping runs cannot both
  // send: a failed send waits for next week rather than retrying every hour.
  if (!(await claim(env.DB, 'last_digest', now, 6 * DAY))) return false;

  const s = await stats(env.DB, { days: 7, now, tz });
  return sendTelegram(env, digestText(s, siteName(env), origin));
}

export function digestText(s, site, origin) {
  const t = s.totals;
  const b = s.before;
  const lines = [`${site}, last 7 days`];
  if (!t.views) {
    lines.push('No visits this week.');
  } else {
    const delta = (n, m) => (change(n, m) ? ` (${change(n, m)})` : '');
    lines.push(`${t.views} page views${delta(t.views, b.views)}, ${t.visits} visits${delta(t.visits, b.visits)}`);
    lines.push('', 'Top pages');
    for (const p of s.pages.slice(0, 5)) lines.push(`  ${p.views}  ${p.path}`);
    const list = (rows, name) => rows.slice(0, 5).map((r) => `${name(r)} ${r.visits ?? r.clicks}`).join(', ');
    if (s.sources.length) lines.push('', `From: ${list(s.sources, (r) => r.name)}`);
    if (s.countries.length) lines.push(`Countries: ${list(s.countries, (r) => countryName(r.name))}`);
    if (s.outbound.length) lines.push(`Clicked: ${list(s.outbound, (r) => r.name)}`);
  }
  if (origin) lines.push('', `${origin}/?days=7`);
  return lines.join('\n');
}
