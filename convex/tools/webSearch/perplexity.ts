// Perplexity Sonar API — https://docs.perplexity.ai
// Requires env var: PERPLEXITY_API_KEY

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

export async function perplexitySearch(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not set. Add it via: npx convex env set PERPLEXITY_API_KEY <key>');
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'user',
          content: `Search for: ${query}\n\nReturn a JSON array of search results with fields: title, url, content (1-2 sentences). Max 5 results.`,
        },
      ],
      return_citations: true,
      search_recency_filter: 'month',
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    citations?: string[];
    choices?: Array<{ message?: { content?: string } }>;
  };

  // Perplexity returns citations as URLs + a prose answer
  const citations = data.citations ?? [];
  const answer = data.choices?.[0]?.message?.content ?? '';

  if (citations.length === 0) {
    return [{ title: 'Perplexity Answer', url: '', content: answer }];
  }

  return citations.slice(0, 5).map((url, i) => ({
    title: `Source ${i + 1}`,
    url,
    content: answer,
  }));
}
