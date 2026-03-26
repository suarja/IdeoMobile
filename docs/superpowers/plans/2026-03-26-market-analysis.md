# Market Analysis Approfondie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Async market analysis pipeline (competitors, TAM, trends, synthesis) unlocked by the chat agent, launched by the user from Insights, delivered as a persistent artifact.

**Architecture:** Chat agent calls `unlockMarketAnalysis` tool → project flag set → Insights banner appears → user taps "Launch" → `launchMarketAnalysis` mutation creates a job + schedules a Convex Workflow → 5 sequential steps (web search + LLM per section + synthesis) update job progress → `onComplete` sets job done → banner shows "View" button → artifact opened in existing `ArtifactDetailSheet`.

**Tech Stack:** `@convex-dev/workflow`, `@convex-dev/agent` (already installed), Tavily/web search (existing), `@ai-sdk/anthropic` (existing), React Native + Convex React.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `convex/schema.ts` | Modify | Add `marketAnalysisAvailable` to projects, add `marketAnalysisJobs` table, extend `artifacts.type` |
| `convex/convex.config.ts` | Modify | Register `@convex-dev/workflow` component |
| `convex/artifacts.ts` | Modify | Accept `'market'` type in args, add `getLatestMarketArtifact` query |
| `convex/market.ts` | Create | WorkflowManager, job mutations/queries, workflow definition, step actions |
| `convex/market.test.ts` | Create | Tests for `launchMarketAnalysis` guards |
| `convex/chat.ts` | Modify | Add `unlockMarketAnalysis` to `buildCommonTools` |
| `src/features/insights/api.ts` | Modify | Add `useMarketAnalysisJob`, `useLaunchMarketAnalysis`, `useLatestMarketArtifact` |
| `src/features/insights/components/market-analysis-banner.tsx` | Create | Banner component (all 5 states) |
| `src/features/insights/insights-screen.tsx` | Modify | Mount banner above artifact list in validation tab |
| `src/translations/en.json` | Modify | Market analysis keys |
| `src/translations/ar.json` | Modify | Market analysis keys (Arabic) |

---

## Task 1: Install @convex-dev/workflow + Schema

**Files:**
- Modify: `package.json` (via npm)
- Modify: `convex/convex.config.ts`
- Modify: `convex/schema.ts`

- [ ] **Step 1: Install the package**

```bash
cd /path/to/IdeoMobile
npm install @convex-dev/workflow
```

Expected: package added to `node_modules/@convex-dev/workflow`.

- [ ] **Step 2: Register in convex.config.ts**

Replace the full content of `convex/convex.config.ts`:

```typescript
import agent from '@convex-dev/agent/convex.config';
import workflow from '@convex-dev/workflow/convex.config';
import { defineApp } from 'convex/server';

const app = defineApp();
app.use(agent);
app.use(workflow);

export default app;
```

- [ ] **Step 3: Add marketAnalysisAvailable to projects table**

In `convex/schema.ts`, inside the `projects: defineTable({...})` block (around line 110), add after `projectLinks`:

```typescript
    marketAnalysisAvailable: v.optional(v.boolean()),
```

Full projects block after change:
```typescript
  projects: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    threadId: v.string(),
    isActive: v.boolean(),
    isTracked: v.optional(v.boolean()),
    status: v.union(v.literal('active'), v.literal('paused'), v.literal('abandoned')),
    createdAt: v.number(),
    validationSearchCount: v.optional(v.number()),
    trackingThreadId: v.optional(v.string()),
    projectLinks: v.optional(v.object({
      github: v.optional(v.string()),
      website: v.optional(v.string()),
      tiktok: v.optional(v.string()),
      instagram: v.optional(v.string()),
    })),
    marketAnalysisAvailable: v.optional(v.boolean()),
  })
    .index('by_userId', ['userId'])
    .index('by_threadId', ['threadId'])
    .index('by_userId_active', ['userId', 'isActive']),
```

- [ ] **Step 4: Add 'market' to artifacts.type union**

In `convex/schema.ts`, find the `artifacts: defineTable({...})` block (~line 179) and update the `type` field:

```typescript
    type: v.union(v.literal('validation'), v.literal('tracking'), v.literal('market')),
```

- [ ] **Step 5: Add marketAnalysisJobs table**

In `convex/schema.ts`, after the `artifacts` table definition (after its closing `.index(...)` line), add:

