import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup-tests.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
})
