import { v } from 'convex/values';
import { internalMutation, query } from './_generated/server';

export const upsertUserMemory = internalMutation({
  args: {
    userId: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { userId, key, value }) => {
    const existing = await ctx.db
      .query('userMemory')
      .withIndex('by_userId_key', q => q.eq('userId', userId).eq('key', key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    }
    else {
      await ctx.db.insert('userMemory', { userId, key, value, updatedAt: Date.now() });
    }
  },
});

export const upsertProjectMemory = internalMutation({
  args: {
    projectId: v.id('projects'),
    userId: v.string(),
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { projectId, userId, key, value }) => {
    const existing = await ctx.db
      .query('projectMemory')
      .withIndex('by_projectId_key', q => q.eq('projectId', projectId).eq('key', key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    }
    else {
      await ctx.db.insert('projectMemory', { projectId, userId, key, value, updatedAt: Date.now() });
    }
  },
});

export const deleteMemoryFragment = internalMutation({
  args: {
    scope: v.union(v.literal('user'), v.literal('project')),
    userId: v.string(),
    key: v.string(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, { scope, userId, key, projectId }) => {
    if (scope === 'user') {
      const existing = await ctx.db
        .query('userMemory')
        .withIndex('by_userId_key', q => q.eq('userId', userId).eq('key', key))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
    else if (scope === 'project' && projectId !== undefined) {
      const existing = await ctx.db
        .query('projectMemory')
        .withIndex('by_projectId_key', q => q.eq('projectId', projectId).eq('key', key))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
  },
});

export const getUserMemory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;

    const userId = identity.subject;
    const rows = await ctx.db
      .query('userMemory')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .collect();

    return rows.map(({ key, value, updatedAt }) => ({ key, value, updatedAt }));
  },
});

export const getProjectMemory = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return [];

    const rows = await ctx.db
      .query('projectMemory')
      .withIndex('by_projectId', q => q.eq('projectId', projectId))
      .collect();

    return rows.map(({ key, value, updatedAt }) => ({ key, value, updatedAt }));
  },
});
