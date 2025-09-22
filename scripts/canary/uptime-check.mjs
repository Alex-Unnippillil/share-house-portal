#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const thresholdsPath = path.resolve(__dirname, '../../config/canary/thresholds.json');
const thresholdsRaw = await readFile(thresholdsPath, 'utf8');
const thresholds = JSON.parse(thresholdsRaw);

const baseUrl = process.env.UPTIME_CHECK_URL || process.env.CANARY_URL;
if (!baseUrl) {
  console.error('Uptime check requires CANARY_URL or UPTIME_CHECK_URL.');
  process.exit(1);
}

const checkPath = process.env.UPTIME_CHECK_PATH || '/api/health';
const probeUrl = new URL(checkPath, baseUrl).toString();
const headers = {};
if (process.env.UPTIME_CHECK_API_KEY) {
  headers['Authorization'] = `Bearer ${process.env.UPTIME_CHECK_API_KEY}`;
}

const start = performance.now();
const response = await fetch(probeUrl, { headers });
const duration = performance.now() - start;

if (response.status !== (process.env.UPTIME_EXPECTED_STATUS ? Number(process.env.UPTIME_EXPECTED_STATUS) : thresholds.uptime.expectedStatus)) {
  console.error(`Uptime check failed. Expected status ${process.env.UPTIME_EXPECTED_STATUS || thresholds.uptime.expectedStatus} but received ${response.status}.`);
  process.exit(1);
}

if (!response.ok) {
  console.error(`Probe to ${probeUrl} failed with status ${response.status}.`);
  process.exit(1);
}

if (duration > thresholds.uptime.maxResponseTimeMs) {
  console.error(`Uptime regression detected: response time ${duration.toFixed(2)}ms exceeds threshold ${thresholds.uptime.maxResponseTimeMs}ms.`);
  process.exit(1);
}

console.log(`Uptime check passed in ${duration.toFixed(2)}ms.`);
