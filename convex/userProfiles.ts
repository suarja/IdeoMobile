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

export const backfillUserProfilesAndStandupTime = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. backfill userStats standupTime
    const stats = await ctx.db.query('userStats').collect();
    for (const stat of stats) {
      if (!stat.standupTime) {
        await ctx.db.patch(stat._id, { standupTime: '09:00' });
      }

      // 2. ensure userProfile exists
      const existingProfile = await ctx.db
        .query('userProfiles')
        .withIndex('by_userId', q => q.eq('userId', stat.userId))
        .first();

      if (!existingProfile) {
        await ctx.db.insert('userProfiles', {
          userId: stat.userId,
          socialLinks: [],
          updatedAt: Date.now(),
        });
      }
    }
  },
});
