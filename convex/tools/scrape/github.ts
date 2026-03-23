// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type RepoStats = {
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  pushedAt: string;
};

export type BranchActivity = { branch: string; date: string };

export type CommitSummary = { sha: string; message: string };

export type OpenPR = { number: number; title: string; branch: string; url: string };

// ---------------------------------------------------------------------------
// Internal GitHub API types
// ---------------------------------------------------------------------------

type GitHubRepo = {
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  default_branch: string;
};

type GitHubPushEvent = {
  type: string;
  created_at: string;
  payload: {
    ref: string; // "refs/heads/feat/web-search"
    commits: Array<{ message: string; sha: string }>;
  };
};

type GitHubCommit = {
  commit: { message: string };
  sha: string;
};

type GitHubPR = {
  number: number;
  title: string;
  head: { ref: string };
  html_url: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBranchName(ref: string) {
  return ref.replace('refs/heads/', '');
}

function formatDate(iso: string) {
  return `${iso.replace('T', ' ').replace('Z', ' UTC').slice(0, 19)} UTC`;
}

function makeHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token)
    headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Parse owner/repo from a GitHub URL.
 * Returns null if the URL doesn't match the expected pattern.
 */
export function parseOwnerRepo(url: string): [string, string] | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!match)
    return null;
  return [match[1], match[2]];
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Fetch basic repo metadata (description, stars, forks, open issues, default branch).
 * Returns null on 404 or API error.
 */
export async function getRepoStats(owner: string, repo: string, token?: string): Promise<RepoStats | null> {
  const headers = makeHeaders(token);
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!res.ok)
    return null;
  const r = await res.json() as GitHubRepo;
  return {
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    defaultBranch: r.default_branch,
    pushedAt: formatDate(r.pushed_at),
  };
}

/**
 * Get recently active branches from the Events API (last 30 events → top 5 unique PushEvent branches).
 */
export async function getActiveBranches(owner: string, repo: string, token?: string): Promise<BranchActivity[]> {
  const headers = makeHeaders(token);
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/events?per_page=30`, { headers });
  if (!res.ok)
    return [];
  const events = await res.json() as GitHubPushEvent[];
  const pushEvents = events.filter(e => e.type === 'PushEvent' && e.payload.ref).slice(0, 10);

  const seen = new Set<string>();
  const result: BranchActivity[] = [];
  for (const ev of pushEvents) {
    const branch = parseBranchName(ev.payload.ref);
    if (!seen.has(branch)) {
      seen.add(branch);
      result.push({ branch, date: formatDate(ev.created_at) });
    }
  }
  return result.slice(0, 5);
}

type GetCommitsByBranchOptions = {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
  limit?: number;
};

/**
 * Get recent commits for a specific branch.
 */
export async function getCommitsByBranch({ owner, repo, branch, token, limit = 3 }: GetCommitsByBranchOptions): Promise<CommitSummary[]> {
  const headers = makeHeaders(token);
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`,
    { headers },
  );
  if (!res.ok)
    return [];
  const data = await res.json() as GitHubCommit[];
  return data.map(c => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0],
  }));
}

/**
 * Get open pull requests for a repo (up to 10).
 */
export async function getOpenPRs(owner: string, repo: string, token?: string): Promise<OpenPR[]> {
  const headers = makeHeaders(token);
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=10`,
    { headers },
  );
  if (!res.ok)
    return [];
  const data = await res.json() as GitHubPR[];
  return data.map(pr => ({
    number: pr.number,
    title: pr.title,
    branch: pr.head.ref,
    url: pr.html_url,
  }));
}

// ---------------------------------------------------------------------------
// Composite fetch (used by scrapeUrl dispatcher — same output as before)
// ---------------------------------------------------------------------------

export async function githubFetch(repoUrl: string, token?: string): Promise<string> {
  const parsed = parseOwnerRepo(repoUrl);
  if (!parsed)
    return `[Cannot parse GitHub URL: ${repoUrl}]`;
  const [owner, repo] = parsed;

  const [stats, activeBranches] = await Promise.all([
    getRepoStats(owner, repo, token),
    getActiveBranches(owner, repo, token),
  ]);

  if (!stats) {
    return token
      ? `[Repo ${owner}/${repo} not found or token lacks access]`
      : `[Repo ${owner}/${repo} is private — configure your GitHub token in Settings]`;
  }

  // Fetch actual commits for the top 3 most active branches
  const topBranches = activeBranches.slice(0, 3);
  const branchCommits = await Promise.all(
    topBranches.map(async ({ branch, date }) => {
      const commits = await getCommitsByBranch({ owner, repo, branch, token, limit: 3 });
      return { branch, date, commits: commits.map(c => c.message) };
    }),
  );

  const lines: string[] = [
    `**${owner}/${repo}** — ${stats.description ?? 'no description'}`,
    `Stars: ${stats.stars} | Forks: ${stats.forks} | Open issues: ${stats.openIssues}`,
    `Last push (any branch): ${stats.pushedAt}`,
    `Default branch: ${stats.defaultBranch}`,
  ];

  if (branchCommits.length > 0) {
    lines.push('');
    lines.push('Recently active branches:');
    for (const b of branchCommits) {
      lines.push(`- **${b.branch}** (${b.date})`);
      for (const msg of b.commits)
        lines.push(`  · ${msg}`);
    }
  }

  return lines.join('\n');
}
