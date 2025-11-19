import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@src': path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: { provider: 'v8', reports: ['text', 'lcov'] },
    passWithNoTests: false,
  },
});
