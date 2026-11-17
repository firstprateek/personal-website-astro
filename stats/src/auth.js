/**
 * Sign-in for the dashboard, with no password: the sign-in page asks the
 * Telegram bot to send the owner a one-time link, the link opens a page whose
 * button exchanges it for a session cookie. Only the owner's Telegram chat
 * ever sees a link, so only the owner can sign in.
 *
 * The link's GET only shows a button; the token is spent by the button's POST,
 * so anything that prefetches the link (a preview, a scanner) cannot use it up.
 * Links and sessions are stored as SHA-256 hashes.
 */
import { DAY, MINUTE, claim, esc, randomToken, sendTelegram, sha256 } from './util.js';
import { page } from './page.js';

export const LINK_TTL = 10 * MINUTE;
export const LINK_GAP = 2 * MINUTE;
export const SESSION_TTL = 90 * DAY;
const COOKIE = 'pulse_session';

export async function signedIn(request, env, now = Date.now()) {
  const token = readCookie(request, COOKIE);
  if (!token) return false;
  const row = await env.DB.prepare(
    `SELECT 1 AS ok FROM tokens WHERE hash = ? AND kind = 'session' AND expires > ?`,
  )
    .bind(await sha256(token), now)
    .first();
  return Boolean(row);
}

export async function auth(request, env, url, now = Date.now()) {
  const self = url.origin;

  if (request.method === 'GET' && url.pathname === '/auth') {
    const t = url.searchParams.get('t') ?? '';
    return html(
      page(
        'Sign in',
        `<h1>Sign in</h1>
        <form method="post" action="/auth">
          <input type="hidden" name="t" value="${esc(t)}">
          <button type="submit">Sign in on this device</button>
        </form>`,
      ),
    );
  }

  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  // Forms from other sites cannot sign in, out, or send links.
  if (request.headers.get('Origin') !== self) return new Response('Forbidden', { status: 403 });

  if (url.pathname === '/login') {
    if (!(await claim(env.DB, 'last_link', now, LINK_GAP))) {
      return html(notice('A link was sent a moment ago. Check Telegram.'));
    }
    const token = randomToken();
    await env.DB.prepare(`INSERT INTO tokens (hash, kind, expires) VALUES (?, 'link', ?)`)
      .bind(await sha256(token), now + LINK_TTL)
      .run();
    const sent = await sendTelegram(
      env,
      `Sign in to the site stats (valid for 10 minutes, once):\n${self}/auth?t=${token}`,
    );
    return html(
      notice(sent ? 'Sent. Open the link from Telegram on this device.' : 'Telegram did not take the message. Try again later.'),
      sent ? 200 : 502,
    );
  }

  if (url.pathname === '/auth') {
    const form = await request.formData();
    const t = String(form.get('t') ?? '');
    const used = t
      ? await env.DB.prepare(
          `DELETE FROM tokens WHERE hash = ? AND kind = 'link' AND expires > ? RETURNING hash`,
        )
          .bind(await sha256(t), now)
          .first()
      : null;
    if (!used) return html(notice('That link has expired or was already used. Send a new one.'), 403);
    const session = randomToken();
    await env.DB.prepare(`INSERT INTO tokens (hash, kind, expires) VALUES (?, 'session', ?)`)
      .bind(await sha256(session), now + SESSION_TTL)
      .run();
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/',
        'Set-Cookie': `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}`,
      },
    });
  }

  if (url.pathname === '/logout') {
    const token = readCookie(request, COOKIE);
    if (token) {
      await env.DB.prepare('DELETE FROM tokens WHERE hash = ?').bind(await sha256(token)).run();
    }
    return new Response(null, {
      status: 303,
      headers: { Location: '/', 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` },
    });
  }

  return new Response('Not found', { status: 404 });
}

export function signInPage() {
  return page(
    'Site stats',
    `<h1>Site stats</h1>
    <p>Sign in with a one-time link sent to your Telegram.</p>
    <form method="post" action="/login"><button type="submit">Send me a link</button></form>`,
  );
}

function notice(text) {
  return page('Site stats', `<h1>Site stats</h1><p>${esc(text)}</p><p><a href="/">Back</a></p>`);
}

export function html(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      // same-origin, not no-referrer: no-referrer makes browsers send
      // `Origin: null` on our own form posts, which the CSRF check refuses.
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
      // No script runs on any page here.
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
      ...headers,
    },
  });
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
