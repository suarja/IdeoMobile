/**
 * Debug utilities — NOT exposed to agents, NOT called from the mobile client.
 * Call these via Convex Dashboard > Functions to diagnose issues.
 */

import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';
import { firecrawlScrape } from './tools/scrape/firecrawl';
import {
  getActiveBranches,
  getCommitsByBranch,
  getOpenPRs,
  getRepoStats,
  githubFetch,
} from './tools/scrape/github';
import { scrapeUrl } from './tools/scrape/index';
import { webSearch } from './tools/webSearch/index';

/**
 * Test the web search provider directly.
 *
 * Usage — Convex Dashboard > Functions > debug:testWebSearch
 *   args: { "query": "github.com/suarja/IdeoMobile" }
 *
 * Returns the raw results array (or the error message if it throws).
 */
export const testWebSearch = internalAction({
  args: {
    query: v.string(),
  },
  handler: async (_ctx, { query }) => {
    const provider = process.env.WEB_SEARCH_PROVIDER ?? 'tavily';
    let results: unknown;
    let error: string | null = null;

    try {
      results = await webSearch(query);
    }
    catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    return {
      provider,
      query,
      results: results ?? null,
      error,
      resultCount: Array.isArray(results) ? results.length : 0,
    };
  },
});

/**
 * Test the scrapeUrl dispatcher.
 *
 * Usage — Convex Dashboard > Functions > debug:testScrapeUrl
 *   args: { "url": "https://github.com/owner/repo" }
 */
export const testScrapeUrl = internalAction({
  args: {
    url: v.string(),
    githubToken: v.optional(v.string()),
  },
  handler: async (_ctx, { url, githubToken }) => {
    const content = await scrapeUrl(url, githubToken);
    return { url, contentLength: content.length, preview: content.slice(0, 500) };
  },
});

/**
 * Test Firecrawl scraping directly.
 *
 * Usage — Convex Dashboard > Functions > debug:testFirecrawl
 *   args: { "url": "https://www.tiktok.com/@username" }
 */
export const testFirecrawl = internalAction({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, { url }) => {
    const content = await firecrawlScrape(url);
    return { url, contentLength: content.length, preview: content.slice(0, 500) };
  },
});

/**
 * Test GitHub API fetch directly.
 *
 * Usage — Convex Dashboard > Functions > debug:testGitHub
 *   args: { "url": "https://github.com/owner/repo", "token": "ghp_..." }
 */
