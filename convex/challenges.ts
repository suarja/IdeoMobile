// Shared challenge pool, helpers, and AI-powered challenge generation.

import { generateText } from 'ai';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';

// ---------------------------------------------------------------------------
// AI-powered personalized challenge generation
// ---------------------------------------------------------------------------

type PersonalizedResult = {
  carriedOverLabels: string[];
  newChallenges: Array<{ label: string; points: number; dimension?: string }>;
};

export const generatePersonalizedChallenges = internalAction({
  args: {
    userId: v.string(),
    maxNew: v.number(),
    projectScores: v.optional(v.object({
      validation: v.number(),
      design: v.number(),
      development: v.number(),
      distribution: v.number(),
    })),
    lastSessionSummary: v.optional(v.string()),
    yesterdayChallenges: v.array(v.object({
      label: v.string(),
      points: v.number(),
      dimension: v.optional(v.string()),
    })),
  },
  handler: async (_ctx, { maxNew, projectScores, lastSessionSummary, yesterdayChallenges }): Promise<PersonalizedResult> => {
    try {
      const weakestDimension = projectScores
        ? Object.entries(projectScores).sort(([, a], [, b]) => a - b)[0]?.[0]
        : null;

      const yesterdaySection = yesterdayChallenges.length > 0
        ? `Yesterday's uncompleted challenges (decide which are still relevant today):\n${yesterdayChallenges.map(c => `- "${c.label}" (${c.points} pts${c.dimension ? `, ${c.dimension}` : ''})`).join('\n')}\n\n`
        : '';
      const scoresSection = projectScores
        ? `Project radar scores (0-100): validation=${projectScores.validation}, design=${projectScores.design}, development=${projectScores.development}, distribution=${projectScores.distribution}. Weakest area: ${weakestDimension}.\n`
        : '';
      const summarySection = lastSessionSummary ? `Last session: ${lastSessionSummary}\n` : '';

      const prompt = `You are a challenge advisor for a vibe coder productivity app.

${yesterdaySection}${scoresSection}${summarySection}
Generate 3 personalized daily challenges. Focus on the weakest project area. Each must be completable in one work session.

Respond with ONLY valid JSON:
{
  "carriedOverLabels": ["exact label from yesterday if still relevant today"],
  "newChallenges": [
    {"label": "Action-oriented challenge", "points": 75, "dimension": "validation"},
    {"label": "Another challenge", "points": 100, "dimension": "development"},
    {"label": "Third challenge", "points": 50}
  ]
}

Points: 50-150. dimension is optional: "validation", "design", "development", "distribution".`;

      const { text } = await generateText({
        model: 'anthropic/claude-haiku-4.5',
        prompt,
      });

      const raw = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(raw) as { carriedOverLabels?: unknown; newChallenges?: unknown };

      const carriedOverLabels = Array.isArray(parsed.carriedOverLabels)
        ? (parsed.carriedOverLabels as string[]).filter(l => typeof l === 'string')
        : [];

      const newChallenges = Array.isArray(parsed.newChallenges)
        ? (parsed.newChallenges as Array<{ label: string; points: number; dimension?: string }>)
            .filter(c => typeof c.label === 'string' && typeof c.points === 'number')
            .slice(0, maxNew)
        : [];

      return { carriedOverLabels, newChallenges };
    }
    catch {
      const picked = pickRandom(SYSTEM_CHALLENGE_POOL, 3);
      return {
        carriedOverLabels: [],
        newChallenges: picked.map(c => ({
          label: c.label,
          points: c.points,
          ...(c.dimension !== undefined ? { dimension: c.dimension } : {}),
        })),
      };
    }
  },
});

// ---------------------------------------------------------------------------
// Shared challenge pool and helpers
// ---------------------------------------------------------------------------

export type ChallengeTemplate = {
  label: string;
  points: number;
  dimension: string | undefined;
};

export const SYSTEM_CHALLENGE_POOL: ChallengeTemplate[] = [
  { label: 'Complete a voice session', points: 50, dimension: undefined },
  { label: 'Define a goal for your project', points: 75, dimension: undefined },
  { label: 'Describe your target user', points: 100, dimension: 'validation' },
  { label: 'Name your tech stack', points: 100, dimension: 'development' },
  { label: 'Write a one-line pitch', points: 75, dimension: 'validation' },
  { label: 'List 3 competitors', points: 75, dimension: 'distribution' },
  { label: 'Sketch your main screen', points: 100, dimension: 'design' },
];

export function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

export function utcDateString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
