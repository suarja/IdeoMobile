import type { Id } from '../../../convex/_generated/dataModel';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Auth-dependent queries MUST use 'skip' until Convex auth is established.
// Without this, useQuery creates a subscription during render, but client.setAuth()
// runs in an effect (AFTER render). The server receives the subscription before
// the auth token → executes without auth → throws → useQuery throws in React.

export function useActiveThreadId() {
  const { isAuthenticated } = useConvexAuth();
  const result = useQuery(api.chat.getActiveThread, isAuthenticated ? {} : 'skip');
  // Return just the threadId string (or null/undefined) for backwards compatibility
  if (result === undefined || result === null)
    return result;
  return result.threadId;
}

export function useUserStats() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.gamification.getUserStats, isAuthenticated ? {} : 'skip');
}

export function useProjectScores(threadId: string | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.gamification.getProjectScores,
    isAuthenticated && threadId ? { threadId } : 'skip',
  );
}

export function useDailyChallenges(date: string) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.gamification.getDailyChallenges,
    isAuthenticated ? { date } : 'skip',
  );
}

export function useProjectGoals(threadId: string | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.gamification.getProjectGoals,
    isAuthenticated && threadId ? { threadId } : 'skip',
  );
}

export function useCompleteDailyChallenge() {
  return useMutation(api.gamification.completeDailyChallenge);
}

export function useValidateAndCompleteDailyChallenge() {
  return useAction(api.gamification.validateAndCompleteDailyChallenge);
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

export type DimensionScore = { score: number; weight: number };
export type ProjectScores = {
  validation: DimensionScore;
  design: DimensionScore;
  development: DimensionScore;
  distribution: DimensionScore;
  updatedAt: number | null;
};

export type DailyChallenge = {
  _id: Id<'dailyChallenges'>;
  label: string;
  points: number;
  completed: boolean;
  dimension?: string;
  lastValidationAttemptAt?: number;
  lastRejectionMessage?: string;
};

export type ProjectGoal = {
  _id: Id<'goals'>;
  title: string;
  points: number;
  completed: boolean;
  createdBy: string;
  dimension?: string;
};

export function useUserMemory() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.memory.getUserMemory, isAuthenticated ? {} : 'skip');
}

export function useProjectMemory(projectId: Id<'projects'> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.memory.getProjectMemory,
    isAuthenticated && projectId ? { projectId } : 'skip',
  );
}

export function useListProjects() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.projects.listProjects, isAuthenticated ? {} : 'skip');
}

export function useSetActiveProject() {
  return useMutation(api.projects.setActiveProject);
}
