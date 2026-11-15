---
title: A frame-budget profiler for embedded web UIs in desktop applications
date: 2026-03-27
status: active
summary: Attributes dropped frames to the owning product team rather than to the framework, which turned out to be the entire point.
repo: https://github.com/patjosh/frame-budget
---

When a hundred product teams render inside one shell, "the application is slow"
is a claim with no owner. Every team believes it is fast, and each of them is
approximately right about their own panel.

Frame Budget instruments the shell and attributes each long frame to the
subtree that caused it, then reports per-team rather than per-component. The
technical work is unremarkable — a long-task observer and some bookkeeping. The
useful part was changing the unit of the report from a stack frame to an owner.

## What changed when the report had names on it

Nothing about the framework got faster. What happened was that four teams
independently found and fixed their own regressions within a month, because for
the first time the number in the dashboard was theirs.

This is my favourite kind of tool: one that works by moving information rather
than by making anything faster.
