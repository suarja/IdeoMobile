import type { Id } from './_generated/dataModel';
import type { AgentType } from './agents/routerAgent';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, tool } from 'ai';
import { v } from 'convex/values';
import { z } from 'zod';
import { internal } from './_generated/api';
import { action, internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { generalAgent } from './agents/chatAgent';
import { designAgent } from './agents/designAgent';
import { developmentAgent } from './agents/developmentAgent';
import { distributionAgent } from './agents/distributionAgent';
import { routeMessage } from './agents/routerAgent';
import { validationAgent } from './agents/validationAgent';
import { utcDateString } from './challenges';
import { webSearch } from './tools/webSearch/index';

// ---------------------------------------------------------------------------
// Agent registry
// ---------------------------------------------------------------------------

const SPECIALIST_AGENTS = {
  general: generalAgent,
  validation: validationAgent,
  design: designAgent,
  development: developmentAgent,
  distribution: distributionAgent,
} as const satisfies Record<AgentType, typeof generalAgent>;

// ---------------------------------------------------------------------------
// Thread management
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Memory & prompt helpers
// ---------------------------------------------------------------------------

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
type RunQueryFn = (ref: any, args: any) => Promise<any>;

// ---------------------------------------------------------------------------
// Common tools (available to all agents)
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-params, max-lines-per-function
function buildCommonTools(
  runMutation: RunMutationFn,
  runQuery: RunQueryFn,
  threadId: string,
  memData: MemData,
) {
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
    readDailyChallenges: tool({
      description: 'Read the user\'s daily challenges for today. Use to check progress and decide if any are completed.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!uid)
          return 'No user context.';
        const challenges = await runQuery(internal.gamification.getDailyChallengesInternal, {
          userId: uid,
          date: utcDateString(),
        });
        return JSON.stringify(challenges);
      },
    }),
    completeDailyChallenge: tool({
      description: 'Mark a daily challenge as completed. Call when the conversation demonstrates the challenge is done.',
      inputSchema: z.object({
        challengeId: z.string().describe('The _id of the dailyChallenge document'),
      }),
      execute: async ({ challengeId }) => {
        if (!uid)
          return 'No user context.';
        await runMutation(internal.gamification.completeDailyChallengeInternal, {
          challengeId: challengeId as Id<'dailyChallenges'>,
          userId: uid,
        });
        return 'Challenge completed. Points awarded.';
      },
    }),
    createDailyChallenge: tool({
      description: 'Create a custom challenge tailored to the current session context. Use to replace generic challenges with more relevant ones.',
      inputSchema: z.object({
        label: z.string().describe('Clear action-oriented challenge label'),
        points: z.number().min(50).max(200),
        dimension: z.enum(['validation', 'design', 'development', 'distribution']).optional(),
      }),
      execute: async ({ label, points, dimension }) => {
        if (!uid)
          return 'No user context.';
        await runMutation(internal.gamification.createDailyChallengeInternal, {
          userId: uid,
          label,
          points,
          dimension,
          date: utcDateString(),
        });
        return `Challenge "${label}" created.`;
      },
    }),
    readUserStats: tool({
      description: 'Read current user stats: points, level, streak. Use to personalize motivation.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!uid)
          return 'No user context.';
        const stats = await runQuery(internal.gamification.getUserStatsInternal, { userId: uid });
        return JSON.stringify(stats);
      },
    }),
    readProjectScores: tool({
      description: 'Read the current radar scores for the active project (0-100 per dimension).',
      inputSchema: z.object({}),
      execute: async () => {
        const scores = await runQuery(internal.gamification.getProjectScoresInternal, { threadId });
        return JSON.stringify(scores);
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Specialized tools (per-agent additions)
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-params
function buildSpecializedTools(
  specialist: AgentType,
  runMutation: RunMutationFn,
  runQuery: RunQueryFn,
  threadId: string,
) {
  if (specialist === 'validation' || specialist === 'distribution') {
    return {
      triggerValidationSearch: tool({
        description: 'Launch a web search to validate the idea or research distribution channels. ONLY call when: (1) idea is well understood (ideaSummary in memory), (2) user has explicitly confirmed they want a search.',
        inputSchema: z.object({
          query: z.string().describe('Specific search query optimized for finding competitors or market data'),
          ideaSummary: z.string().describe('1-sentence summary of the idea being validated'),
        }),
        execute: async ({ query, ideaSummary: _ideaSummary }) => {
          const quota = await runQuery(internal.projects.getValidationSearchQuota, { threadId });
          if ((quota as { projectCount: number; monthlyCount: number }).projectCount >= 1) {
            return 'Search quota reached for this project (max 1 search/project).';
          }
          if ((quota as { projectCount: number; monthlyCount: number }).monthlyCount >= 4) {
            return 'Monthly search quota reached (max 4/month).';
          }
          let results: Array<{ title: string; url: string; content: string }>;
          try {
            results = await webSearch(query);
          }
          catch (err) {
            return `Search unavailable: ${err instanceof Error ? err.message : 'Unknown error'}`;
          }
          await runMutation(internal.projects.incrementValidationSearchCount, { threadId });
          return JSON.stringify(results);
        },
      }),
    };
  }
  return {};
}

// ---------------------------------------------------------------------------
// sendMessage — router (Haiku) + specialist agent dispatch
// ---------------------------------------------------------------------------

export const sendMessage = action({
  args: {
    threadId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { threadId, content }): Promise<string> => {
    const messageCount = await ctx.runQuery(internal.chat.countMessages, { threadId });
    await ctx.runMutation(internal.chat.insertMessage, { threadId, role: 'user', content });

    const [memData, lastMessages, projectScores] = await Promise.all([
      ctx.runQuery(internal.chat.getMemoryForThread, { threadId }),
      ctx.runQuery(internal.chat.listMessagesInternal, { threadId }),
      ctx.runQuery(internal.gamification.getProjectScoresInternal, { threadId }),
    ]);

    // Router (Haiku): route + optionally compress + select relevant memory
    const routerDecision = await routeMessage({
      content,
      userMem: memData.userMem as MemEntry[],
      projectMem: memData.projectMem as MemEntry[],
      projectScores: projectScores as { validation?: number; design?: number; development?: number; distribution?: number } | null,
    });

    // Build mem data with router-selected memory fragments
    const selectedKeys = new Set(routerDecision.selectedMemory.map((m: MemEntry) => m.key));
    const memDataForAgent: MemData = {
      ...memData,
      userMem: (memData.userMem as MemEntry[]).filter((u: MemEntry) => selectedKeys.has(u.key)),
      projectMem: (memData.projectMem as MemEntry[]).filter((p: MemEntry) => selectedKeys.has(p.key)),
    };

    const lastMsgCreatedAt = lastMessages.length > 0
      ? (lastMessages[lastMessages.length - 1] as { createdAt: number }).createdAt
      : null;
    const fullPrompt = buildFullPrompt(routerDecision.processedMessage, memDataForAgent, lastMsgCreatedAt);

    const selectedAgent = SPECIALIST_AGENTS[routerDecision.specialist as AgentType];
    const commonTools = buildCommonTools(
      ctx.runMutation.bind(ctx),
      ctx.runQuery.bind(ctx),
      threadId,
      memData,
    );
    const specializedTools = buildSpecializedTools(
      routerDecision.specialist,
      ctx.runMutation.bind(ctx),
      ctx.runQuery.bind(ctx),
      threadId,
    );

    const { thread } = await selectedAgent.continueThread(ctx, { threadId });
    const allTools: any = { ...commonTools, ...specializedTools };
    const result = await thread.generateText({
      prompt: fullPrompt,
      tools: allTools,
    });

    // AI SDK v6: result.text = finalStep.text only.
    // If the last step ended with a tool call (e.g. saveProjectMemory after the response),
    // text is "" even if a prior step generated the actual response.
    // Fall back to the last step that produced non-empty text.
    let responseText = result.text ?? '';
    if (!responseText) {
      const steps = (result as any).steps as Array<{ text?: string }> | undefined;
      if (steps && steps.length > 0) {
        const lastTextStep = [...steps].reverse().find(s => s.text);
        responseText = lastTextStep?.text ?? '';
      }
    }
    await ctx.runMutation(internal.chat.insertMessage, { threadId, role: 'assistant', content: responseText });

    if (messageCount === 0) {
      await ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, { threadId, content });
    }

    return responseText;
  },
});

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Thread title
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

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
