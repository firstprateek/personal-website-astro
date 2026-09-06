---
title: The typography of a site nobody notices
date: 2026-08-12
description: Rebuilding this site, and the small number of decisions that turned out to matter.
draft: false
---

This paragraph is deliberately long, because the only way to check a measure is
to have enough text to wrap several times. A comfortable line holds somewhere
between sixty-five and seventy-five characters, and the eye starts to lose its
place above that. The column here is set in `ch` units rather than pixels, so it
stays put as the viewport grows instead of stretching toward the edges of a wide
display. If this reads as an ordinary block of prose at 1024, 1280, 1440 and
1920 pixels wide, the measure is doing its job and nothing else needs saying
about it.

## A second-level heading

Short paragraphs matter as much as long ones. Here is one with *emphasis set in
a real italic* rather than a synthesised slant, which on a serif is the kind of
detail that separates considered from careless. Here is **a bold run** at the
second of the two weights.

### A third-level heading

A list, because lists are part of prose:

- The first item, kept short.
- The second item, which runs on a little longer so that it wraps and the
  indentation of a continued line can be checked.
- The third item.

## Code

Inline code such as `entry.id` should sit on the baseline without disturbing the
line height. A block follows:

```ts
// Dates are strings all the way through, on purpose.
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
```

And a second block in another language, to check that highlighting is not
accidentally tied to one grammar:

```css
.astro-code,
.astro-code span {
  color: light-dark(var(--shiki-light), var(--shiki-dark));
}
```

A diff, which is the one block type where the theme's own colours are not
enough on their own:

```diff
 export function formatDate(date: string): string {
-  return new Date(date).toLocaleDateString();
+  const [year, month, day] = date.split('-').map(Number);
+  return `${day} ${MONTHS[month - 1]} ${year}`;
 }
```

## Links and quotations

An [outbound link](https://example.com/some/path) and a [second one](https://example.org)
in the same sentence, so the underline spacing can be judged against the text
around it.

> A block quotation, which should read as an aside rather than as a decorated
> box. The rule down its edge is decorative, and never doubles as a control
> border.

That is the whole fixture.
