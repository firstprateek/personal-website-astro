---
title: Session state is the hard part
date: 2026-05-09
description: Agents are easy to demo and hard to resume, and the gap between those two things is almost entirely about state.
draft: false
---

A coding agent is easy to demo and hard to resume. Every impressive
demonstration I have seen runs in one sitting, in one directory, with one
person watching. The moment you want to close the laptop and come back
tomorrow, the difficulty goes up by an order of magnitude, and almost all of it
is state.

## What "session" actually contains

The word hides a lot. When someone says they want to resume a session, they are
asking for at least four different things to survive:

The conversation is the obvious one and the least interesting. It is a list; it
serialises fine.

The working tree is where it starts getting awkward. The agent made edits. Some
are committed, some are not, and the user may have made their own changes in
between with an editor the agent knows nothing about.

The environment is worse. A dev server on port 3000, a database with three
migrations applied, a `node_modules` that matches a lockfile which has since
changed. None of this is in the transcript and none of it comes back on its
own.

And then there is the model's own understanding — the accumulated context about
why things are the way they are. This is the part that people actually miss
when resumption is bad. Re-reading the transcript does not restore it, any more
than re-reading your own notes restores the meeting.

## The tempting wrong answer

The obvious design is to snapshot everything: transcript, diff, environment
manifest, the lot. Write it down, restore it later.

This fails for a reason that took me embarrassingly long to see. The snapshot
is only valid against a world that has not moved, and the world always moves.
The branch advanced. A dependency was patched. The bug the session was chasing
was fixed by someone else on Tuesday. Restoring faithfully to a state that is
no longer true is worse than not restoring at all, because now the agent is
confidently working from a stale model and the human has no signal that
anything is wrong.

## What worked better

Treat resumption as reconciliation rather than restoration.

Store the minimum that cannot be recomputed — the intent, the decisions, the
open questions — and recompute everything that can be. On resume, re-derive the
current state of the world, diff it against what the session assumed, and
surface the difference before doing anything else.

The output is a short, boring paragraph:

```text
Resuming: "fix the flaky upload test"
  since you left: 4 commits on main, uploader.js changed
  your assumption "the drain runs every 120s" is no longer in the code
  uncommitted: 2 files, still present
```

That last section is what makes it usable. It is not a restoration; it is a
briefing. The agent tells you what it thought, what has changed underneath it,
and where its previous reasoning may no longer hold.

## The general shape

This is the same lesson as build caches and the same lesson as ORM identity
maps, arriving from a different direction: durable state should be the smallest
thing you cannot derive, and everything derivable should be derived fresh and
checked. Storing derived state is how you get correctness bugs that only appear
after a weekend.

Sessions feel special because there is a conversation in them, and conversations
feel like the important artefact. They are not. The conversation is the cheapest
thing to keep and the least useful to restore.
