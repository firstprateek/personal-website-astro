---
title: Session Ledger
date: 2026-06-18
status: active
summary: Durable, resumable state for long-running coding agents — stores decisions rather than snapshots, and reconciles against the repository on resume.
repo: https://github.com/patjosh/session-ledger
video: _demo.mp4
featured: false
---

Ledger came out of a specific frustration: closing a laptop mid-task and losing
not the transcript but the understanding. The transcript always survived. The
model's grip on *why* did not.

## Decisions, not snapshots

The ledger stores the smallest thing that cannot be recomputed — the intent,
the decisions taken, the questions left open — and derives everything else
fresh. On resume it re-reads the repository, diffs reality against what the
session assumed, and reports the difference before doing any work.

```
Resuming: "fix the flaky upload test"
  since you left: 4 commits on main, uploader.js changed
  assumption "the drain runs every 120s" no longer holds
  uncommitted: 2 files, still present
```

That briefing is the whole product. Restoring faithfully to a world that has
moved is worse than not restoring, and I wrote up the longer version of that
argument in [session state is the hard part](/writing/_fixture-session-state/).

Currently single-user and single-machine. Sharing a ledger across a team is the
obvious next thing and also where all the hard privacy questions live.