```typescript
  // --- Market Analysis Jobs ---

  marketAnalysisJobs: defineTable({
    projectId: v.id('projects'),
    userId: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('done'),
      v.literal('error'),
    ),
    currentStep: v.string(),
    stepsTotal: v.number(),
    stepsDone: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId']),
```

- [ ] **Step 6: Push schema to Convex dev**

```bash
npx convex dev --once
```

Expected: schema compiled without errors. Check Convex dashboard for new `marketAnalysisJobs` table.

- [ ] **Step 7: Commit**

```bash
git add convex/schema.ts convex/convex.config.ts package.json package-lock.json
git commit -m "feat(market): install workflow component + schema (jobs table, marketAnalysisAvailable, market artifact type)"
```

---

## Task 2: Update artifacts.ts

**Files:**
- Modify: `convex/artifacts.ts`

- [ ] **Step 1: Update listArtifacts args to accept 'market'**

In `convex/artifacts.ts`, update the `listArtifacts` query args and the `ArtifactType` union:

```typescript
export const listArtifacts = query({
  args: {
    type: v.union(v.literal('validation'), v.literal('tracking'), v.literal('market')),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, { type, projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return [];
    const userId = identity.subject;

    if (projectId) {
      return ctx.db
        .query('artifacts')
        .withIndex('by_project_type', q => q.eq('projectId', projectId).eq('type', type))
        .order('desc')
        .take(30);
    }

    return ctx.db
      .query('artifacts')
      .withIndex('by_user_type', q => q.eq('userId', userId).eq('type', type))
      .order('desc')
      .take(30);
  },
});
```

- [ ] **Step 2: Add getLatestMarketArtifact internal query**

After the `getRecentTldrs` function in `convex/artifacts.ts`, add:

```typescript
export const getLatestMarketArtifact = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return ctx.db
      .query('artifacts')
      .withIndex('by_project_type', q => q.eq('projectId', projectId).eq('type', 'market'))
      .order('desc')
      .first();
  },
});
```

Also add a public version for the frontend hook:

```typescript
export const getLatestMarketArtifactPublic = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;
    return ctx.db
      .query('artifacts')
      .withIndex('by_project_type', q => q.eq('projectId', projectId).eq('type', 'market'))
      .order('desc')
      .first();
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add convex/artifacts.ts
git commit -m "feat(market): extend artifacts to support 'market' type"
```

---

## Task 3: Create convex/market.ts — job mutations and queries

**Files:**
- Create: `convex/market.ts`
- Create: `convex/market.test.ts`

- [ ] **Step 1: Write the failing test**

Create `convex/market.test.ts`:

```typescript
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const modules = import.meta.glob('./**/*.ts');

describe('launchMarketAnalysis', () => {
  it('returns error if project not found', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.market.launchMarketAnalysis, {
        projectId: 'projects:fake123' as any,
      }),
    ).rejects.toThrow();
  });

  it('returns error if marketAnalysisAvailable is false', async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: 'user1' }, async () => {
      // Create a project without the flag
      const projectId = await t.mutation(internal.projects.createProjectAndThread, { name: 'Test' });
      await expect(
        t.mutation(api.market.launchMarketAnalysis, { projectId: projectId.projectId }),
      ).rejects.toThrow('not available');
    });
  });

  it('creates a job when marketAnalysisAvailable is true', async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: 'user1' }, async () => {
      const { projectId } = await t.mutation(internal.projects.createProjectAndThread, { name: 'My Idea' });
      await t.run(async (ctx) => {
        await ctx.db.patch(projectId, { marketAnalysisAvailable: true });
      });
      // Should not throw
      await t.mutation(api.market.launchMarketAnalysis, { projectId });
      // Job created
      const job = await t.query(api.market.getMarketJob, { projectId });
      expect(job).not.toBeNull();
      expect(job?.status).toBe('pending');
    });
  });

  it('is idempotent — does not create second job if pending', async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity({ subject: 'user1' }, async () => {
      const { projectId } = await t.mutation(internal.projects.createProjectAndThread, { name: 'My Idea' });
      await t.run(async (ctx) => {
        await ctx.db.patch(projectId, { marketAnalysisAvailable: true });
      });
      await t.mutation(api.market.launchMarketAnalysis, { projectId });
      // Second call should throw
      await expect(
        t.mutation(api.market.launchMarketAnalysis, { projectId }),
      ).rejects.toThrow('already running');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:convex convex/market.test.ts
```

