import { getCollection, type CollectionEntry } from 'astro:content';

/* -------------------------------------------------------------------------
   Dates

   Frontmatter dates are plain calendar dates and are kept as strings all the
   way to the page. `new Date('2026-10-04')` parses as UTC midnight, which
   renders as October 3rd for anyone west of Greenwich; that off-by-one is the
   trap this module exists to avoid. Nothing here ever constructs a Date from
   a bare date string, and formatting is pinned to UTC so the output is
   identical in every timezone.
------------------------------------------------------------------------- */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-10-04" -> "4 October 2026". No Date arithmetic, no timezone. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Only for RSS, which genuinely wants an instant. Noon UTC keeps the calendar
 *  day intact either side of the date line. */
export function toPubDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** ISO date strings sort correctly as strings, so no Date is needed. */
function newestFirst<T extends { data: { date: string } }>(a: T, b: T): number {
  return b.data.date.localeCompare(a.data.date);
}


/* -------------------------------------------------------------------------
   Fixtures

   Fixtures and templates are the `_`-prefixed files in the collection
   directories. content.config.ts excludes them from the glob in a production
   build, and the build script passes --force so Astro's content cache cannot
   serve a stale one. This is the second, independent guard, and it is not
   redundant: both of those live in places a host's framework preset or a
   hand-run `npx astro build` bypasses entirely, and either would then
   republish whatever the cache still holds. Shipping a fake project is the one
   failure the client called worse than an empty page, so it gets two guards
   that fail independently. This one runs on the read path, where nothing is
   cached and no flag can switch it off.
------------------------------------------------------------------------- */

const INCLUDE_FIXTURES = process.env.INCLUDE_FIXTURES === '1';

function isFixture(id: string): boolean {
  return id.split('/').some((segment) => segment.startsWith('_'));
}

function dropFixtures<T extends { id: string }>(entries: T[]): T[] {
  return INCLUDE_FIXTURES ? entries : entries.filter((entry) => !isFixture(entry.id));
}

/* ------------------------------------------------------------------------- */

/** Published posts, newest first. Drafts get no route, no listing, no feed item. */
export async function getPosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts', ({ data }) => data.draft !== true);
  return dropFixtures(posts).sort(newestFirst);
}

/**
 * Projects, newest first, with the build-time guards applied. Every page that
 * reads projects goes through here, so the guards cannot be skipped.
 */
export async function getProjects(): Promise<CollectionEntry<'projects'>[]> {
  const projects = dropFixtures(await getCollection('projects'));

  const featured = projects.filter((entry) => entry.data.featured);
  if (featured.length > 1) {
    throw new Error(
      `Only one project may set \`featured: true\`, found ${featured.length}: ` +
        `${featured.map((entry) => entry.id).join(', ')}. ` +
        'The home page shows exactly one, so this would silently pick a winner.',
    );
  }

  for (const entry of projects) {
    if (entry.data.video) await resolveVideo(entry);
  }

  return projects.sort(newestFirst);
}

export async function getFeaturedProject(): Promise<CollectionEntry<'projects'> | undefined> {
  const projects = await getProjects();
  return projects.find((entry) => entry.data.featured);
}

/* -------------------------------------------------------------------------
   Video + poster

   Media lives in src/media/ rather than public/, so a file is only emitted
   into the build when something actually references it. That is what keeps a
   fixture's demo video out of a production build.

   The poster frame is inferred from the video path — demo.mp4 -> demo.jpg —
   so the frontmatter stays as specified. A missing poster fails the build
   loudly rather than shipping a video with a blank first frame.
------------------------------------------------------------------------- */

// Vite emits every file an import.meta.glob matches, eager or lazy, whether or
// not an entry references it. So the production pattern excludes `_`-prefixed
// files — the fixture naming convention — and the two calls are selected by a
// constant Vite replaces at build time, letting Rollup drop the dead branch
// along with its assets.
declare const __INCLUDE_FIXTURES__: boolean;

// The options object must be written out at both call sites: Vite reads it
// statically and silently returns module namespaces instead of URLs if it is
// passed by reference.
const media: Record<string, () => Promise<string>> = __INCLUDE_FIXTURES__
  ? import.meta.glob<string>('/src/media/**/*.{mp4,jpg}', { query: '?url', import: 'default' })
  : import.meta.glob<string>('/src/media/**/[!_]*.{mp4,jpg}', { query: '?url', import: 'default' });

export interface ResolvedVideo {
  src: string;
  poster: string;
}

export async function resolveVideo(entry: CollectionEntry<'projects'>): Promise<ResolvedVideo> {
  const path = entry.data.video;
  if (!path) throw new Error(`Project "${entry.id}" has no video to resolve.`);

  if (!path.endsWith('.mp4')) {
    throw new Error(
      `Project "${entry.id}": video must be a self-hosted .mp4, got "${path}".`,
    );
  }

  const videoKey = `/src/media/${path}`;
  const posterKey = videoKey.replace(/\.mp4$/, '.jpg');

  const loadSrc = media[videoKey];
  if (!loadSrc) {
    throw new Error(
      `Project "${entry.id}": video "${path}" not found at src/media/${path}.`,
    );
  }

  const loadPoster = media[posterKey];
  if (!loadPoster) {
    throw new Error(
      `Project "${entry.id}": video "${path}" has no poster frame. ` +
        `Add a sibling JPEG at src/media/${path.replace(/\.mp4$/, '.jpg')} ` +
        '(same name, .jpg extension). A poster is required so the video ' +
        'reserves its space and shows something before it is played.',
    );
  }

  return { src: await loadSrc(), poster: await loadPoster() };
}
