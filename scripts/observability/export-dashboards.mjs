#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import process from "process"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..", "..")
const dashboardsRoot = path.join(repoRoot, "observability", "dashboards")

const datadogTargets = [
  {
    env: "DATADOG_ROOMSILY_CORE_DASHBOARD_ID",
    file: path.join(dashboardsRoot, "datadog", "roomsily-core.dashboard.json"),
    description: "Roomsily core services dashboard"
  }
]

const vercelTargets = [
  {
    slug: process.env.VERCEL_PRODUCTION_DASHBOARD_SLUG ?? "production-performance",
    projectEnv: "VERCEL_PROJECT_ID",
    file: path.join(dashboardsRoot, "vercel", "production-performance.dashboard.json"),
    description: "Production performance analytics dashboard"
  }
]

async function ensureParentDirectory(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

async function resolveDatadogId(target) {
  if (process.env[target.env]) {
    return process.env[target.env]
  }

  if (!existsSync(target.file)) {
    throw new Error(
      `Missing ${target.env} and ${target.file}. Provide the Datadog dashboard id via env.`
    )
  }

  const existingRaw = await readFile(target.file, "utf8")
  const existing = JSON.parse(existingRaw)
  if (!existing.id) {
    throw new Error(
      `Unable to derive Datadog dashboard id from ${target.file}; please set ${target.env}.`
    )
  }

  console.warn(
    `Using dashboard id ${existing.id} from ${path.relative(repoRoot, target.file)} because ${target.env} is not set.`
  )
  return existing.id
}

async function exportDatadogDashboards() {
  const apiKey = process.env.DATADOG_API_KEY
  const appKey = process.env.DATADOG_APP_KEY

  if (!apiKey || !appKey) {
    console.warn("Skipping Datadog export; set DATADOG_API_KEY and DATADOG_APP_KEY to enable.")
    return
  }

  const apiHost = process.env.DATADOG_API_HOST ?? "https://api.datadoghq.com"

  for (const target of datadogTargets) {
    const dashboardId = await resolveDatadogId(target)
    const url = `${apiHost}/api/v1/dashboard/${dashboardId}`
    const response = await fetch(url, {
      headers: {
        "DD-API-KEY": apiKey,
        "DD-APPLICATION-KEY": appKey,
        Accept: "application/json"
      }
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Failed to export Datadog dashboard ${dashboardId} (${target.description}). ${response.status} ${response.statusText}: ${body}`
      )
    }

    const payload = await response.json()
    await ensureParentDirectory(target.file)
    await writeFile(target.file, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
    console.log(`✅ Updated ${path.relative(repoRoot, target.file)} from Datadog (${dashboardId}).`)
  }
}

async function exportVercelDashboards() {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    console.warn("Skipping Vercel export; set VERCEL_TOKEN to enable.")
    return
  }

  const teamId = process.env.VERCEL_TEAM_ID

  for (const target of vercelTargets) {
    const projectId = process.env[target.projectEnv]
    if (!projectId) {
      throw new Error(`Set ${target.projectEnv} before exporting ${target.description}.`)
    }

    const url = new URL("https://api.vercel.com/v1/insights/overview")
    url.searchParams.set("projectId", projectId)
    url.searchParams.set("slug", target.slug)
    if (teamId) {
      url.searchParams.set("teamId", teamId)
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    })

    if (response.status === 404) {
      console.warn(
        `Vercel did not expose an insights export for ${target.slug}. Leaving ${path.relative(
          repoRoot,
          target.file
        )} unchanged. (request url: ${url.toString()})`
      )
      continue
    }

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Failed to export Vercel dashboard ${target.slug}. ${response.status} ${response.statusText}: ${body}`
      )
    }

    const payload = await response.json()
    const definition = {
      slug: target.slug,
      projectId,
      exportedAt: new Date().toISOString(),
      source: url.toString(),
      payload
    }

    await ensureParentDirectory(target.file)
    await writeFile(target.file, `${JSON.stringify(definition, null, 2)}\n`, "utf8")
    console.log(`✅ Updated ${path.relative(repoRoot, target.file)} from Vercel (${target.slug}).`)
  }
}

try {
  await exportDatadogDashboards()
  await exportVercelDashboards()
  console.log("Done exporting dashboards.")
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
