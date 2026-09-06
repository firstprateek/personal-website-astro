---
title: Doc Drift
date: 2025-06-05
status: experiment
summary: Flags documentation whose code examples no longer compile against the current API.
repo: https://github.com/patjosh/doc-drift
featured: false
---

Extracts every fenced code block from a documentation tree, type-checks it
against the current published types, and reports the ones that have quietly
stopped being true.

It found forty-one broken examples on its first run against our docs, which was
both a good result and an uncomfortable one. About half had been wrong for more
than a year.

The experiment part is what to do about examples that are illustrative rather
than executable. I tried requiring an explicit opt-out marker and everybody
just added the marker. I do not have a good answer yet, which is why this is
still an experiment rather than a gate in CI.
