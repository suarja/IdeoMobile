import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';
import { internalAction, internalQuery } from './_generated/server';
import { pickRandom, SYSTEM_CHALLENGE_POOL, utcDateString } from './challenges';

export const queryAllUserIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('userStats').take(1000);
    return rows.map(r => r.userId);
  },
});

export const generateDailyChallenges = internalAction({
  args: {},
  handler: async (ctx) => {
    const date = utcDateString();
    const allUserIds: string[] = await ctx.runQuery(internal.crons.queryAllUserIds, {});

    for (const userId of allUserIds) {
      const count = 3 + Math.floor(Math.random() * 2); // 3 or 4
      const picked = pickRandom(SYSTEM_CHALLENGE_POOL, count);

      await ctx.runMutation(internal.gamification.insertDailyChallengesForUser, {
        userId,
        date,
        challenges: picked.map(c => ({
          label: c.label,
          points: c.points,
          ...(c.dimension !== undefined ? { dimension: c.dimension } : {}),
        })),
      });
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

export default crons;
