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

const TRACKING_SYSTEM_PROMPT = `You are a daily tracker for vibe coders. Your job is to generate a concise daily stand-up report by:
1. Reviewing today's conversation activity (provided by the user)
2. Checking the user's recent TLDRs to avoid redundant context
3. Scraping each available project link using the scrapeUrl tool (one call per link)
4. Synthesizing everything into a structured markdown report
5. Calling saveReport with the full report and a 2-3 sentence tldr for tomorrow's context

Be concise and actionable. Focus on what changed today vs previous reports.`;

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
  todayMessages,
  availableLinks,
  today,
}: {
  projectName: string;
  todayMessages: TrackingMessage[];
  availableLinks: Record<string, string>;
  today: string;
}): string {
  const lines: string[] = [
    `# Daily Tracking Report — ${today}`,
    `**Project:** ${projectName}`,
    '',
  ];

  if (Object.keys(availableLinks).length > 0) {
    lines.push('## Available Links to Monitor');
    for (const [platform, url] of Object.entries(availableLinks)) {
      lines.push(`- ${platform}: ${url}`);
    }
    lines.push('');
  }

  if (todayMessages.length > 0) {
    lines.push('## Today\'s Conversations');
    for (const msg of todayMessages) {
      lines.push(`**${msg.role}:** ${msg.content.slice(0, 500)}`);
    }
    lines.push('');
  }
  else {
    lines.push('*No conversations today.*');
    lines.push('');
  }

  lines.push('Please generate the daily tracking report now. Call saveReport when done.');
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

function buildSaveReportTool(runMutation: RunMutationFn, userId: string, trackingThreadId: string) {
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
    const activeProjects = await ctx.runQuery(internal.projects.listActiveProjects, {});

    for (const project of activeProjects) {
      // Idempotence: skip if already generated today
      const existing = await ctx.runQuery(internal.artifacts.getTrackingArtifactForDate, {
        userId: project.userId,
        date: today,
      });
      if (existing)
        continue;

      const [todayMessages, profile] = await Promise.all([
        ctx.runQuery(internal.chat.getMessagesForDate, {
          threadId: project.threadId,
          date: today,
        }),
        ctx.runQuery(internal.userProfiles.getProfileByUserId, {
          userId: project.userId,
        }),
      ]);

      // Build links map: project-specific first, fallback to profile social links
      const availableLinks: Record<string, string> = {};
      if (project.projectLinks) {
        const pl = project.projectLinks;
        if (pl.github)
          availableLinks.github = pl.github;
        if (pl.website)
          availableLinks.website = pl.website;
        if (pl.tiktok)
          availableLinks.tiktok = pl.tiktok;
        if (pl.instagram)
          availableLinks.instagram = pl.instagram;
      }
      else if (profile?.socialLinks) {
        for (const link of profile.socialLinks) {
          availableLinks[link.platform] = link.url;
        }
      }

      const prompt = buildTrackingPrompt({
        projectName: project.name ?? 'Unnamed project',
        todayMessages: todayMessages as TrackingMessage[],
        availableLinks,
        today,
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
            githubToken: profile?.githubToken,
          }),
          saveReport: buildSaveReportTool(ctx.runMutation.bind(ctx), project.userId, trackingThreadId),
        },
      });
    }
  },
});
