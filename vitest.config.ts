import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: true,
    coverage: {
      reporter: ["text", "lcov"],
      include: ["lib/auth/**/*.ts", "middleware.ts"],
    },
  },
})
