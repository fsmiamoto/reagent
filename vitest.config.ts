import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@src": path.resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
    passWithNoTests: false,
  },
});
