/**
 * Visit counting for the site. Routes:
 *   POST /p               beacons from the site's head script (collect.js)
 *   GET  /                the dashboard, once signed in (dashboard.js)
 *   POST /login, /logout  and GET/POST /auth: Telegram sign-in (auth.js)
 * Cron, hourly: token cleanup and the Monday digest (digest.js).
 *
 * Secrets (wrangler secret put, never in this repo): TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID, the same bot as the contact form.
 * Vars (wrangler.toml): ALLOWED_ORIGINS, the site's origins; the first names the site.
 * Bindings: DB (D1), LIMITER (rate limit, optional).
 */
import { collect } from './collect.js';
import { auth, html, signInPage, signedIn } from './auth.js';
import { dashboard } from './dashboard.js';
import { hourly } from './digest.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/p':
        return collect(request, env);
      case '/login':
      case '/logout':
      case '/auth':
        return auth(request, env, url);
      case '/robots.txt':
        return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
      case '/':
        if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
        if (!(await signedIn(request, env))) return html(signInPage());
        return html(await dashboard(request, env, url));
      default:
        return new Response('Not found', { status: 404 });
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(hourly(env, event.scheduledTime, env.DASHBOARD_ORIGIN));
  },
};
