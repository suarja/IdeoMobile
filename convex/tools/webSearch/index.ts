// Web search provider selection
// Set WEB_SEARCH_PROVIDER env var to: 'tavily' | 'perplexity' | 'anthropic'
// Default: 'tavily'

import type { WebSearchResult } from './tavily';

export type { WebSearchResult } from './tavily';

export async function webSearch(query: string): Promise<WebSearchResult[]> {
  const provider = process.env.WEB_SEARCH_PROVIDER ?? 'tavily';

  switch (provider) {
    case 'perplexity': {
      const { perplexitySearch } = await import('./perplexity');
      return perplexitySearch(query);
    }
    case 'anthropic': {
      const { anthropicNativeSearch } = await import('./anthropicNative');
      return anthropicNativeSearch(query);
    }
    case 'tavily':
    default: {
      const { tavilySearch } = await import('./tavily');
      return tavilySearch(query);
    }
  }
}
