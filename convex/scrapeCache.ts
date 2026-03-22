import { v } from 'convex/values';

import { internalMutation, internalQuery } from './_generated/server';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export const getCached = internalQuery({
  args: { userId: v.string(), url: v.string() },
  handler: async (ctx, { userId, url }) => {
    const entry = await ctx.db
      .query('scrapeCache')
      .withIndex('by_userId_url', q => q.eq('userId', userId).eq('url', url))
      .first();
    if (!entry)
      return null;
    if (Date.now() - entry.scrapedAt > CACHE_TTL_MS)
      return null; // stale
    return entry.content;
  },
});

export const setCached = internalMutation({
  args: { userId: v.string(), url: v.string(), content: v.string() },
  handler: async (ctx, { userId, url, content }) => {
    const existing = await ctx.db
      .query('scrapeCache')
      .withIndex('by_userId_url', q => q.eq('userId', userId).eq('url', url))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { content, scrapedAt: Date.now() });
    }
    else {
      await ctx.db.insert('scrapeCache', { userId, url, content, scrapedAt: Date.now() });
    }
  },
});
