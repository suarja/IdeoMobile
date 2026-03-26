import { vWorkflowId, WorkflowManager } from '@convex-dev/workflow';
import { vResultValidator } from '@convex-dev/workpool';
import { v } from 'convex/values';
import { components } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';

// ---------------------------------------------------------------------------
// Workflow manager
// ---------------------------------------------------------------------------

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

    // Workflow will be started in Task 4. For now, just create the job.
    // TODO Task 4: replace this comment with marketWorkflow.start(...)

    return jobId;
  },
});
