import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**"],
      exclude: ["**/node_modules/**", "**/dist/**"],
      reporter: ["text", "html"],
    },
  },
});
