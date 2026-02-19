import { spawnSync } from "node:child_process"
import { mkdtempSync, statSync, appendFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { createRequire } from "node:module"
import process from "node:process"

const require = createRequire(import.meta.url)

const tailwindCli = require.resolve("tailwindcss/lib/cli.js")
const projectRoot = resolve(process.cwd())
const configPath = resolve(
  projectRoot,
  process.env.TAILWIND_CONFIG_PATH ?? "tailwind.config.js",
)
const inputCss = resolve(
  projectRoot,
  process.env.TAILWIND_INPUT_CSS ?? "app/globals.css",
)

const tempDir = mkdtempSync(join(tmpdir(), "tailwind-purge-"))
const outputCss = join(tempDir, "purged.css")

const cliResult = spawnSync(process.execPath, [
  tailwindCli,
  "--config",
  configPath,
  "--input",
  inputCss,
  "--output",
  outputCss,
  "--minify",
])

if (cliResult.status !== 0) {
  const exitCode = cliResult.status ?? 1
  console.error(`Tailwind CSS build failed with exit code ${exitCode}.`)
  process.exit(exitCode)
}

const { size } = statSync(outputCss)
const bundleKb = size / 1024
const thresholdRaw = process.env.CSS_BUNDLE_MAX_KB ?? "90"
const thresholdKb = Number(thresholdRaw)

if (!Number.isFinite(thresholdKb)) {
  console.error(
    `Invalid CSS_BUNDLE_MAX_KB value: "${thresholdRaw}". Please provide a numeric threshold.`,
  )
  process.exit(1)
}

const summaryLine = `Purged CSS size: ${bundleKb.toFixed(2)} kB (limit ${thresholdKb.toFixed(2)} kB).`
console.log(summaryLine)

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\n### CSS bundle size\n\n- ${summaryLine}\n`,
    "utf8",
  )
}

if (bundleKb > thresholdKb) {
  console.error(
    `CSS bundle size exceeded threshold by ${(bundleKb - thresholdKb).toFixed(2)} kB.`,
  )
  process.exit(1)
}
