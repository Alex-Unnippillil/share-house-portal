#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

const ANALYZE_HTML_PATH = '.next/analyze/client.html'
const OUTPUT_TOP_MODULES = 'artifacts/bundle/top-modules.txt'

const ROUTES = {
  '/': {
    budget: 120 * 1024,
    entrypointPatterns: [/^app\/page$/],
  },
  '/dashboard': {
    budget: 180 * 1024,
    entrypointPatterns: [
      /^app\/(?:\([^/]+\)\/)*dashboard(?:\/\([^/]+\))*\/page$/,
    ],
  },
}

const formatSize = bytes => `${(bytes / 1024).toFixed(2)} kB`

async function parseChartData() {
  const html = await readFile(ANALYZE_HTML_PATH, 'utf8')
  const match = html.match(/chartData\s*=\s*(\[[\s\S]*?\]);/)
  if (!match) {
    throw new Error('Unable to locate chartData array in analyzer report')
  }
  try {
    return JSON.parse(match[1])
  } catch (error) {
    throw new Error(`Failed to parse chartData JSON: ${error.message}`)
  }
}

function collectEntrypointSizes(chartData) {
  const totals = new Map()
  for (const chunk of chartData) {
    const { parsedSize, isInitialByEntrypoint } = chunk
    if (!parsedSize || !isInitialByEntrypoint) continue
    for (const [entrypoint, isInitial] of Object.entries(isInitialByEntrypoint)) {
      if (!isInitial) continue
      totals.set(entrypoint, (totals.get(entrypoint) || 0) + parsedSize)
    }
  }
  return totals
}

function matchesAny(entrypoint, patterns) {
  return patterns.some(pattern => pattern.test(entrypoint))
}

function collectRouteSizes(entrypointTotals) {
  const results = new Map()
  const errors = []
  for (const [route, config] of Object.entries(ROUTES)) {
    let total = 0
    for (const [entrypoint, size] of entrypointTotals.entries()) {
      if (matchesAny(entrypoint, config.entrypointPatterns)) {
        total += size
      }
    }
    if (total === 0) {
      errors.push(`No analyzer entrypoints matched for route ${route}`)
    }
    results.set(route, { total, budget: config.budget })
  }
  return { results, errors }
}

function collectModuleSizes(chartData) {
  const moduleSizes = new Map()
  const stack = [...chartData]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue

    if (Array.isArray(node.groups)) {
      for (const child of node.groups) {
        stack.push(child)
      }
    }
    if (Array.isArray(node.modules)) {
      for (const child of node.modules) {
        stack.push(child)
      }
    }

    const hasChildren = (node.groups && node.groups.length) || (node.modules && node.modules.length)
    if (!hasChildren && typeof node.path === 'string' && node.parsedSize) {
      moduleSizes.set(node.path, (moduleSizes.get(node.path) || 0) + node.parsedSize)
    }
  }
  return moduleSizes
}

async function writeTopModules(moduleSizes) {
  const sorted = Array.from(moduleSizes.entries())
    .filter(([, size]) => size > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const lines = ['# Top Modules by parsed JS size', '']
  for (const [path, size] of sorted) {
    lines.push(`${formatSize(size)}\t${path}`)
  }

  await mkdir(dirname(OUTPUT_TOP_MODULES), { recursive: true })
  await writeFile(OUTPUT_TOP_MODULES, lines.join('\n'), 'utf8')
}

async function main() {
  const chartData = await parseChartData()
  const entrypointTotals = collectEntrypointSizes(chartData)
  const { results, errors } = collectRouteSizes(entrypointTotals)
  const moduleSizes = collectModuleSizes(chartData)
  await writeTopModules(moduleSizes)

  let hasFailure = false
  for (const [route, { total, budget }] of results.entries()) {
    if (total === 0) {
      hasFailure = true
      continue
    }
    const withinBudget = total <= budget
    const summary = `${route}: ${formatSize(total)} (budget ${formatSize(budget)})`
    if (withinBudget) {
      console.log(summary)
    } else {
      hasFailure = true
      console.error(`${summary} — exceeds budget`)
    }
  }
  for (const message of errors) {
    console.error(message)
    hasFailure = true
  }
  if (hasFailure) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
