#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const statsPath = path.join(projectRoot, '.next', 'analyze', 'client-stats.json')
const artifactsDir = path.join(projectRoot, 'artifacts', 'bundle')
const outputPath = path.join(artifactsDir, 'top-modules.txt')

const DEFAULT_BUDGET_KB = 150

function parseBudget() {
  const raw = process.env.BUNDLE_MODULE_GZIP_BUDGET_KB
  if (!raw) {
    return DEFAULT_BUDGET_KB
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `BUNDLE_MODULE_GZIP_BUDGET_KB must be a positive number. Received: "${raw}".`
    )
  }

  return parsed
}

function collectModules(input) {
  const modules = []
  const stack = [input]

  while (stack.length > 0) {
    const value = stack.pop()

    if (Array.isArray(value)) {
      for (const item of value) {
        stack.push(item)
      }
      continue
    }

    if (!value || typeof value !== 'object') {
      continue
    }

    const groups = Array.isArray(value.groups) ? value.groups : []
    const hasChildren = groups.length > 0

    if (typeof value.gzipSize === 'number' && !hasChildren) {
      modules.push({
        label: typeof value.label === 'string' ? value.label : undefined,
        path: typeof value.path === 'string' ? value.path : undefined,
        gzipSize: value.gzipSize,
      })
    }

    for (const child of groups) {
      stack.push(child)
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === 'groups') {
        continue
      }
      stack.push(child)
    }
  }

  return modules
}

function formatKilobytes(bytes) {
  return bytes / 1024
}

function formatModuleLine(index, module) {
  const position = String(index + 1).padStart(2, '0')
  const displayPath = (module.path || module.label || 'unknown').replace(/^\.\//, '')
  const sizeKB = formatKilobytes(module.gzipSize)
  return `${position}. ${displayPath} - ${sizeKB.toFixed(2)} kB gzip`
}

function ensureArtifactsDir() {
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true, force: true })
  }
  fs.mkdirSync(artifactsDir, { recursive: true })
}

function main() {
  if (!fs.existsSync(statsPath)) {
    throw new Error(
      `Bundle stats not found at ${path.relative(projectRoot, statsPath)}. ` +
        'Run the build with ANALYZE=true before running this script.'
    )
  }

  const raw = fs.readFileSync(statsPath, 'utf8')
  const report = JSON.parse(raw)
  const modules = collectModules(report)

  if (!modules.length) {
    throw new Error('No modules were found in the bundle stats output.')
  }

  modules.sort((a, b) => b.gzipSize - a.gzipSize)

  const budgetKB = parseBudget()
  const offenders = modules.filter(module => formatKilobytes(module.gzipSize) > budgetKB)

  const topModules = modules.slice(0, 20)

  ensureArtifactsDir()

  const lines = []
  lines.push('Top 20 modules by gzipped size')
  lines.push('================================')
  lines.push('')
  for (let i = 0; i < topModules.length; i += 1) {
    lines.push(formatModuleLine(i, topModules[i]))
  }

  lines.push('')
  lines.push(`Budget: ${budgetKB.toFixed(2)} kB gzip per module`)

  if (offenders.length > 0) {
    lines.push('Modules exceeding the budget:')
    for (const offender of offenders) {
      const sizeKB = formatKilobytes(offender.gzipSize)
      const displayPath = (offender.path || offender.label || 'unknown').replace(/^\.\//, '')
      lines.push(`- ${displayPath} (${sizeKB.toFixed(2)} kB gzip)`)
    }
  } else {
    lines.push('All modules are within the configured budget.')
  }

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8')

  const relativeOutput = path.relative(projectRoot, outputPath)
  console.log(`Wrote bundle report to ${relativeOutput}`)

  if (offenders.length > 0) {
    console.error(
      `Found ${offenders.length} module(s) exceeding the ${budgetKB.toFixed(2)} kB gzip budget.`
    )
    process.exit(1)
  }
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
