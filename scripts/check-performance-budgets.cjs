#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const ts = require("typescript")

const budgetsPath = path.resolve(__dirname, "../config/performance.ts")

const source = fs.readFileSync(budgetsPath, "utf8")
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
})

const sandbox = {
  module: { exports: {} },
  exports: {},
  require,
  __dirname: path.dirname(budgetsPath),
  __filename: budgetsPath,
  console,
  process,
}

sandbox.exports = sandbox.module.exports

vm.runInNewContext(transpiled.outputText, sandbox, {
  filename: budgetsPath,
})

const performanceBudgets = sandbox.module.exports.performanceBudgets
const defaultDevice = sandbox.module.exports.DEFAULT_DEVICE ?? "mid-tier-mobile"

if (!Array.isArray(performanceBudgets)) {
  console.error("[perf-check] Unable to load performance budgets from config/performance.ts")
  process.exit(1)
}

const midTierBudgets = performanceBudgets.filter((budget) => budget?.device === "mid-tier-mobile")

const ttiBudgets = midTierBudgets.filter((budget) => budget.metrics?.tti)

if (ttiBudgets.length === 0) {
  console.error("[perf-check] No TTI budgets defined for mid-tier mobile device profile")
  process.exit(1)
}

const exceedingThreshold = ttiBudgets.filter(
  (budget) => typeof budget.metrics.tti.thresholdMs === "number" && budget.metrics.tti.thresholdMs > 2500
)

const belowPercentile = ttiBudgets.filter(
  (budget) => typeof budget.metrics.tti.percentile === "number" && budget.metrics.tti.percentile < 95
)

if (exceedingThreshold.length > 0 || belowPercentile.length > 0) {
  if (exceedingThreshold.length > 0) {
    console.error("[perf-check] The following routes exceed the 2.5s P95 TTI budget on mid-tier mobile:")
    for (const budget of exceedingThreshold) {
      console.error(
        `  - ${budget.route} (threshold ${budget.metrics.tti.thresholdMs}ms)`
      )
    }
  }

  if (belowPercentile.length > 0) {
    console.error("[perf-check] The following routes target a percentile below P95 for TTI:")
    for (const budget of belowPercentile) {
      console.error(
        `  - ${budget.route} (percentile P${budget.metrics.tti.percentile})`
      )
    }
  }

  process.exit(1)
}

const fallbackBudget = ttiBudgets.find((budget) => budget.route === "*")

if (!fallbackBudget) {
  console.error("[perf-check] Missing wildcard mid-tier mobile TTI budget; add a '*' entry to config/performance.ts")
  process.exit(1)
}

console.log(
  `[perf-check] ${ttiBudgets.length} mid-tier mobile TTI budgets verified (default device: ${defaultDevice})`
)
