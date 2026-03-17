// Tavily Search API — https://tavily.com
// Requires env var: TAVILY_API_KEY

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export async function tavilySearch(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set. Add it via: npx convex env set TAVILY_API_KEY <key>');
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_depth: 'basic',
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
    }>;
  };

  return (data.results ?? []).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    content: r.content ?? '',
    score: r.score,
  }));
}
