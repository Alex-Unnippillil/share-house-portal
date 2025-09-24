#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const complianceFile = path.join(repoRoot, 'docs', 'compliance', 'soc2.yaml')

async function main() {
  const errors = []
  let raw

  try {
    raw = await readFile(complianceFile, 'utf8')
  } catch (error) {
    errors.push(`Unable to read compliance register at ${complianceFile}: ${error.message}`)
    reportAndExit(errors)
    return
  }

  let document
  try {
    document = parse(raw)
  } catch (error) {
    errors.push(`Failed to parse soc2.yaml: ${error.message}`)
    reportAndExit(errors)
    return
  }

  if (!document || typeof document !== 'object') {
    errors.push('Parsed SOC 2 document is empty or not an object.')
  }

  const metadata = document?.metadata
  if (!metadata) {
    errors.push('metadata section is required in docs/compliance/soc2.yaml.')
  } else {
    if (!metadata.review_cycle) {
      errors.push('metadata.review_cycle must be defined (expected "quarterly").')
    } else if (String(metadata.review_cycle).toLowerCase() !== 'quarterly') {
      errors.push(
        `metadata.review_cycle is set to "${metadata.review_cycle}" but must remain "quarterly" to satisfy review cadence.`
      )
    }

    if (!metadata.last_reviewed) {
      errors.push('metadata.last_reviewed must record the most recent review date (ISO-8601).')
    }
  }

  const controls = Array.isArray(document?.controls) ? document.controls : []
  if (controls.length === 0) {
    errors.push('At least one control entry is required under controls[].')
  }

  controls.forEach((control, index) => {
    const controlRef = control?.id ? `${control.id}` : `index ${index}`

    if (!control?.id) {
      errors.push(`Control at index ${index} is missing an id.`)
    }

    if (!control?.title) {
      errors.push(`Control ${controlRef} is missing a title.`)
    }

    if (!Array.isArray(control?.evidence) || control.evidence.length === 0) {
      errors.push(`Control ${controlRef} must reference at least one evidence item.`)
      return
    }

    control.evidence.forEach((item, evidenceIndex) => {
      const evidenceRef = `${controlRef} evidence[${evidenceIndex}]`

      if (!item?.path) {
        errors.push(`${evidenceRef} is missing a path field.`)
        return
      }

      const absolutePath = path.join(repoRoot, item.path)
      if (!existsSync(absolutePath)) {
        errors.push(`${evidenceRef} path does not exist: ${item.path}`)
      }

      if (!item?.type) {
        errors.push(`${evidenceRef} is missing a type (policy, runbook, code, config, migration, automation, etc.).`)
      }

      if (!item?.name) {
        errors.push(`${evidenceRef} is missing a descriptive name.`)
      }
    })
  })

  reportAndExit(errors)
}

function reportAndExit(errors) {
  if (errors.length > 0) {
    console.error('\nSOC 2 mapping validation failed:')
    for (const message of errors) {
      console.error(`  • ${message}`)
    }
    process.exitCode = 1
  } else {
    console.log('SOC 2 mappings look good ✅')
  }
}

await main()
