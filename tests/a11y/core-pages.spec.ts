import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const IMPACT_THRESHOLD: Array<"critical" | "serious"> = ["critical", "serious"]

type AxeViolations = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]

async function expectAccessible(page: Page, path: string) {
  await test.step(`audit ${path}`, async () => {
    await page.goto(path)
    await page.waitForLoadState("networkidle")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()

    const impactfulViolations = results.violations.filter((violation) =>
      IMPACT_THRESHOLD.includes((violation.impact ?? "moderate") as (typeof IMPACT_THRESHOLD)[number]),
    )

    expect(impactfulViolations, formatViolations(impactfulViolations)).toEqual([])
  })
}

function formatViolations(violations: AxeViolations) {
  if (!violations.length) return ""
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => ` - ${node.target.join(", ")}: ${node.failureSummary}`)
        .join("\n")
      return `${violation.id} (${violation.impact ?? "unknown"}): ${violation.help}\n${nodes}`
    })
    .join("\n\n")
}

test.describe("core experience accessibility", () => {
  const routes = ["/dashboard", "/payments", "/messaging"]

  for (const route of routes) {
    test(`meets axe-core guidelines: ${route}`, async ({ page }) => {
      await expectAccessible(page, route)
    })
  }
})
