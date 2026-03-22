/**
 * Debug utilities — NOT exposed to agents, NOT called from the mobile client.
 * Call these via Convex Dashboard > Functions to diagnose issues.
 */

import { v } from 'convex/values';

import { internalAction } from './_generated/server';
import { firecrawlScrape } from './tools/scrape/firecrawl';
import { githubFetch } from './tools/scrape/github';
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
