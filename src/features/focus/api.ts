import type { Id } from '../../../convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function useActiveThreadId() {
  return useQuery(api.chat.getActiveThread);
}

export function useUserStats() {
  return useQuery(api.gamification.getUserStats);
}

export function useProjectScores(threadId: string | null) {
  return useQuery(
    api.gamification.getProjectScores,
    threadId ? { threadId } : 'skip',
  );
}

export function useDailyChallenges(date: string) {
  return useQuery(api.gamification.getDailyChallenges, { date });
}

export function useProjectGoals(threadId: string | null) {
  return useQuery(
    api.gamification.getProjectGoals,
    threadId ? { threadId } : 'skip',
  );
}

export function useCompleteDailyChallenge() {
  return useMutation(api.gamification.completeDailyChallenge);
}

export function useCompleteGoal() {
  return useMutation(api.gamification.completeGoal);
}

export function useAddGoal() {
  return useMutation(api.gamification.addGoal);
}

export function localDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DailyChallenge = {
  _id: Id<'dailyChallenges'>;
  label: string;
  points: number;
  completed: boolean;
  dimension?: string;
};

export type ProjectGoal = {
  _id: Id<'goals'>;
  title: string;
  points: number;
  completed: boolean;
  createdBy: string;
  dimension?: string;
};
