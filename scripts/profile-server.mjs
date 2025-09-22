#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';

const DEFAULT_OUTPUT_DIR = 'docs/perf/flamegraphs';
const DEFAULT_WAIT_MS = 1200;

function parseArgs(argv) {
  let route;
  let port = process.env.PORT ? Number(process.env.PORT) : 3000;
  let outputDir = DEFAULT_OUTPUT_DIR;
  let label;
  let waitMs = DEFAULT_WAIT_MS;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!route && !arg.startsWith('-')) {
      route = arg;
      continue;
    }

    if (arg === '--port' || arg === '-p') {
      port = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith('--port=')) {
      port = Number(arg.split('=')[1]);
      continue;
    }

    if (arg === '--output-dir' || arg === '-o') {
      outputDir = argv[++i];
      continue;
    }

    if (arg.startsWith('--output-dir=')) {
      outputDir = arg.split('=')[1];
      continue;
    }

    if (arg === '--label' || arg === '-l') {
      label = argv[++i];
      continue;
    }

    if (arg.startsWith('--label=')) {
      label = arg.split('=')[1];
      continue;
    }

    if (arg === '--wait' || arg === '--delay') {
      waitMs = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith('--wait=') || arg.startsWith('--delay=')) {
      waitMs = Number(arg.split('=')[1]);
      continue;
    }

    console.warn(`Unknown argument: ${arg}`);
  }

  if (!route) {
    console.error('Usage: node scripts/profile-server.mjs <route> [--port <port>] [--output-dir <dir>] [--label <name>] [--wait <ms>]');
    process.exit(1);
  }

  return { route, port, outputDir, label, waitMs };
}

function normaliseRoute(route) {
  if (/^https?:\/\//i.test(route)) {
    try {
      const url = new URL(route);
      return url.pathname || '/';
    } catch (error) {
      return route;
    }
  }

  if (!route.startsWith('/')) {
    return `/${route}`;
  }

  return route;
}

function createSlug(route, label) {
  const base = label || normaliseRoute(route);
  const withoutQuery = base.split('?')[0].split('#')[0];
  const slug = withoutQuery
    .replace(/^[\/]+/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug.length > 0 ? slug : 'root';
}

function getTargetUrl(route, port) {
  if (/^https?:\/\//i.test(route)) {
    return route;
  }

  const path = normaliseRoute(route);
  return `http://localhost:${port}${path}`;
}

async function waitForReady(child) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const handleData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (!resolved) {
        const normalised = text.toLowerCase();
        if (normalised.includes('started server') || normalised.includes('ready - started server')) {
          resolved = true;
          child.stdout.off('data', handleData);
          resolve();
        }
      }
    };

    child.stdout.on('data', handleData);
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));

    child.once('exit', (code) => {
      if (!resolved) {
        reject(new Error(`next start exited before becoming ready (code ${code})`));
      }
    });

    child.once('error', reject);
  });
}

async function waitForExit(child, signal = 'SIGINT') {
  if (!child.killed) {
    child.kill(signal);
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, 5000);

    child.once('exit', (code, signalName) => {
      clearTimeout(timeout);
      resolve({ code, signal: signalName });
    });
  });
}

async function findLatestV8Log(cwd) {
  const entries = await readdir(cwd);
  const logs = [];

  for (const entry of entries) {
    if (entry.startsWith('isolate-') && entry.endsWith('-v8.log')) {
      const filePath = join(cwd, entry);
      const stats = await stat(filePath);
      logs.push({ filePath, mtime: stats.mtimeMs });
    }
  }

  logs.sort((a, b) => b.mtime - a.mtime);
  return logs[0];
}

function resolveBinary(bin) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  return join(process.cwd(), 'node_modules', '.bin', `${bin}${suffix}`);
}

function runBinary(command, args, options = {}) {
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
  const { route, port, outputDir, label, waitMs } = parseArgs(process.argv.slice(2));
  const targetUrl = getTargetUrl(route, port);
  const slug = createSlug(route, label);

  console.log(`Starting Next.js with V8 profiler for ${targetUrl}...`);
  const nextCli = join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn('node', ['--prof', nextCli, 'start', '-p', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  await waitForReady(server);

  console.log(`Requesting ${targetUrl} to capture workload...`);
  const start = performance.now();
  const response = await fetch(targetUrl, {
    headers: { 'user-agent': 'share-house-portal-profiler' },
  });
  const duration = performance.now() - start;

  if (!response.ok) {
    throw new Error(`Request to ${targetUrl} failed with status ${response.status}`);
  }

  // Consume the body to make sure all work completes before shutting down
  await response.text();
  console.log(`Route responded in ${duration.toFixed(2)}ms`);

  await delay(waitMs);
  console.log('Stopping Next.js server...');
  await waitForExit(server);

  const log = await findLatestV8Log(process.cwd());
  if (!log) {
    throw new Error('No V8 profiling log found. Was node --prof able to generate output?');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destinationDir = resolve(process.cwd(), outputDir, `${timestamp}-${slug}`);
  await mkdir(destinationDir, { recursive: true });

  const zeroX = resolveBinary('0x');
  console.log(`Converting ${basename(log.filePath)} into a flamegraph using 0x...`);
  await runBinary(zeroX, ['--output-dir', destinationDir, '--visualize-only', log.filePath]);

  const archivedLogPath = join(destinationDir, basename(log.filePath));
  await rename(log.filePath, archivedLogPath);

  console.log(`Flamegraph and raw log saved to ${destinationDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
