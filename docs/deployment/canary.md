# Canary Deployment Flow

This document explains how the Roomsily portal promotes code merged into `main` through a canary environment, validates release quality, and promotes to production. The automation lives in `.github/workflows/canary-deploy.yml` and is triggered automatically on merges to `main`.

## Pipeline Overview

1. **Build & Deploy**
   - The workflow installs dependencies with `pnpm`, builds the Next.js application, and deploys it to a dedicated Vercel preview using `vercel deploy --target=preview` with `CANARY=1` in the environment.
   - The preview URL and deployment ID are captured for subsequent jobs.
   - The workflow also records the current production deployment ID so it can revert if checks fail.
2. **Quality Gates**
   - **RUM guard** – `scripts/canary/rum-check.mjs` fetches real user monitoring metrics from `RUM_METRICS_ENDPOINT` (or `https://<preview>/api/canary/rum-summary`) and validates them against the thresholds defined in `config/canary/thresholds.json`.
   - **Uptime guard** – `scripts/canary/uptime-check.mjs` probes `CANARY_URL` (or `UPTIME_CHECK_URL`) and ensures we return the expected status in less than the configured response budget.
   - **Lighthouse** – `pnpm canary:lighthouse` runs Lighthouse CI against the preview URL with score assertions sourced from `config/canary/thresholds.json` via `lighthouserc.cjs`.
   - **Smoke suite** – `pnpm canary:smoke` executes the Vitest tests under `tests/` to confirm core flows still work.
3. **Promotion or Rollback**
   - If all gates succeed, the workflow promotes the canary deployment with `vercel promote <deploymentId>` and posts announcements to Slack and email.
   - If any gate fails, the workflow promotes the previously recorded production deployment (rolling back) and notifies stakeholders of the failure.

## Required Secrets

Configure the following secrets in the repository or organisation settings before enabling the workflow:

| Secret | Purpose |
| --- | --- |
| `VERCEL_TOKEN` | Vercel access token used for deploy/promote calls. |
| `VERCEL_ORG_ID` | Organisation scope for the Roomsily project. |
| `VERCEL_PROJECT_ID` | Project ID for the portal. |
| `CANARY_SLACK_WEBHOOK` | Incoming webhook URL for the delivery-status Slack channel. |
| `RESEND_API_KEY` | API key for sending transactional emails via Resend. |
| `CANARY_EMAIL_FROM` | Sender address for rollout notifications. |
| `CANARY_EMAIL_RECIPIENTS` | Comma-separated list of stakeholders to email. |
| `RUM_METRICS_ENDPOINT` (optional) | Override metrics endpoint for RUM checks. |
| `RUM_METRICS_API_KEY` (optional) | API key for the metrics endpoint. |
| `UPTIME_CHECK_URL` / `UPTIME_CHECK_PATH` (optional) | Override endpoint for uptime probes if different from `/api/health`. |
| `UPTIME_CHECK_API_KEY` / `UPTIME_EXPECTED_STATUS` (optional) | Authentication and custom status expectations for uptime probes. |
| `LIGHTHOUSE_RUNS` (optional) | Number of Lighthouse runs to average per release. |

## Threshold Configuration

`config/canary/thresholds.json` centralises the budgets enforced by automation. Update these numbers when performance budgets change and keep them in sync with observability dashboards. The same file powers the RUM, uptime, and Lighthouse checks.

## Rollback Playbook

Automation mirrors the manual playbook:

1. Capture the ID of the latest production deployment before creating the canary.
2. If any gate fails, immediately alias production back to that saved deployment using `vercel promote <previousDeploymentId>`.
3. Publish Slack and email alerts explaining the failure and linking the canary URL for investigation.
4. Leave the failed canary deployment active for debugging, but block promotion until the regression is fixed and merged.

Because the workflow implements the exact steps above, engineers can still execute the same commands locally if needed.

## Notifications

Slack and email alerts fire on both promotion success and rollback. Messages include the preview URL to aid debugging and audit. Update the Slack channel or mailing list by changing the corresponding secrets.

## Local Verification

To reproduce the gates locally against a running canary deployment, export `CANARY_URL` and run:

```bash
pnpm canary:rum
pnpm canary:uptime
pnpm canary:lighthouse
pnpm canary:smoke
```

Ensure the metrics APIs you rely on are reachable from your environment and that the thresholds file matches expectations before adjusting automation.
