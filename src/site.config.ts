/**
 * Everything the client needs to edit before launch lives here, and nowhere else.
 * The TODO_ values are deliberately unmissable: they render on screen and in
 * <title>, so shipping one is a visible mistake rather than a silent one.
 */
const PLACEHOLDER = {
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
  about: ['TODO_REPLACE_BEFORE_LAUNCH — a few paragraphs about you.'],
};

/**
 * Demo values for INCLUDE_FIXTURES=1 builds. Delete this block with the fixtures.
 *
 * Deliberately not written into PLACEHOLDER above: a plausible-looking name
 * sitting in the real config is precisely the quietly-wrong state the
 * placeholders exist to prevent. A plain build cannot reach these.
 */
const DEMO = {
  url: 'https://patjosh.example.com',
  name: 'Pat Josh',
  bio: [
    'Ten years building developer-facing software. For seven of them I owned the web UI framework behind MATLAB Desktop, which a hundred-odd internal product teams shipped on top of.',
    'Now I write about platform architecture and agentic developer tooling — mostly about what breaks when a tool has to serve people who never chose it.',
  ],
  description:
    'Essays on platform architecture and agentic developer tooling, by an engineer who spent seven years owning a UI framework other teams had to live with.',
  links: [
    { label: 'GitHub', href: 'https://github.com/patjosh' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/patjosh' },
    { label: 'Email', href: 'mailto:pat@example.com' },
  ],
  about: [
    'I have spent about ten years building software for other engineers. For seven of them I owned the web UI framework behind MATLAB Desktop \u2014 the toolkit, the rendering layer, and the migration path \u2014 which a hundred-odd internal product teams shipped on top of.',
    'That job taught me what platform work actually is. You are not building a product people chose; you are building the floor they stand on, and the whole discipline is in changing that floor without anyone falling through it. Most of what I write comes out of that.',
    'These days I am mostly interested in agentic developer tooling: what breaks when a coding agent has to survive a closed laptop, why review is the last mile nobody has solved, and how much of that is a state problem wearing a model problem\u2019s clothes.',
  ],
};

export const SITE = process.env.INCLUDE_FIXTURES === '1' ? DEMO : PLACEHOLDER;
