#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';

const TRACE_SOURCE = '.next/trace';
const DEFAULT_ROUTE = '/dashboard';
const DEFAULT_OUTPUT_DIR = 'docs/perf/traces';

function parseArgs(argv) {
  let route = DEFAULT_ROUTE;
  let outputDir = DEFAULT_OUTPUT_DIR;
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

    console.warn(`Unknown argument: ${arg}`);
  }

  return { route, outputDir, label };
}

function normaliseRoute(route) {
  if (!route) return '/';
  if (/^https?:\/\//i.test(route)) {
    try {
      const url = new URL(route);
      return url.pathname || '/';
    } catch (error) {
      return '/';
    }
  }

  if (!route.startsWith('/')) {
    return `/${route}`;
  }

  return route;
}

function toSlug(route, label) {
  const base = label || route;
  const withoutQuery = base.split('?')[0].split('#')[0];
  const slug = withoutQuery
    .replace(/^[\/]+/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return slug.length > 0 ? slug : 'root';
}

function matchesRoute(event, route) {
  if (!event || typeof event !== 'object') return false;
  const args = event.args;
  if (!args || typeof args !== 'object') return false;

  const candidates = [
    args.route,
    args.page,
    args.appDirRoute,
    args.ampRoute,
    args.routePath,
    args.componentPath,
    args.file,
    args.resource,
  ];

  const target = route === '/' ? '/' : route.replace(/\/$/, '');
  const targetWithTrailing = target.endsWith('/page') ? target : `${target}/page`;

  return candidates.some((value) => {
    if (!value) return false;
    const text = String(value).replace(/\\/g, '/');
    if (text === route || text === target) return true;
    if (text === targetWithTrailing || text.endsWith(targetWithTrailing)) return true;
    return text.endsWith(target) || text.includes(`${target}/`);
  });
}

async function main() {
  const { route: rawRoute, outputDir, label } = parseArgs(process.argv.slice(2));
  const route = normaliseRoute(rawRoute);
  const slug = toSlug(route, label);

  let contents;
  try {
    contents = await readFile(TRACE_SOURCE, 'utf8');
  } catch (error) {
    throw new Error('Trace file .next/trace not found. Run `next build --profile` before exporting traces.');
  }

  let events;
  try {
    events = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Unable to parse trace file: ${error.message}`);
  }

  if (!Array.isArray(events)) {
    throw new Error('Unexpected trace format: expected an array of trace events.');
  }

  const filtered = events.filter((event) => matchesRoute(event, route));
  if (filtered.length === 0) {
    console.warn(`No trace events matched route ${route}. The exported file will be empty.`);
  }

  const data = {
    metadata: {
      route,
      generatedAt: new Date().toISOString(),
      totalEvents: filtered.length,
      source: TRACE_SOURCE,
    },
    events: filtered,
  };

  const outputDirectory = resolve(process.cwd(), outputDir);
  await mkdir(outputDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = join(outputDirectory, `${timestamp}-${slug}-trace.json`);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`React trace for ${route} written to ${filePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
