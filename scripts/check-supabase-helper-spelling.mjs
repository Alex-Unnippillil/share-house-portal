#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['app', 'lib', 'utils'];
const allowList = new Set(['utils/supaone.tsx']);
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const disallowed = /\bSupbase\b|createSupbaseServerClient(ReadOnly)?\b/g;
const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const normalizedPath = fullPath.replace(/\\/g, '/');
    if (allowList.has(normalizedPath)) {
      continue;
    }

    const ext = fullPath.slice(fullPath.lastIndexOf('.'));
    if (!exts.has(ext)) {
      continue;
    }

    const content = readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (disallowed.test(line)) {
        violations.push(`${fullPath}:${index + 1}: ${line.trim()}`);
      }
      disallowed.lastIndex = 0;
    });
  }
}

for (const root of roots) {
  walk(root);
}

if (violations.length > 0) {
  console.error('Found deprecated Supbase helper spelling. Use createSupabase... helpers instead.');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Supabase helper spelling check passed.');
