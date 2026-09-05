/**
 * Everything the client needs to edit before launch lives here, and nowhere else.
 * The TODO_ values are deliberately unmissable: they render on screen and in
 * <title>, so shipping one is a visible mistake rather than a silent one.
 */
export const SITE = {
  /** Canonical origin. Used for RSS, canonical links and og:url. */
  url: 'https://todo-replace-before-launch.example.com',
  /** Shown as the site heading on / and in the footer. */
  name: 'TODO_REPLACE_BEFORE_LAUNCH — your name',
  /** Two lines. Rendered verbatim on / as the whole of the bio. */
  bio: [
    'TODO_REPLACE_BEFORE_LAUNCH — first line of the bio, one sentence.',
    'TODO_REPLACE_BEFORE_LAUNCH — second line of the bio, one sentence.',
  ],
  /** <meta name="description"> fallback and RSS channel description. */
  description: 'TODO_REPLACE_BEFORE_LAUNCH — one sentence describing the site.',
  /** Footer contact links. Plain text links, no icons. Order is preserved. */
  links: [
    { label: 'GitHub', href: 'https://github.com/TODO_REPLACE_BEFORE_LAUNCH' },
    { label: 'Email', href: 'mailto:TODO_REPLACE_BEFORE_LAUNCH@example.com' },
  ],
} as const;
