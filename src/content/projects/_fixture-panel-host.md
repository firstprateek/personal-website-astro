---
title: Panel Host
date: 2024-10-22
status: archived
summary: The docking and layout container that replaced three competing implementations.
repo: https://github.com/patjosh/panel-host
featured: false
---

Panel Host consolidated three separate docking implementations that had grown
up in different parts of the product, each with its own serialisation format
for saved layouts.

The engineering was mostly migration. Shipping it meant reading three formats
and writing one, keeping the readers for two full release cycles, and providing
a codemod that rewrote the call sites — the approach described in
[what a platform team owes its consumers](/writing/_fixture-platform-teams/).

Archived because it has been absorbed into the framework proper and no longer
exists as a separate component. The repository stays up because the layout
migration notes are still the clearest description of the old formats anywhere.
