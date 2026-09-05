---
title: A fixture project with a demo
date: 2026-09-03
status: active
summary: A fixture project. It exists to prove the video, poster and prose rendering path end to end, and is excluded from production builds.
repo: https://github.com/example/fixture
video: _demo.mp4
featured: true
---

The video above is self-hosted, carries a poster frame inferred from its own
filename, and is set to `preload="none"` — so no part of the mp4 is fetched
until the reader presses play. Its box is reserved from first paint by the
intrinsic `width` and `height` together with a 16/9 `aspect-ratio` in CSS.

## How it works

The interesting part is the resolution step, which fails loudly rather than
shipping a video with a blank first frame:

```ts
const poster = media[posterKey];
if (!poster) {
  throw new Error(`Project "${entry.id}": video has no poster frame.`);
}
```

Media lives in `src/media/` rather than `public/`, so a file is only emitted
into the build when an entry actually references it. That is what keeps this
fixture's video out of a production build.

## Notes

- The status above renders as plain text beside the date.
- The link to the repository sits at the foot of the page, as text.

See the [project repository](https://github.com/example/fixture) for the rest.
