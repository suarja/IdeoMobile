import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  threads: defineTable({
    userId: v.string(),
    threadId: v.string(),
    title: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_threadId', ['threadId']),

  messages: defineTable({
    threadId: v.string(),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    createdAt: v.number(),
  }).index('by_threadId', ['threadId']),

  // --- Gamification ---

  levels: defineTable({
    level: v.number(),
    name: v.string(),
    minPoints: v.number(),
    iconEmoji: v.string(),
  }).index('by_level', ['level']),

  userStats: defineTable({
    userId: v.string(),
    totalPoints: v.number(),
    currentLevel: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastSessionAt: v.number(),
    activeDays: v.optional(v.array(v.string())), // YYYY-MM-DD
    standupTime: v.optional(v.string()), // "HH:MM" format for daily standup reminder
    monthlySearchCount: v.optional(v.number()), // real monthly web search count
    searchMonthStart: v.optional(v.string()), // 'YYYY-MM' of current month window
  }).index('by_userId', ['userId']),

  projectScores: defineTable({
    userId: v.string(),
    threadId: v.string(),
    validationScore: v.number(),
    designScore: v.number(),
    developmentScore: v.number(),
    distributionScore: v.number(),
    validationWeight: v.number(),
    designWeight: v.number(),
    developmentWeight: v.number(),
    distributionWeight: v.number(),
    updatedAt: v.number(),
  })
    .index('by_threadId', ['threadId'])
    .index('by_userId', ['userId']),

  voiceSessions: defineTable({
    userId: v.string(),
    threadId: v.string(),
    pointsEarned: v.number(),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_threadId', ['threadId']),

  dailyChallenges: defineTable({
    userId: v.string(),
    date: v.string(),
    challengeType: v.string(),
    label: v.string(),
    dimension: v.optional(v.string()),
    points: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    lastValidationAttemptAt: v.optional(v.number()),
    lastRejectionMessage: v.optional(v.string()),
    failed: v.optional(v.boolean()),
    carriedOver: v.optional(v.boolean()),
    validationType: v.optional(v.union(v.literal('conversation'), v.literal('github'))),
    completedByCron: v.optional(v.boolean()),
    seenAt: v.optional(v.number()),
    completionNote: v.optional(v.string()),
  }).index('by_userId_date', ['userId', 'date']),

  goals: defineTable({
    userId: v.string(),
    threadId: v.string(),
    title: v.string(),
    points: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    createdBy: v.string(),
    dimension: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_threadId', ['threadId'])
    .index('by_userId', ['userId']),

  dailyMoods: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    moodScore: v.number(), // 1 to 5
    createdAt: v.number(),
  }).index('by_userId_date', ['userId', 'date']),

  // --- Projects & Memory ---

  projects: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    threadId: v.string(),
    isActive: v.boolean(),
    isTracked: v.optional(v.boolean()), // included in daily tracking cron
    status: v.union(v.literal('active'), v.literal('paused'), v.literal('abandoned')),
    createdAt: v.number(),
    validationSearchCount: v.optional(v.number()),
    trackingThreadId: v.optional(v.string()), // thread persistant pour le tracking cron
    projectLinks: v.optional(v.object({
      github: v.optional(v.string()),
      website: v.optional(v.string()),
      tiktok: v.optional(v.string()),
      instagram: v.optional(v.string()),
    })),
  })
    .index('by_userId', ['userId'])
    .index('by_threadId', ['threadId'])
    .index('by_userId_active', ['userId', 'isActive']),

  userMemory: defineTable({
    userId: v.string(),
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_key', ['userId', 'key']),

  projectMemory: defineTable({
    projectId: v.id('projects'),
    userId: v.string(),
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_key', ['projectId', 'key']),

  // --- Web Search Logs ---

  webSearchLogs: defineTable({
    userId: v.string(),
    threadId: v.string(),
    specialist: v.string(),
    query: v.string(),
    resultCount: v.number(),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_threadId', ['threadId']),

  // --- API Usage ---

  apiUsage: defineTable({
    userId: v.string(),
    threadId: v.string(),
    specialist: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_threadId', ['threadId']),

  // --- Artifacts ---

  artifacts: defineTable({
    userId: v.string(),
    threadId: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
    type: v.union(v.literal('validation'), v.literal('tracking')),
    title: v.string(),
    content: v.string(),
    tldr: v.string(),
    date: v.string(), // YYYY-MM-DD
    createdAt: v.number(),
  })
    .index('by_user_type', ['userId', 'type'])
    .index('by_user_date', ['userId', 'date'])
    .index('by_project_type', ['projectId', 'type'])
    .index('by_project_date', ['projectId', 'date']),

  // --- App Config ---

  appConfig: defineTable({
    supportEmail: v.string(),
    appStoreUrl: v.string(),
    shareUrl: v.string(),
    privacyUrl: v.string(),
    termsUrl: v.string(),
    websiteUrl: v.string(),
    githubUrl: v.string(),
  }),

  // --- User Profiles ---

  userProfiles: defineTable({
    userId: v.string(),
    socialLinks: v.array(
      v.object({
        platform: v.union(
          v.literal('github'),
          v.literal('instagram'),
          v.literal('tiktok'),
          v.literal('website'),
        ),
        url: v.string(),
      }),
    ),
    notificationPreferences: v.optional(v.object({
      standupReminder: v.boolean(),
    })),
    pushToken: v.optional(v.string()), // device push token (APNs/FCM) — stored for future push notifications
    githubToken: v.optional(v.string()), // GitHub PAT for accessing private repos
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  // --- Scrape Cache ---

  scrapeCache: defineTable({
    userId: v.string(),
    url: v.string(),
    content: v.string(),
    scrapedAt: v.number(),
  }).index('by_userId_url', ['userId', 'url']),
});
