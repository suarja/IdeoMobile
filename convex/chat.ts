import type { Id } from './_generated/dataModel';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, tool } from 'ai';
import { v } from 'convex/values';
import { z } from 'zod';
import { internal } from './_generated/api';
import { action, internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { chatAgent } from './agents/chatAgent';

export const getOrCreateThread = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;

    // Return existing active project if one exists (preserves "get or create" semantics)
    const activeProject = await ctx.db
      .query('projects')
      .withIndex('by_userId_active', q => q.eq('userId', userId).eq('isActive', true))
      .first();
    if (activeProject)
      return activeProject.threadId;

    // No active project → create one
    const result = await ctx.runMutation(internal.projects.createProjectAndThread, {});
    return result.threadId;
  },
});

export const getActiveThread = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;
    const userId = identity.subject;

    const project = await ctx.db
      .query('projects')
      .withIndex('by_userId_active', q => q.eq('userId', userId).eq('isActive', true))
      .first();

    if (!project)
      return null;
    return { threadId: project.threadId, title: project.name ?? null };
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

// ---- Memory & prompt helpers ----

type MemEntry = { key: string; value: string };

type MemData = {
  userMem: MemEntry[];
  projectMem: MemEntry[];
  projectId?: Id<'projects'>;
  userId?: string;
};

function buildFullPrompt(content: string, memData: MemData, lastMsgCreatedAt: number | null): string {
  let sessionGapNote = '';
  if (lastMsgCreatedAt !== null) {
    const gapHours = (Date.now() - lastMsgCreatedAt) / (1000 * 60 * 60);
    if (gapHours > 12) {
      sessionGapNote = `[SYSTEM: Last interaction was ${Math.round(gapHours)} hours ago. If this feels like a new work session, call recordVoiceSession at the end.]`;
    }
  }
  const memLines: string[] = [];
  if (memData.userMem.length > 0) {
    memLines.push('## User Profile Memory');
    for (const m of memData.userMem) memLines.push(`- ${m.key}: ${m.value}`);
  }
  if (memData.projectMem.length > 0) {
    memLines.push('## Project Memory');
    for (const m of memData.projectMem) memLines.push(`- ${m.key}: ${m.value}`);
  }
  const memCtx = memLines.length > 0 ? `\n\n${memLines.join('\n')}` : '';
  return sessionGapNote ? `${sessionGapNote}\n\n${content}${memCtx}` : `${content}${memCtx}`;
}

type RunMutationFn = (ref: any, args: any) => Promise<any>;

