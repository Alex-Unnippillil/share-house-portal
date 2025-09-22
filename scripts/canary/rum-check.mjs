#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const thresholdsPath = path.resolve(__dirname, '../../config/canary/thresholds.json');
const thresholdsRaw = await readFile(thresholdsPath, 'utf8');
const thresholds = JSON.parse(thresholdsRaw);

const previewUrl = process.env.CANARY_URL;
const metricsEndpoint = process.env.RUM_METRICS_ENDPOINT || (previewUrl ? new URL('/api/canary/rum-summary', previewUrl).toString() : null);

if (!metricsEndpoint) {
  console.error('RUM metrics endpoint not configured. Set RUM_METRICS_ENDPOINT or provide CANARY_URL.');
  process.exit(1);
}

const headers = {};
if (process.env.RUM_METRICS_API_KEY) {
  headers['Authorization'] = `Bearer ${process.env.RUM_METRICS_API_KEY}`;
}

const response = await fetch(metricsEndpoint, { headers });
if (!response.ok) {
  console.error(`Failed to load RUM metrics from ${metricsEndpoint}. Received status ${response.status}.`);
  process.exit(1);
}

const payload = await response.json();
const metrics = {
  clsP75: Number(payload.clsP75 ?? payload.cls?.p75 ?? payload.cumulativeLayoutShift?.p75 ?? NaN),
  fidP75: Number(payload.fidP75 ?? payload.fid?.p75 ?? payload.firstInputDelay?.p75 ?? NaN),
  lcpP75: Number(payload.lcpP75 ?? payload.lcp?.p75 ?? payload.largestContentfulPaint?.p75 ?? NaN)
};

const missing = Object.entries(metrics).filter(([, value]) => Number.isNaN(value)).map(([key]) => key);
if (missing.length > 0) {
  console.error(`Missing expected RUM metrics: ${missing.join(', ')}.`);
  process.exit(1);
}

const violations = [];
if (metrics.clsP75 > thresholds.rum.clsP75) {
  violations.push(`p75 CLS ${metrics.clsP75} exceeds threshold ${thresholds.rum.clsP75}`);
}
if (metrics.fidP75 > thresholds.rum.fidP75) {
  violations.push(`p75 FID ${metrics.fidP75} exceeds threshold ${thresholds.rum.fidP75}ms`);
}
if (metrics.lcpP75 > thresholds.rum.lcpP75) {
  violations.push(`p75 LCP ${metrics.lcpP75} exceeds threshold ${thresholds.rum.lcpP75}ms`);
}

if (violations.length > 0) {
  console.error('RUM regression detected:\n- ' + violations.join('\n- '));
  process.exit(1);
}

console.log('RUM metrics are within thresholds.');
