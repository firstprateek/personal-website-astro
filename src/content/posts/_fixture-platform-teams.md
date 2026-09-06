---
title: What a platform team owes its consumers
date: 2025-03-18
description: A platform team's real product is not the framework. It is the promise that upgrading will not ruin your quarter.
draft: false
---

The first thing I learned owning a framework that other teams had to build on
is that almost nobody chooses you. Product teams choose their features, their
deadlines and occasionally their database. The UI framework is weather. It is
the thing they work around.

That asymmetry changes what you owe them.

## The product is the upgrade path

A framework is judged on its API for about two weeks, and on its upgrade path
for the next five years. Teams will forgive an awkward component signature.
They will not forgive a minor version that quietly changes layout in a dialog
they have not touched since 2019, because now they have to justify a two-week
regression hunt to a manager who does not know your framework exists.

So the useful question when reviewing a change is never "is this better?" It is
"what does this cost someone who is not in this room?" Those have different
answers more often than platform engineers like to admit.

## Deprecation is a schedule, not an announcement

Announcing a deprecation is the easy half. The hard half is that a hundred
teams have a hundred different release cadences, and some of them ship twice a
year against a validated build. A deprecation without a migration and a date is
just a threat.

What actually worked for us was boring:

- The old thing keeps working for two full release cycles. No exceptions,
  including for the team that owns the framework.
- A codemod ships with the deprecation, not after it. If the migration cannot
  be automated, that is evidence the replacement API is wrong.
- The warning names the file and the line in the consumer's code, not ours.

The third one sounds like a detail. It is most of the value. A warning that
says `deprecated: use PanelHost instead` produces a support ticket. A warning
that says `src/views/InspectorPanel.js:214: LegacyPanel is deprecated, run npx
uikit-codemod panel-host` produces a pull request.

## Support load is a design signal

We tracked which components generated the most questions, and it was not the
complicated ones. It was the ones where the obvious usage was subtly wrong. A
component that is hard to use correctly and easy to use incorrectly will
generate support forever, and no amount of documentation fixes it, because the
people asking did not read the documentation — that is why they are asking.

Every recurring question is a bug report about the API, filed in the wrong
place. Treating it that way turned our support rotation from a tax into the
best design feedback we had.

## The part nobody thanks you for

None of this shows up in a demo. You cannot screenshot an upgrade that did not
break anything. The work that most improves a platform team's standing is
invisible by construction, which means you have to be willing to spend
political capital on it without a visible win to point at.

I do not have a clever resolution to that. I only know that the teams who
skipped it spent the same effort eventually, at a worse exchange rate, in the
middle of someone else's release.
