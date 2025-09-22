import { expect, test } from "@playwright/test"
import { loadPerfDashboardFixture } from "@/lib/perf/load-dashboard-fixture"

const routePath = "/perf-test"

test.describe("/perf-test performance dashboard", () => {
  test("renders deterministic fixture data", async ({ page }) => {
    const fixture = await loadPerfDashboardFixture()

    await page.goto(routePath)

    await expect(page.getByRole("heading", { name: fixture.overview.hero.greeting })).toBeVisible()
    await expect(page.getByText(fixture.overview.rentCard.amount)).toBeVisible()
    await expect(page.getByText(fixture.overview.rentCard.due)).toBeVisible()

    for (const documentTitle of fixture.overview.documentsCard.items) {
      await expect(page.getByText(documentTitle)).toBeVisible()
    }

    const boardPreview = fixture.overview.roommateBoard.items.slice(0, 2)
    for (const message of boardPreview) {
      await expect(page.getByText(message)).toBeVisible()
    }

    await expect(page.getByText(`${fixture.members.length} total`)).toBeVisible()
    await expect(page.getByText(`${fixture.todos.length} tasks`)).toBeVisible()
  })
})