Expected: fail with "cannot find module" or similar — file doesn't exist yet.

- [ ] **Step 3: Create convex/market.ts with WorkflowManager + job mutations + launchMarketAnalysis**

Create `convex/market.ts`:

```typescript
import { vWorkflowId, vResultValidator, WorkflowManager } from '@convex-dev/workflow';
import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { components, internal } from './_generated/api';

// ---------------------------------------------------------------------------
// Workflow manager
// ---------------------------------------------------------------------------

export const marketWorkflow = new WorkflowManager(components.workflow);

// ---------------------------------------------------------------------------
// Internal job mutations
// ---------------------------------------------------------------------------

export const updateJobStep = internalMutation({
  args: {
    jobId: v.id('marketAnalysisJobs'),
    currentStep: v.string(),
    stepsDone: v.number(),
  },
  handler: async (ctx, { jobId, currentStep, stepsDone }) => {
    await ctx.db.patch(jobId, { currentStep, stepsDone, status: 'running' });
  },
});

export const setJobDone = internalMutation({
  args: { jobId: v.id('marketAnalysisJobs') },
  handler: async (ctx, { jobId }) => {
    await ctx.db.patch(jobId, { status: 'done' });
  },
});

export const setJobError = internalMutation({
  args: { jobId: v.id('marketAnalysisJobs'), errorMessage: v.string() },
  handler: async (ctx, { jobId, errorMessage }) => {
    await ctx.db.patch(jobId, { status: 'error', errorMessage });
  },
});

export const setMarketAnalysisAvailable = internalMutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    await ctx.db.patch(projectId, { marketAnalysisAvailable: true });
  },
});

// ---------------------------------------------------------------------------
// onComplete callback (called by Workflow after full completion or failure)
// ---------------------------------------------------------------------------

export const onWorkflowComplete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.id('marketAnalysisJobs'),
  },
  handler: async (ctx, { result, context: jobId }) => {
    if (result.kind === 'success') {
      await ctx.db.patch(jobId, { status: 'done' });
    } else if (result.kind === 'error') {
      await ctx.db.patch(jobId, { status: 'error', errorMessage: result.error });
    }
  },
});

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export const getMarketJob = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return null;
    return ctx.db
      .query('marketAnalysisJobs')
      .withIndex('by_project', q => q.eq('projectId', projectId))
      .order('desc')
      .first();
  },
});

// ---------------------------------------------------------------------------
// Public mutations
// ---------------------------------------------------------------------------

export const launchMarketAnalysis = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      throw new Error('Unauthenticated');
    const userId = identity.subject;

    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId)
      throw new Error('Project not found');
    if (!project.marketAnalysisAvailable)
      throw new Error('Market analysis not available for this project');

    // Idempotence: block if already running
    const existing = await ctx.db
      .query('marketAnalysisJobs')
      .withIndex('by_project', q => q.eq('projectId', projectId))
      .order('desc')
      .first();
    if (existing && (existing.status === 'pending' || existing.status === 'running')) {
      throw new Error('Analysis already running');
    }

    const projectName = project.name ?? 'Your project';

    const jobId = await ctx.db.insert('marketAnalysisJobs', {
      projectId,
      userId,
      status: 'pending',
      currentStep: 'Initialisation',
      stepsTotal: 5,
      stepsDone: 0,
      createdAt: Date.now(),
    });

    await marketWorkflow.start(
      ctx,
      internal.market.runMarketWorkflow,
      { projectId, jobId, userId, projectName },
      {
        onComplete: internal.market.onWorkflowComplete,
        context: jobId,
      },
    );

    return jobId;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:convex convex/market.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/market.ts convex/market.test.ts
git commit -m "feat(market): job mutations, launchMarketAnalysis mutation with idempotency guards"
```

---

## Task 4: Add workflow definition + step actions to convex/market.ts

**Files:**
- Modify: `convex/market.ts`

- [ ] **Step 1: Add searchAndAnalyzeAction (internal action)**

Append to `convex/market.ts`:

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { webSearch } from './tools/webSearch/index';

// ---------------------------------------------------------------------------
// Step actions — each is a retryable Convex internalAction
// ---------------------------------------------------------------------------

