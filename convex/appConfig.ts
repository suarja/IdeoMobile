import { internalMutation, query } from './_generated/server';

export const getAppConfig = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query('appConfig').collect();
    return configs[0] ?? null;
  },
});

export const seedAppConfig = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('appConfig').collect();
    if (existing.length > 0)
      return;
    await ctx.db.insert('appConfig', {
      supportEmail: 'support@ideo.app',
      appStoreUrl: '',
      shareUrl: '',
      privacyUrl: '',
      termsUrl: '',
      websiteUrl: '',
      githubUrl: '',
    });
  },
});
