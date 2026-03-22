export async function firecrawlScrape(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey)
    return `[FIRECRAWL_API_KEY not set — cannot scrape ${url}]`;

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });

  if (!response.ok)
    return `[Firecrawl error ${response.status} for ${url}]`;

  const data = await response.json() as { data?: { markdown?: string } };
  return data.data?.markdown?.slice(0, 3000) ?? `[No content for ${url}]`;
}
