import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  threads: defineTable({
    userId: v.string(),
    threadId: v.string(),
    createdAt: v.number(),
  }).index('by_userId', ['userId']),

  messages: defineTable({
    threadId: v.string(),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    createdAt: v.number(),
  }).index('by_threadId', ['threadId']),
});
