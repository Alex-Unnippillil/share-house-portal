import fs from "node:fs"
import path from "node:path"

const componentsRoot = path.join(process.cwd(), "components")
const componentExtensions = new Set([".ts", ".tsx", ".js", ".jsx"])

const files = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }

    if (!componentExtensions.has(path.extname(entry.name))) {
      continue
    }

    files.push(path.relative(process.cwd(), fullPath))
  }
}

if (!fs.existsSync(componentsRoot)) {
  console.log("No components directory found; skipping filename checks.")
  process.exit(0)
}

walk(componentsRoot)

const issues = []
const lowercasePaths = new Map()
const dedupedBaseNames = new Map()

for (const relativePath of files) {
  const lowercasePath = relativePath.toLowerCase()

  if (lowercasePaths.has(lowercasePath) && lowercasePaths.get(lowercasePath) !== relativePath) {
    issues.push(
      `Case-variant file paths found: \`${lowercasePaths.get(lowercasePath)}\` and \`${relativePath}\``,
    )
  } else {
    lowercasePaths.set(lowercasePath, relativePath)
  }

  const fileName = path.basename(relativePath)
  const extension = path.extname(fileName)
  const stem = path.basename(fileName, extension)

  if (/\s\(\d+\)$/.test(stem)) {
    issues.push(`Duplicate-suffixed filename found: \`${relativePath}\``)
  }

  const dedupedStem = stem.replace(/\s\(\d+\)$/, "")
  const dedupedKey = `${path.dirname(relativePath)}/${dedupedStem}`.toLowerCase()

  if (!dedupedBaseNames.has(dedupedKey)) {
    dedupedBaseNames.set(dedupedKey, [])
  }

  dedupedBaseNames.get(dedupedKey).push(relativePath)
}

for (const relatedPaths of dedupedBaseNames.values()) {
  if (relatedPaths.length > 1) {
    issues.push(`Potential duplicate component filenames found: ${relatedPaths.map((file) => `\`${file}\``).join(", ")}`)
  }
}

if (issues.length > 0) {
  console.error("Component filename validation failed:\n")
  for (const issue of issues) {
    console.error(`- ${issue}`)
  }
  process.exit(1)
}

console.log(`Component filename validation passed for ${files.length} files.`)
