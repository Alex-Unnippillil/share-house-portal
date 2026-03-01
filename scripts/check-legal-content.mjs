#!/usr/bin/env node

import { readFileSync } from "node:fs"

const filesToCheck = ["app/terms/page.mdx"]

const disallowedPatterns = [
  { label: "Bracketed state/country placeholder", regex: /\[State\/Country Placeholder\]/gi },
  { label: "Template legal email placeholder", regex: /@\[your-domain\]\.com/gi },
  { label: "Generic bracket placeholder token", regex: /\[[^\]]*placeholder[^\]]*\]/gi },
  { label: "Explicit replace-before-production note", regex: /replace before production publication/gi },
]

const findings = []

for (const filePath of filesToCheck) {
  const source = readFileSync(filePath, "utf8")

  for (const { label, regex } of disallowedPatterns) {
    for (const match of source.matchAll(regex)) {
      const index = match.index ?? 0
      const line = source.slice(0, index).split("\n").length
      findings.push({ filePath, label, line, excerpt: match[0] })
    }
  }
}

if (findings.length > 0) {
  console.error("❌ Legal content placeholder validation failed. Resolve the following placeholders:")
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} [${finding.label}] -> ${finding.excerpt}`)
  }
  process.exit(1)
}

console.log("✅ Legal content placeholder validation passed.")
