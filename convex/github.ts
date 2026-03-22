import { v } from 'convex/values';

import { action } from './_generated/server';
import { githubFetch } from './tools/scrape/github';

export const validateGitHubToken = action({
  args: { token: v.string(), repoUrl: v.string() },
  handler: async (_ctx, { token, repoUrl }) => {
    const content = await githubFetch(repoUrl, token);
    const ok = !content.startsWith('[');
    return { ok, preview: ok ? content.slice(0, 200) : content };
  },
});