function buildAgentTools(runMutation: RunMutationFn, threadId: string, memData: MemData) {
  const pid = memData?.projectId;
  const uid = memData?.userId ?? '';
  return {
    updateProjectScores: tool({
      description: 'Update the radar progress scores for the current project. Scores are 0-100 per dimension.',
      inputSchema: z.object({
        validation: z.number().min(0).max(100).optional(),
        design: z.number().min(0).max(100).optional(),
        development: z.number().min(0).max(100).optional(),
        distribution: z.number().min(0).max(100).optional(),
      }),
      execute: async (scores) => {
        await runMutation(internal.gamification.updateProjectScores, { threadId, scores });
        return 'Project scores updated.';
      },
    }),
    addGoal: tool({
      description: 'Create a goal for the current project on behalf of the agent.',
      inputSchema: z.object({
        title: z.string(),
        points: z.number().min(50).max(500),
        dimension: z.enum(['validation', 'design', 'development', 'distribution']).optional(),
      }),
      execute: async ({ title, points, dimension }) => {
        await runMutation(internal.gamification.addGoalInternal, { threadId, title, points, dimension });
        return `Goal "${title}" created.`;
      },
    }),
    saveUserMemory: tool({
      description: 'Save an insight about the user (work style, motivations, blockers, patterns). Call proactively when relevant info emerges.',
      inputSchema: z.object({
        key: z.string().describe('Short snake_case label e.g. workStyle, mainBlocker'),
        value: z.string().max(150).describe('Concise value under 150 chars'),
      }),
      execute: async ({ key, value }) => {
        if (!uid)
          return 'No user context.';
        await runMutation(internal.memory.upsertUserMemory, { userId: uid, key, value });
        return 'Saved.';
      },
    }),
    saveProjectMemory: tool({
      description: 'Save an insight about the active project (phase, stack, blocker, next step). Call proactively without being asked.',
      inputSchema: z.object({
        key: z.string().describe('Short snake_case label e.g. currentPhase, techStack'),
        value: z.string().max(150).describe('Concise value under 150 chars'),
      }),
      execute: async ({ key, value }) => {
        if (!pid || !uid)
          return 'No project context.';
        await runMutation(internal.memory.upsertProjectMemory, { projectId: pid, userId: uid, key, value });
        return 'Saved.';
      },
    }),
    deleteMemory: tool({
      description: 'Delete an incorrect memory fragment.',
      inputSchema: z.object({ scope: z.enum(['user', 'project']), key: z.string() }),
      execute: async ({ scope, key }) => {
        await runMutation(internal.memory.deleteMemoryFragment, {
          scope,
          userId: uid,
          key,
          ...(pid ? { projectId: pid } : {}),
        });
        return 'Deleted.';
      },
    }),
    recordVoiceSession: tool({
      description: 'Record the end of a voice work session. Call when the gap since last message is >12h, when user signals end of session, or when a clear goal was reached.',
      inputSchema: z.object({
        summary: z.string().describe('1-2 sentence summary of what was accomplished'),
      }),
      execute: async ({ summary }) => {
        await runMutation(internal.gamification.addSessionPoints, { threadId });
        if (pid && uid) {
          await runMutation(internal.memory.upsertProjectMemory, {
            projectId: pid,
            userId: uid,
            key: 'lastSessionSummary',
            value: summary,
          });
        }
        return 'Session recorded.';
      },
    }),
  };
}

// ---- sendMessage ----

export const sendMessage = action({
  args: {
    threadId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { threadId, content }): Promise<string> => {
    const messageCount = await ctx.runQuery(internal.chat.countMessages, { threadId });
    await ctx.runMutation(internal.chat.insertMessage, { threadId, role: 'user', content });

    const [memData, lastMessages] = await Promise.all([
      ctx.runQuery(internal.chat.getMemoryForThread, { threadId }),
      ctx.runQuery(internal.chat.listMessagesInternal, { threadId }),
    ]);

    const lastMsgCreatedAt = lastMessages.length > 0 ? lastMessages[lastMessages.length - 1].createdAt : null;
    const fullPrompt = buildFullPrompt(content, memData, lastMsgCreatedAt);

    const { thread } = await chatAgent.continueThread(ctx, { threadId });
    const { text } = await thread.generateText({
      prompt: fullPrompt,
      tools: buildAgentTools(ctx.runMutation.bind(ctx), threadId, memData),
    });

    const responseText = text ?? '';
    await ctx.runMutation(internal.chat.insertMessage, { threadId, role: 'assistant', content: responseText });

    if (messageCount === 0) {
      await ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, { threadId, content });
    }

    return responseText;
  },
});

// ---- Read queries ----

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

// ---- Thread title ----

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

    const project = await ctx.runQuery(internal.chat.getProjectByThreadId, { threadId });
    if (project) {
      await ctx.runMutation(internal.projects.updateProjectName, { projectId: project._id, name: title });
    }
  },
});

// ---- Internal queries ----

export const getProjectByThreadId = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return ctx.db
      .query('projects')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();
  },
});

export const getMemoryForThread = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();

    if (!project) {
      return { userMem: [] as MemEntry[], projectMem: [] as MemEntry[] };
    }

    const { userId, _id: projectId } = project;
    const [userMem, projectMem] = await Promise.all([
      ctx.db.query('userMemory').withIndex('by_userId', q => q.eq('userId', userId)).collect(),
      ctx.db.query('projectMemory').withIndex('by_projectId', q => q.eq('projectId', projectId)).collect(),
    ]);

    return { userMem, projectMem, projectId, userId };
  },
});
