import type { Id } from './_generated/dataModel';
/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

function makeT() {
  return convexTest(schema, modules);
}

// ── upsertUserMemory ──────────────────────────────────────────────────────────

describe('upsertUserMemory', () => {
  it('insert new entry — retrievable via getUserMemory', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    await t.mutation(internal.memory.upsertUserMemory, {
      userId: 'user_1',
      key: 'preferred_stack',
      value: 'React Native + Convex',
    });

    const result = await t.withIdentity(identity).query(api.memory.getUserMemory, {});
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].key).toBe('preferred_stack');
    expect(result![0].value).toBe('React Native + Convex');
  });

  it('update existing entry — idempotence on key, latest value kept', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    await t.mutation(internal.memory.upsertUserMemory, {
      userId: 'user_1',
      key: 'preferred_stack',
      value: 'React Native + Convex',
    });
    await t.mutation(internal.memory.upsertUserMemory, {
      userId: 'user_1',
      key: 'preferred_stack',
      value: 'Expo + Supabase',
    });

    const result = await t.withIdentity(identity).query(api.memory.getUserMemory, {});
    expect(result).toHaveLength(1); // no duplicate created
    expect(result![0].value).toBe('Expo + Supabase'); // latest value
  });
});

// ── upsertProjectMemory ───────────────────────────────────────────────────────

describe('upsertProjectMemory', () => {
  it('insert new entry for a project', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    let projectId: Id<'projects'>;
    await t.run(async (ctx) => {
      projectId = await ctx.db.insert('projects', {
        userId: 'user_1',
        threadId: 'thread_1',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
      });
    });

    await t.mutation(internal.memory.upsertProjectMemory, {
      projectId: projectId!,
      userId: 'user_1',
      key: 'tech_stack',
      value: 'Next.js',
    });

    const result = await t.withIdentity(identity).query(api.memory.getProjectMemory, { projectId: projectId! });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('tech_stack');
    expect(result[0].value).toBe('Next.js');
  });

  it('update existing entry — idempotence on key, latest value kept', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    let projectId: Id<'projects'>;
    await t.run(async (ctx) => {
      projectId = await ctx.db.insert('projects', {
        userId: 'user_1',
        threadId: 'thread_1',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
      });
    });

    await t.mutation(internal.memory.upsertProjectMemory, {
      projectId: projectId!,
      userId: 'user_1',
      key: 'tech_stack',
      value: 'Next.js',
    });
    await t.mutation(internal.memory.upsertProjectMemory, {
      projectId: projectId!,
      userId: 'user_1',
      key: 'tech_stack',
      value: 'Remix',
    });

    const result = await t.withIdentity(identity).query(api.memory.getProjectMemory, { projectId: projectId! });
    expect(result).toHaveLength(1); // no duplicate
    expect(result[0].value).toBe('Remix'); // latest value
  });
});

// ── deleteMemoryFragment ──────────────────────────────────────────────────────

describe('deleteMemoryFragment', () => {
  it('user scope — insert then delete, entry is gone', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    await t.mutation(internal.memory.upsertUserMemory, {
      userId: 'user_1',
      key: 'to_delete',
      value: 'temporary',
    });

    const before = await t.withIdentity(identity).query(api.memory.getUserMemory, {});
    expect(before).toHaveLength(1);

    await t.mutation(internal.memory.deleteMemoryFragment, {
      scope: 'user',
      userId: 'user_1',
      key: 'to_delete',
    });

    const after = await t.withIdentity(identity).query(api.memory.getUserMemory, {});
    expect(after).toHaveLength(0);
  });

  it('project scope — insert then delete, entry is gone', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    let projectId: Id<'projects'>;
    await t.run(async (ctx) => {
      projectId = await ctx.db.insert('projects', {
        userId: 'user_1',
        threadId: 'thread_1',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
      });
    });

    await t.mutation(internal.memory.upsertProjectMemory, {
      projectId: projectId!,
      userId: 'user_1',
      key: 'to_delete',
      value: 'temporary',
    });

    const before = await t.withIdentity(identity).query(api.memory.getProjectMemory, { projectId: projectId! });
    expect(before).toHaveLength(1);

    await t.mutation(internal.memory.deleteMemoryFragment, {
      scope: 'project',
      userId: 'user_1',
      key: 'to_delete',
      projectId: projectId!,
    });

    const after = await t.withIdentity(identity).query(api.memory.getProjectMemory, { projectId: projectId! });
    expect(after).toHaveLength(0);
  });
});

// ── getUserMemory isolation ───────────────────────────────────────────────────

describe('getUserMemory', () => {
  it('returns only entries for the authenticated user', async () => {
    const t = makeT();

    // Seed entries for two different users directly
    await t.run(async (ctx) => {
      await ctx.db.insert('userMemory', {
        userId: 'user_1',
        key: 'stack',
        value: 'React Native',
        updatedAt: Date.now(),
      });
      await ctx.db.insert('userMemory', {
        userId: 'user_2',
        key: 'stack',
        value: 'Flutter',
        updatedAt: Date.now(),
      });
    });

    const user1Result = await t.withIdentity({ subject: 'user_1' }).query(api.memory.getUserMemory, {});
    expect(user1Result).toHaveLength(1);
    expect(user1Result![0].value).toBe('React Native');

    const user2Result = await t.withIdentity({ subject: 'user_2' }).query(api.memory.getUserMemory, {});
    expect(user2Result).toHaveLength(1);
    expect(user2Result![0].value).toBe('Flutter');
  });
});

// ── getProjectMemory isolation ────────────────────────────────────────────────

describe('getProjectMemory', () => {
  it('returns only entries for the given projectId', async () => {
    const t = makeT();
    const identity = { subject: 'user_1' };

    let projectAId: Id<'projects'>;
    let projectBId: Id<'projects'>;

    await t.run(async (ctx) => {
      projectAId = await ctx.db.insert('projects', {
        userId: 'user_1',
        threadId: 'thread_A',
        isActive: true,
        status: 'active',
        createdAt: Date.now(),
      });
      projectBId = await ctx.db.insert('projects', {
        userId: 'user_1',
        threadId: 'thread_B',
        isActive: false,
        status: 'paused',
        createdAt: Date.now(),
      });

      await ctx.db.insert('projectMemory', {
        projectId: projectAId,
        userId: 'user_1',
        key: 'focus',
        value: 'MVP launch',
        updatedAt: Date.now(),
      });
      await ctx.db.insert('projectMemory', {
        projectId: projectBId,
        userId: 'user_1',
        key: 'focus',
        value: 'Growth hacking',
        updatedAt: Date.now(),
      });
    });

    const resultA = await t.withIdentity(identity).query(api.memory.getProjectMemory, { projectId: projectAId! });
    expect(resultA).toHaveLength(1);
    expect(resultA[0].value).toBe('MVP launch');

    const resultB = await t.withIdentity(identity).query(api.memory.getProjectMemory, { projectId: projectBId! });
    expect(resultB).toHaveLength(1);
    expect(resultB[0].value).toBe('Growth hacking');
  });
});
