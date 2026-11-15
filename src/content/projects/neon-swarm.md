---
title: Neon Swarm
date: 2026-06-10
status: experiment
summary: A 3D swarm-survivor game built for raw browser performance, on a seeded city so friends can race the same map.
repo: https://github.com/firstprateek/neon-swarm
---

[Play it in the browser](https://firstprateek.github.io/neon-swarm/). Pick a
survivor, hold off the horde, and compare scores with friends on the same seed.

## What made it interesting

**Performance first.** It renders with three.js's WebGPU renderer and falls back
to WebGL2. Every class of thing (enemies, bullets, gems, particles) is one
instanced draw call. Enemy state lives in packed typed arrays with no per-enemy
objects, and a spatial hash rebuilt each frame with a counting sort handles
separation and collisions without allocating. A quality governor holds the
target frame rate by flexing pixel ratio and bloom. In a stress test, 15,000
enemies hold 120 FPS on an Apple Silicon Mac.

**A seeded world.** The arena is a finite city generated from the run's seed:
downtown on a road grid, a suburb with a mall, a national park with lakes and a
mountain you can climb. The same seed gives the identical map, which is what
makes a daily challenge fair. Buildings block you and the horde alike, and about
half of them can be entered for supplies.

**Playable on a phone.** Touch is detected, and a floating joystick and ability
buttons replace the keyboard. Every key is remappable, and three control presets
decide how much the game aims for you.

TypeScript and Vite; every push to `main` deploys to GitHub Pages.
