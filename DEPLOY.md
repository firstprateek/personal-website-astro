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
