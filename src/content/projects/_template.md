---
title: Name of the project
date: 2026-10-01
status: experiment
summary: One sentence. It shows in the projects list, at the top of the project page, and as the page's meta description.
repo: https://github.com/you/the-project
# video is optional. If set, it is a path under src/media/ and a poster frame
# with the same name and a .jpg extension must sit beside it, or the build fails.
# video: the-project.mp4
---

Copy this file to `src/content/projects/my-project.md`. The filename becomes the
URL.

`status` must be one of `experiment`, `active` or `archived`. To list the
project under "Current projects" on the home page, add its filename (without
`.md`) to `currentProjects` in `src/site.config.ts`.
