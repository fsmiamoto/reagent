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
        include: ['tests/e2e/**/*.e2e.ts'],
        environment: 'node',
        globals: true,
        setupFiles: ['tests/setup.ts'],
        // Smoke tests need longer timeouts for server startup/shutdown
        testTimeout: 30000,
        hookTimeout: 30000,
        fileParallelism: false,
        // Run tests within a file sequentially (they may share server state)
        sequence: {
            concurrent: false,
        },
        passWithNoTests: false,
    },
});
