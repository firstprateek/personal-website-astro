---
title: Bundle Atlas
date: 2025-02-11
status: experiment
summary: Tracks JavaScript bundle composition over time and attributes growth to the commit that caused it.
repo: https://github.com/patjosh/bundle-atlas
video: _atlas.mp4
featured: false
---

A bundle analyser tells you what your bundle contains today. That is the less
useful question. The useful one is what changed since the last release and who
changed it.

Atlas records composition per commit and produces a per-release attribution:
this release grew 340 KB, of which 280 KB is one transitive dependency
introduced by a single commit.

```
v4.12.0  +341 KB
  +279 KB  moment-timezone     via #8821 (analytics panel)
  + 44 KB  lodash (full)       via #8834 — tree-shake failure
  + 18 KB  everything else
```

The `lodash (full)` line is the recurring one. Nobody ever means to import all
of lodash; it happens through a dependency that does, and without attribution
it looks like ambient growth rather than a fixable mistake.

Experimental because the attribution is heuristic when several commits land in
one merge, and I have not decided whether to fix that or to live with it.
