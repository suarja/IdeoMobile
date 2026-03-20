/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

function makeT() {
  return convexTest(schema, modules);
}

// ── Points & Streaks ──────────────────────────────────────────────────────────

describe('addSessionPoints', () => {
  it('première session → 50 pts base + 10 bonus streak 1', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    await t.run(async (ctx) => {
      await ctx.db.insert('threads', { userId: 'user_1', threadId: 'thread_1', createdAt: Date.now() });
    });

    await t.withIdentity(identity).mutation(internal.gamification.addSessionPoints, { threadId: 'thread_1' });

    const stats = await t.withIdentity(identity).query(api.gamification.getUserStats, {});
    expect(stats).not.toBeNull();
    expect(stats!.totalPoints).toBe(60); // 50 base + 10 streak bonus (streak 1 × 10)
    expect(stats!.currentStreak).toBe(1);
  });

  it('2e session dans la fenêtre 48h → streak incrémente, bonus appliqué', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    await t.run(async (ctx) => {
      await ctx.db.insert('threads', { userId: 'user_1', threadId: 'thread_1', createdAt: Date.now() });
      const yesterday = Date.now() - 20 * 60 * 60 * 1000; // 20h ago
      await ctx.db.insert('userStats', {
        userId: 'user_1',
        totalPoints: 60,
        currentLevel: 1,
        currentStreak: 1,
        longestStreak: 1,
        lastSessionAt: yesterday,
      });
    });

    await t.withIdentity(identity).mutation(internal.gamification.addSessionPoints, { threadId: 'thread_1' });

    const stats = await t.withIdentity(identity).query(api.gamification.getUserStats, {});
    expect(stats!.currentStreak).toBe(2);
    expect(stats!.totalPoints).toBe(130); // 60 + 50 base + 20 bonus (streak 2 × 10)
  });

  it('session hors fenêtre 48h → streak remet à 1', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    await t.run(async (ctx) => {
      await ctx.db.insert('threads', { userId: 'user_1', threadId: 'thread_1', createdAt: Date.now() });
      const threeDaysAgo = Date.now() - 72 * 60 * 60 * 1000;
      await ctx.db.insert('userStats', {
        userId: 'user_1',
        totalPoints: 200,
        currentLevel: 1,
        currentStreak: 5,
        longestStreak: 5,
        lastSessionAt: threeDaysAgo,
      });
    });

    await t.withIdentity(identity).mutation(internal.gamification.addSessionPoints, { threadId: 'thread_1' });

    const stats = await t.withIdentity(identity).query(api.gamification.getUserStats, {});
    expect(stats!.currentStreak).toBe(1); // reset
  });

  it('bonus streak plafonné à 50 (streak > 5)', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    await t.run(async (ctx) => {
      await ctx.db.insert('threads', { userId: 'user_1', threadId: 'thread_1', createdAt: Date.now() });
      const recentSession = Date.now() - 12 * 60 * 60 * 1000;
      await ctx.db.insert('userStats', {
        userId: 'user_1',
        totalPoints: 1000,
        currentLevel: 2,
        currentStreak: 10,
        longestStreak: 10,
        lastSessionAt: recentSession,
      });
    });

    const before = await t.withIdentity(identity).query(api.gamification.getUserStats, {});
    await t.withIdentity(identity).mutation(internal.gamification.addSessionPoints, { threadId: 'thread_1' });
    const after = await t.withIdentity(identity).query(api.gamification.getUserStats, {});

    const earned = after!.totalPoints - before!.totalPoints;
    expect(earned).toBe(100); // 50 base + 50 bonus (plafonné)
  });
});

// ── Idempotence ───────────────────────────────────────────────────────────────

