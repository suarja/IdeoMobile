import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';
import { chatAgent } from './agents/chatAgent';

export const createProjectAndThread = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ projectId: Id<'projects'>; threadId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthenticated');
    }
    const userId = identity.subject;

    const { threadId } = await chatAgent.createThread(ctx, {});

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
    });

    await ctx.runMutation(internal.gamification.initProjectScores, { threadId, userId });

    return { projectId, threadId };
  },
});

export const createProject = mutation({
  args: {},
  handler: async (ctx): Promise<{ projectId: Id<'projects'>; threadId: string }> => {
    return ctx.runMutation(internal.projects.createProjectAndThread, {});
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
        createdAt: p.createdAt,
      }));
  },
});

export const updateProjectName = internalMutation({
  args: { projectId: v.id('projects'), name: v.string() },
  handler: async (ctx, { projectId, name }) => {
    await ctx.db.patch(projectId, { name });
  },
});
