import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.spec.ts",
      "tests/**/*.test.tsx",
      "tests/**/*.spec.tsx",
    ],
    environmentMatchGlobs: [["tests/accessibility/**", "jsdom"]],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
})