describe('completeDailyChallenge — idempotence', () => {
  it('deuxième complétion n\'accorde pas de points supplémentaires', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    const challengeId = await t.run(async (ctx) => {
      await ctx.db.insert('userStats', {
        userId: 'user_1',
        totalPoints: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastSessionAt: 0,
      });
      return ctx.db.insert('dailyChallenges', {
        userId: 'user_1',
        date: '2026-03-15',
        challengeType: 'voice_session',
        label: 'Complete a voice session',
        points: 50,
        completed: false,
      });
    });

    await t.withIdentity(identity).mutation(api.gamification.completeDailyChallenge, { challengeId });
    await t.withIdentity(identity).mutation(api.gamification.completeDailyChallenge, { challengeId });

    const stats = await t.withIdentity(identity).query(api.gamification.getUserStats, {});
    expect(stats!.totalPoints).toBe(50); // une seule fois
  });

  it('refus si non authentifié', async () => {
    const t = makeT();
    const challengeId = await t.run(async (ctx) => {
      return ctx.db.insert('dailyChallenges', {
        userId: 'user_1',
        date: '2026-03-15',
        challengeType: 'voice_session',
        label: 'Test',
        points: 50,
        completed: false,
      });
    });

    await expect(
      t.mutation(api.gamification.completeDailyChallenge, { challengeId }),
    ).rejects.toThrow();
  });
});

describe('completeGoal — idempotence', () => {
  it('deuxième complétion n\'accorde pas de points supplémentaires', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    const goalId = await t.run(async (ctx) => {
      await ctx.db.insert('userStats', {
        userId: 'user_1',
        totalPoints: 0,
        currentLevel: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastSessionAt: 0,
      });
      return ctx.db.insert('goals', {
        userId: 'user_1',
        threadId: 'thread_1',
        title: 'Build MVP',
        points: 100,
        completed: false,
        createdBy: 'user',
        createdAt: Date.now(),
      });
    });

    await t.withIdentity(identity).mutation(api.gamification.completeGoal, { goalId });
    await t.withIdentity(identity).mutation(api.gamification.completeGoal, { goalId });

    const stats = await t.withIdentity(identity).query(api.gamification.getUserStats, {});
    expect(stats!.totalPoints).toBe(100);
  });
});

// ── Défis quotidiens (cron) ───────────────────────────────────────────────────

describe('insertDailyChallengesForUser', () => {
  it('insère 3 défis pour un user+date donné', async () => {
    const t = makeT();

    await t.mutation(internal.gamification.insertDailyChallengesForUser, {
      userId: 'user_1',
      date: '2026-03-15',
      challenges: [
        { label: 'Voice session', points: 50 },
        { label: 'Define goal', points: 75 },
        { label: 'Write pitch', points: 75 },
      ],
    });

    const challenges = await t
      .withIdentity({ subject: 'user_1' })
      .query(api.gamification.getDailyChallenges, { date: '2026-03-15' });
    expect(challenges).toHaveLength(3);
    expect(challenges.every(c => !c.completed)).toBe(true);
  });

  it('garde anti-doublon : deuxième appel n\'insère rien', async () => {
    const t = makeT();
    const args = {
      userId: 'user_1',
      date: '2026-03-15',
      challenges: [{ label: 'Voice session', points: 50 }],
    };

    await t.mutation(internal.gamification.insertDailyChallengesForUser, args);
    await t.mutation(internal.gamification.insertDailyChallengesForUser, args);

    const challenges = await t
      .withIdentity({ subject: 'user_1' })
      .query(api.gamification.getDailyChallenges, { date: '2026-03-15' });
    expect(challenges).toHaveLength(1); // pas doublé
  });
});

// ── Queries ───────────────────────────────────────────────────────────────────

describe('getUserStats', () => {
  it('retourne les valeurs par défaut si user sans row', async () => {
    const t = makeT();
    const stats = await t
      .withIdentity({ subject: 'new_user' })
      .query(api.gamification.getUserStats, {});
    expect(stats!.totalPoints).toBe(0);
    expect(stats!.currentStreak).toBe(0);
  });
});

