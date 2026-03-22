import { v } from 'convex/values';
import { internalQuery, mutation, query } from './_generated/server';

export const getProfileByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query('userProfiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
  },
});

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

export const setNotificationPreferences = mutation({
  args: {
    standupReminder: v.boolean(),
  },
  handler: async (ctx, { standupReminder }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    const notificationPreferences = { standupReminder };
    if (existing) {
      await ctx.db.patch(existing._id, { notificationPreferences, updatedAt: Date.now() });
    }
    else {
      await ctx.db.insert('userProfiles', { userId, socialLinks: [], notificationPreferences, updatedAt: Date.now() });
    }
  },
});

export const setPushToken = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { pushToken: token, updatedAt: Date.now() });
    }
    else {
      await ctx.db.insert('userProfiles', { userId, socialLinks: [], pushToken: token, updatedAt: Date.now() });
    }
  },
});

export const setGitHubToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { githubToken: token, updatedAt: Date.now() });
    }
    else {
      await ctx.db.insert('userProfiles', { userId, socialLinks: [], githubToken: token, updatedAt: Date.now() });
    }
  },
});

export const removeGitHubToken = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { githubToken: undefined, updatedAt: Date.now() });
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
