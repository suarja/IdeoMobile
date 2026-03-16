// Shared challenge pool and helpers used by crons and user init.

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
