#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const seedPath = path.resolve(__dirname, '..', 'supabase', 'demo', 'seed.sql');

if (!fs.existsSync(seedPath)) {
  console.error('Unable to find Supabase seed file at', seedPath);
  process.exit(1);
}

const connectionUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionUrl) {
  console.error(
    'Missing required environment variable. Set SUPABASE_DB_URL (or DATABASE_URL) to a valid Postgres connection string.'
  );
  process.exit(1);
}

const versionCheck = spawnSync('psql', ['--version'], { stdio: 'ignore' });

if (versionCheck.status !== 0) {
  console.error(
    'The `psql` CLI is required to run the seed. Install PostgreSQL locally or use the Supabase CLI to expose `psql`.'
  );
  process.exit(versionCheck.status || 1);
}

let databaseLabel = 'Supabase database';

try {
  const parsed = new URL(connectionUrl);
  const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '') : '';
  const user = parsed.username ? `${parsed.username}@` : '';
  databaseLabel = `${user}${parsed.hostname}${dbName ? `/${dbName}` : ''}`;
} catch (error) {
  // Ignore parsing issues and fall back to the generic label above.
}

console.log(`Seeding ${databaseLabel} using ${seedPath}`);

const result = spawnSync(
  'psql',
  [connectionUrl, '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-f', seedPath],
  { stdio: 'inherit' }
);

if (result.error) {
  console.error('Failed to execute seed via psql:', result.error.message);
  process.exit(result.status || 1);
}

if (result.status !== 0) {
  console.error('Supabase seed exited with a non-zero status code.');
  process.exit(result.status);
}

console.log('Seed data loaded successfully.');
