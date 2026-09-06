---
title: The shortest loop wins
date: 2025-07-02
description: Every tool I have kept using for more than a year had one thing in common.
draft: false
---

Every developer tool I have kept using for more than a year had the same
property, and it was never the feature list. It was that the loop between
*doing something* and *seeing what happened* was short enough that I stopped
noticing it.

Not fast. Short. Those are different.

A test suite that runs in ninety seconds but tells me exactly which assertion
failed has a shorter loop than one that runs in nine and prints a stack trace
into a CI log I have to go find. The wall-clock time is a tenth. The loop is
longer, because the loop includes me switching context, opening a browser,
scrolling, and reconstructing what I was thinking about four minutes ago.

This is why I am suspicious of tooling that improves throughput at the cost of
feedback. Batching twenty checks into one nightly run is a throughput win and a
loop disaster. So is any error that requires me to add logging and re-run to
find out what actually happened — that is not one loop, it is two, and the
second one starts from a cold cache in my head.

The practical version of this: when something is annoying, measure the loop and
not the step. Ask how long it takes to go from a change to a confident answer,
including the parts where you are the bottleneck. The answer is usually much
worse than the number in the CI dashboard, and it usually points somewhere
other than where you were about to optimise.

Agentic tools have made this sharper rather than softer. An agent that takes
four minutes and is right is comfortably better than one that takes forty
seconds and needs three corrections, because each correction restarts the loop
and drags my attention back in. Latency is what the benchmark measures.
Interruption is what I actually pay.
