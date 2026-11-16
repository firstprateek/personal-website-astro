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
