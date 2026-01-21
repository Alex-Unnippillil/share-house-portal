# Nightly Supabase ELT Jobs

This directory contains helper scripts for orchestrating the nightly Supabase → warehouse extract/load/transform (ELT) process using Airbyte.

## `run-airbyte-sync.mjs`

`run-airbyte-sync.mjs` triggers a manual sync for an Airbyte connection and monitors the job until completion. It exits with a non-zero status if the sync fails or does not finish within the configured timeout.

### Required environment

| Variable | Description |
| --- | --- |
| `AIRBYTE_API_URL` | Base URL for the Airbyte instance (for Airbyte Cloud use `https://api.airbyte.com`). |
| `AIRBYTE_CONNECTION_ID` | UUID of the connection that replicates Supabase into the warehouse. |

### Optional configuration

| Variable | Default | Description |
| --- | --- | --- |
| `AIRBYTE_API_TOKEN` | – | Personal access token or API key for authenticating against Airbyte. |
| `AIRBYTE_AUTH_HEADER` | `Authorization` | Header used for the token. If set to `Authorization` the script automatically prefixes `Bearer` when missing. |
| `ELT_PIPELINE_NAME` | `Supabase nightly sync` | Name used for logging and alerts. |
| `ELT_POLL_INTERVAL_SECONDS` | `30` | Poll cadence when checking job status. |
| `ELT_MAX_WAIT_MINUTES` | `45` | Maximum amount of time to wait before marking the sync as failed. |
| `ELT_ALERT_WEBHOOK_URL` | – | Optional webhook endpoint (Slack, Teams, PagerDuty, etc.) that receives success/failure notifications. |
| `ELT_ALERT_CHANNEL` | – | Channel identifier forwarded to the webhook payload. |

### Scheduling nightly execution

Add the script to the platform's scheduler (cron, GitHub Actions, Airbyte automation, etc.). Example cron entry running every night at 02:00 in UTC:

```cron
0 2 * * * cd /var/www/share-house-portal && \ \
  export AIRBYTE_API_URL="https://api.airbyte.com" \ \
  export AIRBYTE_CONNECTION_ID="<connection-uuid>" \ \
  export AIRBYTE_API_TOKEN="<token>" \ \
  export ELT_ALERT_WEBHOOK_URL="https://hooks.slack.com/services/..." \ \
  node scripts/elt/run-airbyte-sync.mjs >> /var/log/share-house-portal/elt.log 2>&1
```

Monitoring is automatic once a webhook URL is provided—the script will send `info` alerts on success and `error` alerts on any failure or timeout, ensuring nightly job health is visible.
