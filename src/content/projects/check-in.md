---
title: Check-in
date: 2026-11-08
status: active
summary: A ten-second iPhone check-in (what am I feeling, what should I be doing, what am I doing?) that turns the answers into nightly and weekly patterns.
repo: https://github.com/firstprateek/emotion-checkin
featured: false
---

The problem I wanted to catch is drifting into avoidance without noticing the
feeling that came first. A check-in has to take about ten seconds, and the
reminder has to come from outside the app, because the app is closed exactly
when you are drifting.

## What it does

Every so often during the day a notification asks three things: what am I
feeling, what should I be doing, and what am I actually doing. Then one tap: on
it, escaping, or a planned break. Chips under each field come from my own past
answers, so most check-ins are taps, not typing.

At night it shows the counts, what I was avoiding, what I felt just before, where
I went instead, and the three-hour window with the most escapes. Once a week it
compares with last week and writes the top pattern as one sentence. That
sentence is counting, not a model.

## Decisions

**A home-screen web app, not a native app.** Native would give lock-screen
buttons and typed replies, which suit a ten-second check-in. A web app shipped
the same day with no App Store or signing, and the spec says up front what that
costs: one tap opens the app instead of answering from the notification.

**The server sends the reminders.** A small Node server with one dependency
sends Web Push on a schedule computed by a pure, unit-tested function that works
in the phone's time zone and never sends twice, even in the repeated hour when
clocks fall back.

**Offline first.** Saves go to IndexedDB, then sync. Pages fall back to the
cached shell after three seconds, so an asleep server never means a blank
screen.

## How it was built

The spec is written as a contract for coding agents: it assigns each file to a
server builder or a client builder and pins the API, so each side can be tested
without the other. The spec landed at 12:32 and the whole build at 12:59 the
same day.