export const searchAndAnalyzeAction = internalAction({
  args: {
    query: v.string(),
    sectionTitle: v.string(),
    analysisInstruction: v.string(),
  },
  handler: async (_ctx, { query, sectionTitle, analysisInstruction }) => {
    const results = await webSearch(query);
    const resultsText = results
      .map(r => `**${r.title}**\n${r.content}`)
      .join('\n\n');

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      prompt: `${analysisInstruction}\n\nSearch results:\n${resultsText}\n\nWrite a concise markdown section titled "## ${sectionTitle}" (3-6 bullet points or short paragraphs). Be specific, cite names when found.`,
    });
    return text;
  },
});
```

Note: `anthropic` and `generateText` imports should be added at the top of the file alongside the existing convex imports.

- [ ] **Step 2: Add synthesizeAndSaveAction (internal action)**

Append to `convex/market.ts`:

```typescript
export const synthesizeAndSaveAction = internalAction({
  args: {
    projectId: v.id('projects'),
    userId: v.string(),
    projectName: v.string(),
    sections: v.array(v.string()),
  },
  handler: async (ctx, { projectId, userId, projectName, sections }) => {
    const combinedSections = sections.join('\n\n');

    const { text: synthesis } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt: `You are a sharp startup analyst. Based on the following market research sections for "${projectName}", write a "## Synthèse" section with:\n- 3 key strengths\n- 3 key risks or weaknesses\n- A brief recommendation (go/no-go/pivot)\n\nResearch:\n${combinedSections}`,
    });

    const fullContent = `# Market Analysis — ${projectName}\n\n${combinedSections}\n\n${synthesis}`;

    const { text: tldr } = await generateText({
      model: anthropic('claude-haiku-4-5'),
      prompt: `Write 2 sentences summarizing this market analysis for "${projectName}":\n${fullContent.slice(0, 3000)}`,
    });

    const date = new Date().toISOString().split('T')[0];
    await ctx.runMutation(internal.artifacts.saveArtifact, {
      userId,
      projectId,
      type: 'market',
      title: `Market Analysis — ${projectName}`,
      content: fullContent,
      tldr,
      date,
    });
  },
});
```

- [ ] **Step 3: Add runMarketWorkflow (the workflow definition)**

Append to `convex/market.ts`, after the step actions:

```typescript
// ---------------------------------------------------------------------------
// Workflow definition
// ---------------------------------------------------------------------------

export const runMarketWorkflow = marketWorkflow.define({
  args: {
    projectId: v.id('projects'),
    jobId: v.id('marketAnalysisJobs'),
    userId: v.string(),
    projectName: v.string(),
  },
  returns: v.null(),
  handler: async (step, { projectId, jobId, userId, projectName }): Promise<null> => {
    // Step 1 — Concurrent competitors
    await step.runMutation(internal.market.updateJobStep, {
      jobId, currentStep: 'Concurrents directs', stepsDone: 0,
    });
    const competitors = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} competitors app 2025`,
      sectionTitle: 'Concurrents directs',
      analysisInstruction: `Identify the main direct competitors for a product called "${projectName}". List name, positioning, and key differentiator.`,
    });

    // Step 2 — Alternatives
    await step.runMutation(internal.market.updateJobStep, {
      jobId, currentStep: 'Alternatives & substituts', stepsDone: 1,
    });
    const alternatives = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} alternatives tools market`,
      sectionTitle: 'Alternatives & substituts',
      analysisInstruction: `Identify indirect competitors and substitute tools for "${projectName}". What do people use today instead?`,
    });

    // Step 3 — Market size
    await step.runMutation(internal.market.updateJobStep, {
      jobId, currentStep: 'Taille de marché (TAM/SAM/SOM)', stepsDone: 2,
    });
    const marketSize = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} market size TAM SAM SOM 2025`,
      sectionTitle: 'Taille de marché',
      analysisInstruction: `Estimate the market size for "${projectName}". Include TAM, SAM, SOM if data is available. Cite numbers and sources.`,
    });

    // Step 4 — Trends
    await step.runMutation(internal.market.updateJobStep, {
      jobId, currentStep: 'Tendances 2025-2026', stepsDone: 3,
    });
    const trends = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} market trends 2025 2026`,
      sectionTitle: 'Tendances 2025-2026',
      analysisInstruction: `What are the key market trends relevant to "${projectName}" for 2025-2026? What's growing, declining, or emerging?`,
    });

    // Step 5 — Synthesis (save artifact)
    await step.runMutation(internal.market.updateJobStep, {
      jobId, currentStep: 'Synthèse', stepsDone: 4,
    });
    await step.runAction(internal.market.synthesizeAndSaveAction, {
      projectId,
      userId,
      projectName,
      sections: [competitors, alternatives, marketSize, trends],
    });

    return null;
  },
});
```

- [ ] **Step 4: Verify imports at the top of convex/market.ts**

The final import block at the top of `convex/market.ts` should be:

```typescript
import { vWorkflowId, vResultValidator, WorkflowManager } from '@convex-dev/workflow';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { components, internal } from './_generated/api';
import { webSearch } from './tools/webSearch/index';
```

- [ ] **Step 5: Push and verify Convex compiles**

```bash
npx convex dev --once
```

Expected: no TypeScript errors. The `internal.market.runMarketWorkflow` function is now accessible.

- [ ] **Step 6: Commit**

```bash
git add convex/market.ts
git commit -m "feat(market): workflow pipeline — 5-step search + synthesis + artifact save"
```

---

## Task 5: Add unlockMarketAnalysis tool to chat.ts

**Files:**
- Modify: `convex/chat.ts`

- [ ] **Step 1: Add the tool inside buildCommonTools**

In `convex/chat.ts`, inside `function buildCommonTools(...)`, after the last tool (currently `endSession`), add:

```typescript
    unlockMarketAnalysis: tool({
      description: 'Unlock the deep market analysis for the current project. Call when the user has refined their idea across at least 2 dimensions and you have enough context to run a meaningful competitor and market size analysis. Once unlocked, the user can launch it from the Insights tab.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!pid) return 'No active project found.';
        await runMutation(internal.market.setMarketAnalysisAvailable, { projectId: pid });
        return 'Market analysis unlocked. Inform the user: their deep market analysis is now available in the Insights tab. They can tap "Launch" to start a 3-5 minute automated analysis.';
      },
    }),
