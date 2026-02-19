import { spawnSync } from "node:child_process"
import { appendFileSync, existsSync, readFileSync, statSync } from "node:fs"
import { resolve } from "node:path"
import process from "node:process"

const BUDGET_FILE = resolve(process.cwd(), "config/performance-budgets.json")
const APP_BUILD_MANIFEST = resolve(process.cwd(), ".next/app-build-manifest.json")
const APP_PATH_ROUTES_MANIFEST = resolve(process.cwd(), ".next/app-path-routes-manifest.json")

if (!existsSync(APP_BUILD_MANIFEST) || !existsSync(APP_PATH_ROUTES_MANIFEST)) {
  const buildResult = spawnSync("pnpm", ["build"], { stdio: "inherit", env: process.env })
  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1)
  }
}

const budgets = JSON.parse(readFileSync(BUDGET_FILE, "utf8"))
const jsBundles = budgets.jsBundles

if (!jsBundles || typeof jsBundles !== "object") {
  console.error("Missing jsBundles budget map in config/performance-budgets.json")
  process.exit(1)
}

const appBuildManifest = JSON.parse(readFileSync(APP_BUILD_MANIFEST, "utf8"))
const appPathRoutesManifest = JSON.parse(readFileSync(APP_PATH_ROUTES_MANIFEST, "utf8"))

const routeToManifestKey = new Map()
for (const [manifestKey, route] of Object.entries(appPathRoutesManifest)) {
  if (manifestKey.endsWith("/page")) {
    routeToManifestKey.set(route, manifestKey)
  }
}

const failures = []
const summaryLines = []

for (const [route, budgetKb] of Object.entries(jsBundles)) {
  if (typeof budgetKb !== "number" || !Number.isFinite(budgetKb) || budgetKb <= 0) {
    failures.push(`Invalid JS budget for ${route}: ${budgetKb}`)
    continue
  }

  const manifestKey = routeToManifestKey.get(route)
  if (!manifestKey) {
    failures.push(`Route ${route} is not present in .next/app-path-routes-manifest.json`)
    continue
  }

  const pageKey = manifestKey === "/page" ? "/page" : `${manifestKey}`
  const files = appBuildManifest.pages?.[pageKey]
  if (!Array.isArray(files)) {
    failures.push(`No build output found for ${route} (${pageKey}) in .next/app-build-manifest.json`)
    continue
  }

  const jsFiles = [...new Set(files.filter((file) => file.endsWith(".js")))]
  const totalBytes = jsFiles.reduce((sum, file) => sum + statSync(resolve(process.cwd(), ".next", file)).size, 0)
  const totalKb = totalBytes / 1024

  const summary = `${route}: ${totalKb.toFixed(2)} kB (limit ${budgetKb.toFixed(2)} kB)`
  summaryLines.push(summary)

  if (totalKb > budgetKb) {
    failures.push(`${route} exceeded budget by ${(totalKb - budgetKb).toFixed(2)} kB`)
  }
}

console.log("JS bundle budgets")
for (const line of summaryLines) {
  console.log(`- ${line}`)
}

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\n### JS bundle size\n\n${summaryLines.map((line) => `- ${line}`).join("\n")}\n`,
    "utf8",
  )
}

if (failures.length) {
  console.error("JS bundle budget check failed:")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}
