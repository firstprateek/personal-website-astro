// Fetches recent public GitHub activity for the repos the project pages link to
// and writes src/data/activity.json. Run by .github/workflows/activity.yml on a
// schedule; the site build itself never touches the network.
//
// The file holds content only (no fetch timestamp), so it changes, and gets
// committed, only when there is new activity.
//
// usage: GITHUB_TOKEN=... node scripts/fetch-activity.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('src/data/activity.json', ROOT);
const PROJECTS = new URL('src/content/projects/', ROOT);
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is not set');

const PER_REPO = 5;
const TITLE_MAX = 100;

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'site-activity',
    },
  });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const oneLine = (s) => {
  const line = String(s ?? '').split('\n')[0].trim();
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX - 1).trimEnd()}…` : line;
};
const day = (iso) => String(iso).slice(0, 10);
const isBot = (login) => /\[bot\]$/.test(login ?? '');
// The site never shows home paths or private hostnames, even ones already public in a repo.
const PRIVATE = /~\/|\/Users\/|\/home\/|\.ts\.net\b|\btail[0-9a-f]{6}\b/i;
const safe = (e) => !PRIVATE.test(e.title);

// Repos come from the published project pages (not `_` fixtures or templates).
const repos = new Map();
for (const file of readdirSync(PROJECTS)) {
  if (!file.endsWith('.md') || file.startsWith('_')) continue;
  const front = readFileSync(new URL(file, PROJECTS), 'utf8').split('\n---')[0];
  const m = /^repo:\s*https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)\/?\s*$/m.exec(front);
  if (m) repos.set(`${m[1]}/${m[2]}`, file.replace(/\.md$/, ''));
}

const out = { repos: {} };
for (const [full, project] of [...repos].sort()) {
  const repo = await gh(`/repos/${full}`);
  // Public repos only, checked rather than assumed.
  if (repo.private || repo.visibility !== 'public') continue;

  const commits = (await gh(`/repos/${full}/commits?sha=${repo.default_branch}&per_page=20`))
    .filter((c) => !isBot(c.author?.login) && !isBot(c.committer?.login))
    .map((c) => ({ date: day(c.commit.committer.date), title: oneLine(c.commit.message), url: c.html_url }))
    .filter(safe)
    .slice(0, PER_REPO);

  const pulls = (await gh(`/repos/${full}/pulls?state=closed&sort=updated&direction=desc&per_page=30`))
    .filter((p) => p.merged_at && !isBot(p.user?.login))
    .sort((a, b) => b.merged_at.localeCompare(a.merged_at))
    .map((p) => ({ date: day(p.merged_at), number: p.number, title: oneLine(p.title), url: p.html_url }))
    .filter(safe)
    .slice(0, PER_REPO);

  const releases = (await gh(`/repos/${full}/releases?per_page=10`))
    .filter((r) => !r.draft && r.published_at)
    .map((r) => ({ date: day(r.published_at), tag: r.tag_name, title: oneLine(r.name || r.tag_name), url: r.html_url }))
    .filter(safe)
    .slice(0, 3);

  out.repos[full] = { project, name: repo.name, url: repo.html_url, commits, pulls, releases };
}

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`activity: ${Object.keys(out.repos).length} repos -> src/data/activity.json`);
