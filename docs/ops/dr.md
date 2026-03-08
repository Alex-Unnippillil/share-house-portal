# Disaster Recovery Playbooks

This document covers the disaster recovery (DR) playbooks and validation approach for the Share House Portal when third-party dependencies experience outages. It focuses on Supabase (primary data plane), Stripe (payments), and Cal.com (amenity scheduling) and describes how we prepare, respond, and review DR drills.

## Metrics Snapshot

The most recent game day drill is orchestrated via `node scripts/dr/run-game-day.mjs`, which generates `scripts/dr/latest-metrics.json` capturing Recovery Time Objective (RTO) and Recovery Point Objective (RPO) outcomes. A summary of the current simulation results is below.

| Service  | Target RTO (min) | Simulated RTO (min) | RTO Status      | Target RPO (min) | Simulated RPO (min) | RPO Status      | Follow-ups |
|----------|------------------|---------------------|-----------------|------------------|---------------------|-----------------|------------|
| Supabase | 30               | 26                  | Met (4 min slack) | 5                | 4                   | Met             | Automate Supabase replica promotion and credential rotation checks. |
| Stripe   | 15               | 22                  | **Missed** (+7 min) | 5                | 2                   | Met             | Reduce manual failover effort by codifying webhook replay automation. |
| Cal.com  | 25               | 18                  | Met (7 min slack) | 10               | 12                  | **Missed** (+2 min) | Improve Cal.com backup cadence and embed caching for amenity availability. |

Re-run the simulation before every production change freeze or quarterly review to update the metrics file, then incorporate gaps into the follow-up backlog tracked below.

## Game Day Execution

1. **Schedule the drill** using the configuration in `scripts/dr/scenarios.json`. The `gameDay` block defines the base start time and owner, while each scenario specifies its offset, duration, and objectives.
2. **Run the simulation** locally with:
   ```bash
   pnpm exec node scripts/dr/run-game-day.mjs
   ```
   Optionally pass `--service supabase` (repeatable) to scope to a single dependency.
3. **Review metrics** in the console output and in `scripts/dr/latest-metrics.json`. The script highlights RPO/RTO misses and lists improvement items declared per scenario.
4. **Create tickets** for any gaps surfaced. Stripe currently exceeds the RTO target by 7 minutes, and Cal.com exceeds the RPO target by 2 minutes, so capture remediation items in Linear/Jira before closing the exercise.

## Supabase Outage Playbook

Supabase underpins authentication, tenancy data, and realtime messaging. An outage directly impacts the core experience and must be resolved first.

- **Detection & Trigger**
  - PagerDuty alert from Supabase status webhooks or failing health checks on `/api/health` for database connectivity.
  - On-call SRE acknowledges within 5 minutes and starts the DR log in Slack `#incidents`.
- **Immediate Actions**
  - Freeze deploys via Vercel protection rule.
  - Confirm user impact by checking Supabase project metrics and internal telemetry dashboards.
- **Failover Steps**
  1. Promote the hot standby in the secondary Supabase region using the Supabase CLI.
  2. Update `SUPABASE_SERVICE_ROLE_KEY` and associated env vars in Vercel to point to the standby instance.
  3. Run automated schema drift check to ensure replica is up-to-date; apply pending migrations if required.
- **Validation & Recovery**
  - Execute health checks on authentication, booking creation, and messaging flows via the `tests/dr/supabase.smoke.ts` suite.
  - Monitor realtime channels for message propagation and amenity booking sync.
- **Communication**
  - Provide updates every 15 minutes in `#incidents` and email property managers after failover completion.
- **Post-Incident & Follow-ups**
  - Review `scripts/dr/latest-metrics.json` for RTO/RPO measurements (currently 26 min RTO, 4 min RPO) and ensure slack remains above the 20% buffer.
  - Automate replica promotion via infrastructure-as-code and rotate credentials once the primary region is healthy.

## Stripe Outage Playbook

Stripe handles rent payments and refunds. Ensuring continuity is critical for tenant trust and property manager cash flow.

- **Detection & Trigger**
  - PagerDuty alert on failed webhook deliveries or Stripe status RSS feed changes.
  - Finance lead confirms tenant impact by reviewing payment dashboard anomalies.
- **Immediate Actions**
  - Notify property managers via pre-approved email template outlining outage scope and manual payment alternatives.
  - Disable new autopay enrollments temporarily to prevent retries during the incident.
- **Failover Steps**
  1. Switch to backup Stripe account or region (if available) by updating API keys in Vercel and Supabase secrets.
  2. Enable offline rent payment workflow in the admin portal to capture manual receipts.
  3. Queue webhook replay scripts for later execution and flag unsettled invoices in Supabase.
- **Validation & Recovery**
  - Run payment smoke tests covering Checkout session creation, invoice reconciliation, and webhook handling.
  - Verify that manual receipts sync back to Supabase without duplicates.
- **Communication**
  - Share 30-minute cadence updates in `#incidents` and a summary email to finance leadership post-recovery.
- **Post-Incident & Follow-ups**
  - Simulation shows a 22-minute RTO (target 15). Prioritise automating webhook replay and API key swaps to remove manual steps.
  - Maintain documentation on manual rent capture and audit the backlog of queued payments once Stripe resolves the outage.

## Cal.com Outage Playbook

Cal.com powers amenity bookings and synchronization with Supabase. Downtime affects shared resource coordination.

- **Detection & Trigger**
  - Monitor Cal.com hosted status page and Supabase sync logs for booking replication failures.
  - Alerts fire when Supabase replication queue exceeds 5 minutes delay.
- **Immediate Actions**
  - Inform tenants in-app via banner and send Slack update to property managers about temporary booking freeze.
  - Pause automated booking reminders to avoid confusion.
- **Failover Steps**
  1. Enable static schedule fallback generated from the last known good sync stored in Supabase.
  2. Activate cached availability served from Supabase to allow read-only view of bookings.
  3. Prepare Cal.com self-hosted instance for restoration by applying most recent backups.
- **Validation & Recovery**
  - After restoration, trigger manual sync job to reconcile bookings and compare to the cached snapshot.
  - Run UI smoke tests to ensure embed loads and respects new reservations.
- **Communication**
  - Post updates every 30 minutes in `#incidents` and notify tenants when bookings reopen.
- **Post-Incident & Follow-ups**
  - Latest drill produced an 18-minute RTO (target 25) but a 12-minute RPO versus a 10-minute goal. Increase backup cadence and evaluate incremental sync checkpoints to reduce data loss exposure.
  - Backfill missed reminders and confirm no double-bookings occurred during the outage window.

## Continuous Improvement

- **After Action Reviews**: Conduct within 48 hours of each game day to document lessons learned and update this playbook.
- **Backlog Tracking**: Log action items (e.g., Stripe webhook automation, Cal.com backup cadence) in the operations project board with owners and due dates.
- **Tooling Enhancements**: Extend `scripts/dr/run-game-day.mjs` with live integration tests once sandbox endpoints are available.

Keep this document updated as integration architectures change, and ensure on-call engineers rehearse the playbooks quarterly.
