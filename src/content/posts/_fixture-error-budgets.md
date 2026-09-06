---
title: Error budgets for tools nobody chose
date: 2025-11-05
description: Reliability targets assume users who can leave. Internal platforms have neither that pressure nor that feedback, and the substitutes are worse than they look.
draft: false
---

An error budget works because someone can walk away. You spend reliability
against a target, and the target is calibrated to how much unreliability your
users will tolerate before they go somewhere else. Take away the leaving, and
the mechanism does not fail loudly — it keeps producing numbers, and the
numbers stop meaning anything.

That is the position every internal platform team is in. The teams building on
your framework did not evaluate it. They were told which framework to use, and
the cost of your bad week is not churn, it is a hundred people quietly working
around you.

## What replaces the signal

The usual substitute is a survey, and surveys measure the loudest quarter of
your users on the worst day they remember. The second substitute is ticket
volume, which measures how much friction people will tolerate before they
escalate — a number that mostly tracks how pleasant your team is to talk to.

The thing I found more honest was time-to-first-render on a cold cache, sampled
from real sessions rather than a synthetic run. It is not a satisfaction
metric. It is a proxy for how many seconds a hundred teams collectively spend
waiting on you, and unlike a survey it moves the same week the regression lands.

## The uncomfortable part

If you cannot lose users, you also cannot tell the difference between a
platform people like and one they are stuck with. Every internal team I have
worked on eventually has this argument, and the honest resolution is that you
have to go and ask — not with a form, but by sitting with three teams a quarter
and watching them build something.

That does not scale, which is the standard objection. It does not need to. You
are not sampling for statistical power, you are sampling for the failure you
would never have predicted, and three teams is plenty for that.
