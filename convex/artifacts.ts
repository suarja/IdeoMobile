import { v } from 'convex/values';
import { internalMutation, internalQuery, query } from './_generated/server';

export const saveArtifact = internalMutation({
  args: {
    userId: v.string(),
    threadId: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
    type: v.union(v.literal('validation'), v.literal('tracking')),
    title: v.string(),
    content: v.string(),
    tldr: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('artifacts', { ...args, createdAt: Date.now() });
  },
});

export const listArtifacts = query({
  args: {
    type: v.union(v.literal('validation'), v.literal('tracking')),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, { type, projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return [];
    const userId = identity.subject;

    if (projectId) {
      // Strict per-project: only artifacts that explicitly belong to this project
      return ctx.db
        .query('artifacts')
        .withIndex('by_project_type', q => q.eq('projectId', projectId).eq('type', type))
        .order('desc')
        .take(30);
    }

    // No active project → fallback: show user-level artifacts (legacy or unscoped)
    return ctx.db
      .query('artifacts')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', type))
      .order('desc')
      .take(30);
  },
});

export const getArtifact = query({
  args: { id: v.id('artifacts') },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;
    const artifact = await ctx.db.get(id);
    if (!artifact || artifact.userId !== identity.subject)
      return null;
    return artifact;
  },
});

export const getTrackingArtifactForDate = internalQuery({
  args: { userId: v.string(), projectId: v.optional(v.id('projects')), date: v.string() },
  handler: async (ctx, { userId, projectId, date }) => {
    if (projectId) {
      return ctx.db
        .query('artifacts')
        .withIndex('by_project_date', q => q.eq('projectId', projectId).eq('date', date))
        .filter(q => q.eq(q.field('type'), 'tracking'))
        .first();
    }
    return ctx.db
      .query('artifacts')
      .withIndex('by_user_date', q => q.eq('userId', userId).eq('date', date))
      .filter(q => q.eq(q.field('type'), 'tracking'))
      .first();
  },
});

export const getRecentTldrs = internalQuery({
  args: {
    userId: v.string(),
    type: v.union(v.literal('validation'), v.literal('tracking')),
    limit: v.number(),
  },
  handler: async (ctx, { userId, type, limit }) => {
    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', type))
      .order('desc')
      .take(limit);
    return artifacts.map(a => ({ date: a.date, tldr: a.tldr }));
  },
});
