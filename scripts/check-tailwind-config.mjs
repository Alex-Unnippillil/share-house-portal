import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(process.cwd())
const candidates = [
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
]

const present = candidates.filter((file) => existsSync(resolve(root, file)))

if (present.length === 0) {
  console.error('No Tailwind config file found. Expected tailwind.config.js.')
  process.exit(1)
}

if (!present.includes('tailwind.config.js')) {
  console.error(
    `Canonical Tailwind config tailwind.config.js is missing. Found: ${present.join(', ')}`,
  )
  process.exit(1)
}

if (present.length > 1) {
  console.error(
    `Multiple Tailwind config files detected (${present.join(', ')}). Keep only tailwind.config.js.`,
  )
  process.exit(1)
}

const canonicalConfig = readFileSync(resolve(root, 'tailwind.config.js'), 'utf8')

if (!canonicalConfig.includes('"gradient-dark"') && !canonicalConfig.includes("'gradient-dark'")) {
  console.error(
    'tailwind.config.js is missing extend.backgroundImage.gradient-dark; expected to preserve this extension.',
  )
  process.exit(1)
}

console.log('Tailwind config guard passed: single canonical tailwind.config.js detected.')
