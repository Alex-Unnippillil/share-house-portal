import fs from 'node:fs/promises'
import { createServer, type Server as HttpServer } from 'node:http'
import path from 'node:path'
import { parse } from 'node:url'

import chromeLauncher, { type LaunchedChrome } from 'chrome-launcher'
import lighthouse, {
  type Config as LighthouseConfig,
  type Flags as LighthouseFlags,
  type RunnerResult,
} from 'lighthouse'
import next from 'next'

import {
  PERFORMANCE_METRICS,
  listPerformanceBudgets,
  type PerformanceCheckResult,
  type PerformanceMetric,
  type PerformanceMetricCheck,
  type PerformanceReport,
  type ResolvedPerformanceBudget,
} from '../config/performance'

const METRIC_AUDIT_IDS: Record<PerformanceMetric, string> = {
  lcp: 'largest-contentful-paint',
  tti: 'interactive',
}

const METRIC_LABELS: Record<PerformanceMetric, string> = {
  lcp: 'Largest Contentful Paint',
  tti: 'Time to Interactive',
}

const HOST = process.env.PERF_BUDGET_HOST ?? '127.0.0.1'
const PORT = Number(process.env.PERF_BUDGET_PORT ?? 4010)

async function prepareNextServer() {
  const app = next({ dev: false, hostname: HOST, port: PORT })

  try {
    await app.prepare()
  } catch (error) {
    console.error(
      'Failed to prepare the Next.js application. Did you forget to run `pnpm build` first?'
    )
    throw error
  }

  const handle = app.getRequestHandler()
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '/', true)
    handle(req, res, parsedUrl)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(PORT, HOST, () => resolve())
  })

  return server
}

async function runLighthouseForBudget(
  budget: ResolvedPerformanceBudget,
  chromePort: number
): Promise<PerformanceCheckResult> {
  const url = `http://${HOST}:${PORT}${budget.route}`
  const flags: LighthouseFlags = {
    logLevel: 'error',
    output: 'json',
    port: chromePort,
  }

  const config: LighthouseConfig = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: ['performance'],
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
        disabled: false,
      },
    },
  }

  const runnerResult = (await lighthouse(url, flags, config)) as RunnerResult
  const metrics: Record<PerformanceMetric, PerformanceMetricCheck> = {
    lcp: { actual: null, budget: budget.metrics.lcp, passed: false },
    tti: { actual: null, budget: budget.metrics.tti, passed: false },
  }

  for (const metric of PERFORMANCE_METRICS) {
    const auditId = METRIC_AUDIT_IDS[metric]
    const audit = runnerResult.lhr.audits[auditId]
    const rawValue = audit?.numericValue
    const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : null
    const budgetValue = budget.metrics[metric]
    const passed = value !== null && value <= budgetValue

    metrics[metric] = {
      actual: value,
      budget: budgetValue,
      passed,
    }
  }

  const passed = Object.values(metrics).every((metric) => metric.passed)

  return {
    route: budget.route,
    description: budget.description,
    metrics,
    passed,
  }
}

function createFailureResult(budget: ResolvedPerformanceBudget): PerformanceCheckResult {
  const metrics: Record<PerformanceMetric, PerformanceMetricCheck> = {
    lcp: { actual: null, budget: budget.metrics.lcp, passed: false },
    tti: { actual: null, budget: budget.metrics.tti, passed: false },
  }

  return {
    route: budget.route,
    description: budget.description,
    metrics,
    passed: false,
  }
}

function formatMetricValue(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }

  return `${Math.round(value)} ms`
}

async function main() {
  const budgets = listPerformanceBudgets()

  if (budgets.length === 0) {
    console.warn('No performance budgets configured. Skipping Lighthouse run.')
    return
  }

  const server = await prepareNextServer()
  let chrome: LaunchedChrome | null = null
  const results: PerformanceCheckResult[] = []
  const failures: PerformanceCheckResult[] = []

  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
    })

    for (const budget of budgets) {
      console.log(`\nAuditing ${budget.route}…`)

      try {
        const result = await runLighthouseForBudget(budget, chrome.port)

        for (const metric of PERFORMANCE_METRICS) {
          const check = result.metrics[metric]
          const status = check.passed ? 'PASS' : 'FAIL'
          console.log(
            `  [${status}] ${METRIC_LABELS[metric]} — actual: ${formatMetricValue(check.actual)} (budget: ${Math.round(check.budget)} ms)`
          )
        }

        results.push(result)

        if (!result.passed) {
          failures.push(result)
        }
      } catch (error) {
        console.error(`  Failed to gather metrics for ${budget.route}`, error)
        const failure = createFailureResult(budget)
        results.push(failure)
        failures.push(failure)
      }
    }
  } finally {
    if (chrome) {
      await chrome.kill()
    }
    await closeServer(server)
  }

  const report: PerformanceReport = {
    generatedAt: new Date().toISOString(),
    results,
  }

  const outputPath = path.resolve(process.cwd(), 'app/perf/metrics/latest.json')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8')
  console.log(`\nSaved metrics report to ${outputPath}`)

  if (failures.length > 0) {
    console.error(`\nPerformance budgets exceeded on ${failures.length} route(s).`)
    for (const failure of failures) {
      console.error(` - ${failure.route}`)
    }
    process.exitCode = 1
  } else {
    console.log('\nAll performance budgets met ✅')
  }
}

main().catch((error) => {
  if (isChromeNotFoundError(error)) {
    console.error(
      'Chrome could not be launched. Install Chrome/Chromium locally or set the CHROME_PATH environment variable to a valid executable.'
    )
  } else {
    console.error('Unexpected error while running Lighthouse budgets.', error)
  }
  if (error) {
    console.error(error)
  }
  process.exitCode = 1
})

async function closeServer(server: HttpServer) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

function isChromeNotFoundError(error: unknown): error is { code?: string } {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'ERR_LAUNCHER_PATH_NOT_SET'
  )
}
