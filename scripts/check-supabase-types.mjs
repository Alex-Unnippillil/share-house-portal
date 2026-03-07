#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const migrationsDir = path.join(root, 'supabase', 'migrations')
const generatedTypesPath = path.join(root, 'lib', 'database.types.generated.ts')

const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()

if (migrationFiles.length === 0) {
  console.error('No active migrations found in supabase/migrations.')
  process.exit(1)
}

const migrationContent = migrationFiles
  .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n\n-- migration-separator --\n\n')

const currentHash = createHash('sha256').update(migrationContent).digest('hex')
const generatedFile = readFileSync(generatedTypesPath, 'utf8')
const existingHash = generatedFile.match(/schema-hash:\s*([a-f0-9]{64})/i)?.[1]

if (!existingHash) {
  console.error('Missing schema-hash header in lib/database.types.generated.ts.')
  process.exit(1)
}

if (existingHash !== currentHash) {
  console.error('Supabase generated types are stale.')
  console.error(`Expected schema-hash: ${currentHash}`)
  console.error(`Found schema-hash:    ${existingHash}`)
  console.error('Regenerate lib/database.types.generated.ts from active migrations.')
  process.exit(1)
}

console.log('Supabase generated types are in sync with active migrations.')
