---
title: Widget Registry
date: 2025-09-14
status: active
summary: A versioned catalogue of every UI component in use across the desktop product, built to make deprecations schedulable instead of aspirational.
repo: https://github.com/patjosh/widget-registry
featured: false
---

You cannot deprecate what you cannot count. Before the registry, answering "who
still uses `LegacyPanel`?" meant grepping a dozen repositories on a good day
and guessing on a bad one.

The registry scans consumer repositories on a schedule and records which
components are used where, at which version, by which team. It is a boring
piece of infrastructure and it changed how deprecations went, because a
deprecation with an exact consumer list stops being a negotiation and becomes a
project plan.

## The part I got wrong first

The first version reported usage counts. Counts are useless — one team with
four hundred call sites and a codemod is a smaller problem than three teams
with one call site each in code nobody understands. The second version reported
owners and last-touched dates, which is what anybody actually needed to plan
around.

More on why this matters in [what a platform team owes its consumers](/writing/_fixture-platform-teams/).