export const testGitHub = internalAction({
  args: {
    url: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (_ctx, { url, token }) => {
    const content = await githubFetch(url, token);
    return { url, content };
  },
});

/**
 * Inspect raw GitHub Events API (PushEvents) for a repo.
 * Useful for verifying branch names, dates, and commit messages before the
 * tracking agent processes them.
 *
 * Usage — Convex Dashboard > Functions > debug:testGitHubEvents
 *   args: { "url": "https://github.com/owner/repo", "token": "ghp_..." }
 */
export const testGitHubEvents = internalAction({
  args: {
    url: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (_ctx, { url, token }) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!match)
      return { error: `Cannot parse GitHub URL: ${url}`, events: [] };
    const [, owner, repo] = match;

    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (token)
      headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/events?per_page=30`, { headers });
    if (!res.ok)
      return { error: `GitHub API error ${res.status}`, events: [] };

    type RawEvent = {
      type: string;
      created_at: string;
      payload: { ref: string; commits: Array<{ message: string; sha: string }> };
    };

    const events = await res.json() as RawEvent[];
    const pushEvents = events
      .filter((e: RawEvent) => e.type === 'PushEvent' && e.payload.ref)
      .slice(0, 10)
      .map((e: RawEvent) => ({
        branch: e.payload.ref.replace('refs/heads/', ''),
        created_at: e.created_at,
        commits: (e.payload.commits ?? []).slice(0, 3).map(c => ({
          sha: c.sha.slice(0, 7),
          message: c.message.split('\n')[0],
        })),
      }));

    return { owner, repo, pushEventCount: pushEvents.length, events: pushEvents };
  },
});

/**
 * Test getRepoStats primitive directly.
 *
 * Usage — Convex Dashboard > Functions > debug:testGetRepoStats
 *   args: { "owner": "suarja", "repo": "IdeoMobile" }
 */
export const testGetRepoStats = internalAction({
  args: {
    owner: v.string(),
    repo: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (_ctx, { owner, repo, token }) => {
    let stats = null;
    let error: string | null = null;
    try {
      stats = await getRepoStats(owner, repo, token);
    }
    catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    return { owner, repo, stats, error };
  },
});

/**
 * Test getActiveBranches primitive directly.
 *
 * Usage — Convex Dashboard > Functions > debug:testGetActiveBranches
 *   args: { "owner": "suarja", "repo": "IdeoMobile" }
 */
export const testGetActiveBranches = internalAction({
  args: {
    owner: v.string(),
    repo: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (_ctx, { owner, repo, token }) => {
    let branches: Awaited<ReturnType<typeof getActiveBranches>> = [];
    let error: string | null = null;
    try {
      branches = await getActiveBranches(owner, repo, token);
    }
    catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    return { owner, repo, branchCount: branches.length, branches, error };
  },
});

/**
 * Test getCommitsByBranch primitive directly.
 *
 * Usage — Convex Dashboard > Functions > debug:testGetCommitsByBranch
 *   args: { "owner": "suarja", "repo": "IdeoMobile", "branch": "main", "limit": 5 }
 */
export const testGetCommitsByBranch = internalAction({
  args: {
    owner: v.string(),
    repo: v.string(),
    branch: v.string(),
    token: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, { owner, repo, branch, token, limit }) => {
    let commits: Awaited<ReturnType<typeof getCommitsByBranch>> = [];
    let error: string | null = null;
    try {
      commits = await getCommitsByBranch({ owner, repo, branch, token, limit });
    }
    catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    return { owner, repo, branch, commitCount: commits.length, commits, error };
  },
});

/**
 * Test getOpenPRs primitive directly.
 *
 * Usage — Convex Dashboard > Functions > debug:testGetOpenPRs
 *   args: { "owner": "suarja", "repo": "IdeoMobile" }
 */
export const testGetOpenPRs = internalAction({
  args: {
    owner: v.string(),
    repo: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (_ctx, { owner, repo, token }) => {
    let prs: Awaited<ReturnType<typeof getOpenPRs>> = [];
    let error: string | null = null;
    try {
      prs = await getOpenPRs(owner, repo, token);
    }
    catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    return { owner, repo, prCount: prs.length, prs, error };
  },
});

/**
 * List all active projects and whether they would be processed by the tracking cron.
 * A project is eligible if it has both a GitHub URL and a GitHub token configured.
 *
 * Usage — Convex Dashboard > Functions > debug:testTrackingConditions
 *   args: {}
 */
export const testTrackingConditions = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    totalActiveProjects: number;
    wouldRun: number;
    wouldSkip: number;
    projects: Array<{
      projectId: string;
      name: string;
      githubUrl: string | null;
      hasGithubUrl: boolean;
      hasToken: boolean;
      wouldRun: boolean;
      skipReason: string | null;
    }>;
  }> => {
    const activeProjects = await ctx.runQuery(internal.projects.listActiveProjects, {});

    const results = await Promise.all(
      (activeProjects as Array<{
        _id: string;
        userId: string;
        name?: string;
        projectLinks?: { github?: string };
      }>).map(async (project) => {
        const profile = await ctx.runQuery(internal.userProfiles.getProfileByUserId, {
          userId: project.userId,
        }) as { githubToken?: string } | null;
        const hasGithubUrl = !!project.projectLinks?.github;
        const hasToken = !!profile?.githubToken;
        return {
          projectId: project._id,
          name: project.name ?? 'unnamed',
          githubUrl: project.projectLinks?.github ?? null,
          hasGithubUrl,
          hasToken,
          wouldRun: hasGithubUrl && hasToken,
          skipReason: !hasGithubUrl ? 'no GitHub URL' : !hasToken ? 'no GitHub token' : null,
        };
      }),
    );

    return {
      totalActiveProjects: results.length,
      wouldRun: results.filter(r => r.wouldRun).length,
      wouldSkip: results.filter(r => !r.wouldRun).length,
      projects: results,
    };
  },
});
