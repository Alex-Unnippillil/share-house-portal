import { expect, test } from "@playwright/test"

import { expectProtectedRoute } from "./helpers"

test.describe("messaging flow variants", () => {
  test("tenant messaging board route renders", async ({ page }) => {
    await expectProtectedRoute(page, "/messaging", /message|thread|poll|roommate/i)
  })

  test("manager moderation dashboard variant is role-gated", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations/moderation", /moderation|queue|flag|status/i)
  })

  test("admin moderation summary is represented on operations dashboard", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations", /moderation|unresolved|operations/i)
  })
})
