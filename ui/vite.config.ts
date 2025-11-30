/// <reference types="vitest" />

import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vitest augments Vite config with a `test` block, which our current Vite typings do not include.
const config = {
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
} as UserConfig;

export default defineConfig(config);
