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
  ref: string; // "refs/heads/feat/web-search"
  payload: {
    commits: Array<{ message: string; sha: string }>;
  };
};

function parseBranchName(ref: string) {
  return ref.replace('refs/heads/', '');
}

function formatDate(iso: string) {
  return `${iso.replace('T', ' ').replace('Z', ' UTC').slice(0, 19)} UTC`;
}

export async function githubFetch(repoUrl: string, token?: string): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!match)
    return `[Cannot parse GitHub URL: ${repoUrl}]`;
  const [, owner, repo] = match;

  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token)
    headers.Authorization = `Bearer ${token}`;

  const [repoRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/events?per_page=30`, { headers }),
  ]);

  if (repoRes.status === 404) {
    return token
      ? `[Repo ${owner}/${repo} not found or token lacks access]`
      : `[Repo ${owner}/${repo} is private — configure your GitHub token in Settings]`;
  }
  if (!repoRes.ok)
    return `[GitHub API error ${repoRes.status} for ${owner}/${repo}]`;

  const r = await repoRes.json() as GitHubRepo;

  // Extract recent push activity across all branches
  const events = eventsRes.ok ? await eventsRes.json() as GitHubPushEvent[] : [];
  const pushEvents = events.filter(e => e.type === 'PushEvent').slice(0, 10);

  // Build a deduplicated list of recently active branches (most recent first)
  const seenBranches = new Set<string>();
  const activeBranches: Array<{ branch: string; date: string; commits: string[] }> = [];
  for (const ev of pushEvents) {
    const branch = parseBranchName(ev.ref);
    if (!seenBranches.has(branch)) {
      seenBranches.add(branch);
      activeBranches.push({
        branch,
        date: formatDate(ev.created_at),
        commits: ev.payload.commits.slice(0, 3).map(c => c.message.split('\n')[0]),
      });
    }
  }

  const lines: string[] = [
    `**${owner}/${repo}** — ${r.description ?? 'no description'}`,
    `Stars: ${r.stargazers_count} | Forks: ${r.forks_count} | Open issues: ${r.open_issues_count}`,
    `Last push (any branch): ${formatDate(r.pushed_at)}`,
    `Default branch: ${r.default_branch}`,
  ];

  if (activeBranches.length > 0) {
    lines.push('');
    lines.push('Recently active branches:');
    for (const b of activeBranches.slice(0, 3)) {
      lines.push(`- **${b.branch}** (${b.date})`);
      for (const msg of b.commits)
        lines.push(`  · ${msg}`);
    }
  }

  return lines.join('\n');
}
