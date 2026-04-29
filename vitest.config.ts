import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    fileParallelism: false,
    setupFiles: ["./tests/setup/load-env.ts"],
    include: ["tests/**/*.spec.ts"],
    exclude: ["tests/e2e/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
