# Deploying

The host is not chosen yet, so there is no `wrangler.jsonc` and no
`netlify.toml` in this repo — two rival configs for an undecided host is more
confusing than none. Everything either host needs is the same:

| | |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22.12 or newer (Astro 7 requires it) |
| Install command | `npm ci` |

`public/_headers` is copied verbatim into `dist/` and uses the identical syntax
on both hosts. It sets a one-year immutable cache on `/_astro/*`, which is safe
because every filename in there is content-hashed.

**Before the first deploy**, set `url` in `src/site.config.ts` to the real
domain. It is what the canonical links, the RSS feed and `og:url` are built
from, and it is currently a loud placeholder.

## Cloudflare

Cloudflare now steers new projects towards **Workers** rather than Pages. Pages
still exists and still works for a static site like this one, but the dashboard
will push you to Workers; either is fine, and the settings are the same.

1. Push the repo to GitHub.
2. Cloudflare dashboard → **Compute (Workers)** → **Create** → **Import a
   repository** (or **Workers & Pages** → **Create** → **Pages** → **Connect to
   Git** if you want Pages specifically).
3. Pick the repo. Set the build command and output directory by hand from the
   table above. **Do not use the "Astro" framework preset** — presets resolve
   to a bare `astro build`, which skips the `--force` that clears Astro's
   content cache.
4. Deploy. You get a `*.workers.dev` or `*.pages.dev` URL immediately.
5. **Custom domains** → add the domain. If the domain is already in the same
   Cloudflare account, the DNS record is created for you and the certificate is
   issued automatically.

## Netlify

1. Push the repo to GitHub.
2. Netlify → **Add new site** → **Import an existing project** → pick the repo.
3. Netlify will offer to detect Astro. Set the build command and publish
   directory by hand from the table above instead — a detected preset resolves
   to a bare `astro build`, which skips the `--force` that clears Astro's
   content cache.
4. Deploy. You get a `*.netlify.app` URL immediately.
5. **Domain management** → **Add a domain**.

Two things about the apex domain (`example.com`, with no `www.`):

- **It cannot be a CNAME.** The DNS spec does not allow a CNAME at the zone
  apex. Use your registrar's `ALIAS`/`ANAME` record if it has one, or the plain
  `A` record pointing at Netlify's load balancer (`75.2.60.5` at the time of
  writing — check Netlify's docs, it does change). A `www.` subdomain has no
  such restriction and can be a normal CNAME.
- **HTTPS cannot be issued until DNS resolves.** Netlify provisions the Let's
  Encrypt certificate by verifying the domain, so the certificate step will sit
  there failing until the records have propagated. This is normal; wait for
  propagation, then retry the certificate from **Domain management → HTTPS**.

## Verifying a build

The build must succeed with no network access at all — no font CDN, no
telemetry. Astro's telemetry is switched off in `astro.config.mjs` for exactly
this reason. From a clean clone:

```sh
npm ci && npm run build
find dist -name '*.js'          # must print nothing
grep -rc '<script' dist/index.html   # must be 1 — the theme script
```
