import { defineHastPlugin } from 'satteri';

/**
 * Prefixes site-absolute links in Markdown (`[x](/writing/foo/)`, `![](/media/a.png)`)
 * with Astro's base, so content written for a domain root also works when the
 * site is served under a sub-path. Protocol-relative (`//host`) and already-
 * prefixed URLs are left alone. A hast plugin for Sätteri, Astro 7's default
 * Markdown processor (rehype plugins would need the old unified stack).
 */
export default function baseLinks(base) {
  const prefix = base.replace(/\/+$/, '');
  const fix = (value) =>
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    value !== prefix &&
    !value.startsWith(`${prefix}/`)
      ? `${prefix}${value}`
      : null;

  return defineHastPlugin({
    name: 'base-links',
    element: {
      filter: ['a', 'img', 'video', 'source', 'audio'],
      visit(node, ctx) {
        if (!prefix) return;
        for (const key of ['href', 'src', 'poster']) {
          const fixed = fix(node.properties?.[key]);
          if (fixed) ctx.setProperty(node, key, fixed);
        }
      },
    },
  });
}
