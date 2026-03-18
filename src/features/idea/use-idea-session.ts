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

export type SessionEndData = {
  summary: string;
  objectives: string[];
  nextSteps: string[];
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
  sessionEndData: SessionEndData | null;
  lastMessageAt: number | null;
  handleSend: (content: string) => Promise<void>;
  handleCancel: () => void;
  enterPreview: () => void;
  handleClarificationSelect: (option: string) => void;
};

const CLARIFY_REGEX = /%%CLARIFY:(\{.*?\})%%/s;
const SESSION_END_REGEX = /%%SESSION_END%%(\{.*\})/s;

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

/** Parse the %%SESSION_END%%{...} marker from agent text. Returns null if absent or invalid. */
function parseSessionEndFromText(text: string): SessionEndData | null {
  const match = SESSION_END_REGEX.exec(text);
  if (!match)
    return null;
  try {
    return JSON.parse(match[1]) as SessionEndData;
  }
  catch {
    return null;
  }
}

/** Strip both marker types from text for display. */
export function stripClarifyMarker(text: string): string {
  return text
    .replace(CLARIFY_REGEX, '')
    .replace(SESSION_END_REGEX, '')
    .trimEnd();
}

/**
 * Extract the displayable user-facing content from a raw agent thread message.
 *
 * `buildFullPrompt` in chat.ts appends memory context and system notes to the
 * prompt before sending it to the specialist agent. The full prompt is what
 * gets stored in the agent thread — so `msg.text` looks like:
 *
 *   [SYSTEM: Last interaction was 14h ago…]\n\n{user content}\n\n## User Profile Memory\n- …
 *
 * This function strips all of that scaffolding so the UI only shows the
 * human-readable part of what was said/triggered.
 *
 * For fully-synthetic system messages (end session, topic routing), it returns
 * a friendly label instead of the raw technical string.
 */
export function getDisplayableUserContent(rawText: string): string {
  // Known fully-synthetic system messages → friendly labels
  if (/\[SYSTEM:.*session end/i.test(rawText))
    return 'Fin de session demandée';
  if (/\[SYSTEM:.*Route to.*agent/i.test(rawText))
    return 'Nouveau sujet de discussion';

  let text = rawText;

  // Strip leading [SYSTEM: …] prefix (ends at the first blank line)
  text = text.replace(/^\[SYSTEM:[^\]]*\]\s*\n\n/, '');

  // Strip trailing memory context (everything from the first "\n\n## " onwards)
  const memIdx = text.indexOf('\n\n## ');
  if (memIdx !== -1)
    text = text.slice(0, memIdx);

  return text.trim();
}

// eslint-disable-next-line max-lines-per-function
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

  // Last completed assistant message text (stripped of markers for display)
  const lastCompletedAssistant = [...results]
    .reverse()
    .find(m => m.role === 'assistant' && m.status !== 'streaming');
  const rawAssistantText = lastCompletedAssistant?.text ?? '';
  const lastAssistantText = stripClarifyMarker(rawAssistantText);

  // Adapt agent messages to legacy Message shape for compatibility.
  // Apply getDisplayableUserContent so the UI never shows raw memory context or system prompts.
  const lastUserMessage: Message | null = (() => {
    const msg = [...results].reverse().find(m => m.role === 'user');
    if (!msg)
      return null;
    const displayable = getDisplayableUserContent(msg.text ?? '');
    if (!displayable)
      return null;
    return { role: 'user', content: displayable };
  })();

  const lastAssistantMessage: Message | null = lastAssistantText
    ? { role: 'assistant', content: lastAssistantText }
    : null;

  // Clarification parsed from %%CLARIFY:{...}%% marker in last completed assistant message
  const clarification = rawAssistantText ? parseClarificationFromText(rawAssistantText) : null;

  // Session end data parsed from %%SESSION_END%%{...} marker
  const sessionEndData = rawAssistantText ? parseSessionEndFromText(rawAssistantText) : null;

  // Timestamp of the last message in the thread (for continuation chips)
  const lastMessageAt: number | null = (() => {
    const last = [...results].reverse().find(m => m.role === 'assistant' || m.role === 'user');
    return (last as any)?._creationTime ?? null;
  })();

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
    sessionEndData,
    lastMessageAt,
    handleSend,
    handleCancel,
    enterPreview,
    handleClarificationSelect,
  };
}
