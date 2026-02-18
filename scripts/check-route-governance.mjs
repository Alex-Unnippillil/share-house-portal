import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const governance = JSON.parse(readFileSync(new URL("../config/route-governance.json", import.meta.url), "utf8"))

const pageFileNames = new Set(["page.tsx", "page.mdx", "page.ts"])

function listPages(dir, prefix = []) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const routes = []

  for (const entry of entries) {
    if (entry.name.startsWith("_")) continue
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      routes.push(...listPages(fullPath, [...prefix, entry.name]))
      continue
    }

    if (!pageFileNames.has(entry.name)) continue

    const normalized = prefix.filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    const pathname = `/${normalized.join("/")}`.replace(/\/+/g, "/") || "/"
    routes.push(pathname === "/" ? "/" : pathname.replace(/\/$/, ""))
  }

  return routes
}

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function inList(pathname, exact, prefixes) {
  return exact.includes(pathname) || prefixes.some((prefix) => matchesPrefix(pathname, prefix))
}

const appDir = fileURLToPath(new URL("../app", import.meta.url))
const discoveredRoutes = Array.from(new Set(listPages(appDir))).sort()

const failures = []

for (const route of discoveredRoutes) {
  const isCore = inList(route, governance.productionPublicExact, governance.productionAuthenticatedPrefixes)
  const isPublicPrefix = governance.productionPublicPrefixes.some((prefix) => matchesPrefix(route, prefix))
  const isInternal = governance.internalToolingPrefixes.some((prefix) => matchesPrefix(route, prefix))
  const isDemo = governance.demoArtifactPrefixes.some((prefix) => matchesPrefix(route, prefix))

  if (isDemo) {
    failures.push(`Demo/experimental route must be removed from app router: ${route}`)
    continue
  }

  if (!isCore && !isPublicPrefix && !isInternal) {
    failures.push(`Route is not classified in governance config: ${route}`)
  }
}

if (failures.length) {
  console.error("Route governance check failed:\n")
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Route governance check passed for ${discoveredRoutes.length} routes.`)
