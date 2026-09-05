import githubLight from 'shiki/themes/github-light.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';

/**
 * Contrast-corrected Shiki themes.
 *
 * Astro runs Shiki with `defaultColor: false`, so each token span carries only
 * `--shiki-light` / `--shiki-dark` custom properties and *no scope class*.
 * Nothing in the markup says which token is a comment and which is a keyword,
 * so no CSS selector can reach a token type. The corrections therefore have to
 * be made to the theme itself, at build time, and end up inline in the HTML.
 *
 * Every ratio below is measured against `subtle` — #F4F2EE light, #1E1F22 dark
 * — because code blocks sit on `subtle`, not on Shiki's own backgrounds. The
 * corrections hold hue and chroma and move lightness only, except #E36209,
 * which has to shed some chroma to reach 4.5 without leaving sRGB.
 *
 * To swap the theme pair, change the two imports and re-measure the table.
 */

type Theme = typeof githubLight;

/** Foreground hex -> replacement, applied to every scope that uses it. */
type Corrections = Record<string, string>;

const LIGHT: Corrections = {
  '#6a737d': '#666E78', // comment                             4.31 -> 4.62
  '#d73a49': '#CD2F41', // keyword, storage                    4.09 -> 4.60
  '#22863a': '#167E33', // entity.name.tag, markup.inserted    4.14 -> 4.62
  '#e36209': '#B74D01', // variable, markup.changed            3.12 -> 4.61

  // github makes these legible by pairing them with a *token* background, and
  // with defaultColor:false there is no way to render one — so as bare
  // foregrounds they measure 1.05 and 1.08. Fall back to ordinary body text.
  '#f6f8fa': '#24292E', // markup.ignored, markup.untracked    1.05 -> 13.12
  '#fafbfc': '#24292E', // carriage-return                     1.08 -> 13.12
};

const DARK: Corrections = {
  '#6a737d': '#7F8993', // comment                             3.42 -> 4.63
  '#24292e': '#E1E4E8', // carriage-return                     1.12 -> 12.92
  '#2f363d': '#E1E4E8', // markup.ignored, markup.untracked    1.35 -> 12.92
};

function correct(theme: Theme, corrections: Corrections): Theme {
  const patched = structuredClone(theme);
  for (const token of patched.tokenColors ?? []) {
    const foreground = token.settings?.foreground?.toLowerCase();
    if (foreground && corrections[foreground]) {
      token.settings.foreground = corrections[foreground];
    }
  }
  return patched;
}

export const codeThemeLight = correct(githubLight, LIGHT);
export const codeThemeDark = correct(githubDark, DARK);
