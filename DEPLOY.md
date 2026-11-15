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
| Project site (now) | `https://firstprateek.github.io/personal-website-astro/` | `/personal-website-astro/` |
| Custom domain (later) | `https://pjoshi.dev/` | `/` |

Every internal link goes through `href()` in `src/lib/paths.ts`, and site-absolute
links inside Markdown (`[x](/writing/foo/)`) are prefixed by the hast plugin in
`src/lib/base-links.mjs`. Write content links as `/writing/...`; never hard-code
the base. The fixture build runs under `/demo/` on purpose, so CI proves the base
is honoured on every template.

## Custom domain cutover

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

`/contact/` posts to a Cloudflare Worker in `worker/`. The Worker checks the
origin, body size, a per-IP rate limit (5 a minute), the fields and a
Cloudflare Turnstile token, then sends a phone push through ntfy. The site
never posts to the home server. Neither the site nor the Worker stores
anything; ntfy.sh keeps a message on its server for about 12 hours.

Until `contact.endpoint` and `contact.turnstileSiteKey` are both set in
`src/site.config.ts`, the page shows a short note instead of the form.

One-time setup:

1. **ntfy:** install the ntfy app on the phone and subscribe to a long random
   topic on `ntfy.sh` (for example the output of `openssl rand -hex 24`).
   Anyone who knows a topic on ntfy.sh can read and publish to it, so it is
   kept only as a Worker secret, never in this repo or the page.
2. **Turnstile:** in the Cloudflare dashboard, add a Turnstile widget (managed
   mode) for the hostname `firstprateek.github.io` (later also `pjoshi.dev`).
   The site key is public and goes in `site.config.ts`; the secret key goes to
   the Worker.
3. **Worker:** from `worker/`, run `npm ci`, `npx wrangler login`, then
   `npx wrangler deploy`. Set the secrets with
   `npx wrangler secret put TURNSTILE_SECRET` and
   `npx wrangler secret put NTFY_TOPIC`.
4. Put the Worker URL (`https://contact-form.<account>.workers.dev/`) and the
   site key in `site.config.ts` and merge.

At the domain cutover, add `https://pjoshi.dev` to `ALLOWED_ORIGINS` in
`worker/wrangler.toml` and redeploy the Worker, and add the hostname to the
Turnstile widget.

Tests: `npm run test:worker` (Node's test runner, no Cloudflare runtime). For
a full local run, put Turnstile's always-pass test secret
`1x0000000000000000000000000000000AA`, a local `NTFY_SERVER`, and
`ALLOWED_ORIGINS` set to the local preview origin plus `https://example.com`
(the hostname the test secret reports) in `worker/.dev.vars` (git-ignored), run `npx wrangler dev`, and build the site
with the test site key `1x00000000000000000000AA` and the local endpoint.
