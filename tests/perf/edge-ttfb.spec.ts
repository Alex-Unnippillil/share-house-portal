import { test, expect } from "@playwright/test"

const baseUrl =
  process.env.EDGE_TEST_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"

const regionAllowList = (process.env.EDGE_TEST_REGIONS ?? "cle1,iad1,cdg1,sin1")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)

const targets = ["/docs", "/help"]

async function measureTtfb(page: import("@playwright/test").Page) {
  const navTiming = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType("navigation")
    return navigation
      ? { responseStart: navigation.responseStart, startTime: navigation.startTime }
      : null
  })

  if (!navTiming) {
    throw new Error("Navigation timing data was unavailable")
  }

  return navTiming.responseStart - navTiming.startTime
}

test.describe("Vercel Edge cache", () => {
  for (const path of targets) {
    test(`${path} responds from the edge within 100ms TTFB`, async ({ page }) => {
      const url = new URL(path, baseUrl)
      const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded" })

      expect(response, "expected a main document response").not.toBeNull()

      const headers = response!.headers()
      const cacheControl = headers["cache-control"]
      expect(cacheControl, "Cache-Control header missing").toBeTruthy()
      expect(cacheControl).toContain("s-maxage=86400")
      expect(cacheControl).toContain("stale-while-revalidate")

      const xVercelId = headers["x-vercel-id"]
      expect(xVercelId, "x-vercel-id header missing").toBeTruthy()

      const idParts = xVercelId!.split("::").filter(Boolean)
      expect(idParts.length).toBeGreaterThanOrEqual(2)

      const [edgePop, computeRegion] = idParts
      if (regionAllowList.length) {
        expect(regionAllowList).toContain(edgePop)
        if (computeRegion) {
          expect(regionAllowList).toContain(computeRegion)
        }
      }

      const cacheStatus = headers["x-vercel-cache"]
      expect(cacheStatus ?? "HIT").toMatch(/(HIT|STALE|MISS)/)

      const ttfb = await measureTtfb(page)
      expect(ttfb).toBeGreaterThan(0)
      expect(ttfb).toBeLessThan(100)
    })
  }
})
