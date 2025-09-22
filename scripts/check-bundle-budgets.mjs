#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const cwd = process.cwd()
const distDir = process.env.NEXT_DIST_DIR ?? '.next'
const reportFile = path.join(cwd, distDir, 'analyze', 'client-report.json')
const budgetsFile = path.join(cwd, 'config', 'perf', 'bundle-budgets.json')

const args = new Set(process.argv.slice(2))
const quiet = args.has('--ci')

async function loadJson(filePath, missingMessage) {
  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      console.error(missingMessage)
      process.exitCode = 1
      throw error
    }
    throw error
  }
}

function packageName(label) {
  if (label.startsWith('@')) {
    const parts = label.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0]
  }
  const [name] = label.split('/')
  return name
}

function aggregatePackages(report) {
  const totals = new Map()

  for (const chunk of report) {
    const groups = Array.isArray(chunk?.groups) ? chunk.groups : []
    for (const group of groups) {
      if (group?.label !== 'node_modules' || !Array.isArray(group.groups)) {
        continue
      }

      for (const pkg of group.groups) {
        const label = pkg?.label
        if (!label) continue
        const name = packageName(label)
        const size = Number(pkg?.gzipSize ?? 0)
        if (!Number.isFinite(size)) continue
        const prev = totals.get(name) ?? 0
        totals.set(name, prev + size)
      }
    }
  }

  return totals
}

function formatKB(bytes) {
  return (bytes / 1024).toFixed(1)
}

function renderTable(rows) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const widths = headers.map(header => Math.max(header.length, ...rows.map(row => String(row[header]).length)))

  const formatRow = row =>
    headers
      .map((header, index) => String(row[header]).padEnd(widths[index]))
      .join('  ')

  const headerLine = formatRow(Object.fromEntries(headers.map(h => [h, h])))
  const separator = widths.map(width => '-'.repeat(width)).join('  ')
  const body = rows.map(formatRow)

  return [headerLine, separator, ...body].join('\n')
}

async function main() {
  const report = await loadJson(
    reportFile,
    'Bundle analyzer report not found. Run `npm run bundle:analyze` before checking budgets.'
  )
  const budgets = await loadJson(
    budgetsFile,
    'Bundle budget configuration missing at config/perf/bundle-budgets.json.'
  )

  const threshold = Number(budgets.thresholdBytes ?? 51200)
  const packageBudgets = budgets.packages ?? {}

  const totals = aggregatePackages(report)
  const heavyPackages = Array.from(totals.entries())
    .map(([name, size]) => ({ name, size }))
    .filter(entry => entry.size >= threshold)
    .sort((a, b) => b.size - a.size)

  const summaryRows = heavyPackages.map(pkg => {
    const budget = packageBudgets[pkg.name]
    return {
      package: pkg.name,
      'gzip (kB)': formatKB(pkg.size),
      'limit (kB)': budget?.limitBytes ? formatKB(budget.limitBytes) : '—',
      owner: budget?.owner ?? 'unassigned',
    }
  })

  if (!quiet && summaryRows.length > 0) {
    const table = renderTable(summaryRows)
    if (table) {
      console.log('Libraries at or above the gzip threshold:')
      console.log(table)
      console.log('')
    }
  } else if (!quiet) {
    console.log(`No dependencies exceed the gzip threshold of ${formatKB(threshold)} kB.`)
  }

  const violations = []
  for (const pkg of heavyPackages) {
    const budget = packageBudgets[pkg.name]
    if (!budget) {
      violations.push(
        `${pkg.name} (${formatKB(pkg.size)} kB gz) is above ${formatKB(threshold)} kB with no budget owner assigned.`
      )
      continue
    }

    if (typeof budget.limitBytes !== 'number') {
      violations.push(
        `${pkg.name} has an invalid budget configuration. Ensure a numeric limitBytes is defined.`
      )
      continue
    }

    if (pkg.size > budget.limitBytes) {
      violations.push(
        `${pkg.name} (${formatKB(pkg.size)} kB gz) exceeds its budget of ${formatKB(budget.limitBytes)} kB (owner: ${
          budget.owner ?? 'unassigned'
        }).`
      )
    }
  }

  if (violations.length > 0) {
    console.error('Bundle budget violations detected:')
    for (const message of violations) {
      console.error(`  • ${message}`)
    }
    process.exit(1)
  } else if (!quiet) {
    console.log('Bundle budgets check passed.')
  }
}

main().catch(error => {
  if (!quiet) {
    console.error('Failed to evaluate bundle budgets:')
  }
  console.error(error)
  process.exit(1)
})
