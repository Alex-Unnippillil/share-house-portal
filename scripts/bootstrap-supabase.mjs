#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const supabaseCli = process.env.SUPABASE_CLI_PATH || 'supabase';
const dbUrl = process.env.SUPABASE_DB_URL;
const shouldSeed = process.env.SUPABASE_SKIP_SEED !== 'true';
const seedFile = resolve(process.cwd(), process.env.SUPABASE_SEED_FILE ?? 'supabase/demo/seed.sql');

function runSupabaseCommand(args) {
  const result = spawnSync(supabaseCli, args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`Supabase CLI not found at \"${supabaseCli}\". Install it from https://supabase.com/docs/guides/cli.`);
      process.exit(1);
    }

    console.error(result.error);
    process.exit(1);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

const pushArgs = ['db', 'push'];
if (dbUrl) {
  pushArgs.push('--db-url', dbUrl);
}

console.log('Applying Supabase migrations...');
runSupabaseCommand(pushArgs);

if (shouldSeed && existsSync(seedFile)) {
  console.log(`Seeding database with ${seedFile}...`);
  runSupabaseCommand(['db', 'seed', '--file', seedFile]);
} else if (shouldSeed) {
  console.warn(`Seed file not found at ${seedFile}. Skipping seeding step.`);
} else {
  console.log('Skipping seeding step because SUPABASE_SKIP_SEED is set to true.');
}
