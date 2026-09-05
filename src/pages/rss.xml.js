import rss from '@astrojs/rss';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { SITE } from '../site.config';
import { getPosts, toPubDate } from '../lib/content';

const markdown = new MarkdownIt();

export async function GET(context) {
  const posts = await getPosts();

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: toPubDate(post.data.date),
      link: `/writing/${post.id}/`,
      // Full text. This re-parses the raw markdown, so the feed carries plain
      // <pre><code> with no Shiki highlighting — which is the right thing for
      // a reader that applies its own styles.
      content: sanitizeHtml(markdown.render(post.body ?? ''), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      }),
    })),
  });
}
