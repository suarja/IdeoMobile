import { anthropic } from '@ai-sdk/anthropic';
import { generateText, tool } from 'ai';
import { v } from 'convex/values';
import { z } from 'zod';
import { internal } from './_generated/api';
import { action, internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { chatAgent } from './agents/chatAgent';

export const getOrCreateThread = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthenticated');
    }
    const userId = identity.subject;

    const existing = await ctx.db
      .query('threads')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();

    if (existing) {
      return existing.threadId;
    }

    const { threadId } = await chatAgent.createThread(ctx, {});
    await ctx.db.insert('threads', {
      userId,
      threadId,
      createdAt: Date.now(),
    });
    await ctx.runMutation(internal.gamification.initProjectScores, { threadId, userId });

    return threadId;
  },
});

export const getActiveThread = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;
    const userId = identity.subject;

    const thread = await ctx.db
      .query('threads')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();

    if (!thread)
      return null;
    return { threadId: thread.threadId, title: thread.title ?? null };
  },
});

export const insertMessage = internalMutation({
  args: {
    threadId: v.string(),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
  },
  handler: async (ctx, { threadId, role, content }) => {
    await ctx.db.insert('messages', {
      threadId,
      role,
      content,
      createdAt: Date.now(),
    });
  },
});

export const sendMessage = action({
  args: {
    threadId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { threadId, content }) => {
    const messageCount = await ctx.runQuery(internal.chat.countMessages, { threadId });

    await ctx.runMutation(internal.chat.insertMessage, {
      threadId,
      role: 'user',
      content,
    });

    const { thread } = await chatAgent.continueThread(ctx, { threadId });

    const { text } = await thread.generateText({
      prompt: content,
      tools: {
        updateProjectScores: tool({
          description:
            'Update the radar progress scores for the current project. Scores are 0-100 per dimension.',
          inputSchema: z.object({
            validation: z.number().min(0).max(100).optional(),
            design: z.number().min(0).max(100).optional(),
            development: z.number().min(0).max(100).optional(),
            distribution: z.number().min(0).max(100).optional(),
          }),
          execute: async (scores) => {
            await ctx.runMutation(internal.gamification.updateProjectScores, {
              threadId,
              scores,
            });
            return 'Project scores updated.';
          },
        }),
        addGoal: tool({
          description: 'Create a goal for the current project on behalf of the agent.',
          inputSchema: z.object({
            title: z.string(),
            points: z.number().min(50).max(500),
            dimension: z
              .enum(['validation', 'design', 'development', 'distribution'])
              .optional(),
          }),
          execute: async ({ title, points, dimension }) => {
            await ctx.runMutation(internal.gamification.addGoalInternal, {
              threadId,
              title,
              points,
              dimension,
            });
            return `Goal "${title}" created.`;
          },
        }),
      },
    });

    const responseText = text ?? '';

    await ctx.runMutation(internal.chat.insertMessage, {
      threadId,
      role: 'assistant',
      content: responseText,
    });

    // Award session points (silently skips if unauthenticated)
    await ctx.runMutation(internal.gamification.addSessionPoints, { threadId });

    // Generate thread title from the first user message
    if (messageCount === 0) {
      await ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, { threadId, content });
    }

    return responseText;
  },
});

export const listMessages = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return ctx.db
      .query('messages')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .order('asc')
      .take(50);
  },
});

export const listMessagesInternal = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return ctx.db
      .query('messages')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .order('asc')
      .take(50);
  },
});

export const countMessages = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const msgs = await ctx.db
      .query('messages')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .take(1);
    return msgs.length;
  },
});

export const updateThreadTitle = internalMutation({
  args: { threadId: v.string(), title: v.string() },
  handler: async (ctx, { threadId, title }) => {
    const thread = await ctx.db
      .query('threads')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();
    if (thread)
      await ctx.db.patch(thread._id, { title });
  },
});

export const generateThreadTitle = internalAction({
  args: { threadId: v.string(), content: v.string() },
  handler: async (ctx, { threadId, content }) => {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt: `Give a concise 3-5 word project name for a project where someone says: "${content.slice(0, 300)}". Reply with ONLY the project name, no punctuation.`,
    });
    const title = text.trim().slice(0, 60);
    await ctx.runMutation(internal.chat.updateThreadTitle, { threadId, title });
  },
});
