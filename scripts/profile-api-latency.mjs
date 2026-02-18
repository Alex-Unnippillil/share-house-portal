import fs from 'node:fs/promises'

const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3000'
const runs = Number.parseInt(process.env.PERF_RUNS ?? '5', 10)

const endpoints = [
  '/api/bookings/history?limit=20',
  '/api/search/global?query=unit',
  '/api/exports/maintenance',
]

async function timeRequest(path) {
  const start = performance.now()
  const response = await fetch(`${baseUrl}${path}`, { cache: 'no-store' })
  const end = performance.now()

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }

  return Math.round(end - start)
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

const output = {}
for (const endpoint of endpoints) {
  const timings = []
  for (let index = 0; index < runs; index += 1) {
    timings.push(await timeRequest(endpoint))
  }

  output[endpoint] = {
    p50: percentile(timings, 50),
    p95: percentile(timings, 95),
    samples: timings,
  }
}

await fs.mkdir('artifacts/perf', { recursive: true })
await fs.writeFile('artifacts/perf/api-latency.json', JSON.stringify({ baseUrl, runs, output }, null, 2))

console.log('API latency profile written to artifacts/perf/api-latency.json')
