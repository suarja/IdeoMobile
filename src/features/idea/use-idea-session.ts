import { useConvexAuth } from 'convex/react';

import { useEffect, useState } from 'react';

import { useActiveProject, useGetOrCreateThread, useMessages, useSendMessage } from './api';

type Message = { role: string; content: string };

type IdeaSession = {
  isSending: boolean;
  isPreview: boolean;
  agentError: string | null;
  lastUserMessage: Message | null;
  lastAssistantMessage: Message | null;
  handleSend: (content: string) => Promise<void>;
  handleCancel: () => void;
  enterPreview: () => void;
};

export function useIdeaSession(): IdeaSession {
  const [isSending, setIsSending] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const { isAuthenticated } = useConvexAuth();
  const getOrCreateThread = useGetOrCreateThread();
  const sendMessage = useSendMessage();

  // Reactive subscription: updates automatically when the active project changes
  // (e.g. after setActiveProject is called from the Projects sheet)
  const activeProject = useActiveProject();
  const threadId = activeProject?.threadId ?? null;

  const messages = useMessages(threadId);

  // Ensure a project exists on mount. Result is ignored — threadId comes
  // reactively from useActiveProject above, not from this call's return value.
  useEffect(() => {
    if (!isAuthenticated)
      return;
    getOrCreateThread({}).catch(console.error);
  }, [isAuthenticated, getOrCreateThread]);

  const lastUserMessage = messages
    ? [...messages].reverse().find(m => m.role === 'user') ?? null
    : null;

  const lastAssistantMessage = messages
    ? [...messages].reverse().find(m => m.role === 'assistant') ?? null
    : null;

  const enterPreview = () => setIsPreview(true);

  const handleCancel = () => {
    setIsPreview(false);
    setAgentError(null);
  };

  /**
   * Sends transcript content to the Convex agent.
   * State is cleared before the await so the UI resets immediately
   * rather than waiting for the network round-trip to complete.
   */
  const handleSend = async (content: string) => {
    if (!threadId || !content.trim())
      return;
    setIsPreview(false);
    setIsSending(true);
    setAgentError(null);
    try {
      await sendMessage({ threadId, content: content.trim() });
    }
    catch (err) {
      console.error('Agent error:', err);
      setAgentError('Failed to get a response. Please try again.');
    }
    finally {
      setIsSending(false);
    }
  };

  return {
    isSending,
    isPreview,
    agentError,
    lastUserMessage,
    lastAssistantMessage,
    handleSend,
    handleCancel,
    enterPreview,
  };
}
