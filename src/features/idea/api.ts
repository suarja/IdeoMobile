import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export function useGetOrCreateThread() {
  return useMutation(api.chat.getOrCreateThread);
}

export function useSendMessage() {
  return useAction(api.chat.sendMessage);
}

export function useMessages(threadId: string | null) {
  return useQuery(api.chat.listMessages, threadId ? { threadId } : 'skip');
}
