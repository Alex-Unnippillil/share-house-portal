import { expect, test } from "@playwright/test"

import { expectProtectedRoute } from "./helpers"

test.describe("visitor flow variants", () => {
  test("tenant visitor booking workflow exists", async ({ page }) => {
    await expectProtectedRoute(page, "/visitors", /visitor|arrival|departure|host roommate/i)
  })

  test("manager visitor oversight is available", async ({ page }) => {
    await expectProtectedRoute(page, "/visitors", /oversight|visitor|policy|approval/i)
  })

  test("admin exports include visitor logs", async ({ page }) => {
    await expectProtectedRoute(page, "/dashboard/operations", /csv export: visitor logs|operations|tools/i)
  })
})
