import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "tests/**/*.spec.ts",
      "tests/**/*.spec.tsx",
    ],
    setupFiles: ["tests/setup/test-setup.ts"],
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
