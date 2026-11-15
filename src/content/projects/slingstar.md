---
title: Slingstar
date: 2026-11-11
status: experiment
summary: A one-thumb orbital slingshot game for the iPhone home screen. Hold to orbit a planet, let go to fling off, and stay ahead of the light rising from below.
repo: https://github.com/firstprateek/slingstar
featured: false
---

[Play it in the browser](https://firstprateek.github.io/slingstar/). On an
iPhone, open it in Safari and add it to the home screen: it runs full screen
and works offline.

## One button

The whole screen is the button. Hold inside a planet's capture ring to latch
into orbit, and let go to fly off along the tangent toward the next planet.
Orbits decay, so holding too long ends the run. Catching new planets builds a
combo; every ten planets is a new zone with a new hazard: moons, drifting
planets, black holes and binary pairs.

## Fair by construction

The course generator is tested for solvability, and a bot that plays like a
person is used to tune the difficulty. Daily mode plays the same course for
everyone on a given date.

## Built with

Plain JavaScript modules, raw WebGL2 and synthesised Web Audio, with no build
step and no runtime dependencies. It is a static web app with a service worker
for offline play.
