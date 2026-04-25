import { readdirSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const apiRoot = path.join(process.cwd(), "app", "api")
const allowedRouteFiles = new Set(["route.ts", "route.js"])
const violations = []

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }

    if (allowedRouteFiles.has(entry.name)) {
      continue
    }

    violations.push(path.relative(process.cwd(), fullPath))
  }
}

walk(apiRoot)

if (violations.length > 0) {
  console.error("Unsupported files found under app/api. Only Next.js route handlers are allowed:")
  for (const file of violations) {
    console.error(`- ${file}`)
  }
  process.exit(1)
}

console.log("App API runtime target guard passed: only Next.js route handlers found under app/api.")
