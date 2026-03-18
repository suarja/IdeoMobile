import type { MutationCtx, QueryCtx } from './_generated/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { pickRandom, SYSTEM_CHALLENGE_POOL, utcDateString } from './challenges';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function computeLevel(ctx: MutationCtx | QueryCtx, totalPoints: number): Promise<number> {
  const levels = await ctx.db.query('levels').withIndex('by_level').order('asc').take(20);
  let currentLevel = 1;
  for (const l of levels) {
    if (totalPoints >= l.minPoints)
      currentLevel = l.level;
  }
  return currentLevel;
}

async function grantPoints(ctx: MutationCtx, userId: string, points: number): Promise<void> {
  const stats = await ctx.db
    .query('userStats')
    .withIndex('by_userId', q => q.eq('userId', userId))
    .first();

  const newTotal = (stats?.totalPoints ?? 0) + points;
  const newLevel = await computeLevel(ctx, newTotal);

  if (stats) {
    await ctx.db.patch(stats._id, { totalPoints: newTotal, currentLevel: newLevel });
  }
  else {
    await ctx.db.insert('userStats', {
      userId,
      totalPoints: newTotal,
      currentLevel: newLevel,
      currentStreak: 1,
      longestStreak: 0,
      lastSessionAt: 0,
      activeDays: [],
    });
  }
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

export const seedLevels = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('levels').first();
    if (existing)
      return;

    const levels = [
      { level: 1, name: 'Dreamer', minPoints: 0, iconEmoji: '🌱' },
      { level: 2, name: 'Thinker', minPoints: 500, iconEmoji: '💡' },
      { level: 3, name: 'Builder', minPoints: 1500, iconEmoji: '🔨' },
      { level: 4, name: 'Maker', minPoints: 3500, iconEmoji: '⚡' },
      { level: 5, name: 'Founder', minPoints: 7000, iconEmoji: '🚀' },
    ];
    for (const l of levels) {
      await ctx.db.insert('levels', l);
    }
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const stats = await ctx.db
      .query('userStats')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();

    const levels = await ctx.db.query('levels').withIndex('by_level').order('asc').take(10);

    const totalPoints = stats?.totalPoints ?? 0;
    const currentLevelNum = stats?.currentLevel ?? 1;

    // If stored currentLevel is invalid (e.g. 0), fall back to level 1
    const resolvedLevelNum = levels.some(l => l.level === currentLevelNum) ? currentLevelNum : 1;
    const currentLevelData = levels.find(l => l.level === resolvedLevelNum);
    const nextLevelData = levels.find(l => l.level === resolvedLevelNum + 1);

    const pointsToNextLevel = nextLevelData ? Math.max(0, nextLevelData.minPoints - totalPoints) : 0;
    const progressToNextLevel
      = nextLevelData && currentLevelData && nextLevelData.minPoints > currentLevelData.minPoints
        ? Math.min(
            1,
            Math.max(
              0,
              (totalPoints - currentLevelData.minPoints)
              / (nextLevelData.minPoints - currentLevelData.minPoints),
            ),
          )
        : nextLevelData ? 0 : 1; // 0 = fallback on error, 1 = max level reached

    return {
      totalPoints,
      currentLevel: currentLevelNum,
      levelName: currentLevelData?.name ?? 'Dreamer',
      levelIcon: currentLevelData?.iconEmoji ?? '🌱',
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      activeDays: stats?.activeDays ?? [],
      pointsToNextLevel,
      progressToNextLevel,
      nextLevelName: nextLevelData?.name ?? null,
      nextLevelIcon: nextLevelData?.iconEmoji ?? null,
    };
  },
});

export const getProjectScores = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const scores = await ctx.db
      .query('projectScores')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();

    return {
      validation: { score: scores?.validationScore ?? 0, weight: scores?.validationWeight ?? 1.0 },
      design: { score: scores?.designScore ?? 0, weight: scores?.designWeight ?? 1.0 },
      development: {
        score: scores?.developmentScore ?? 0,
        weight: scores?.developmentWeight ?? 1.0,
      },
      distribution: {
        score: scores?.distributionScore ?? 0,
        weight: scores?.distributionWeight ?? 1.0,
      },
    };
  },
});

