#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const args = [];
  let route;
  let outputDir;
  let label;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if ((arg === '--route' || arg === '-r') && argv[i + 1]) {
      route = argv[++i];
      continue;
    }

    if (arg.startsWith('--route=')) {
      route = arg.split('=')[1];
      continue;
    }

    if ((arg === '--output-dir' || arg === '-o') && argv[i + 1]) {
      outputDir = argv[++i];
      continue;
    }

    if (arg.startsWith('--output-dir=')) {
      outputDir = arg.split('=')[1];
      continue;
    }

    if ((arg === '--label' || arg === '-l') && argv[i + 1]) {
      label = argv[++i];
      continue;
    }

    if (arg.startsWith('--label=')) {
      label = arg.split('=')[1];
      continue;
    }

    args.push(arg);
  }

  const exportArgs = [];
  if (route) {
    exportArgs.push('--route', route);
  }
  if (outputDir) {
    exportArgs.push('--output-dir', outputDir);
  }
  if (label) {
    exportArgs.push('--label', label);
  }

  return { nextArgs: args, exportArgs, route };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const { nextArgs, exportArgs, route } = parseArgs(process.argv.slice(2));
  const nextCli = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  const env = { ...process.env, NEXT_PROFILING: process.env.NEXT_PROFILING ?? '1' };

  console.log('Building Next.js with React profiling instrumentation...');
  await run('node', [nextCli, 'build', '--profile', ...nextArgs], { env });

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const exportScript = join(currentDir, 'export-react-trace.mjs');
  const targetRoute = route ?? '/dashboard';
  console.log(`Exporting React trace events for ${targetRoute}...`);
  await run('node', [exportScript, ...exportArgs], { env: process.env });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
