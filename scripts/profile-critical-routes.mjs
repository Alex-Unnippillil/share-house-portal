import fs from 'node:fs/promises'
import { chromium } from '@playwright/test'

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3000'

const scenarios = [
  { name: 'tenant-dashboard', path: '/dashboard', interaction: async (page) => page.getByRole('link', { name: /book an amenity|reserve an amenity/i }).first().click({ trial: true }).catch(() => {}) },
  { name: 'maintenance-list', path: '/maintenance', interaction: async (page) => page.getByRole('tab', { name: /manager triage|tenant view/i }).first().click({ trial: true }).catch(() => {}) },
  { name: 'bookings-calendar', path: '/bookings', interaction: async (page) => page.getByRole('tab', { name: /calendars/i }).click().catch(() => {}) },
  { name: 'admin-reporting', path: '/dashboard/operations/finance', interaction: async (page) => page.getByRole('link', { name: /next/i }).first().click({ trial: true }).catch(() => {}) },
]

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

const results = []
for (const scenario of scenarios) {
  const url = `${baseUrl}${scenario.path}`
  const start = performance.now()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const end = performance.now()

  const nav = await page.evaluate(() => {
    const timing = performance.getEntriesByType('navigation')[0]
    if (!timing) return null
    return {
      domContentLoadedMs: Math.round(timing.domContentLoadedEventEnd),
      loadMs: Math.round(timing.loadEventEnd),
      ttfbMs: Math.round(timing.responseStart),
    }
  })

  const interactionStart = performance.now()
  await scenario.interaction(page)
  const interactionMs = Math.round(performance.now() - interactionStart)

  results.push({
    scenario: scenario.name,
    path: scenario.path,
    initialLoadMs: Math.round(end - start),
    interactionLatencyMs: interactionMs,
    navigation: nav,
  })
}

await browser.close()
await fs.mkdir('artifacts/perf', { recursive: true })
await fs.writeFile('artifacts/perf/route-latency.json', JSON.stringify({ baseUrl, results }, null, 2))
console.log('Route profile written to artifacts/perf/route-latency.json')
