type GitHubRepo = {
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
};

type GitHubCommit = {
  commit: {
    message: string;
    author: { date: string };
  };
};

export async function githubFetch(repoUrl: string, token?: string): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!match)
    return `[Cannot parse GitHub URL: ${repoUrl}]`;
  const [, owner, repo] = match;

  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token)
    headers.Authorization = `Bearer ${token}`;

  const [repoRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, { headers }),
  ]);

  if (repoRes.status === 404) {
    return token
      ? `[Repo ${owner}/${repo} not found or token lacks access]`
      : `[Repo ${owner}/${repo} is private — configure your GitHub token in Settings]`;
  }
  if (!repoRes.ok)
    return `[GitHub API error ${repoRes.status} for ${owner}/${repo}]`;

  const r = await repoRes.json() as GitHubRepo;
  const commits = commitsRes.ok ? await commitsRes.json() as GitHubCommit[] : [];

  return [
    `**${owner}/${repo}** — ${r.description ?? 'no description'}`,
    `Stars: ${r.stargazers_count} | Forks: ${r.forks_count} | Open issues: ${r.open_issues_count}`,
    `Last push: ${r.pushed_at}`,
    commits.length > 0
      ? `Recent commits:\n${commits.slice(0, 5).map(c => `- ${c.commit.message.split('\n')[0]} (${c.commit.author.date})`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');
}
