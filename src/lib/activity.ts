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
