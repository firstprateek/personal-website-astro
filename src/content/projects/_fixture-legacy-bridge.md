---
title: Legacy Bridge
date: 2024-05-16
status: archived
summary: An interop layer that let new web components mount inside the old native UI during a multi-year migration.
repo: https://github.com/patjosh/legacy-bridge
---

For about three years the desktop product was half native and half web, and
Bridge was the seam. It let a web component mount inside a native container and
participate in the old layout and focus systems as though it were native.

It was never good. It could not have been — it existed to make two
incompatible models cohabit, and every such layer is a pile of special cases
with a nice name. What it was, was correct enough for long enough that the
migration could proceed incrementally instead of as a rewrite.

Archived, and I am glad. The best outcome for a bridge is that both sides end
up on the same bank and nobody needs it.
