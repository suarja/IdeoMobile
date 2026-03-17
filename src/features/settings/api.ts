import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// appConfig is public (no auth required)
export function useAppConfig() {
  return useQuery(api.appConfig.getAppConfig, {});
}

// userProfile requires auth
export function useUserProfile() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.userProfiles.getUserProfile, isAuthenticated ? {} : 'skip');
}

export function useUpsertUserProfile() {
  return useMutation(api.userProfiles.upsertUserProfile);
}
