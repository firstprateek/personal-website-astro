/**
 * Every internal link goes through here, so the site works both at a domain
 * root and under a sub-path (a GitHub Pages project site is served from
 * /personal-website-astro/). The base comes from the path of `url` in
 * site.config.ts; see astro.config.mjs.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** `path` is site-absolute, e.g. `/writing/`. Returns it prefixed with the base. */
export function href(path: string): string {
  if (!path.startsWith('/')) throw new Error(`href() takes a site-absolute path, got "${path}"`);
  return `${BASE}${path}`;
}

/** True when `pathname` (Astro.url.pathname) is the site's home page. */
export function isHomePath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === BASE;
}
