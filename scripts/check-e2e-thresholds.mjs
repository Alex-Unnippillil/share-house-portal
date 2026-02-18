import fs from "node:fs"

const reportPath = process.env.PLAYWRIGHT_REPORT_PATH ?? "playwright-report/report.json"

if (!fs.existsSync(reportPath)) {
  console.error(`Playwright report not found at ${reportPath}`)
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"))

const suites = [
  "onboarding.spec.ts",
  "payments.spec.ts",
  "maintenance.spec.ts",
  "bookings.spec.ts",
  "documents.spec.ts",
  "messaging.spec.ts",
  "visitors.spec.ts",
  "responsive-breakpoints.spec.ts",
  "security-webhooks.spec.ts",
]

const tests = []

function walkSuites(entries = []) {
  for (const suite of entries) {
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        for (const test of spec.tests ?? []) {
          tests.push({
            file: spec.file,
            title: test.title,
            results: test.results ?? [],
            status: test.ok ? "passed" : "failed",
          })
        }
      }
    }

    walkSuites(suite.suites)
  }
}

walkSuites(report.suites)

let hasFailure = false

for (const suite of suites) {
  const suiteTests = tests.filter((test) => test.file.endsWith(suite))
  const total = suiteTests.length
  const passed = suiteTests.filter((test) => test.status === "passed").length
  const failed = total - passed
  const passRate = total > 0 ? passed / total : 0
  const threshold = 1

  console.log(
    `${suite}: ${passed}/${total} passed (${Math.round(passRate * 100)}%); launch threshold ${
      threshold * 100
    }%`,
  )

  if (total === 0 || failed > 0 || passRate < threshold) {
    hasFailure = true
  }
}

if (hasFailure) {
  console.error("E2E launch-blocking thresholds not met.")
  process.exit(1)
}
