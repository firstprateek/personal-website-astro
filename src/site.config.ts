/**
 * Everything the client needs to edit before launch lives here, and nowhere else.
 * The TODO_ values are deliberately unmissable: they render on screen and in
 * <title>, so shipping one is a visible mistake rather than a silent one.
 */
const PLACEHOLDER = {
  /**
   * Canonical URL, with a trailing slash. Used for RSS, canonical links and
   * og:url, and its path becomes Astro's `base` (astro.config.mjs).
   */
  url: 'https://pjoshi.dev/',
  /** Shown in the header on every page and in page titles. */
  name: 'Prateek Joshi',
  /** <meta name="description"> fallback and RSS channel description. */
  description: 'Projects and writing by Prateek Joshi on coding agents and developer tools.',
  /** Project ids (filenames) shown under "Current projects" on /, in order. */
  currentProjects: ['i-inc', 'sparring', 'vastu', 'check-in', 'orrery'],
  /** Footer contact links. Plain text links, no icons. Order is preserved. */
  links: [
    { label: 'GitHub', href: 'https://github.com/firstprateek' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/joshi-prateek' },
  ],
  /**
   * The /contact/ form. `endpoint` is the Cloudflare Worker in worker/ and
   * `turnstileSiteKey` the public Turnstile site key (the secret half lives
   * only in the Worker). Until both are set the page renders a short note
   * instead of a form that cannot send. Neither value is secret.
   */
  contact: {
    endpoint: 'https://contact-form.pjoshi.workers.dev/',
    turnstileSiteKey: '0x4AAAAAAGCbzMfrLexOVeFv',
  },
  /**
   * Visit counting. `endpoint` is the beacon URL of the Cloudflare Worker in
   * stats/; the head script sends to it only when the page is served from
   * `url`'s host, so local builds and previews count nothing. Empty turns it off.
   */
  stats: {
    endpoint: 'https://site-pulse.pjoshi.workers.dev/p',
  },
  /** About paragraphs. Trusted HTML, written here by hand: inline links only. */
  about: [
    'I\u2019ve spent about ten years building software, and the most fun has always been building the software other engineers use.',
    'These days I build with coding agents, and mostly think about how to use them to build software safely and efficiently. I\u2019m interested in building software that other agents can use, and in how agents can work together toward human-set goals with as little waste and as few interruptions as possible, so people can focus on the higher levels: the project, the product, the business.',
    'On the side, I build the tools I use every day. Most articles here start in <a href="https://github.com/firstprateek/sparring">Sparring</a>, an AI coach that interviews me and critiques my drafts. Some I draft with agents and edit until they say what I mean.',
  ],
};

/**
 * Demo values for INCLUDE_FIXTURES=1 builds. Delete this block with the fixtures.
 *
 * Deliberately not written into PLACEHOLDER above: a plausible-looking name
 * sitting in the real config is precisely the quietly-wrong state the
 * placeholders exist to prevent. A plain build cannot reach these.
 */
const DEMO = {
  // A sub-path on purpose, so the fixture build also proves every link honours the base.
  url: 'https://patjosh.example.com/demo/',
  name: 'Pat Josh',
  currentProjects: ['_fixture-mcp-workbench', '_fixture-session-ledger'],
  description:
    'Essays on platform architecture and agentic developer tooling, by an engineer who spent seven years owning a UI framework other teams had to live with.',
  links: [
    { label: 'GitHub', href: 'https://github.com/patjosh' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/patjosh' },
    { label: 'Email', href: 'mailto:pat@example.com' },
  ],
  // Turnstile's published always-pass test key, so the fixture build renders
  // the full form. The endpoint does not exist; nothing can be sent from it.
  contact: {
    endpoint: 'https://contact-form.example.workers.dev/',
    turnstileSiteKey: '1x00000000000000000000AA',
  },
  // No counting in the demo.
  stats: {
    endpoint: '',
  },
  about: [
    'I have spent about ten years building software for other engineers. For seven of them I owned the web UI framework behind MATLAB Desktop \u2014 the toolkit, the rendering layer, and the migration path \u2014 which a hundred-odd internal product teams shipped on top of.',
    'That job taught me what platform work actually is. You are not building a product people chose; you are building the floor they stand on, and the whole discipline is in changing that floor without anyone falling through it. Most of what I write comes out of that.',
    'These days I am mostly interested in agentic developer tooling: what breaks when a coding agent has to survive a closed laptop, why review is the last mile nobody has solved, and how much of that is a state problem wearing a model problem\u2019s clothes.',
  ],
};

export const SITE = process.env.INCLUDE_FIXTURES === '1' ? DEMO : PLACEHOLDER;
