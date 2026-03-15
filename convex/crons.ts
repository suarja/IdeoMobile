import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';
import { internalAction, internalQuery } from './_generated/server';

const SYSTEM_CHALLENGE_POOL = [
  { label: 'Complete a voice session', points: 50, dimension: undefined as string | undefined },
  { label: 'Define a goal for your project', points: 75, dimension: undefined as string | undefined },
  { label: 'Describe your target user', points: 100, dimension: 'validation' as string | undefined },
  { label: 'Name your tech stack', points: 100, dimension: 'development' as string | undefined },
  { label: 'Write a one-line pitch', points: 75, dimension: 'validation' as string | undefined },
  { label: 'List 3 competitors', points: 75, dimension: 'distribution' as string | undefined },
  { label: 'Sketch your main screen', points: 100, dimension: 'design' as string | undefined },
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function utcDateString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
