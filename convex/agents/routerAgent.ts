import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentType = 'validation' | 'design' | 'development' | 'distribution' | 'general';

type MemEntry = { key: string; value: string };

type ProjectScores = {
  validation?: number;
  design?: number;
  development?: number;
  distribution?: number;
} | null;

export type RouterDecision = {
  specialist: AgentType;
  processedMessage: string;
  selectedMemory: MemEntry[];
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildRouterPrompt(
  content: string,
  allMemory: MemEntry[],
  projectScores: ProjectScores,
): string {
  const memLines = allMemory.map(m => `- ${m.key}: ${m.value}`).join('\n') || '(none)';
  const scores = projectScores
    ? Object.entries(projectScores).map(([k, v]) => `  ${k}: ${v ?? 0}`).join('\n')
    : '  (no scores yet)';

  // Identify weak dimensions (score < 30) to boost routing toward them
  const weakDimensions = projectScores
    ? Object.entries(projectScores)
        .filter(([, v]) => (v ?? 0) < 30)
        .map(([k]) => k)
    : [];

  const weakNote = weakDimensions.length > 0
    ? `\nWeak dimensions (score < 30, prioritize): ${weakDimensions.join(', ')}`
    : '';

  return `You are a routing agent. Analyze the user message and decide which specialist agent to route it to.

Specialists:
- general: strategic co-founder advice, motivation, blocking issues, general project questions
- validation: market analysis, competitor research, target users, problem-solution fit, idea validation
- design: UX/UI, screen flows, component structure, user experience, visual design
- development: tech stack, architecture, data models, implementation guidance, code decisions
- distribution: go-to-market, launch strategy, content creation, growth, channels, viral mechanics

Project radar scores (0-100):
${scores}${weakNote}

Memory fragments available:
${memLines}

User message:
${content}

Instructions:
1. Choose the best specialist for this message (default to "general" if unclear)
2. processedMessage rules — critical:
   - If the message is ≤ 800 tokens: return it VERBATIM, unchanged, as processedMessage
   - If the message is > 800 tokens: compress to a concise first-person statement that starts with "I" ("I want to...", "I'm looking to...", "I need help with...") — preserve intent + key facts
3. Select 3-5 memory fragments most relevant for the chosen specialist
4. Return ONLY valid JSON, no prose, no markdown:
{"specialist":"<type>","processedMessage":"<message or compressed version>","selectedMemory":[{"key":"...","value":"..."}]}`;
}

// ---------------------------------------------------------------------------
// Router — plain async function, called directly from sendMessage
// ---------------------------------------------------------------------------

const VALID_SPECIALISTS = ['validation', 'design', 'development', 'distribution', 'general'] as const;

type RouteMessageArgs = {
  content: string;
  userMem: MemEntry[];
  projectMem: MemEntry[];
  projectScores: ProjectScores;
};

export async function routeMessage({ content, userMem, projectMem, projectScores }: RouteMessageArgs): Promise<RouterDecision> {
  const allMemory = [...userMem, ...projectMem];

  let text: string;
  try {
    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt: buildRouterPrompt(content, allMemory, projectScores),
    });
    text = result.text;
  }
  catch {
    // If routing fails, fall back to general agent with original message
    return { specialist: 'general', processedMessage: content, selectedMemory: allMemory.slice(0, 5) };
  }

  try {
    const raw = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw) as {
      specialist?: string;
      processedMessage?: string;
      selectedMemory?: unknown[];
    };

    const specialist = VALID_SPECIALISTS.includes(parsed.specialist as AgentType)
      ? (parsed.specialist as AgentType)
      : 'general';

    const processedMessage = typeof parsed.processedMessage === 'string' && parsed.processedMessage.length > 0
      ? parsed.processedMessage
      : content;

    const selectedMemory = Array.isArray(parsed.selectedMemory)
      ? (parsed.selectedMemory as MemEntry[]).filter(
          (m): m is MemEntry =>
            typeof m === 'object' && m !== null && typeof m.key === 'string' && typeof m.value === 'string',
        ).slice(0, 5)
      : allMemory.slice(0, 5);

    return { specialist, processedMessage, selectedMemory };
  }
  catch {
    return { specialist: 'general', processedMessage: content, selectedMemory: allMemory.slice(0, 5) };
  }
}
