# Deploying

The site is hosted on **GitHub Pages**, built and deployed by
`.github/workflows/site.yml`:

- **Pull requests:** `npm run check` (astro check), `npm run build`, then
  `npm run check:links` (every internal link and asset in `dist/` must resolve),
  and the same build + link check with `INCLUDE_FIXTURES=1` so every template is
  exercised. Any failure fails the PR.
- **Push to `main`:** the same checks, then `dist/` is uploaded and deployed with
  `actions/deploy-pages`. Pages' source is set to "GitHub Actions" in the repo
  settings; there is no `gh-pages` branch.

Actions are pinned to commit SHAs (tag in the comment beside each). Node comes
from `.nvmrc`.

## URL and base path

`url` in `src/site.config.ts` is the one place the address lives. Its path becomes
Astro's `base` (see `astro.config.mjs`):

| Served at | `url` | `base` |
|---|---|---|
| Custom domain (now, since 2026-11-15) | `https://pjoshi.dev/` | `/` |
| Project site (before) | `https://firstprateek.github.io/personal-website-astro/` | `/personal-website-astro/` |

Every internal link goes through `href()` in `src/lib/paths.ts`, and site-absolute
links inside Markdown (`[x](/writing/foo/)`) are prefixed by the hast plugin in
`src/lib/base-links.mjs`. Write content links as `/writing/...`; never hard-code
the base. The fixture build runs under `/demo/` on purpose, so CI proves the base
is honoured on every template.

## Custom domain (done 2026-11-15)

The registrar is Squarespace; DNS is hosted on Cloudflare (the domain's
nameservers point there), so records are edited in Cloudflare, set to DNS only.
The old github.io address redirects to `pjoshi.dev`.

1. Set `url` to `https://pjoshi.dev/` and add `public/CNAME` containing `pjoshi.dev`.
2. DNS for the apex: `A` 185.199.108.153, .109.153, .110.153, .111.153 and `AAAA`
   2606:50c0:8000::153, 8001::153, 8002::153, 8003::153. Optionally `www` as a
   `CNAME` to `firstprateek.github.io`.
3. Repo Settings → Pages → custom domain `pjoshi.dev`, then **Enforce HTTPS** once
   the certificate is issued.

`public/_headers` is a Cloudflare/Netlify file; GitHub Pages ignores it.

## GitHub activity

`src/data/activity.json` holds recent commits, merged PRs and releases for the
public repos the project pages link to. `.github/workflows/activity.yml` refreshes
it daily (or on demand from the Actions tab), commits only when it changed, and then
starts the Site workflow. Locally: `GITHUB_TOKEN=$(gh auth token) node scripts/fetch-activity.mjs`.
Entries whose titles mention a home path or a tailnet host are dropped.

## Contact form

`/contact/` posts to a Cloudflare Worker in `worker/`, deployed at
`https://contact-form.pjoshi.workers.dev/`. The Worker checks the origin, body
size, a per-IP rate limit (5 a minute), the fields and a Cloudflare Turnstile
token (valid, and solved on one of our hostnames), then sends the owner a
Telegram message from a bot. The site never posts to the home server, and
neither the site nor the Worker stores anything.

Until `contact.endpoint` and `contact.turnstileSiteKey` are both set in
`src/site.config.ts`, the page shows a short note instead of the form.

Worker secrets (never in this repo), each set with
`npx wrangler secret put <NAME>` from `worker/`:

- `TURNSTILE_SECRET`: the secret half of the Turnstile widget
  "Website contact form" (managed mode). The site key is public and lives in
  `site.config.ts`.
- `TELEGRAM_BOT_TOKEN`: the bot's token from @BotFather.
- `TELEGRAM_CHAT_ID`: the owner's chat with the bot. After messaging the bot,
  read it from `https://api.telegram.org/bot<token>/getUpdates`.

Why Telegram and not ntfy: ntfy.sh does not answer connections from
Cloudflare Workers (every attempt failed with 522).

