import path from "node:path"
import { defineConfig } from "vitest/config"

const rootDir = path.resolve(new URL(".", import.meta.url).pathname)

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: [],
    coverage: {
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
})
