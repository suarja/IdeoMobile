/**
 * Debug utilities — NOT exposed to agents, NOT called from the mobile client.
 * Call these via Convex Dashboard > Functions to diagnose issues.
 */

import { v } from 'convex/values';

import { internalAction } from './_generated/server';
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