describe('getDailyChallenges', () => {
  it('retourne seulement les défis du user authentifié', async () => {
    const t = makeT();

    await t.run(async (ctx) => {
      await ctx.db.insert('dailyChallenges', {
        userId: 'user_1',
        date: '2026-03-15',
        challengeType: 'voice_session',
        label: 'User 1 challenge',
        points: 50,
        completed: false,
      });
      await ctx.db.insert('dailyChallenges', {
        userId: 'user_2',
        date: '2026-03-15',
        challengeType: 'voice_session',
        label: 'User 2 challenge',
        points: 50,
        completed: false,
      });
    });

    const challenges = await t
      .withIdentity({ subject: 'user_1' })
      .query(api.gamification.getDailyChallenges, { date: '2026-03-15' });
    expect(challenges).toHaveLength(1);
    expect(challenges[0].label).toBe('User 1 challenge');
  });
});

describe('getProjectGoals', () => {
  it('retourne seulement les goals du bon threadId', async () => {
    const t = makeT();

    await t.run(async (ctx) => {
      await ctx.db.insert('goals', {
        userId: 'user_1',
        threadId: 'thread_A',
        title: 'Goal A',
        points: 100,
        completed: false,
        createdBy: 'user',
        createdAt: Date.now(),
      });
      await ctx.db.insert('goals', {
        userId: 'user_1',
        threadId: 'thread_B',
        title: 'Goal B',
        points: 100,
        completed: false,
        createdBy: 'user',
        createdAt: Date.now(),
      });
    });

    const goals = await t
      .withIdentity({ subject: 'user_1' })
      .query(api.gamification.getProjectGoals, { threadId: 'thread_A' });
    expect(goals).toHaveLength(1);
    expect(goals[0].title).toBe('Goal A');
  });
});

// ── Rate-limit (updateValidationAttempt) ──────────────────────────────────────

describe('updateValidationAttempt', () => {
  it('stocke lastValidationAttemptAt et lastRejectionMessage', async () => {
    const t = makeT();

    const challengeId = await t.run(async (ctx) => {
      return ctx.db.insert('dailyChallenges', {
        userId: 'user_1',
        date: '2026-03-20',
        challengeType: 'voice_session',
        label: 'Voice session',
        points: 50,
        completed: false,
      });
    });

    const now = Date.now();
    await t.mutation(internal.gamification.updateValidationAttempt, {
      challengeId,
      lastValidationAttemptAt: now,
      lastRejectionMessage: 'Continue à travailler !',
    });

    const challenge = await t.run(async ctx => ctx.db.get(challengeId));
    expect(challenge!.lastValidationAttemptAt).toBe(now);
    expect(challenge!.lastRejectionMessage).toBe('Continue à travailler !');
  });

  it('écrase la valeur précédente lors d\'une nouvelle tentative', async () => {
    const t = makeT();

    const earlier = Date.now() - 35 * 60 * 1000; // 35 min ago (hors cooldown)
    const challengeId = await t.run(async (ctx) => {
      return ctx.db.insert('dailyChallenges', {
        userId: 'user_1',
        date: '2026-03-20',
        challengeType: 'voice_session',
        label: 'Voice session',
        points: 50,
        completed: false,
        lastValidationAttemptAt: earlier,
        lastRejectionMessage: 'Ancien message.',
      });
    });

    const now = Date.now();
    await t.mutation(internal.gamification.updateValidationAttempt, {
      challengeId,
      lastValidationAttemptAt: now,
      lastRejectionMessage: 'Nouveau message.',
    });

    const challenge = await t.run(async ctx => ctx.db.get(challengeId));
    expect(challenge!.lastValidationAttemptAt).toBe(now);
    expect(challenge!.lastRejectionMessage).toBe('Nouveau message.');
  });

  it('lastRejectionMessage optionnel — pas de champ si non fourni', async () => {
    const t = makeT();

    const challengeId = await t.run(async (ctx) => {
      return ctx.db.insert('dailyChallenges', {
        userId: 'user_1',
        date: '2026-03-20',
        challengeType: 'voice_session',
        label: 'Voice session',
        points: 50,
        completed: false,
      });
    });

    const now = Date.now();
    await t.mutation(internal.gamification.updateValidationAttempt, {
      challengeId,
      lastValidationAttemptAt: now,
    });

    const challenge = await t.run(async ctx => ctx.db.get(challengeId));
    expect(challenge!.lastValidationAttemptAt).toBe(now);
    expect(challenge!.lastRejectionMessage).toBeUndefined();
  });
});
