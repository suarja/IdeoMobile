import { anthropic } from '@ai-sdk/anthropic';
import { vWorkflowId, WorkflowManager } from '@convex-dev/workflow';
import { vResultValidator } from '@convex-dev/workpool';
import { generateText } from 'ai';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import { internalAction, internalMutation, mutation, query } from './_generated/server';
import { webSearch } from './tools/webSearch/index';

// ---------------------------------------------------------------------------
// Workflow manager
// ---------------------------------------------------------------------------

// Type assertion needed until `npx convex dev` regenerates _generated/api.d.ts with the workflow component.
// workflow is registered in convex.config.ts via `app.use(workflow)` and will be properly typed after deployment.
export const marketWorkflow = new WorkflowManager(components.workflow as any);

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
    }
    else if (result.kind === 'failed') {
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

    const projectName = project.name ?? 'My Project';

    // Idempotence: block if already running
    const existing = await ctx.db
      .query('marketAnalysisJobs')
      .withIndex('by_project', q => q.eq('projectId', projectId))
      .order('desc')
      .first();
    if (existing && (existing.status === 'pending' || existing.status === 'running')) {
      throw new Error('Analysis already running');
    }

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
      // Type assertion needed until `npx convex dev` regenerates _generated/api.d.ts.
      internal.market.runMarketWorkflow as any,
      { projectId, jobId, userId, projectName },
      {
        onComplete: internal.market.onWorkflowComplete,
        context: jobId,
      },
    );

    return jobId;
  },
});

// ---------------------------------------------------------------------------
// Step actions — retryable internalActions called by the workflow
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

// ---------------------------------------------------------------------------
// Workflow definition — 5-step sequential pipeline
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
    // Step 1 — Direct competitors
    await step.runMutation(internal.market.updateJobStep, {
      jobId,
      currentStep: 'Concurrents directs',
      stepsDone: 0,
    });
    const competitors = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} competitors app 2025`,
      sectionTitle: 'Concurrents directs',
      analysisInstruction: `Identify the main direct competitors for a product called "${projectName}". List name, positioning, and key differentiator.`,
    });

    // Step 2 — Alternatives
    await step.runMutation(internal.market.updateJobStep, {
      jobId,
      currentStep: 'Alternatives & substituts',
      stepsDone: 1,
    });
    const alternatives = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} alternatives tools market`,
      sectionTitle: 'Alternatives & substituts',
      analysisInstruction: `Identify indirect competitors and substitute tools for "${projectName}". What do people use today instead?`,
    });

    // Step 3 — Market size
    await step.runMutation(internal.market.updateJobStep, {
      jobId,
      currentStep: 'Taille de marché (TAM/SAM/SOM)',
      stepsDone: 2,
    });
    const marketSize = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} market size TAM SAM SOM 2025`,
      sectionTitle: 'Taille de marché',
      analysisInstruction: `Estimate the market size for "${projectName}". Include TAM, SAM, SOM if data is available. Cite numbers and sources.`,
    });

    // Step 4 — Trends
    await step.runMutation(internal.market.updateJobStep, {
      jobId,
      currentStep: 'Tendances 2025-2026',
      stepsDone: 3,
    });
    const trends = await step.runAction(internal.market.searchAndAnalyzeAction, {
      query: `${projectName} market trends 2025 2026`,
      sectionTitle: 'Tendances 2025-2026',
      analysisInstruction: `What are the key market trends relevant to "${projectName}" for 2025-2026? What's growing, declining, or emerging?`,
    });

    // Step 5 — Synthesis (saves artifact)
    await step.runMutation(internal.market.updateJobStep, {
      jobId,
      currentStep: 'Synthèse',
      stepsDone: 4,
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
