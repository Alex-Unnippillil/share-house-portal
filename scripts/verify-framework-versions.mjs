#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgPath = resolve(__dirname, '../package.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const EXPECTED_VERSIONS = {
  next: '14.2.4',
  typescript: '5.5.4'
};

const errors = [];

const declaredNext = pkg.dependencies?.next;
if (declaredNext !== EXPECTED_VERSIONS.next) {
  errors.push(
    `Expected dependencies.next to be ${EXPECTED_VERSIONS.next}, but found ${declaredNext ?? 'undefined'}.`
  );
}

const overrideNext = pkg.pnpm?.overrides?.next;
if (overrideNext !== EXPECTED_VERSIONS.next) {
  errors.push(
    `Expected pnpm.overrides.next to be ${EXPECTED_VERSIONS.next}, but found ${overrideNext ?? 'undefined'}.`
  );
}

const declaredTs = pkg.devDependencies?.typescript ?? pkg.dependencies?.typescript;
if (declaredTs !== EXPECTED_VERSIONS.typescript) {
  errors.push(
    `Expected TypeScript to be ${EXPECTED_VERSIONS.typescript}, but found ${declaredTs ?? 'undefined'}.`
  );
}

const overrideTs = pkg.pnpm?.overrides?.typescript;
if (overrideTs !== EXPECTED_VERSIONS.typescript) {
  errors.push(
    `Expected pnpm.overrides.typescript to be ${EXPECTED_VERSIONS.typescript}, but found ${overrideTs ?? 'undefined'}.`
  );
}

if (errors.length > 0) {
  console.error('Framework version verification failed:');
  for (const message of errors) {
    console.error(` - ${message}`);
  }
  process.exit(1);
}

console.log('Next.js and TypeScript versions are pinned and verified.');
