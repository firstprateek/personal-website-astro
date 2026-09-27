import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { SITE } from '../site.config';

/* The link-preview card behind og:image, drawn at build time from
   site.config.ts, so the name on it can never drift from the name on the site
   and there is no second place to edit before launch.

   Nothing here touches the network. The fonts are the site's own, read from
   node_modules as WOFF, since satori cannot read WOFF2. Satori lays the card
   out and turns its text into paths, so the rasteriser needs no fonts at all.
   resvg runs as WebAssembly rather than a per-platform binary, so the build
   machine's OS makes no difference. */

const require = createRequire(import.meta.url);
const asset = (specifier) => readFile(require.resolve(specifier));

// The light palette from global.css. A preview has no theme to follow, and
// light is the site's own default.
const BG = '#fdfcfa';
const TEXT = '#1f1d1a';
const MUTED = '#6b6660';
const ACCENT = '#35697c';

// initWasm throws if it runs twice in one process, and the dev server
// re-evaluates this module on every edit, so the promise lives on globalThis.
const WASM = Symbol.for('site.resvg-wasm');
const resvgReady = () =>
  (globalThis[WASM] ??= asset('@resvg/resvg-wasm/index_bg.wasm').then((wasm) => initWasm(wasm)));

const box = (style, children) => ({ type: 'div', props: { style, children } });

export async function GET() {
  const [serif, serifSemibold, mono] = await Promise.all([
    asset('@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff'),
    asset('@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff'),
    asset('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff'),
  ]);

  // Clamped and allowed to break inside a word, so a long name or a loud
  // TODO placeholder stays on the card instead of running off its edge.
  const card = box(
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      backgroundColor: BG,
      color: TEXT,
      fontFamily: 'Source Serif 4',
    },
    [
      box({ display: 'flex', flexDirection: 'column' }, [
        box({ width: 72, height: 6, backgroundColor: ACCENT, marginBottom: 44 }),
        box(
          { display: 'block', fontSize: 76, fontWeight: 600, lineHeight: 1.15, wordBreak: 'break-word', lineClamp: 2 },
          SITE.name,
        ),
        box(
          { display: 'block', marginTop: 28, fontSize: 36, lineHeight: 1.4, color: MUTED, wordBreak: 'break-word', lineClamp: 3 },
          SITE.description,
        ),
      ]),
      box({ fontFamily: 'JetBrains Mono', fontSize: 26, color: MUTED }, new URL(SITE.url).host),
    ],
  );

  const svg = await satori(card, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Source Serif 4', data: serif, weight: 400, style: 'normal' },
      { name: 'Source Serif 4', data: serifSemibold, weight: 600, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
    ],
  });
  await resvgReady();
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
