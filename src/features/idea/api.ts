import { useUIMessages } from '@convex-dev/agent/react';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function useGetOrCreateThread() {
  return useMutation(api.chat.getOrCreateThread);
}

export function useActiveThread() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.chat.getActiveThread, isAuthenticated ? {} : 'skip');
}

export function useSendMessage() {
  return useAction(api.chat.sendMessage);
}

export function useMessages(threadId: string | null) {
  return useQuery(api.chat.listMessages, threadId ? { threadId } : 'skip');
}

export function useCreateProject() {
  return useMutation(api.projects.createProject);
}

export function useActiveProject() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.projects.getActiveProject, isAuthenticated ? {} : 'skip');
}

export function useAgentThreadMessages(threadId: string | null) {
  return useUIMessages(
    api.chat.listThreadMessages,
    threadId ? { threadId } : 'skip',
    { initialNumItems: 30, stream: true },
  );
}

export function useSaveDailyMood() {
  return useMutation(api.gamification.saveDailyMood);
}
