---
title: Why agentic coding tools keep failing at the last mile of code review
date: 2026-01-22
description: The models got good at writing code well before the tools got good at explaining what they had done, and review is where that gap becomes expensive.
draft: false
---

I have now watched three separate teams adopt an agentic coding tool, get a
genuine productivity win in the first month, and then stall. The stall is
always in the same place, and it is never the code generation. It is review.

The pattern is consistent enough to be worth writing down.

## The first month is real

Nobody is imagining the early win. A tool that can take a described change and
produce a working patch across nine files genuinely removes hours of
mechanical work per week. The teams I watched were not credulous — they
measured, and the numbers held up.

What changed in month two was not the tool's accuracy. It was the volume. When
one engineer can open six substantial pull requests in a day, the constraint
moves to the people who have to read them, and those people are now reading
code that nobody wrote.

## Review was never about correctness

This is the part that surprises people. If review were primarily about catching
bugs, agentic output would be *easier* to review, because it is more
consistent, better commented, and usually has tests.

But most of what a reviewer does is reconstruct intent. You read a diff and you
build a model of what the author was trying to do, and then you check whether
the code does that, and whether that was the right thing to want. The bug-
catching falls out of the intent-reconstruction; it is a side effect, not the
main activity.

Agentic diffs break this because the intent is not recoverable from the diff.
The author was a prompt, and the prompt is not in the pull request. So the
reviewer is left doing the hardest half of review with the input removed.

> The failure is not that the code is wrong. It is that the reviewer cannot
> tell the difference between a decision and an accident.

That distinction is load-bearing. When a human writes `retries = 3`, a reviewer
reads it as a choice and asks why three. When an agent writes it, the reviewer
does not know whether it is a considered default, a value copied from
elsewhere in the repo, or a number the model produced because three is a
number. Asking costs a round trip. Not asking costs an incident, eventually.

## What the tools give you instead

Most tools respond to this with a summary. The summary describes the diff:

```text
Added retry logic to the upload handler with exponential backoff.
Updated tests. Refactored the error path to use the shared logger.
```

Which is a restatement of what I can already see. It answers *what* and leaves
*why* exactly as absent as before. A summary that paraphrases the diff is
worse than nothing, because it looks like it is doing the job.

The thing I actually want is closer to a decision log:

```text
retries = 3
  considered: 5 (matches uploader.js), 1 (fail fast)
  chose 3: the endpoint's own timeout is 30s and the queue drains
           every 120s, so >3 risks overlapping the next drain
  uncertain: whether the 120s drain is still true after #4412
```

The last line is the valuable one. An agent that reports its own uncertainty
lets a reviewer spend attention where it pays, and there is no reason a tool
cannot produce this — the information exists at generation time and is thrown
away.

### A note on tests

The other place intent goes missing is the test suite. Agentic tools are good
at producing tests, and the tests usually pass, which is the problem. A test
written from the same understanding that produced the code does not check the
code — it checks that the model was internally consistent, which it reliably
is.

I have started reading agentic tests before the implementation, on the theory
that if the test does not describe a behaviour I actually want, the
implementation underneath it does not matter. It is a slower way to review and
it has caught things the other order did not. Twice now the test encoded an
assumption nobody would have written down deliberately, and both times the
implementation was a faithful expression of a wrong idea.

## The organisational failure underneath

There is a version of this essay that blames the tools, and it would be half
right. The other half is that most teams adopted agentic tooling without
changing anything about how they review, and then were surprised that a process
designed around a human author behaved badly with a non-human one.

A few things that helped the teams that got past the stall:

- **The prompt goes in the pull request.** Not the whole transcript. The
  instruction that produced the change, verbatim, so the reviewer can see what
  was asked for and judge whether that was the right ask.
- **The author reviews first, and says so.** An engineer who opens an agentic
  PR without having read it is laundering responsibility, and everyone
  downstream can tell within about a week.
- **Small diffs, aggressively.** This was always good advice and it is now
  load-bearing. The cost of a large diff has gone up, because the reviewer no
  longer gets intent for free.
- **Separate mechanical from consequential.** A rename across two hundred files
  and a change to retry semantics are different artefacts and should not
  arrive in the same review.

### The one that was hardest to sell

Reviewing agentic code takes longer per line, not shorter, and teams need to
plan for that. The productivity win is real but it lands on the writing side
and gets partly spent on the reading side. Pretending otherwise sets up a
review queue that grows quietly for a quarter and then becomes the only thing
anyone talks about.

## Where this goes

I do not think this is a permanent state. The information a reviewer needs is
available to the tool at the moment it makes the decision, and eventually
somebody will ship an agent whose primary output is a defensible account of its
own reasoning, with the diff as an attachment.

Until then, the teams doing well are the ones that noticed review is a
bottleneck made of people, and that adding a faster writer to a system whose
constraint is reading is a way to make the queue longer.

The thing I would tell a team about to adopt one of these tools is not to slow
down. It is to decide, before the volume arrives, what a reviewer is entitled
to receive along with a diff — and then to hold that line even when the tool
does not make it easy, because the alternative is discovering in month four
that you have shipped a quarter's worth of code that nobody can explain.

That is not a tooling problem, in the end. It is the same thing platform teams
learn about deprecations: the artefact is not the change, it is the account of
the change, and a team that ships one without the other is borrowing against a
future it has not looked at.
