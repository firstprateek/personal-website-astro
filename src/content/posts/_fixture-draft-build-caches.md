---
title: Notes toward a theory of build caches
date: 2026-08-20
description: Unfinished. Every build cache I have debugged failed the same way, and I am still working out whether that is one bug or four.
draft: true
---

Every build cache I have had to debug failed in the same direction: it was
correct about what it had, and wrong about whether that was still what you
wanted.

Draft. The sections below are notes, not argument.

## The invariant nobody writes down

A cache key is a claim that two inputs produce the same output. Most cache bugs
are that claim being false in a way the key does not capture — an environment
variable, a file mode, the clock.

## Things I still need to check

- Whether content-addressed keys actually help here or just move the problem
- The Bazel argument for hermeticity, and why almost nobody pays its price
- Whether "cache invalidation is hard" is a real observation or a joke that
  stopped being examined

More when I have thought it through.
