#!/usr/bin/env node

/**
 * Nightly ELT orchestrator for triggering an Airbyte connection sync and
 * ensuring the job completes successfully. The script was designed for
 * Share House Portal's Supabase -> warehouse pipeline, but is generic enough
 * to be reused for other Airbyte sources.
 */

const requiredEnv = [
  'AIRBYTE_API_URL',
  'AIRBYTE_CONNECTION_ID',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(', ')}`,
  );
  process.exit(1);
}

const {
  AIRBYTE_API_URL,
  AIRBYTE_CONNECTION_ID,
  AIRBYTE_API_TOKEN,
  AIRBYTE_AUTH_HEADER,
  ELT_POLL_INTERVAL_SECONDS,
  ELT_MAX_WAIT_MINUTES,
  ELT_ALERT_WEBHOOK_URL,
  ELT_ALERT_CHANNEL,
  ELT_PIPELINE_NAME = 'Supabase nightly sync',
} = process.env;

const pollIntervalMs = Number(ELT_POLL_INTERVAL_SECONDS ?? 30) * 1000;
const maxWaitMs = Number(ELT_MAX_WAIT_MINUTES ?? 45) * 60 * 1000;

const headers = {
  'content-type': 'application/json',
  accept: 'application/json',
};

if (AIRBYTE_API_TOKEN) {
  const headerName = (AIRBYTE_AUTH_HEADER ?? 'Authorization').trim();
  if (headerName.toLowerCase() === 'authorization') {
    headers[headerName] = AIRBYTE_API_TOKEN.startsWith('Bearer ')
      ? AIRBYTE_API_TOKEN
      : `Bearer ${AIRBYTE_API_TOKEN}`;
  } else {
    headers[headerName] = AIRBYTE_API_TOKEN;
  }
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeFetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request to ${url} failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function triggerSync(connectionId) {
  log(`Triggering Airbyte sync for connection ${connectionId}...`);
  const data = await safeFetchJson(`${AIRBYTE_API_URL}/api/v1/connections/sync`, {
    method: 'POST',
    body: JSON.stringify({ connectionId }),
  });

  const jobId = data?.job?.id ?? data?.jobId;
  if (!jobId) {
    throw new Error(`Unexpected Airbyte response when starting sync: ${JSON.stringify(data)}`);
  }

  log(`Airbyte job ${jobId} started.`);
  return jobId;
}

async function getJobStatus(jobId) {
  const data = await safeFetchJson(`${AIRBYTE_API_URL}/api/v1/jobs/get`, {
    method: 'POST',
    body: JSON.stringify({ id: jobId }),
  });

  const status = data?.job?.status ?? data?.status;
  const attempts = data?.job?.attempts ?? [];
  const latestAttempt = attempts[attempts.length - 1];
  const updatedAt = latestAttempt?.endedAt ?? latestAttempt?.createdAt;
  return {
    status,
    updatedAt,
    attempts,
  };
}

function isTerminal(status) {
  return ['succeeded', 'failed', 'error', 'cancelled', 'incomplete'].includes(
    status?.toLowerCase?.() ?? '',
  );
}

async function sendAlert({ level, title, status, details }) {
  if (!ELT_ALERT_WEBHOOK_URL) {
    return;
  }

  const payload = {
    username: 'Share House Portal ELT',
    text: `*${title}*: ${status}\n${details}`,
    level,
    channel: ELT_ALERT_CHANNEL,
  };

  try {
    await fetch(ELT_ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('Failed to deliver alert webhook:', error);
  }
}

async function run() {
  const start = Date.now();
  const jobId = await triggerSync(AIRBYTE_CONNECTION_ID);

  while (true) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error(
        `Airbyte job ${jobId} did not finish within ${Math.round(maxWaitMs / 60000)} minutes`,
      );
    }

    const { status, updatedAt } = await getJobStatus(jobId);

    if (!status) {
      log(`Job ${jobId} returned an unknown status, retrying after ${pollIntervalMs / 1000}s.`);
      await delay(pollIntervalMs);
      continue;
    }

    log(`Job ${jobId} status: ${status}${updatedAt ? ` (updated at ${updatedAt})` : ''}`);

    if (isTerminal(status)) {
      if (status.toLowerCase() === 'succeeded') {
        await sendAlert({
          level: 'info',
          title: ELT_PIPELINE_NAME,
          status: 'Nightly sync succeeded',
          details: `Airbyte job ${jobId} completed successfully.`,
        });
        log('Nightly sync completed successfully.');
        return;
      }

      const message = `Airbyte job ${jobId} ended with status ${status}.`;
      await sendAlert({
        level: 'error',
        title: ELT_PIPELINE_NAME,
        status: 'Nightly sync failed',
        details: message,
      });
      const failure = new Error(message);
      failure.alertSent = true;
      throw failure;
    }

    await delay(pollIntervalMs);
  }
}

run().catch(async (error) => {
  console.error(error);
  if (!error?.alertSent) {
    await sendAlert({
      level: 'error',
      title: ELT_PIPELINE_NAME,
      status: 'Nightly sync failed',
      details: error.message,
    });
  }
  process.exit(1);
});
