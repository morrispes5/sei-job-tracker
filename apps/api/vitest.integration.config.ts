import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 60_000,
    include: ["src/integration/**/*.e2e.ts"],
    testTimeout: 60_000,
  },
});
