import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';
import { generalAgent } from './agents/chatAgent';

export const createProjectAndThread = internalMutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ projectId: Id<'projects'>; threadId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthenticated');
    }
    const userId = identity.subject;

    const { threadId } = await generalAgent.createThread(ctx, {});

    // Deactivate all existing projects for this user
    const existingProjects = await ctx.db
      .query('projects')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .collect();
    for (const project of existingProjects) {
      await ctx.db.patch(project._id, { isActive: false });
    }

    // Keep threads table in sync for backwards compat (gamification functions look up userId by threadId)
    await ctx.db.insert('threads', {
      userId,
      threadId,
      createdAt: Date.now(),
    });

    const projectId = await ctx.db.insert('projects', {
      userId,
      threadId,
      isActive: true,
      status: 'active',
      createdAt: Date.now(),
      ...(args.name ? { name: args.name } : {}),
    });

    await ctx.runMutation(internal.gamification.initProjectScores, { threadId, userId });

    return { projectId, threadId };
  },
});

export const createProject = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ projectId: Id<'projects'>; threadId: string }> => {
    return ctx.runMutation(internal.projects.createProjectAndThread, { name: args.name });
  },
});

export const getActiveProject = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const project = await ctx.db
      .query('projects')
      .withIndex('by_userId_active', q => q.eq('userId', userId).eq('isActive', true))
      .first();

    if (!project) {
      return null;
    }

    return {
      projectId: project._id,
      threadId: project.threadId,
      name: project.name ?? null,
    };
  },
});

export const setActiveProject = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthenticated');
    }
    const userId = identity.subject;

    // Verify the target project belongs to this user
    const targetProject = await ctx.db.get(projectId);
    if (!targetProject || targetProject.userId !== userId) {
      throw new Error('Forbidden');
    }

    // Deactivate all projects for this user
    const allProjects = await ctx.db
      .query('projects')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .collect();
    for (const project of allProjects) {
      await ctx.db.patch(project._id, { isActive: false });
    }

    // Activate the target project
    await ctx.db.patch(projectId, { isActive: true });

    const target = await ctx.db.get(projectId);
    return { threadId: target!.threadId };
  },
});

export const listProjects = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .collect();

    return projects
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(p => ({
        projectId: p._id,
        threadId: p.threadId,
        name: p.name ?? null,
        status: p.status,
        isActive: p.isActive,
        isTracked: p.isTracked ?? false,
        createdAt: p.createdAt,
        projectLinks: p.projectLinks ?? null,
      }));
  },
});

export const listActiveProjects = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('projects')
      .filter(q => q.eq(q.field('isActive'), true))
      .collect();
  },
});

export const listTrackedProjects = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('projects')
      .filter(q => q.eq(q.field('isTracked'), true))
      .collect();
  },
});

export const setIsTracked = mutation({
  args: { projectId: v.id('projects'), isTracked: v.boolean() },
  handler: async (ctx, { projectId, isTracked }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId)
      throw new Error('Forbidden');
    await ctx.db.patch(projectId, { isTracked });
  },
});

export const setTrackingThreadId = internalMutation({
  args: { projectId: v.id('projects'), trackingThreadId: v.string() },
  handler: async (ctx, { projectId, trackingThreadId }) => {
    await ctx.db.patch(projectId, { trackingThreadId });
  },
});

export const updateProjectLinks = mutation({
  args: {
    projectId: v.id('projects'),
    projectLinks: v.object({
      github: v.optional(v.string()),
      website: v.optional(v.string()),
      tiktok: v.optional(v.string()),
      instagram: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { projectId, projectLinks }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId)
      throw new Error('Forbidden');
    await ctx.db.patch(projectId, { projectLinks });
  },
});

export const updateProjectNameInternal = internalMutation({
  args: { projectId: v.id('projects'), name: v.string() },
  handler: async (ctx, { projectId, name }) => {
    await ctx.db.patch(projectId, { name });
  },
});

export const updateProjectName = mutation({
  args: { projectId: v.id('projects'), name: v.string() },
  handler: async (ctx, { projectId, name }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId)
      throw new Error('Forbidden');
    await ctx.db.patch(projectId, { name });
  },
});

// ---------------------------------------------------------------------------
// Validation search quota (per-project: max 1, monthly: max 4)
// ---------------------------------------------------------------------------

export const getValidationSearchQuota = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();

    const projectCount = project?.validationSearchCount ?? 0;

    let monthlyCount = 0;
    if (project) {
      const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      const userStats = await ctx.db
        .query('userStats')
        .withIndex('by_userId', q => q.eq('userId', project.userId))
        .first();
      // If searchMonthStart matches current month, use the tracked count; otherwise treat as 0
      if (userStats?.searchMonthStart === currentMonth) {
        monthlyCount = userStats.monthlySearchCount ?? 0;
      }
    }

    return { projectCount, monthlyCount };
  },
});

export const incrementValidationSearchCount = internalMutation({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();
    if (!project)
      return;
    // Cumulative counter — never reset, no blocking
    const current = project.validationSearchCount ?? 0;
    await ctx.db.patch(project._id, { validationSearchCount: current + 1 });
  },
});

export const insertWebSearchLog = internalMutation({
  args: {
    threadId: v.string(),
    specialist: v.string(),
    query: v.string(),
    resultCount: v.number(),
  },
  handler: async (ctx, { threadId, specialist, query, resultCount }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();
    if (!project)
      return;
    await ctx.db.insert('webSearchLogs', {
      userId: project.userId,
      threadId,
      specialist,
      query,
      resultCount,
      createdAt: Date.now(),
    });
  },
});
