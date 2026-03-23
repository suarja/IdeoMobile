import type { Id } from './_generated/dataModel';
import { anthropic } from '@ai-sdk/anthropic';
import { Agent } from '@convex-dev/agent';
import { tool } from 'ai';
import { z } from 'zod';

import { components, internal } from './_generated/api';
import { internalAction } from './_generated/server';
import { scrapeUrl } from './tools/scrape/index';

// ---------------------------------------------------------------------------
// Tracking agent — one-shot per project, thread stored for observability
// ---------------------------------------------------------------------------

const TRACKING_SYSTEM_PROMPT = `You are a GitHub-focused daily tracker for vibe coders.

Your job:
1. Call scrapeUrl with the GitHub URL provided in "GitHub Repository" — this returns repo stats, active branches, and recent commits via the GitHub Events API
2. Identify the most recently active branch (not necessarily main)
3. Summarize what changed since the last report (commits, new branches, open issues trend, stars)
4. Flag any risks: no commits in 7+ days, spike in open issues, branch divergence from main
5. Call saveReport with the full structured report and a 2-3 sentence tldr for tomorrow's context

Report format (markdown):
## Daily Tracking — [date]
**Active branch:** [branch name] · [last push time]
**Recent commits:**
- [message] ([date])
**Repo health:** Stars: X (+/-N) | Forks: X | Open issues: X
**Signals:** [key observations]
**Risks:** [if any]

Keep it concise — this is a developer standup, not a blog post.`;

export const trackingAgent = new Agent(components.agent, {
  name: 'Tracking Agent',
  languageModel: anthropic('claude-sonnet-4-6'),
  instructions: TRACKING_SYSTEM_PROMPT,
  maxSteps: 10,
});

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

type TrackingMessage = { role: 'user' | 'assistant'; content: string; createdAt: number };

function buildTrackingPrompt({
  projectName,
  githubUrl,
  recentTldrs,
  todayMessages,
}: {
  projectName: string;
  githubUrl: string;
  recentTldrs: string[];
  todayMessages: TrackingMessage[];
}): string {
  const lines: string[] = [
    `Project: ${projectName}`,
    `GitHub Repository: ${githubUrl}`,
  ];

  if (recentTldrs.length > 0) {
    lines.push('');
    lines.push('Recent context (from previous reports):');
    for (const tldr of recentTldrs) {
      lines.push(tldr);
    }
  }

  if (todayMessages.length > 0) {
    lines.push('');
    lines.push('Today\'s activity:');
    for (const msg of todayMessages) {
      lines.push(`**${msg.role}:** ${msg.content.slice(0, 500)}`);
    }
  }
  else {
    lines.push('');
    lines.push('No conversation activity today.');
  }

  lines.push('');
  lines.push('Call scrapeUrl with the GitHub URL above, then call saveReport.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Tool builders
// ---------------------------------------------------------------------------

type RunMutationFn = (ref: any, args: any) => Promise<any>;
type RunQueryFn = (ref: any, args: any) => Promise<any>;

type ScrapeToolCtx = {
  runMutation: RunMutationFn;
  runQuery: RunQueryFn;
  userId: string;
  githubToken: string | undefined;
};

function buildScrapeUrlTool({ runMutation, runQuery, userId, githubToken }: ScrapeToolCtx) {
  return tool({
    description: 'Scrape a project URL to get its current content. Use for each link in "Available Links".',
    inputSchema: z.object({
      url: z.string().describe('Full URL to scrape'),
    }),
    execute: async ({ url }: { url: string }) => {
      const cached = await runQuery(internal.scrapeCache.getCached, { userId, url });
      if (cached)
        return `[CACHED] ${cached}`;

      const content = await scrapeUrl(url, githubToken);
      await runMutation(internal.scrapeCache.setCached, { userId, url, content });

      return content;
    },
  });
}

type SaveReportToolCtx = {
  runMutation: RunMutationFn;
  userId: string;
  trackingThreadId: string;
  projectId?: Id<'projects'>;
};

function buildSaveReportTool({ runMutation, userId, trackingThreadId, projectId }: SaveReportToolCtx) {
  return tool({
    description: 'Save the completed daily tracking report as a persistent artifact visible in the Insights tab.',
    inputSchema: z.object({
      title: z.string().describe('Short descriptive title, e.g. "Daily Tracking — 22 Mar"'),
      content: z.string().describe('Full markdown content of the report'),
      tldr: z.string().describe('2-3 sentence summary for future continuity'),
    }),
    execute: async ({ title, content, tldr }: { title: string; content: string; tldr: string }) => {
      const date = new Date().toISOString().split('T')[0];
      await runMutation(internal.artifacts.saveArtifact, {
        userId,
        threadId: trackingThreadId,
        projectId,
        type: 'tracking' as const,
        title,
        content,
        tldr,
        date,
      });
      return `Report "${title}" saved to Insights tab.`;
    },
  });
}

// ---------------------------------------------------------------------------
// Cron action
// ---------------------------------------------------------------------------

export const generateDailyTrackingReports = internalAction({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const activeProjects = await ctx.runQuery(internal.projects.listTrackedProjects, {});

    for (const project of activeProjects) {
      // Idempotence: skip if already generated today
      const existing = await ctx.runQuery(internal.artifacts.getTrackingArtifactForDate, {
        userId: project.userId,
        projectId: project._id,
        date: today,
      });
      if (existing)
        continue;

      const [todayMessages, profile, recentTldrEntries] = await Promise.all([
        ctx.runQuery(internal.chat.getMessagesForDate, {
          threadId: project.threadId,
          date: today,
        }),
        ctx.runQuery(internal.userProfiles.getProfileByUserId, {
          userId: project.userId,
        }),
        ctx.runQuery(internal.artifacts.getRecentTldrs, {
          userId: project.userId,
          type: 'tracking',
          limit: 3,
        }),
      ]);

      // GitHub-only: skip projects without a GitHub URL or token
      const githubUrl = project.projectLinks?.github;
      const githubToken = profile?.githubToken;

      if (!githubUrl || !githubToken) {
        console.log(`[tracking] Skipping project ${project._id} (${project.name ?? 'unnamed'}): ${!githubUrl ? 'no GitHub URL' : 'no GitHub token'}`);
        continue;
      }

      const recentTldrs = recentTldrEntries.map((e: { date: string; tldr: string }) => `[${e.date}] ${e.tldr}`);

      const prompt = buildTrackingPrompt({
        projectName: project.name ?? 'Unnamed project',
        githubUrl,
        recentTldrs,
        todayMessages: todayMessages as TrackingMessage[],
      });

      // Ensure persistent tracking thread for this project
      let trackingThreadId = project.trackingThreadId;
      if (!trackingThreadId) {
        const { threadId } = await trackingAgent.createThread(ctx, {});
        trackingThreadId = threadId;
        await ctx.runMutation(internal.projects.setTrackingThreadId, {
          projectId: project._id,
          trackingThreadId,
        });
      }

      // Continue the same thread every run — agent has native memory
      const { thread } = await trackingAgent.continueThread(ctx, { threadId: trackingThreadId });
      await thread.generateText({
        prompt,
        tools: {
          scrapeUrl: buildScrapeUrlTool({
            runMutation: ctx.runMutation.bind(ctx),
            runQuery: ctx.runQuery.bind(ctx),
            userId: project.userId,
            githubToken,
          }),
          saveReport: buildSaveReportTool({ runMutation: ctx.runMutation.bind(ctx), userId: project.userId, trackingThreadId, projectId: project._id }),
        },
      });
    }
  },
});
