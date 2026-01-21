#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const hasConnectionString = Boolean(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);

function runStep(command, args, message) {
  if (message) {
    console.log(message);
  }

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to execute ${command}:`, result.error.message);
    process.exit(result.status || 1);
  }

  if (result.status !== 0) {
    process.exit(result.status);
  }
}

if (process.env.VERCEL_ENV === 'preview') {
  if (hasConnectionString) {
    runStep(npmCommand, ['run', 'dev:seed'], 'Running preview seed (npm run dev:seed) before build');
  } else {
    console.warn(
      'Preview seed skipped because SUPABASE_DB_URL (or DATABASE_URL) is not configured. '
        + 'Provide a connection string to load demo data during preview builds.'
    );
  }
} else {
  console.log(
    `Skipping preview seed because VERCEL_ENV=${process.env.VERCEL_ENV || 'undefined'}.` +
      ' The build will continue without loading demo data.'
  );
}

runStep(npmCommand, ['run', 'build'], 'Starting Next.js build');