export const getDailyChallenges = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty — never throw in queries for transient auth gaps.
      // The subscription stays alive and re-evaluates once auth arrives.
      return [];
    }
    const userId = identity.subject;

    return ctx.db
      .query('dailyChallenges')
      .withIndex('by_userId_date', q => q.eq('userId', userId).eq('date', date))
      .take(10);
  },
});

export const getProjectGoals = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return ctx.db
      .query('goals')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .order('desc')
      .take(20);
  },
});

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

export const completeDailyChallenge = mutation({
  args: { challengeId: v.id('dailyChallenges') },
  handler: async (ctx, { challengeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;

    const challenge = await ctx.db.get(challengeId);
    if (!challenge)
      throw new Error('Challenge not found');
    if (challenge.userId !== userId)
      throw new Error('Unauthorized');
    if (challenge.completed)
      return; // idempotent

    await ctx.db.patch(challengeId, { completed: true, completedAt: Date.now() });
    await grantPoints(ctx, userId, challenge.points);
  },
});

export const completeGoal = mutation({
  args: { goalId: v.id('goals') },
  handler: async (ctx, { goalId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;

    const goal = await ctx.db.get(goalId);
    if (!goal)
      throw new Error('Goal not found');
    if (goal.userId !== userId)
      throw new Error('Unauthorized');
    if (goal.completed)
      return; // idempotent

    await ctx.db.patch(goalId, { completed: true, completedAt: Date.now() });
    await grantPoints(ctx, userId, goal.points);
  },
});

export const addGoal = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
    points: v.number(),
    dimension: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, { threadId, title, points, dimension, createdBy }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;

    return ctx.db.insert('goals', {
      userId,
      threadId,
      title,
      points,
      dimension,
      completed: false,
      createdBy,
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Internal mutations (agent / server-side only)
// ---------------------------------------------------------------------------

export const addSessionPoints = internalMutation({
  args: { threadId: v.string(), basePoints: v.optional(v.number()) },
  handler: async (ctx, { threadId, basePoints = 50 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return; // silently skip if unauthenticated

    const userId = identity.subject;
    const now = Date.now();
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

    const stats = await ctx.db
      .query('userStats')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();

    const isSameSession = stats && stats.lastSessionAt && (now - stats.lastSessionAt) < THREE_HOURS_MS;

    if (isSameSession) {
      // Same session: grant base points only, no streak update
      const newTotal = (stats.totalPoints ?? 0) + basePoints;
      const newLevel = await computeLevel(ctx, newTotal);
      await ctx.db.patch(stats._id, { totalPoints: newTotal, currentLevel: newLevel, lastSessionAt: now });
      await ctx.db.insert('voiceSessions', { userId, threadId, pointsEarned: basePoints, createdAt: now });
      return { pointsEarned: basePoints, newStreak: stats.currentStreak };
    }

    let newStreak = 1;
    let longestStreak = stats?.longestStreak ?? 1;

    if (stats && stats.lastSessionAt && now - stats.lastSessionAt <= TWO_DAYS_MS) {
      newStreak = stats.currentStreak + 1;
    }
    longestStreak = Math.max(longestStreak, newStreak);

    // base + 10 per streak day, capped at 50 bonus
    const streakBonus = Math.min(newStreak * 10, 50);
    const pointsEarned = basePoints + streakBonus;
    const newTotal = (stats?.totalPoints ?? 0) + pointsEarned;
    const newLevel = await computeLevel(ctx, newTotal);

    await ctx.db.insert('voiceSessions', { userId, threadId, pointsEarned, createdAt: now });

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalPoints: newTotal,
        currentLevel: newLevel,
        currentStreak: newStreak,
        longestStreak,
        lastSessionAt: now,
      });
    }
    else {
      await ctx.db.insert('userStats', {
        userId,
        totalPoints: newTotal,
        currentLevel: newLevel,
        currentStreak: newStreak,
        longestStreak,
        lastSessionAt: now,
        activeDays: [utcDateString()],
      });
    }
  },
});

export const updateProjectScores = internalMutation({
  args: {
    threadId: v.string(),
    scores: v.object({
      validation: v.optional(v.number()),
      design: v.optional(v.number()),
      development: v.optional(v.number()),
      distribution: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { threadId, scores }) => {
    const existing = await ctx.db
      .query('projectScores')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();

    const now = Date.now();

    if (existing) {
      const patch: Record<string, number> = { updatedAt: now };
      if (scores.validation !== undefined)
        patch.validationScore = scores.validation;
      if (scores.design !== undefined)
        patch.designScore = scores.design;
      if (scores.development !== undefined)
        patch.developmentScore = scores.development;
      if (scores.distribution !== undefined)
        patch.distributionScore = scores.distribution;
      await ctx.db.patch(existing._id, patch);
    }
    else {
      // Look up userId via threadId
      const thread = await ctx.db
        .query('threads')
        .withIndex('by_threadId', q => q.eq('threadId', threadId))
        .first();
      const userId = thread?.userId ?? '';

      await ctx.db.insert('projectScores', {
        userId,
        threadId,
        validationScore: scores.validation ?? 0,
        designScore: scores.design ?? 0,
        developmentScore: scores.development ?? 0,
        distributionScore: scores.distribution ?? 0,
        validationWeight: 1.0,
        designWeight: 1.0,
        developmentWeight: 1.0,
        distributionWeight: 1.0,
        updatedAt: now,
      });
    }
  },
});

export const updateProjectWeights = internalMutation({
  args: {
    threadId: v.string(),
    weights: v.object({
      validation: v.optional(v.number()),
      design: v.optional(v.number()),
      development: v.optional(v.number()),
      distribution: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { threadId, weights }) => {
    const existing = await ctx.db
      .query('projectScores')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();

    if (existing) {
      const patch: Record<string, number> = { updatedAt: Date.now() };
      if (weights.validation !== undefined)
        patch.validationWeight = weights.validation;
      if (weights.design !== undefined)
        patch.designWeight = weights.design;
      if (weights.development !== undefined)
        patch.developmentWeight = weights.development;
      if (weights.distribution !== undefined)
        patch.distributionWeight = weights.distribution;
      await ctx.db.patch(existing._id, patch);
    }
  },
});

// Used by agent tools (via chat.ts sendMessage) to create goals without needing client auth
export const addGoalInternal = internalMutation({
  args: {
    threadId: v.string(),
    title: v.string(),
    points: v.number(),
    dimension: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, title, points, dimension }) => {
    const thread = await ctx.db
      .query('threads')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();
    const userId = thread?.userId ?? '';

    return ctx.db.insert('goals', {
      userId,
      threadId,
      title,
      points,
      dimension,
      completed: false,
      createdBy: 'agent',
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Validation agent
// ---------------------------------------------------------------------------

export const getDailyChallengeById = internalQuery({
  args: { challengeId: v.id('dailyChallenges') },
  handler: async (ctx, { challengeId }) => ctx.db.get(challengeId),
});

export const completeDailyChallengeInternal = internalMutation({
  args: { challengeId: v.id('dailyChallenges'), userId: v.string() },
  handler: async (ctx, { challengeId, userId }) => {
    const challenge = await ctx.db.get(challengeId);
    if (!challenge || challenge.completed)
      return;
    await ctx.db.patch(challengeId, { completed: true, completedAt: Date.now() });
    await grantPoints(ctx, userId, challenge.points);
  },
});

export const validateAndCompleteDailyChallenge = action({
  args: {
    challengeId: v.id('dailyChallenges'),
    threadId: v.string(),
  },
  handler: async (ctx, { challengeId, threadId }): Promise<{ approved: boolean; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');

    const challenge: { label: string; points: number; completed: boolean } | null = await ctx.runQuery(
      internal.gamification.getDailyChallengeById,
      { challengeId },
    );
    if (!challenge)
      throw new Error('Challenge not found');
    if (challenge.completed)
      return { approved: true, message: 'Already completed!' };

    const messages: Array<{ role: string; content: string }> = await ctx.runQuery(
      internal.chat.listMessagesInternal,
      { threadId },
    );
    const history = messages.map(m => `${m.role}: ${m.content}`).join('\n');

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt: `Based on this conversation, did the user complete the challenge: "${challenge.label}"?

Conversation:
${history || '(no messages yet)'}

Reply with valid JSON only, no markdown, no extra text:
{"approved": true/false, "message": "1-2 sentence explanation (talk to the user, be encouraging, and if rejected, give hints on what they might have missed. You might assume that all the conversations are voice-based)."}

Be lenient: if the conversation shows any attempt toward the challenge, approve it.`,
    });

    let result: { approved: boolean; message: string };
    try {
      const raw = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(raw) as { approved?: unknown; message?: unknown };
      result = {
        approved: parsed.approved === true,
        message: typeof parsed.message === 'string' ? parsed.message : 'Validation complete.',
      };
    }
    catch {
      // If parsing fails, approve optimistically so users aren't blocked
      result = { approved: true, message: 'Challenge validated!' };
    }

    if (result.approved) {
      await ctx.runMutation(internal.gamification.completeDailyChallengeInternal, {
        challengeId,
        userId: identity.subject,
      });
    }

    return result;
  },
});

// ---------------------------------------------------------------------------
// User initialization
// ---------------------------------------------------------------------------

export const initNewUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query('userStats')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (!existing) {
      await ctx.db.insert('userStats', {
        userId,
        totalPoints: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastSessionAt: 0,
        activeDays: [],
      });
    }

    const date = utcDateString();
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
  },
});

// ---------------------------------------------------------------------------
// ProjectScores initialization
// ---------------------------------------------------------------------------

export const initProjectScores = internalMutation({
  args: { threadId: v.string(), userId: v.string() },
  handler: async (ctx, { threadId, userId }) => {
    const existing = await ctx.db
      .query('projectScores')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();
    if (existing)
      return;
    await ctx.db.insert('projectScores', {
      userId,
      threadId,
      validationScore: 0,
      designScore: 0,
      developmentScore: 0,
      distributionScore: 0,
      validationWeight: 1.0,
      designWeight: 1.0,
      developmentWeight: 1.0,
      distributionWeight: 1.0,
      updatedAt: Date.now(),
    });
  },
});

// Used by cron to insert challenges for a single user
export const insertDailyChallengesForUser = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    challenges: v.array(
      v.object({
        label: v.string(),
        points: v.number(),
        dimension: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { userId, date, challenges }) => {
    // Guard: skip if already has challenges today
    const existing = await ctx.db
      .query('dailyChallenges')
      .withIndex('by_userId_date', q => q.eq('userId', userId).eq('date', date))
      .first();
    if (existing)
      return;

    for (const c of challenges) {
      await ctx.db.insert('dailyChallenges', {
        userId,
        date,
        challengeType: 'system',
        label: c.label,
        dimension: c.dimension,
        points: c.points,
        completed: false,
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Internal agent tools — read-only accessors
// ---------------------------------------------------------------------------

export const getDailyChallengesInternal = internalQuery({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    return ctx.db
      .query('dailyChallenges')
      .withIndex('by_userId_date', q => q.eq('userId', userId).eq('date', date))
      .take(10);
  },
});

export const getUserStatsInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const stats = await ctx.db
      .query('userStats')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (!stats)
      return null;
    return {
      totalPoints: stats.totalPoints,
      currentLevel: stats.currentLevel,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastSessionAt: stats.lastSessionAt,
      activeDays: stats.activeDays ?? [],
    };
  },
});

export const getProjectScoresInternal = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const scores = await ctx.db
      .query('projectScores')
      .withIndex('by_threadId', q => q.eq('threadId', threadId))
      .first();
    if (!scores)
      return null;
    return {
      validation: scores.validationScore,
      design: scores.designScore,
      development: scores.developmentScore,
      distribution: scores.distributionScore,
    };
  },
});

export const createDailyChallengeInternal = internalMutation({
  args: {
    userId: v.string(),
    label: v.string(),
    points: v.number(),
    dimension: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, { userId, label, points, dimension, date }) => {
    return ctx.db.insert('dailyChallenges', {
      userId,
      date,
      challengeType: 'agent',
      label,
      dimension,
      points,
      completed: false,
    });
  },
});

// ---------------------------------------------------------------------------
// App open tracking
// ---------------------------------------------------------------------------

export const recordAppOpen = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return { skipped: true };

    const userId = identity.subject;
    const now = Date.now();
    const todayStr = utcDateString();

    const stats = await ctx.db
      .query('userStats')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();

    const activeDays = stats?.activeDays ?? [];

    // Check if the user has already opened the app today
    if (activeDays.includes(todayStr)) {
      // Still check if we should skip points based on lastSessionAt (3 hours)
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
      if (stats && stats.lastSessionAt && (now - stats.lastSessionAt) < THREE_HOURS_MS) {
        return { skipped: true, activeDays, currentStreak: stats.currentStreak };
      }

      const pointsEarned = 5;
      await grantPoints(ctx, userId, pointsEarned);

      // Only update lastSessionAt if returning points, but don't add duplicate activeDays
      await ctx.db.patch(stats!._id, { lastSessionAt: now });
      return { skipped: false, pointsEarned, activeDays, currentStreak: stats!.currentStreak };
    }

    // --- First open of the day ---

    // Calculate the new streak
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    const yY = yesterday.getUTCFullYear();
    const yM = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
    const yD = String(yesterday.getUTCDate()).padStart(2, '0');
    const yesterdayStr = `${yY}-${yM}-${yD}`;

    let newStreak = 1;
    if (activeDays.includes(yesterdayStr) || activeDays.length === 0) {
      newStreak = (stats?.currentStreak ?? 0) + 1; // Or start at 1 if very first time
    }

    const newLongestStreak = Math.max(stats?.longestStreak ?? 0, newStreak);
    const newActiveDays = [...activeDays, todayStr];

    // Safety check so array doesn't get ridiculously large over years
    // Keeping exactly 1000 days should be around ~10KB and last almost 3 years. We don't really need to trim it but just in case:
    if (newActiveDays.length > 1000) {
      newActiveDays.shift(); // remove oldest
    }

    // Award standard points
    const pointsEarned = 5;
    await grantPoints(ctx, userId, pointsEarned);

    // Update stats with the new steak and day
    const updatedStats = await ctx.db
      .query('userStats')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();

    if (updatedStats) {
      await ctx.db.patch(updatedStats._id, {
        lastSessionAt: now,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        activeDays: newActiveDays,
      });
    }
    else {
      await ctx.db.insert('userStats', {
        userId,
        totalPoints: pointsEarned,
        currentLevel: 1,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastSessionAt: now,
        activeDays: newActiveDays,
      });
    }

    return {
      skipped: false,
      pointsEarned,
      isNewStreakDay: true,
      currentStreak: newStreak,
      activeDays: newActiveDays,
    };
  },
});

// ---------------------------------------------------------------------------
// Standup time preference
// ---------------------------------------------------------------------------

export const setStandupTime = mutation({
  args: { time: v.string() }, // "HH:MM" format
  handler: async (ctx, { time }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;

    const stats = await ctx.db
      .query('userStats')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (stats) {
      await ctx.db.patch(stats._id, { standupTime: time });
    }
  },
});