```

- [ ] **Step 2: Verify import of internal.market**

The `internal` import at the top of `convex/chat.ts` already covers all modules via `import { internal } from './_generated/api'`. No change needed.

- [ ] **Step 3: Run type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/chat.ts
git commit -m "feat(market): add unlockMarketAnalysis tool to chat agent"
```

---

## Task 6: Frontend hooks

**Files:**
- Modify: `src/features/insights/api.ts`

- [ ] **Step 1: Add the three new hooks**

In `src/features/insights/api.ts`, after the existing `useArtifacts` hook:

```typescript
import type { Id } from '../../../convex/_generated/dataModel';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// ... existing exports ...

export function useMarketAnalysisJob(projectId: Id<'projects'> | null | undefined) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.market.getMarketJob,
    isAuthenticated && projectId ? { projectId } : 'skip',
  );
}

export function useLaunchMarketAnalysis() {
  return useMutation(api.market.launchMarketAnalysis);
}

export function useLatestMarketArtifact(projectId: Id<'projects'> | null | undefined) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.artifacts.getLatestMarketArtifactPublic,
    isAuthenticated && projectId ? { projectId } : 'skip',
  );
}
```

Note: update the existing import block at the top — add `useMutation` to the destructuring from `'convex/react'`.

Also update the exported `ArtifactType`:

```typescript
export type ArtifactType = 'validation' | 'tracking' | 'market';
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/api.ts
git commit -m "feat(market): frontend hooks — useMarketAnalysisJob, useLaunchMarketAnalysis, useLatestMarketArtifact"
```

---

## Task 7: MarketAnalysisBanner component

**Files:**
- Create: `src/features/insights/components/market-analysis-banner.tsx`

The banner has 5 render states based on job status and artifact availability.

- [ ] **Step 1: Create the component**

Create `src/features/insights/components/market-analysis-banner.tsx`:

