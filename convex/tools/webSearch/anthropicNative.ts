// Anthropic built-in web search tool
// Available via @ai-sdk/anthropic — no extra API key needed
// Uses claude-sonnet-4.6 with web_search_20250305 tool

import { anthropic } from '@ai-sdk/anthropic';
import { generateText, stepCountIs } from 'ai';

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export async function anthropicNativeSearch(query: string): Promise<WebSearchResult[]> {
  const { text, sources } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    prompt: `Search the web for: "${query}"\n\nSummarize the top 5 most relevant results as a JSON array with fields: title, url, content (1-2 sentence summary). Return only valid JSON, no markdown.`,
    tools: {
      web_search: anthropic.tools.webSearch_20250305({
        maxUses: 3,
      }),
    },
    stopWhen: stepCountIs(5),
  });

  // Try to parse results from sources if available
  if (sources && sources.length > 0) {
    return sources.slice(0, 5).map(s => ({
      title: (s as { title?: string }).title ?? '',
      url: (s as { url?: string }).url ?? '',
      content: (s as { snippet?: string }).snippet ?? text,
    }));
  }

  // Fallback: return the text answer as a single result
  return [{ title: 'Search Result', url: '', content: text }];
}
