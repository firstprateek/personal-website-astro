// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { SITE } from './src/site.config.ts';
import { codeThemeDark, codeThemeLight } from './src/lib/shiki-theme.ts';

// A build must make no network requests at all. Astro's anonymous telemetry is
// the only thing that would, and it is only switchable by environment
// variable, so it is set here — in the repo, and on every platform — rather
// than relying on each machine or CI runner to export it.
process.env.ASTRO_TELEMETRY_DISABLED = '1';

/**
 * Fonts are declared with the `local` provider rather than `npm`, on purpose.
 *
 * The `npm` provider parses exactly one Fontsource CSS entry file (`index.css`
 * by default) and returns whatever @font-face rules it finds. It ignores the
 * `weights`, `styles` and `subsets` keys entirely, so `weights: [400, 600]`
 * silently yielded 400-only, and `subsets: ['latin']` still shipped cyrillic,
 * greek and vietnamese. It also rewrites every src to a jsDelivr URL.
 *
 * The `local` provider takes the exact woff2 files instead: latin only, one
 * declaration per face, resolved from node_modules with no CDN in the path.
 * Astro still computes the metric-override fallbacks from the file itself.
 */
const serifFile = (v) => `@fontsource/source-serif-4/files/source-serif-4-latin-${v}.woff2`;

export default defineConfig({
  site: SITE.url,
  vite: {
    // Replaced with a literal so Rollup can eliminate the unused branch of the
    // media glob in src/lib/content.ts — see the comment there.
    define: {
      __INCLUDE_FIXTURES__: JSON.stringify(process.env.INCLUDE_FIXTURES === '1'),
    },
  },
  devToolbar: { enabled: false },
  build: {
    // Provably no render-blocking stylesheet: inline every one, not just <4kB.
    inlineStylesheets: 'always',
  },
  markdown: {
    shikiConfig: {
      // Patched theme objects, not names: token colours cannot be corrected
      // from CSS because defaultColor:false emits no scope classes.
      themes: { light: codeThemeLight, dark: codeThemeDark },
      // Emits only --shiki-light / --shiki-dark custom properties. Without this
      // the light colour is written as an inline `color:`, which outranks any
      // author stylesheet and would force !important on every dark rule.
      defaultColor: false,
      wrap: true,
    },
  },
  fonts: [
    {
      // Three faces, not four: bold-italic is dropped on the client's call, to
      // save 21.5 KB of a face that prose essentially never uses.
      name: 'Source Serif 4',
      cssVariable: '--font-serif',
      provider: fontProviders.local(),
      display: 'optional',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          { weight: 400, style: 'normal', src: [serifFile('400-normal')] },
          { weight: 400, style: 'italic', src: [serifFile('400-italic')] },
          { weight: 600, style: 'normal', src: [serifFile('600-normal')] },
        ],
      },
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      provider: fontProviders.local(),
      display: 'optional',
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      options: {
        variants: [
          {
            weight: 400,
            style: 'normal',
            src: ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'],
          },
        ],
      },
    },
  ],
});
