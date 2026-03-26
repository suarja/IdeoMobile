import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('launchMarketAnalysis', () => {
  it('throws if not authenticated', async () => {
    const t = convexTest(schema, modules);
    const projectId = await t.run(async (ctx) => {
      return ctx.db.insert('projects', {
        userId: 'user1',
        threadId: 'thread1',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
        marketAnalysisAvailable: true,
      });
    });
    await expect(
      t.mutation(api.market.launchMarketAnalysis, { projectId }),
    ).rejects.toThrow('Unauthenticated');
  });

  it('throws if marketAnalysisAvailable is false', async () => {
    const t = convexTest(schema, modules);
    const projectId = await t.run(async (ctx) => {
      return ctx.db.insert('projects', {
        userId: 'user1',
        threadId: 'thread1',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
        marketAnalysisAvailable: false,
      });
    });
    await expect(
      t.withIdentity({ subject: 'user1' }).mutation(api.market.launchMarketAnalysis, { projectId }),
    ).rejects.toThrow('not available');
  });

  it('creates a pending job when available', async () => {
    const t = convexTest(schema, modules);
    const projectId = await t.run(async (ctx) => {
      return ctx.db.insert('projects', {
        userId: 'user1',
        threadId: 'thread1',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
        marketAnalysisAvailable: true,
      });
    });
    const jobId = await t.withIdentity({ subject: 'user1' }).mutation(api.market.launchMarketAnalysis, { projectId });
    expect(jobId).toBeTruthy();
    const job = await t.withIdentity({ subject: 'user1' }).query(api.market.getMarketJob, { projectId });
    expect(job).not.toBeNull();
    expect(job?.status).toBe('pending');
    expect(job?.stepsTotal).toBe(5);
  });

  it('throws if a job is already pending or running', async () => {
    const t = convexTest(schema, modules);
    const projectId = await t.run(async (ctx) => {
      return ctx.db.insert('projects', {
        userId: 'user1',
        threadId: 'thread1',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
        marketAnalysisAvailable: true,
      });
    });
    await t.withIdentity({ subject: 'user1' }).mutation(api.market.launchMarketAnalysis, { projectId });
    await expect(
      t.withIdentity({ subject: 'user1' }).mutation(api.market.launchMarketAnalysis, { projectId }),
    ).rejects.toThrow('already running');
  });
});