Deploying from a new machine: `npm ci` and `npx wrangler login` in `worker/`,
then `npx wrangler deploy`. The secrets stay in Cloudflare. On a machine
without a local browser, `wrangler login --browser=false` prints the link;
after approving, paste the `localhost:8976/oauth/callback?...` address the
browser fails to open into `curl` on that machine.

At the domain cutover, add `https://pjoshi.dev` to `ALLOWED_ORIGINS` in
`worker/wrangler.toml` and redeploy, and add the hostname to the Turnstile
widget.

Tests: `npm run test:worker` (Node's test runner, no Cloudflare runtime; also
part of `npm run check`). For a full local run, put Turnstile's always-pass
test secret `1x0000000000000000000000000000000AA`, the Telegram values, and
`ALLOWED_ORIGINS` set to the local preview origin plus `https://example.com`
(the hostname the test secret reports) in `worker/.dev.vars` (git-ignored),
run `npx wrangler dev`, and build the site with the test site key
`1x00000000000000000000AA` and the local endpoint. Headless browsers are
stopped by the real Turnstile widget, so a live test needs a real browser.

## Visit stats

`stats/` is a second Cloudflare Worker, `site-pulse`, at
`https://site-pulse.pjoshi.workers.dev/`. It counts visits and serves a private
dashboard; there are no cookies on the site and nothing that names a reader.

- **What the site sends.** The head script in `Base.astro` sends beacons to
  `stats.endpoint` in `src/site.config.ts`, only when the page is served from
  `url`'s host (so previews and the fixture build send nothing): one when a page
  opens (path, referrer, `utm_source`/`ref`), one when it is hidden (seconds on
  screen, furthest scroll), one per link off the site that is clicked.
- **What the Worker stores** (D1 database `site-pulse`): path, source, country,
  region and city (from Cloudflare), device, browser and OS, time and scroll. Not
  the IP. A visit is keyed by a hash of IP and user agent salted with a random
  value that is replaced every UTC day and deleted, so one person cannot be
  followed across days. Bots and headless browsers are dropped.
- **Opting a device out.** Open any page with `?notrack` (the dashboard footer
  links it); `?track` opts back in. Stored in that browser's localStorage.
- **Dashboard.** Open the Worker's URL, press "Send me a link", and open the link
  the Telegram bot sends (once, within 10 minutes) **in the browser you want to
  stay signed in on**: in Telegram on iPhone, long-press the link and choose Open
  in Safari, then Share → Add to Home Screen. The session lasts 90 days. Days are
  counted in the time zone Cloudflare reports for the viewer.
- **What it shows.** Ranges Today, 7, 30, 90 days and a year. A world map of
  visits by country (Natural Earth 1:110m, generated into `stats/src/world.js`
  by `stats/scripts/make-map.mjs`); tapping a country, or a page in Content,
  narrows the whole dashboard to it (`?country=IN`, `?path=/writing/x/`), and
  the chips at the top clear it. Then content (views, visits, time on screen,
  share read to the end), links clicked off the site, sources, countries,
  cities, devices, and the latest visits as page trails.
- **Digest.** An hourly cron sends a summary of the last 7 days to the same
  Telegram chat on Mondays at 09:00 in the dashboard's last-seen time zone.

Secrets (never in this repo), set from `stats/` with
`npx wrangler secret put <NAME>`: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`,
the same bot as the contact form.

Deploying: `npm ci` in `stats/`, `npm run migrate` (applies
`migrations/` to the remote D1), then `npx wrangler deploy`. Tests:
`npm run test:worker` from the repo root runs both Workers' tests; `node:sqlite`
stands in for D1. For a local run, `npx wrangler d1 migrations apply site-pulse
--local` and `npx wrangler dev --var ALLOWED_ORIGINS:<preview origin>`, and build
the site with `url` and `stats.endpoint` pointing at the two local servers. A
headless browser is filtered as a bot unless it is started with a normal
`--user-agent`.
