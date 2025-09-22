import { readFile } from "node:fs/promises"
import { join } from "node:path"

import type { PerfDashboardFixture } from "@/types/perf"

const fixturePath = join(process.cwd(), "tests/fixtures/perf/dashboard.json")
let cachedFixture: PerfDashboardFixture | null = null

function cloneFixture(fixture: PerfDashboardFixture): PerfDashboardFixture {
  return JSON.parse(JSON.stringify(fixture)) as PerfDashboardFixture
}

export async function loadPerfDashboardFixture(): Promise<PerfDashboardFixture> {
  if (cachedFixture) {
    return cloneFixture(cachedFixture)
  }

  const raw = await readFile(fixturePath, "utf-8")
  const parsed = JSON.parse(raw) as PerfDashboardFixture
  cachedFixture = parsed
  return cloneFixture(parsed)
}

export function getPerfDashboardFixturePath(): string {
  return fixturePath
}
