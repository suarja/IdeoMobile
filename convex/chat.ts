import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, mutation, query } from './_generated/server';
import { chatAgent } from './agents/chatAgent';

export const getOrCreateThread = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
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

    return threadId;
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
    await ctx.runMutation(internal.chat.insertMessage, {
      threadId,
      role: 'user',
      content,
    });

    const { thread } = await chatAgent.continueThread(ctx, { threadId });
    const { text } = await thread.generateText({ prompt: content });

    const responseText = text ?? '';

    await ctx.runMutation(internal.chat.insertMessage, {
      threadId,
      role: 'assistant',
      content: responseText,
    });

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
