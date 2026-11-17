# Site

A static, text-first personal site. Astro, no client-side JavaScript beyond a
single head script (theme and visit counting), no external requests at build
time, and at run time only the visit beacons to our own Worker (`stats/`) and
the contact form's.

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

Replace all of them: `url`, `name`, `description`, `about`, `links`.

`name` is the coral name in the header on every page; `about` is the
paragraphs on `/about`, where `links` is also rendered as the Elsewhere list.

The link-preview image, `/og.png`, is drawn at build time from `name`,
`description` and `url` (`src/pages/og.png.js`), so it has nothing of its own to
edit. Until those are replaced it shows the placeholders too.

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
---
```

`video` is optional and is a path under **`src/media/`**. If you set it:

- The file must be a self-hosted `.mp4`. No YouTube, no embeds.
- A poster frame must sit beside it with the same name and a `.jpg`
  extension — `my-project.mp4` needs `my-project.jpg`. The build **fails** if
  it is missing, rather than shipping a video with a blank first frame.
- The video is rendered at 1280×720 with `controls` and `preload="none"`, so
  not one byte of it is fetched until a reader presses play.

The home page's "Current projects" are the ids (filenames without `.md`)
listed, in order, in `currentProjects` in `src/site.config.ts`. An id with no
matching project **fails the build** rather than silently dropping a row; an
empty list omits the section.

## Things that fail the build, on purpose

- A missing required key, or a key that is not in the list above (the schemas
  are strict, so a typo like `titel:` is an error, not a silent omission).
- A `status` outside the three allowed values.
- A date that is not a real `YYYY-MM-DD` calendar date.
- A video with no sibling poster frame.
- An id in `currentProjects` with no matching project.

## Fixtures

`_fixture-*.md` and `_template.md` inside the content directories are excluded
from production builds — twice over, by the glob pattern in
`src/content.config.ts` and again on the read path in `src/lib/content.ts`.
`src/media/_demo.*` is excluded from the bundle the same way.

The demo identity is part of the same mechanism. `src/site.config.ts` keeps the
`TODO_REPLACE_BEFORE_LAUNCH` placeholders as the default and selects a "Pat
Josh" demo block only when the flag is set, so a plausible-looking name can
never end up in a real build by accident. Before launch, delete the
`_fixture-*.md` files, the demo media in `src/media/`, and the demo block in
`src/site.config.ts`.

`_template.md` is excluded in both modes: a copy-me template is not a fixture
and never becomes a route.

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
  layouts/Base.astro   the page shell, the header, and the site's only script
  pages/about.astro    the about page, rendered from site.config.ts
  styles/global.css    the whole stylesheet; palette is the first block
  content/posts/       *.md
  content/projects/    *.md
  media/               videos and poster frames
public/_headers        cache headers, copied verbatim to dist/
```

Deployment is in [DEPLOY.md](DEPLOY.md).
