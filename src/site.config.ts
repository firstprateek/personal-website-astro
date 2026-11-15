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
  url: 'https://firstprateek.github.io/personal-website-astro/',
  /** Shown as the site heading on / and in the footer. */
  name: 'Prateek Joshi',
  /** Two lines. Rendered verbatim on / as the whole of the bio. */
  bio: [
    'I build tools for working with AI coding agents: a company of agent engineers you file tickets with, a writing coach that argues in the margin, and the plumbing that lets agents run unattended.',
    'About ten years in, most of it on IDE extensibility and plugin frameworks. I write here about what it takes to trust an agent with real work.',
  ],
  /** <meta name="description"> fallback and RSS channel description. */
  description: 'Projects and writing by Prateek Joshi on coding agents and developer tools.',
  /** Project ids (filenames) shown under "Current projects" on /, in order. */
  currentProjects: ['i-inc', 'sparring', 'check-in', 'orrery'],
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
  about: [
    'I\u2019ve spent about ten years building software for other engineers, most of it on IDE extensibility and plugin frameworks: the layer other teams build on, where every change has to land without breaking someone else\u2019s work.',
    'These days I build with coding agents, and mostly on the parts around the model: sandboxes, review by a second model, proof that work is done, and recovery when CI goes red. The projects here are the tools I use every day.',
    'The writing here starts in Sparring, a coach that interviews me and critiques in the margin. Every word here is mine; the coach just asks the questions that help me find them.',
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
  // Turnstile's published always-pass test key, so the fixture build renders
  // the full form. The endpoint does not exist; nothing can be sent from it.
  contact: {
    endpoint: 'https://contact-form.example.workers.dev/',
    turnstileSiteKey: '1x00000000000000000000AA',
  },
  about: [
    'I have spent about ten years building software for other engineers. For seven of them I owned the web UI framework behind MATLAB Desktop \u2014 the toolkit, the rendering layer, and the migration path \u2014 which a hundred-odd internal product teams shipped on top of.',
    'That job taught me what platform work actually is. You are not building a product people chose; you are building the floor they stand on, and the whole discipline is in changing that floor without anyone falling through it. Most of what I write comes out of that.',
    'These days I am mostly interested in agentic developer tooling: what breaks when a coding agent has to survive a closed laptop, why review is the last mile nobody has solved, and how much of that is a state problem wearing a model problem\u2019s clothes.',
  ],
};

export const SITE = process.env.INCLUDE_FIXTURES === '1' ? DEMO : PLACEHOLDER;
