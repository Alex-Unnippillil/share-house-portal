#!/usr/bin/env node

const { execSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const repoRoot = path.resolve(__dirname, "..")
const schemasDir = path.join(repoRoot, "docs", "events", "schemas")

function runGit(command) {
  try {
    return execSync(command, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim()
  } catch (error) {
    return ""
  }
}

function parseNameStatus(output) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [status, filePath] = line.split(/\s+/)
      return { status, filePath }
    })
}

function listFilesRecursively(relativePath) {
  const absolutePath = path.resolve(repoRoot, relativePath)
  if (!absolutePath.startsWith(schemasDir)) {
    return []
  }

  const stats = fs.statSync(absolutePath, { throwIfNoEntry: false })
  if (!stats) {
    return []
  }

  if (stats.isFile()) {
    return [path.relative(repoRoot, absolutePath).replace(/\\/g, "/")]
  }

  if (!stats.isDirectory()) {
    return []
  }

  const results = []
  for (const entry of fs.readdirSync(absolutePath)) {
    const nestedRelative = path.join(relativePath, entry)
    results.push(...listFilesRecursively(nestedRelative))
  }
  return results
}

function parsePorcelain(output) {
  const entries = []
  for (const line of output.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const status = trimmed.slice(0, 2)
    const filePath = trimmed.slice(3).trim()
    const normalizedStatus = status === "??" ? "A" : status.trim() || status

    if (filePath.endsWith("/")) {
      const childFiles = listFilesRecursively(filePath)
      for (const child of childFiles) {
        entries.push({ status: normalizedStatus, filePath: child })
      }
    } else {
      entries.push({ status: normalizedStatus, filePath })
    }
  }
  return entries
}

function getChangedSchemaFiles() {
  const statusOutput = runGit("git status --porcelain docs/events/schemas")
  const statusChanges = parsePorcelain(statusOutput)
  if (statusChanges.length > 0) {
    return statusChanges
  }

  const mergeBase = runGit("git merge-base HEAD origin/main")
  if (mergeBase) {
    const diffOutput = runGit(
      `git diff --name-status ${mergeBase} HEAD -- docs/events/schemas`
    )
    const diffChanges = parseNameStatus(diffOutput)
    if (diffChanges.length > 0) {
      return diffChanges
    }
  }

  const parentRef = runGit("git rev-parse HEAD^")
  if (parentRef) {
    const diffOutput = runGit(
      `git diff --name-status ${parentRef} HEAD -- docs/events/schemas`
    )
    const diffChanges = parseNameStatus(diffOutput)
    if (diffChanges.length > 0) {
      return diffChanges
    }
  }

  return []
}

function validateAddedSchema(filePath) {
  const absolutePath = path.join(repoRoot, filePath)
  if (!absolutePath.startsWith(schemasDir)) {
    throw new Error(`Schema ${filePath} must live under docs/events/schemas/`)
  }

  const fileName = path.basename(filePath)
  const match = fileName.match(/^([a-z0-9-]+)\.v(\d+\.\d+\.\d+)\.json$/)
  if (!match) {
    throw new Error(
      `Schema file ${fileName} must follow <event-name>.v<major>.<minor>.<patch>.json naming`
    )
  }

  const [, , versionFromName] = match
  const rawContent = fs.readFileSync(absolutePath, "utf8")
  let schema
  try {
    schema = JSON.parse(rawContent)
  } catch (error) {
    throw new Error(`Schema file ${fileName} is not valid JSON`)
  }

  const versionConst = schema?.properties?.version?.const
  if (!versionConst) {
    throw new Error(
      `Schema file ${fileName} must declare properties.version.const`
    )
  }

  if (versionConst !== versionFromName) {
    throw new Error(
      `Schema file ${fileName} declares version ${versionConst} but filename encodes ${versionFromName}`
    )
  }

  const eventConst = schema?.properties?.event?.const
  if (!eventConst || typeof eventConst !== "string") {
    throw new Error(`Schema file ${fileName} must declare properties.event.const`)
  }
}

function main() {
  if (!fs.existsSync(schemasDir)) {
    console.error("docs/events/schemas directory is missing")
    process.exit(1)
  }

  const changes = getChangedSchemaFiles()
  if (changes.length === 0) {
    console.log("No schema changes detected.")
    return
  }

  const violations = changes.filter(({ status }) => status !== "A")
  if (violations.length > 0) {
    console.error(
      "Schema files may only be added. Existing versions are immutable:\n" +
        violations.map(({ status, filePath }) => `${status} ${filePath}`).join("\n")
    )
    process.exit(1)
  }

  try {
    for (const change of changes) {
      validateAddedSchema(change.filePath)
    }
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }

  console.log("Event schema validation passed.")
}

main()
