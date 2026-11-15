/**
 * Contact form relay. The static site's /contact/ page posts a form here; this
 * Worker checks it and sends the owner a Telegram message from a bot.
 *
 * Order of checks, cheapest first: method, origin, size, rate limit, fields,
 * then Turnstile (one outbound request), then Telegram (the second).
 *
 * Secrets, set with `wrangler secret put`, never in this repo:
 *   TURNSTILE_SECRET  Turnstile secret key for the site key the page uses.
 *   TELEGRAM_BOT_TOKEN  The bot's token from @BotFather. Whoever holds it
 *                       controls the bot, so it lives only here.
 *   TELEGRAM_CHAT_ID    The owner's chat with the bot. Not secret on its own,
 *                       kept beside the token so all delivery config is in one place.
 * Plain vars (wrangler.toml):
 *   ALLOWED_ORIGINS   Comma-separated origins the page is served from.
 * Binding (wrangler.toml):
 *   LIMITER           Workers rate limiter, keyed by client IP. Optional.
 */

export const TOPICS = {
  general: 'General',
  feedback: 'Feedback on a project',
  work: 'Work or collaboration',
  other: 'Other',
};

export const LIMITS = {
  body: 16 * 1024,
  message: 4000,
  name: 100,
  email: 200,
  project: 80,
  token: 2048,
};

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export default {
  async fetch(request, env) {
    const origins = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const origin = request.headers.get('Origin');
    const allowed = origin !== null && origins.includes(origin);
    const cors = allowed
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : { Vary: 'Origin' };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...cors },
      });

    if (request.method === 'OPTIONS') {
      if (!allowed) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (request.method !== 'POST') {
      return reply(405, { ok: false, error: 'Method not allowed.' });
    }
    if (!allowed) return reply(403, { ok: false, error: 'Origin not allowed.' });

    if (!env.TURNSTILE_SECRET || !env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return reply(500, { ok: false, error: 'The form is not configured yet.' });
    }

    const declared = Number(request.headers.get('Content-Length') ?? 0);
    if (declared > LIMITS.body) return reply(413, { ok: false, error: 'Message too long.' });
    // Counted while reading, so a chunked body without Content-Length cannot
    // make the Worker buffer more than the cap.
    const raw = await readCapped(request, LIMITS.body);
    if (raw === null) return reply(413, { ok: false, error: 'Message too long.' });

    const ip = request.headers.get('CF-Connecting-IP') ?? '';
    if (env.LIMITER) {
      const { success } = await env.LIMITER.limit({ key: ip || 'unknown' });
      if (!success) {
        return reply(429, { ok: false, error: 'Too many messages. Try again in a minute.' });
      }
    }

    let fields;
    try {
      fields = parseFields(raw, request.headers.get('Content-Type') ?? '');
    } catch {
      return reply(400, { ok: false, error: 'Could not read the form.' });
    }

    // Honeypot: a field hidden from people. A bot that fills it gets a success
    // reply and nothing is sent, so it has no signal to adapt to.
    if (fields.trap) return reply(200, { ok: true });

    const problem = validate(fields);
    if (problem) return reply(400, { ok: false, error: problem });

    const hosts = origins.map((o) => new URL(o).hostname);
    const verified = await verifyTurnstile(env.TURNSTILE_SECRET, fields.token, ip, hosts);
    if (!verified) {
      return reply(403, { ok: false, error: 'The spam check failed. Reload the page and try again.' });
    }

    const sent = await notify(env, fields);
    if (!sent) {
      return reply(502, { ok: false, error: 'Could not deliver the message. Please try again later.' });
    }
    return reply(200, { ok: true });
  },
};

/** Accepts urlencoded or JSON. Returns trimmed strings; missing fields are ''. */
export function parseFields(raw, contentType) {
  let get;
  if (contentType.includes('application/json')) {
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) throw new Error('not an object');
    get = (key) => (typeof data[key] === 'string' ? data[key] : '');
  } else {
    const params = new URLSearchParams(raw);
    get = (key) => params.get(key) ?? '';
  }
  return {
    topic: get('topic').trim(),
    project: get('project').trim(),
    message: get('message').trim(),
    name: get('name').trim(),
    email: get('email').trim(),
    // The honeypot. Named so that autofill does not recognise it.
    trap: get('hp_x7').trim(),
    token: get('cf-turnstile-response').trim(),
  };
}

/** Returns a reader-facing problem, or null when the fields are acceptable. */
export function validate(f) {
  if (!Object.hasOwn(TOPICS, f.topic)) return 'Choose what this is about.';
  if (f.topic === 'feedback' && !f.project) return 'Choose a project.';
  if (f.project.length > LIMITS.project) return 'That project name is too long.';
  if (!f.message) return 'Write a message.';
  if (f.message.length > LIMITS.message) {
    return `Keep the message under ${LIMITS.message} characters.`;
  }
  if (f.name.length > LIMITS.name) return 'That name is too long.';
  if (f.email.length > LIMITS.email) return 'That email address is too long.';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
    return 'That email address does not look right.';
  }
  if (!f.token || f.token.length > LIMITS.token) {
    return 'The spam check has not finished. Wait a moment and send again.';
  }
  return null;
}

/** Reads the body as text, or returns null once it passes `cap` bytes. */
async function readCapped(request, cap) {
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

/**
 * The token must be valid and must have been solved on one of our own
 * hostnames, so a token from a test page (localhost, say) is refused even if
 * the widget's hostname list ever allows it.
 */
async function verifyTurnstile(secret, token, ip, hosts) {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true && hosts.includes(data.hostname);
  } catch {
    return false;
  }
}

/**
 * Telegram allows 4096 characters per message. A byte cap is stricter than a
 * character cap, so clipping to 4000 bytes always fits.
 */
export const PUSH_BYTES = 4000;

/** Truncates to at most `max` UTF-8 bytes without splitting a character. */
export function clipBytes(text, max) {
  const encoder = new TextEncoder();
  if (encoder.encode(text).byteLength <= max) return text;
  const marker = '\n(truncated)';
  const room = max - encoder.encode(marker).byteLength;
  let out = '';
  let used = 0;
  for (const ch of text) {
    const n = encoder.encode(ch).byteLength;
    if (used + n > room) break;
    out += ch;
    used += n;
  }
  return out + marker;
}

/** The message the owner sees. Plain text: no parse_mode, so nothing is markup. */
export function formatPush(f) {
  const about = f.topic === 'feedback' ? `Feedback: ${f.project}` : TOPICS[f.topic];
  const from = [f.name, f.email && `<${f.email}>`].filter(Boolean).join(' ') || 'Anonymous';
  return clipBytes(`Website: ${about}\nFrom ${from}\n\n${f.message}`, PUSH_BYTES);
}

async function notify(env, f) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: formatPush(f),
        link_preview_options: { is_disabled: true },
      }),
    });
    // Status and Telegram's description only: never the message or the token.
    if (!res.ok) console.log('telegram refused', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.log('telegram unreachable', String(err).replace(env.TELEGRAM_BOT_TOKEN, '<token>'));
    return false;
  }
}