```typescript
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import type { Artifact } from '../api';
import * as React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, Text, View } from '@/components/ui';
import { translate } from '@/lib/i18n';

type MarketJob = Doc<'marketAnalysisJobs'>;

type Props = {
  projectId: Id<'projects'>;
  job: MarketJob | null | undefined;
  marketArtifact: Artifact | null | undefined;
  onLaunch: () => void;
  onView: (artifact: Artifact) => void;
};

export function MarketAnalysisBanner({ job, marketArtifact, onLaunch, onView }: Props) {
  // State: done — artifact exists
  if (job?.status === 'done' && marketArtifact) {
    return (
      <View style={styles.banner}>
        <View style={styles.row}>
          <Text style={styles.label}>{translate('insights.market_done_label' as any)}</Text>
          <TouchableOpacity onPress={() => onView(marketArtifact)} style={styles.button}>
            <Text style={styles.buttonText}>{translate('insights.market_view' as any)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // State: running or pending
  if (job && (job.status === 'running' || job.status === 'pending')) {
    const progress = job.stepsTotal > 0 ? job.stepsDone / job.stepsTotal : 0;
    return (
      <View style={styles.banner}>
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.brand.dark} style={{ marginRight: 8 }} />
          <Text style={styles.stepLabel} numberOfLines={1}>
            {job.currentStep}
          </Text>
          <Text style={styles.stepCount}>
            {job.stepsDone}/{job.stepsTotal}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
    );
  }

  // State: error
  if (job?.status === 'error') {
    return (
      <View style={[styles.banner, styles.bannerError]}>
        <View style={styles.row}>
          <Text style={styles.label}>{translate('insights.market_error' as any)}</Text>
          <TouchableOpacity onPress={onLaunch} style={styles.button}>
            <Text style={styles.buttonText}>{translate('insights.market_retry' as any)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // State: available but not started
  if (!job) {
    return (
      <View style={styles.banner}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{translate('insights.market_available_title' as any)}</Text>
            <Text style={styles.subtitle}>{translate('insights.market_available_subtitle' as any)}</Text>
          </View>
          <TouchableOpacity onPress={onLaunch} style={styles.button}>
            <Text style={styles.buttonText}>{translate('insights.market_launch' as any)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FDF4CD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DBA8',
  },
  bannerError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.dark,
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.brand.muted,
    marginTop: 2,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.brand.dark,
    flex: 1,
  },
  stepCount: {
    fontSize: 12,
    color: colors.brand.muted,
    marginLeft: 8,
  },
  button: {
    backgroundColor: colors.brand.dark,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: 12,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#E8DBA8',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.brand.dark,
    borderRadius: 2,
  },
});
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/components/market-analysis-banner.tsx
git commit -m "feat(market): MarketAnalysisBanner component — 5 states (available/pending/running/done/error)"
```

---

## Task 8: Wire banner into InsightsScreen

**Files:**
- Modify: `src/features/insights/insights-screen.tsx`

- [ ] **Step 1: Add hooks and banner to InsightsScreen**

Replace the full `InsightsScreen` function in `src/features/insights/insights-screen.tsx`:

```typescript
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Id } from '../../../convex/_generated/dataModel';
import type { Artifact, ArtifactType } from './api';
import type { InsightsTab } from './components/insights-segment-control';

import * as React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, FocusAwareStatusBar, ScrollView, Text, View } from '@/components/ui';
import { useModal } from '@/components/ui/modal';
import { useActiveProject } from '@/features/idea/api';
import { translate } from '@/lib/i18n';
import {
  useArtifacts,
  useLaunchMarketAnalysis,
  useLatestMarketArtifact,
  useMarketAnalysisJob,
} from './api';
import { ArtifactCard } from './components/artifact-card';
import { ArtifactDetailSheet } from './components/artifact-detail-sheet';
import { InsightsSegmentControl } from './components/insights-segment-control';
import { MarketAnalysisBanner } from './components/market-analysis-banner';

function ArtifactList({
  type,
  projectId,
  onSelect,
}: {
  type: ArtifactType;
  projectId: Id<'projects'> | null | undefined;
  onSelect: (artifact: Artifact) => void;
}) {
  const artifacts = useArtifacts(type, projectId);

  if (artifacts === undefined) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 40 }}>
        <ActivityIndicator color={colors.brand.dark} />
      </View>
    );
  }

  if (artifacts.length === 0) {
    const emptyKey = type === 'validation' ? 'insights.empty_validation' : 'insights.empty_suivi';
    return (
      <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 }}>
        <Text
          style={{
            fontSize: 14,
            color: colors.brand.muted,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {translate(emptyKey as any)}
        </Text>
      </View>
    );
  }

  return (
    <>
      {artifacts.map(artifact => (
        <ArtifactCard
          key={artifact._id}
          artifact={artifact as Artifact}
          onPress={onSelect}
        />
      ))}
    </>
  );
}

export function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<InsightsTab>('validation');
  const [selectedArtifact, setSelectedArtifact] = React.useState<Artifact | null>(null);
  const detailSheet = useModal();
  const activeProject = useActiveProject();
  const projectId = activeProject?.projectId ?? null;

  const marketJob = useMarketAnalysisJob(projectId);
  const marketArtifact = useLatestMarketArtifact(projectId);
  const launchMarketAnalysis = useLaunchMarketAnalysis();

  const handleSelect = React.useCallback((artifact: Artifact) => {
    setSelectedArtifact(artifact);
    detailSheet.present();
  }, [detailSheet]);

  const handleLaunchMarket = React.useCallback(async () => {
    if (!projectId) return;
    try {
      await launchMarketAnalysis({ projectId });
    } catch (e) {
      // Job already running or not available — ignore
    }
  }, [launchMarketAnalysis, projectId]);

  const activeType: ArtifactType = activeTab === 'validation' ? 'validation' : 'tracking';
  const showMarketBanner = activeTab === 'validation' && activeProject?.marketAnalysisAvailable;

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand.bg }}>
      <FocusAwareStatusBar />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ideo</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
      >
        <InsightsSegmentControl activeTab={activeTab} onChange={setActiveTab} />

        {showMarketBanner && projectId && (
          <MarketAnalysisBanner
            projectId={projectId}
            job={marketJob}
            marketArtifact={marketArtifact as Artifact | null | undefined}
            onLaunch={handleLaunchMarket}
            onView={handleSelect}
          />
        )}

        <ArtifactList type={activeType} projectId={projectId} onSelect={handleSelect} />
      </ScrollView>

      <ArtifactDetailSheet
        ref={detailSheet.ref as React.RefObject<BottomSheetModal | null>}
        artifact={selectedArtifact}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerTitle: {
    color: colors.brand.dark,
    fontSize: 24,
    fontWeight: '700',
    textShadowColor: 'rgba(255,255,255,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
});
```

