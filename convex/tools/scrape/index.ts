import { firecrawlScrape } from './firecrawl';
import { githubFetch } from './github';

export async function scrapeUrl(url: string, githubToken?: string): Promise<string> {
  if (url.includes('github.com'))
    return githubFetch(url, githubToken);
  return firecrawlScrape(url);
}
