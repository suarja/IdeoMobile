import type { Id } from '../../../convex/_generated/dataModel';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Auth-dependent queries MUST use 'skip' until Convex auth is established.

export type ArtifactType = 'validation' | 'tracking';

export type Artifact = {
  _id: Id<'artifacts'>;
  userId: string;
  threadId?: string;
  type: ArtifactType;
  title: string;
  content: string;
  tldr: string;
  date: string;
  createdAt: number;
};

export function useArtifacts(type: ArtifactType) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.artifacts.listArtifacts,
    isAuthenticated ? { type } : 'skip',
  );
}
