---
title: Orrery
date: 2026-06-20
status: experiment
summary: A 3D solar system explorer in the browser. Zoom from the whole system down to a single moon against one physically correct shared night sky.
repo: https://github.com/firstprateek/orrery
featured: false
---

[Open it in the browser](https://firstprateek.github.io/orrery/). Fly from
whole-system scale down to a single moon, click any body to inspect it, scrub
time, and switch between realistic and visible scale.

## The hard part is scale

The solar system spans about ten orders of magnitude. The first milestone did
nothing but prove the camera could travel from the whole system down to a
one-kilometre object with no jitter, using a logarithmic depth buffer and a
floating origin. Everything else was built on top of that.

## One sky for every body

Seen from anywhere in the solar system, the stars are effectively in the same
place: parallax is far below a screen pixel. So Orrery builds one fixed sky,
from 9,096 real catalogue stars with magnitude sizing and blackbody colours, and
what changes between viewpoints is the Sun's direction and size and where the
other planets are. Stellarium and NASA's Eyes work the same way.

## Built with

three.js on WebGL2, TypeScript and Vite, astronomy-engine for planet positions
and a small Kepler propagator for other moons and the asteroid belt. Fully
static. A quality selector trades frame rate for fidelity, mostly through pixel
ratio and bloom resolution.
