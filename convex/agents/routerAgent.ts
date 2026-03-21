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
  detectedLanguage: string; // BCP-47: 'fr', 'en', 'ar', 'es'...
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

  return `You are a routing agent. Your job: route the user message to the right specialist and distill it into a sharp, first-person intent statement.

Specialists:
- general: strategic co-founder advice, motivation, blocking issues, general project questions
- validation: market analysis, competitor research, target users, problem-solution fit, idea validation
- design: UX/UI, screen flows, component structure, user experience, visual design
- development: tech stack, architecture, data models, implementation guidance, code decisions
- distribution: go-to-market, launch strategy, content creation, growth, channels, viral mechanics

Project radar scores (0 to 100):
${scores}${weakNote}

Memory fragments available:
${memLines}

User message:
${content}

Instructions:
1. Choose the best specialist for this message (default to "general" if unclear)
2. Write processedMessage — ALWAYS rewrite, never copy verbatim. Rules:
   - First person: start with "I" ("I want to...", "I need...", "I'm trying to...")
   - Distill intent: remove filler, keep every meaningful detail and nuance
   - Add one agentic artifact at the end (after an em dash —): name the approach or tool
     e.g. "— mapping competitors and gaps", "— reviewing stack options", "— drafting GTM strategy"
   - 1-2 sentences max. No padding, no preamble.
   - Examples:
     input: "what are competitors using?"
     output: "I want to understand the competitive tech landscape — analyzing competitor positioning and identifying gaps."
     input: "I'm not sure if my idea makes sense for the market"
     output: "I need to validate whether my idea has real market fit — assessing problem-solution alignment and target user signals."
3. Select 3-5 memory fragments most relevant for the chosen specialist
4. Detect the language of the user's ORIGINAL message (before any rewriting).
   Return it as detectedLanguage using a BCP-47 code (e.g. "fr", "en", "ar", "es").
   Default to "en" if the language cannot be determined.
5. Return ONLY valid JSON, no prose, no markdown:
{"specialist":"<type>","processedMessage":"<rewritten first-person statement>","selectedMemory":[{"key":"...","value":"..."}],"detectedLanguage":"<bcp47>"}`;
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
      model: anthropic('claude-haiku-4-5'),
      prompt: buildRouterPrompt(content, allMemory, projectScores),
    });
    text = result.text;
  }
  catch {
    // If routing fails, fall back to general agent with original message
    return { specialist: 'general', processedMessage: content, selectedMemory: allMemory.slice(0, 5), detectedLanguage: 'en' };
  }

  try {
    const raw = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw) as {
      specialist?: string;
      processedMessage?: string;
      selectedMemory?: unknown[];
      detectedLanguage?: string;
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

    const detectedLanguage = typeof parsed.detectedLanguage === 'string' && parsed.detectedLanguage.length > 0
      ? parsed.detectedLanguage
      : 'en';

    return { specialist, processedMessage, selectedMemory, detectedLanguage };
  }
  catch {
    return { specialist: 'general', processedMessage: content, selectedMemory: allMemory.slice(0, 5), detectedLanguage: 'en' };
  }
}
