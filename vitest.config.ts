import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'convex-tests',
          include: ['convex/**/*.test.ts'],
          environment: 'edge-runtime',
        },
      },
    ],
  },
});
