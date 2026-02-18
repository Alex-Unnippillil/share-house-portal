import { expect, test } from "@playwright/test"

import { expectProtectedRoute } from "./helpers"

test.describe("maintenance flow variants", () => {
  test("tenant can initiate maintenance workflow", async ({ page }) => {
    await expectProtectedRoute(page, "/maintenance", /maintenance|request|priority|status/i)
  })

  test("manager maintenance command center variant is reachable", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations/maintenance", /maintenance|queue|triage|request/i)
  })

  test("admin can access operations queue aggregate", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations", /open maintenance|operational queues|tools/i)
  })
})
