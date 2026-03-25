import { cronJobs } from 'convex/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalAction, internalQuery } from './_generated/server';
import { utcDateString } from './challenges';

export const queryAllUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('userStats').take(1000);
    return rows.map(r => r.userId);
  },
});

export const queryYesterdayChallengesForUser = internalQuery({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const challenges = await ctx.db
      .query('dailyChallenges')
      .withIndex('by_userId_date', q => q.eq('userId', userId).eq('date', date))
      .take(10);
    return challenges.filter(c => !c.completed && c.failed !== true);
  },
});

export const generateDailyChallenges = internalAction({
  args: {},
  handler: async (ctx) => {
    const today = utcDateString();
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterday = `${yesterdayDate.getUTCFullYear()}-${String(yesterdayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getUTCDate()).padStart(2, '0')}`;

    const allUserIds: string[] = await ctx.runQuery(internal.crons.queryAllUserIds, {});

    for (const userId of allUserIds) {
      // Skip users who already have today's challenges (idempotency guard)
      const todayExisting = await ctx.runQuery(internal.gamification.getDailyChallengesInternal, { userId, date: today });
      if (todayExisting.length > 0)
        continue;

      // Get yesterday's uncompleted challenges and project context
      const [yesterdayChallenges, projectContext] = await Promise.all([
        ctx.runQuery(internal.crons.queryYesterdayChallengesForUser, { userId, date: yesterday }),
        ctx.runQuery(internal.gamification.getActiveProjectContextForUser, { userId }),
      ]);

      // Single AI call: decide carry-overs + generate new personalized challenges
      const { carriedOverLabels, newChallenges } = await ctx.runAction(
        internal.challenges.generatePersonalizedChallenges,
        {
          userId,
          maxNew: 3, // AI caps output to this; enforced below after carry-overs are known
          ...(projectContext?.scores ? { projectScores: projectContext.scores } : {}),
          ...(projectContext?.lastSessionSummary ? { lastSessionSummary: projectContext.lastSessionSummary } : {}),
          yesterdayChallenges: yesterdayChallenges.map(c => ({
            label: c.label,
            points: c.points,
            ...(c.dimension !== undefined ? { dimension: c.dimension } : {}),
          })),
        },
      );

      // Enforce cap of 3 total after carry-overs are resolved
      const maxNew = Math.max(0, 3 - carriedOverLabels.length);

      // Mark non-carried-over old challenges as failed
      const failedIds = yesterdayChallenges
        .filter(c => !carriedOverLabels.includes(c.label))
        .map(c => c._id);
      if (failedIds.length > 0) {
        await ctx.runMutation(internal.gamification.markChallengesAsFailed, { challengeIds: failedIds });
      }

      // Insert carried-over challenges for today
      for (const label of carriedOverLabels) {
        const original = yesterdayChallenges.find(c => c.label === label);
        if (!original)
          continue;
        await ctx.runMutation(internal.gamification.createDailyChallengeInternal, {
          userId,
          label: original.label,
          points: original.points,
          ...(original.dimension !== undefined ? { dimension: original.dimension } : {}),
          date: today,
          carriedOver: true,
        });
      }

      // Insert new personalized challenges (capped to maxNew to enforce total of 3)
      for (const challenge of newChallenges.slice(0, maxNew)) {
        await ctx.runMutation(internal.gamification.createDailyChallengeInternal, {
          userId,
          label: challenge.label,
          points: challenge.points,
          ...(challenge.dimension !== undefined ? { dimension: challenge.dimension } : {}),
          date: today,
        });
      }
    }
  },
});

const crons = cronJobs();

crons.cron(
  'generate daily challenges',
  '0 6 * * *',
  internal.crons.generateDailyChallenges,
  {},
);

crons.cron(
  'generate daily tracking reports',
  '0 23 * * *',
  internal.tracking.generateDailyTrackingReports,
  {},
);

export default crons;
