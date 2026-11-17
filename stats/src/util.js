/** Small helpers shared by the collector, the dashboard, sign-in and the digest. */

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function hex(bytes) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(bytes = 32) {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

export function origins(env) {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** The site's own hostnames, from ALLOWED_ORIGINS. */
export function siteHosts(env) {
  return origins(env).map((o) => new URL(o).hostname);
}

/** Reads the body as text, or returns null once it passes `cap` bytes. */
export async function readCapped(request, cap) {
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > cap) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > cap) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function getMeta(db, key) {
  return db.prepare('SELECT v FROM meta WHERE k = ?').bind(key).first('v');
}

export async function setMeta(db, key, value) {
  await db
    .prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v')
    .bind(key, String(value))
    .run();
}

/**
 * Takes a rate-limited slot in one statement: records `now` under `key` and
 * returns true only if the last record is at least `gap` old. Concurrent
 * callers cannot both win.
 */
export async function claim(db, key, now, gap) {
  const row = await db
    .prepare(
      `INSERT INTO meta (k, v) VALUES (?, ?)
       ON CONFLICT (k) DO UPDATE SET v = excluded.v WHERE CAST(meta.v AS INTEGER) <= ?
       RETURNING v`,
    )
    .bind(key, String(now), now - gap)
    .first();
  return Boolean(row);
}

/** A valid IANA zone name, or UTC. */
export function zone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/** The zone's offset from UTC at `at`, in seconds (for SQLite's unixepoch modifier). */
export function offsetSeconds(tz, at = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone(tz),
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(at));
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60);
}

/** Weekday (0 = Sunday) and hour in the zone at `at`. */
export function localClock(tz, at) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone(tz),
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(at));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.find((p) => p.type === 'weekday').value,
  );
  const hour = Number(parts.find((p) => p.type === 'hour').value);
  return { weekday, hour };
}

/** Sends the owner a plain-text Telegram message. Never logs the token or the text. */
export async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        // A preview fetch would open the sign-in page; it must not, and the
        // digest's link needs no card.
        link_preview_options: { is_disabled: true },
      }),
    });
    if (!res.ok) console.log('telegram refused', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.log('telegram unreachable', String(err).replace(env.TELEGRAM_BOT_TOKEN, '<token>'));
    return false;
  }
}

export function fmtSeconds(s) {
  if (s == null) return '–';
  const n = Math.round(s);
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  return n % 60 ? `${m}m ${n % 60}s` : `${m}m`;
}

export function fmtPercent(rate) {
  return rate == null ? '–' : `${Math.round(rate * 100)}%`;
}

export function change(now, before) {
  if (!before) return '';
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? '±0%' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`;
}
