import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const palettePattern = /\b(?:bg|text|border|ring|from|to|via|stroke|fill)-(?:slate|zinc|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d+)?\b/g

const roots = [
  "components/landing",
  "components/onboarding-progress.tsx",
  "app/dashboard/(dashboard)/components",
  "app/dashboard/members/components",
  "app/dashboard/todo/components",
]

const ignoredDirs = new Set([".next", "node_modules"])
const exts = new Set([".ts", ".tsx", ".js", ".jsx"])

function walk(dir, files = []) {
  if (ignoredDirs.has(dir)) {
    return files
  }

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      walk(fullPath, files)
      continue
    }

    const extension = fullPath.slice(fullPath.lastIndexOf("."))
    if (exts.has(extension)) {
      files.push(fullPath)
    }
  }

  return files
}

const files = roots.flatMap((root) => {
  const stats = statSync(root)
  if (stats.isDirectory()) {
    return walk(root)
  }

  return [root]
})

const violations = []

for (const file of files) {
  const content = readFileSync(file, "utf8")
  const matches = [...content.matchAll(palettePattern)]
  for (const match of matches) {
    const line = content.slice(0, match.index).split("\n").length
    violations.push(`${file}:${line} -> ${match[0]}`)
  }
}

if (violations.length) {
  console.error("Found direct palette classes in monitored app-level UI files. Prefer semantic tokens (primary/muted/accent/card/payment/booking/maintenance).")
  console.error(violations.join("\n"))
  process.exit(1)
}

console.log("No direct palette classes found in monitored app-level UI files.")
