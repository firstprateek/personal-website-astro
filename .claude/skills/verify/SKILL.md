---
name: verify
description: Build and serve this site in isolation and check it in a browser. The recipe that worked, the flows worth driving, the probe scripts, and the gotchas.
---

# Verifying the site

## Build and serve without touching the working copy

Don't rebuild `dist/` in place: an `astro preview` may already be serving it. Copy the working
tree instead, once with fixtures (every template rendered) and once without (what ships today).
Copy it rather than `git clone` it, or uncommitted changes silently go unverified:

```sh
T=$(mktemp -d)
for v in fixtures plain; do
  rsync -a --exclude node_modules --exclude dist --exclude .astro --exclude .git ./ "$T/site-$v/"
  cp -Rc node_modules "$T/site-$v/node_modules"   # APFS clone: instant, and no shared .astro cache
done
(cd "$T/site-fixtures" && INCLUDE_FIXTURES=1 npm run build)   # 21 pages, 404 included
(cd "$T/site-plain" && npm run build)                         # 5 pages
"$T/site-fixtures/node_modules/.bin/astro" preview --root "$T/site-fixtures" --port 4391 --host 127.0.0.1 --ignore-lock
"$T/site-plain/node_modules/.bin/astro" preview --root "$T/site-plain" --port 4392 --host 127.0.0.1 --ignore-lock
```

Astro 7's `preview` has no `--outDir`; `--root` on a copy is how to serve a second build.
`--ignore-lock` lets it run beside another preview. The plain build's "collection does not exist
or is empty" warnings are expected until there is real content.

## Flows worth driving

- Crawl from `/`: every page 200, every asset 200 (`.mp4` 206), `rss.xml` well-formed.
- Must 404, with the site's own "Not found" page: `/writing/_fixture-draft-build-caches/`,
  `/writing/_template/`, `/projects/_template/`, and every `_fixture-*` route in the plain build.
- Every page's `og:url` equals its canonical link; posts carry `og:type` `article`.
- Theme toggle: click, reload, navigate away; Enter and Space on the focused button. With no stored
  preference, switch the OS colour scheme live and read the button's `aria-label`; it must name the
  theme the page is *not* in (`theme-probe.mjs` below).
- Project video: no `.mp4` request before play, plays on click, and the same 20px gap below it as
  above.
- Widths 320, 375, 390 and 414: no horizontal overflow. On inner pages the header is one row, or
  the name above the nav, with the RSS and theme icons always on the nav's row.
- Contrast in both themes. The syntax tokens sit near 4.6:1, the closest to the AA line, so recheck
  after any palette or Shiki theme change.

## Probes that need a rendering browser

Both drive headless Chrome over the DevTools protocol with Node's built-in `WebSocket`, so nothing
needs installing. Give each run its own profile dir and port.

```sh
node .claude/skills/verify/theme-probe.mjs http://127.0.0.1:4391/writing/ "$T/cdp-theme" 9333
node .claude/skills/verify/page-probe.mjs "$T/cdp-pages" 9334 "$T/shots" \
  "workbench-375=http://127.0.0.1:4391/projects/_fixture-mcp-workbench/@375" \
  "notfound-375=http://127.0.0.1:4391/no-such-page/@375"
```

`theme-probe` flips the emulated OS scheme live and presses the button with a real mouse event;
every line must read `ok`. `page-probe` reports layout shift, console errors, header rows, whether
the icons share the nav's row, overflow and the gap under a video, and saves a screenshot at the
true width. If a run is interrupted, Chrome keeps running: `pkill -f "user-data-dir=$T/cdp-"`.

## Gotchas

- The theme button ships `hidden` and unlabelled on purpose, and the script labels and reveals it.
  A static HTML scan flags it; read the live accessibility tree instead.
- A hidden browser pane or background tab skips rendering updates: no repaint after a scroll (blank
  captures), no video-only playback, and no media-query `change` events. Use the probes above for
  anything that needs them.
- `chrome --headless --screenshot` won't lay a page out narrower than about 500px, whatever
  `--window-size` says. `page-probe` sets the width over CDP instead, which has no floor.
- On a 404 page Chrome logs "Failed to load resource: … 404" for the document itself. It is not a
  missing asset.
