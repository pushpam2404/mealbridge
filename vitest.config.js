import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/tests/**/*.test.js'],
    environment: 'node',
    hookTimeout: 120000,
    testTimeout: 20000,
    fileParallelism: false,
    env: { JWT_SECRET: 'test-secret' },
  },
});
