import { defineConfig } from "vitest/config"
import path from "path"

const scope = process.env.TEST_SCOPE?.toLowerCase()

const scopedIncludes: Record<string, string[]> = {
  unit: ["tests/unit/**/*.test.ts", "tests/lib/**/*.test.ts"],
  integration: ["tests/integration/**/*.test.ts"],
  e2e: ["tests/e2e/**/*.test.ts"],
}

const include = scope && scopedIncludes[scope]?.length ? scopedIncludes[scope] : ["tests/**/*.test.ts"]

export default defineConfig({
  test: {
    environment: "node",
    include,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
    },
  },
})
