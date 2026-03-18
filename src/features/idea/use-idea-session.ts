import { useConvexAuth } from 'convex/react';

import { useEffect, useState } from 'react';

import { useActiveProject, useAgentThreadMessages, useGetOrCreateThread, useSendMessage } from './api';

export type ClarificationType = 'single_choice' | 'multi_select' | 'confirm_cancel';

export type Clarification = {
  question: string;
  type: ClarificationType;
  options?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
};

type Message = { role: string; content: string };

type IdeaSession = {
  isSending: boolean;
  isPreview: boolean;
  isSynthesizing: boolean;
  agentError: string | null;
  lastUserMessage: Message | null;
  lastAssistantMessage: Message | null;
  streamingText: string;
  clarification: Clarification | null;
  handleSend: (content: string) => Promise<void>;
  handleCancel: () => void;
  enterPreview: () => void;
  handleClarificationSelect: (option: string) => void;
};

const CLARIFY_REGEX = /%%CLARIFY:(\{.*?\})%%/s;

/** Parse the %%CLARIFY:{...}%% marker from agent text. Returns null if absent or invalid. */
function parseClarificationFromText(text: string): Clarification | null {
  const match = CLARIFY_REGEX.exec(text);
  if (!match)
    return null;
  try {
    return JSON.parse(match[1]) as Clarification;
  }
  catch {
    return null;
  }
}

/** Strip the %%CLARIFY:{...}%% marker from text for display. */
export function stripClarifyMarker(text: string): string {
  return text.replace(CLARIFY_REGEX, '').trimEnd();
}

export function useIdeaSession(): IdeaSession {
  const [isSending, setIsSending] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const { isAuthenticated } = useConvexAuth();
  const getOrCreateThread = useGetOrCreateThread();
  const sendMessage = useSendMessage();

  // Reactive subscription: updates automatically when the active project changes
  const activeProject = useActiveProject();
  const threadId = activeProject?.threadId ?? null;

  const agentMessages = useAgentThreadMessages(threadId);

  // Ensure a project exists on mount.
  useEffect(() => {
    if (!isAuthenticated)
      return;
    getOrCreateThread({}).catch(console.error);
  }, [isAuthenticated, getOrCreateThread]);

  const results = agentMessages.results ?? [];

  // Last streaming message (assistant, currently streaming)
  const streamingMsg = [...results].reverse().find(
    m => m.role === 'assistant' && m.status === 'streaming',
  );
  const rawStreamingText = streamingMsg?.text ?? '';
  const streamingText = stripClarifyMarker(rawStreamingText);

  // Is synthesizing = we just sent OR there's an active streaming message
  const hasStreamingMsg = results.some(m => m.role === 'assistant' && m.status === 'streaming');
  const isSynthesizing = isSending || hasStreamingMsg;

  // Last completed assistant message text (stripped of clarify marker for display)
  const lastCompletedAssistant = [...results]
    .reverse()
    .find(m => m.role === 'assistant' && m.status !== 'streaming');
  const rawAssistantText = lastCompletedAssistant?.text ?? '';
  const lastAssistantText = stripClarifyMarker(rawAssistantText);

  // Adapt agent messages to legacy Message shape for compatibility
  const lastUserMessage: Message | null = (() => {
    const msg = [...results].reverse().find(m => m.role === 'user');
    if (!msg)
      return null;
    return { role: 'user', content: msg.text ?? '' };
  })();

  const lastAssistantMessage: Message | null = lastAssistantText
    ? { role: 'assistant', content: lastAssistantText }
    : null;

  // Clarification parsed from %%CLARIFY:{...}%% marker in last completed assistant message
  const clarification = rawAssistantText ? parseClarificationFromText(rawAssistantText) : null;

  const enterPreview = () => setIsPreview(true);

  const handleCancel = () => {
    setIsPreview(false);
    setAgentError(null);
  };

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

  const handleClarificationSelect = (option: string) => {
    handleSend(option).catch(console.error);
  };

  return {
    isSending,
    isPreview,
    isSynthesizing,
    agentError,
    lastUserMessage,
    lastAssistantMessage,
    streamingText,
    clarification,
    handleSend,
    handleCancel,
    enterPreview,
    handleClarificationSelect,
  };
}
