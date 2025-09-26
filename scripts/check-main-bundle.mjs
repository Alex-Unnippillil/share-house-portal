import { readFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const statsPath = resolve(
  projectRoot,
  process.env.BUNDLE_ANALYZER_STATS_PATH ?? '.next/analyze/bundles.json',
)

let statsRaw
try {
  statsRaw = readFileSync(statsPath, 'utf8')
} catch (error) {
  console.error(
    `Bundle stats file not found at "${statsPath}". Run the analyze build first (npm run analyze).`,
  )
  process.exit(1)
}

let statsJson
try {
  statsJson = JSON.parse(statsRaw)
} catch (error) {
  console.error(`Failed to parse bundle stats JSON at "${statsPath}": ${error.message}`)
  process.exit(1)
}

const metricAlias = (process.env.MAIN_BUNDLE_METRIC ?? 'gzip').toLowerCase()
const metricMap = {
  gzip: 'gzipSize',
  parsed: 'parsedSize',
  stat: 'statSize',
}

if (!(metricAlias in metricMap)) {
  console.error(
    `Unsupported MAIN_BUNDLE_METRIC value "${metricAlias}". Use one of ${Object.keys(metricMap)
      .map(key => `'${key}'`)
      .join(', ')}.`,
  )
  process.exit(1)
}

const metricProperty = metricMap[metricAlias]
const entrypoint = process.env.MAIN_BUNDLE_ENTRYPOINT ?? 'app/page'
const thresholdRaw = process.env.MAIN_BUNDLE_MAX_KB ?? '480'
const thresholdKb = Number(thresholdRaw)

if (!Number.isFinite(thresholdKb)) {
  console.error(
    `Invalid MAIN_BUNDLE_MAX_KB value: "${thresholdRaw}". Please provide a numeric threshold.`,
  )
  process.exit(1)
}

const chunks = Array.isArray(statsJson?.chunks) ? statsJson.chunks : []

const entryChunks = chunks.filter(
  chunk =>
    chunk &&
    typeof chunk === 'object' &&
    chunk.isInitialByEntrypoint &&
    chunk.isInitialByEntrypoint[entrypoint],
)

if (entryChunks.length === 0) {
  console.error(
    `No chunks found for entrypoint "${entrypoint}". Set MAIN_BUNDLE_ENTRYPOINT to a valid entry label (e.g. 'app/page').`,
  )
  process.exit(1)
}

const totalBytes = entryChunks.reduce((sum, chunk) => {
  const value = chunk?.[metricProperty]
  return sum + (typeof value === 'number' ? value : 0)
}, 0)

const sizeKb = totalBytes / 1024
const metricLabel = metricAlias === 'stat' ? 'stat' : metricAlias === 'parsed' ? 'parsed' : 'gzip'
const summaryLine = `${entrypoint} ${metricLabel} size: ${sizeKb.toFixed(2)} kB (limit ${thresholdKb.toFixed(
  2,
)} kB).`

console.log(summaryLine)

const topContributors = entryChunks
  .map(chunk => ({
    label: chunk.label,
    bytes: typeof chunk?.[metricProperty] === 'number' ? chunk[metricProperty] : 0,
  }))
  .sort((a, b) => b.bytes - a.bytes)
  .slice(0, 5)

if (topContributors.length > 0) {
  console.log('\nTop contributing chunks:')
  topContributors.forEach(({ label, bytes }) => {
    const kb = bytes / 1024
    console.log(`- ${label}: ${kb.toFixed(2)} kB ${metricLabel}`)
  })
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const summaryLines = [`\n### Bundle size (${entrypoint})`, ``, `- ${summaryLine}`]

  if (topContributors.length > 0) {
    summaryLines.push('\nTop contributing chunks:')
    topContributors.forEach(({ label, bytes }) => {
      summaryLines.push(`- ${label}: ${(bytes / 1024).toFixed(2)} kB ${metricLabel}`)
    })
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summaryLines.join('\n')}\n`, 'utf8')
}

if (sizeKb > thresholdKb) {
  console.error(
    `${entrypoint} ${metricLabel} bundle size exceeded threshold by ${(sizeKb - thresholdKb).toFixed(2)} kB.`,
  )
  process.exit(1)
}
