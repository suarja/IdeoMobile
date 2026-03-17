import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;
    const userId = identity.subject;
    return await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
  },
});

export const upsertUserProfile = mutation({
  args: {
    socialLinks: v.array(
      v.object({
        platform: v.union(
          v.literal('github'),
          v.literal('instagram'),
          v.literal('tiktok'),
          v.literal('website'),
        ),
        url: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        socialLinks: args.socialLinks,
        updatedAt: Date.now(),
      });
    }
    else {
      await ctx.db.insert('userProfiles', {
        userId,
        socialLinks: args.socialLinks,
        updatedAt: Date.now(),
      });
    }
  },
});
