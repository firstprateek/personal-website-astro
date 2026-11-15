/**
 * Recent GitHub activity, read from src/data/activity.json at build time. The
 * file is refreshed by .github/workflows/activity.yml; the build never fetches.
 * Dates are shown as calendar dates, never "2 days ago", so a page built today
 * and served next week is still true.
 */
import data from '../data/activity.json';

export interface Item {
  date: string;
  title: string;
  url: string;
}
interface Repo {
  project: string;
  name: string;
  url: string;
  commits: Item[];
  pulls: (Item & { number: number })[];
  releases: (Item & { tag: string })[];
}

const repos = Object.values((data as { repos: Record<string, Repo> }).repos ?? {});

/** Squash-merge commits end in " (#123)"; the PR number adds nothing on the page. */
const tidy = (title: string) => title.replace(/\s*\(#\d+\)$/, '');

export interface FeedItem extends Item {
  repo: string;
  project: string;
  kind: 'release' | 'pull' | 'commit';
  label: string;
}

/**
 * The home page's "Recently": merged PRs and releases, or commits for a repo
 * that works straight on main. At most `perRepo` from any one repo, so one busy
 * project cannot crowd out the rest.
 */
export function recentActivity(limit = 5, perRepo = 2): FeedItem[] {
  const all = repos.flatMap((r) => {
    const items: FeedItem[] = [
      ...r.releases.map((x) => ({ ...x, kind: 'release' as const, label: `Released ${x.tag}` })),
      ...(r.pulls.length
        ? r.pulls.map((x) => ({ ...x, kind: 'pull' as const, label: `Merged #${x.number}` }))
        : r.commits.map((x) => ({ ...x, kind: 'commit' as const, label: 'Committed' }))),
    ].map((x) => ({ ...x, title: tidy(x.title), repo: r.name, project: r.project }));
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, perRepo);
  });
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export interface ProjectActivity {
  lastCommit?: Item;
  release?: Item & { tag: string };
  repoUrl: string;
}

/** One line for a project page: its last commit and latest release. */
export function projectActivity(projectId: string): ProjectActivity | undefined {
  const r = repos.find((x) => x.project === projectId);
  if (!r) return undefined;
  return { lastCommit: r.commits[0], release: r.releases[0], repoUrl: r.url };
}
