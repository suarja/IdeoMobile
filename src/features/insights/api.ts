import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Auth-dependent queries MUST use 'skip' until Convex auth is established.

export type ArtifactType = 'validation' | 'tracking' | 'market';

export type Artifact = Doc<'artifacts'>;

export function useArtifacts(type: ArtifactType, projectId?: Id<'projects'> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.artifacts.listArtifacts,
    isAuthenticated ? { type, ...(projectId ? { projectId } : {}) } : 'skip',
  );
}

export function useMarketAnalysisJob(projectId: Id<'projects'> | null | undefined) {
  return useQuery(
    api.market.getMarketJob,
    projectId ? { projectId } : 'skip',
  );
}

export function useLaunchMarketAnalysis() {
  return useMutation(api.market.launchMarketAnalysis);
}

export function useLatestMarketArtifact(projectId: Id<'projects'> | null | undefined) {
  return useQuery(
    api.artifacts.getLatestMarketArtifactPublic,
    projectId ? { projectId } : 'skip',
  );
}