- [ ] **Step 2: Run type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/insights/insights-screen.tsx
git commit -m "feat(market): wire MarketAnalysisBanner into InsightsScreen validation tab"
```

---

## Task 9: Translations

**Files:**
- Modify: `src/translations/en.json`
- Modify: `src/translations/ar.json`

- [ ] **Step 1: Add keys to en.json**

In `src/translations/en.json`, inside the `"insights"` object, add (keeping alphabetical order):

```json
"market_available_subtitle": "3-5 min automated analysis of your market.",
"market_available_title": "Deep market analysis available",
"market_done_label": "Market analysis complete",
"market_error": "Analysis failed",
"market_launch": "Launch",
"market_retry": "Retry",
"market_view": "View"
```

- [ ] **Step 2: Add keys to ar.json**

In `src/translations/ar.json`, inside the `"insights"` object, add the same keys in Arabic:

```json
"market_available_subtitle": "تحليل آلي للسوق في 3-5 دقائق.",
"market_available_title": "تحليل السوق المعمّق متاح",
"market_done_label": "تحليل السوق مكتمل",
"market_error": "فشل التحليل",
"market_launch": "إطلاق",
"market_retry": "إعادة المحاولة",
"market_view": "عرض"
```

- [ ] **Step 3: Run lint to check key parity**

```bash
pnpm lint:translations
```

Expected: no errors (keys are identical in both files).

- [ ] **Step 4: Commit**

```bash
git add src/translations/en.json src/translations/ar.json
git commit -m "feat(market): add market analysis translation keys"
```

---

## Verification Checklist

End-to-end test on device/simulator:

1. Start a chat conversation. After 2-3 exchanges, the agent should call `unlockMarketAnalysis` (or call it explicitly in dev: `npx convex run market:setMarketAnalysisAvailable '{"projectId":"<id>"}'`).
2. Go to **Insights → Validation tab** — the yellow banner "Deep market analysis available" should appear.
3. Tap **Launch** — banner switches to "Initialisation" with spinner.
4. Watch banner progress through 5 steps (~2-4 min depending on network).
5. Banner shows **"Market analysis complete" + View button**.
6. Tap View → `ArtifactDetailSheet` opens with full markdown content.
7. Verify artifact is stored: `npx convex run artifacts:listArtifacts '{"type":"market","projectId":"<id>"}'`.
8. Restart app mid-analysis — banner should still show progress (Convex Workflow persists through restarts).
9. Force an error by temporarily removing `TAVILY_API_KEY` — banner shows "Analysis failed" + Retry.
10. Re-tap Retry — new job created, analysis restarts.
