import { useEffect, useState } from 'react';

import { POC_USER_ID, useGetOrCreateThread, useMessages, useSendMessage } from './api';

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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const getOrCreateThread = useGetOrCreateThread();
  const sendMessage = useSendMessage();
  const messages = useMessages(threadId);

  // Bootstrap thread once on mount.
  // POC_USER_ID is a stub — replace with ctx.auth when auth lands.
  useEffect(() => {
    getOrCreateThread({ userId: POC_USER_ID })
      .then(id => setThreadId(id))
      .catch(console.error);
  }, [getOrCreateThread]);

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
