import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Fixtures and templates live inside the collection directories as
 * `_fixture-*.md` and `_template.md`. The production pattern excludes every
 * leading-underscore file, so a fixture cannot reach a real build; setting
 * INCLUDE_FIXTURES=1 widens the pattern for local verification. One
 * conditional, no copy step, no second build path.
 *
 * This is one of two independent guards, and on its own it is not enough.
 * Astro caches loaded entries in node_modules/.astro/data-store.json, and that
 * cache survives a change of pattern, so a build that skips the `--force` in
 * the npm script — a host's framework preset, or a hand-run `npx astro build`
 * — will republish whatever fixtures the cache still holds. The second guard
 * is on the read path in lib/content.ts and cannot be bypassed that way. Keep
 * both, and keep the flag.
 */
const pattern =
  process.env.INCLUDE_FIXTURES === '1' ? ['**/*.md'] : ['**/*.md', '!**/_*.md'];

/** Plain calendar date. Deliberately a string, never a Date: see lib/content.ts. */
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

const isoDate = z
  .union([z.string(), z.date()])
  // YAML turns an unquoted `2026-10-04` into a Date at UTC midnight, so this
  // round-trips to the same calendar day. Accepting both spellings means an
  // author never has to remember to quote the date, and the value is a plain
  // string from here on either way.
  .transform((value) => (value instanceof Date ? value.toISOString().slice(0, 10) : value))
  .pipe(
    z
      .string()
      .regex(PLAIN_DATE, 'must be a plain calendar date, YYYY-MM-DD')
      .refine(isRealDate, 'is not a real calendar date'),
  );

const posts = defineCollection({
  loader: glob({ pattern, base: './src/content/posts' }),
  // strictObject: an unknown or misspelled key fails the build rather than
  // being silently dropped.
  schema: z.strictObject({
    title: z.string().min(1),
    date: isoDate,
    description: z.string().min(1),
    draft: z.boolean(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern, base: './src/content/projects' }),
  schema: z.strictObject({
    title: z.string().min(1),
    date: isoDate,
    status: z.enum(['experiment', 'active', 'archived']),
    summary: z.string().min(1),
    repo: z.url(),
    /** Path under src/media/. Optional: not every project has a demo. */
    video: z.string().min(1).optional(),
    featured: z.boolean(),
  }),
});

export const collections = { posts, projects };
