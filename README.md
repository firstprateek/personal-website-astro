# Site

A static, text-first personal site. Astro, no client-side JavaScript beyond a
single theme script, no external requests at build time or run time.

```sh
npm ci
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview  # serve dist/ locally
```

## Before launch

Everything the site needs to know about you lives in **`src/site.config.ts`**,
and nowhere else. Every value in it is currently a `TODO_REPLACE_BEFORE_LAUNCH`
placeholder that renders visibly on the page and in the browser tab, so an
unedited site looks obviously wrong rather than quietly wrong.

Replace all of them: `url`, `name`, `bio`, `description`, `links`.

## Publishing a post

Copy `src/content/posts/_template.md` to `src/content/posts/my-post.md`. The
filename becomes the URL: `/writing/my-post/`.

```yaml
---
title: The title
date: 2026-10-14        # plain calendar date; quoting it is optional
description: One sentence.
draft: false
---
```

All four keys are required. `description` appears under the title in the
writing list, in the RSS feed, and as the page's `<meta name="description">`.

`draft: true` produces no page, no listing entry and no feed item — the post
simply does not exist until you set it to `false`.

## Publishing a project

Copy `src/content/projects/_template.md` to
`src/content/projects/my-project.md` → `/projects/my-project/`.

```yaml
---
title: The title
date: 2026-10-14
status: experiment      # experiment | active | archived
summary: One sentence.
repo: https://github.com/you/my-project
video: my-project.mp4   # optional
featured: false
---
```

`video` is optional and is a path under **`src/media/`**. If you set it:

- The file must be a self-hosted `.mp4`. No YouTube, no embeds.
- A poster frame must sit beside it with the same name and a `.jpg`
  extension — `my-project.mp4` needs `my-project.jpg`. The build **fails** if
  it is missing, rather than shipping a video with a blank first frame.
- The video is rendered at 1280×720 with `controls` and `preload="none"`, so
  not one byte of it is fetched until a reader presses play.

At most one project across the whole collection may set `featured: true`. That
is the one the home page shows; if nothing is featured, the home page omits the
section entirely. Two featured projects **fail the build** rather than silently
picking one.

## Things that fail the build, on purpose

- A missing required key, or a key that is not in the list above (the schemas
  are strict, so a typo like `titel:` is an error, not a silent omission).
- A `status` outside the three allowed values.
- A date that is not a real `YYYY-MM-DD` calendar date.
- A video with no sibling poster frame.
- More than one `featured: true` project.

## Fixtures

`_fixture-*.md` and `_template.md` inside the content directories are excluded
from production builds — twice over, by the glob pattern in
`src/content.config.ts` and again on the read path in `src/lib/content.ts`.
`src/media/_demo.*` is excluded from the bundle the same way.

`npm run build` therefore ships zero posts and zero projects. To see the
rendering end to end:

```sh
INCLUDE_FIXTURES=1 npm run build
```

Delete the fixtures once you have real content; keep the templates.

## Layout

```
src/
  site.config.ts       every value the client edits, in one file
  content.config.ts    the two schemas and the fixture-excluding glob
  lib/content.ts       sorting, date formatting, and the build-time guards
  layouts/Base.astro   the page shell, and the site's only script
  styles/global.css    the whole stylesheet; palette is the first block
  content/posts/       *.md
  content/projects/    *.md
  media/               videos and poster frames
public/_headers        cache headers, copied verbatim to dist/
```

Deployment is in [DEPLOY.md](DEPLOY.md).
