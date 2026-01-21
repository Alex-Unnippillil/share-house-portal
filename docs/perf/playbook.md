# Roomsily Performance & Availability Playbook

This playbook documents how Roomsily measures and protects critical experience-level objectives, who owns each slice of the platform, and how to execute safe rollbacks when something goes wrong.

## Ownership & Contact
- **Primary Owner:** Platform Engineering (on-call rotation documented in PagerDuty schedule `Roomsily / Platform`).
- **Secondary Owner:** Payments & Data Guild (Stripe + Supabase specialists).
- **Escalation Path:** If the owning squad is unresponsive for 10 minutes, page the Engineering Director (`@monica` in Slack) and notify the General Manager.

## Service Level Objectives
| Service Slice | Technical Owner | Availability Target | Latency Target (p95) | Error Budget (30 days) | Measurement Source |
| --- | --- | --- | --- | --- | --- |
| Tenant web experience (Next.js on Vercel) | Web Platform squad | 99.90% | < 1.5 s page transition | 43m 12s downtime | Vercel analytics + synthetic checks |
| Supabase data layer (Postgres + Row Level Security) | Data Platform squad | 99.95% | < 200 ms RPC round-trip | 21m 36s downtime | Supabase Observability + Datadog traces |
| Stripe payment flows (Checkout + webhooks) | Payments squad | 99.90% successful charge rate | < 800 ms webhook handler | 43m 12s failed budget | Stripe dashboards + Datadog error monitors |

> **Error Budget Usage:** Burn alerts trigger at 25%, 50%, and 75% consumption. When budgets reach 75%, freeze feature deploys affecting that slice until a stabilization plan is approved.

## Monitoring Dashboards
| Dashboard | Purpose | Link |
| --- | --- | --- |
| Vercel Production Performance | Page load, Core Web Vitals, function cold starts | <https://vercel.com/roomsily/portal/analytics/performance>
| Datadog Roomsily Core | Aggregated logs, APM traces, error rates | <https://app.datadoghq.com/dashboard/roomsily-core>
| Supabase Project Health | Database latency, replication lag, auth failures | <https://app.supabase.com/project/roomsily-prod/logs>
| Stripe Payments Overview | Checkout conversion, webhook failures | <https://dashboard.stripe.com/live/payments>
| Statuspage (Public) | External communication for incidents | <https://status.roomsily.com>

> **IaC Source of Truth:** Dashboard JSON exports are stored under [`observability/dashboards`](../../observability/dashboards) and refreshed via `pnpm obs:dashboards:export`, which pulls the latest Datadog and Vercel configurations through their public APIs.

## Alert Channels
| Trigger | Channel | Notes |
| --- | --- | --- |
| High-priority outage (P0/P1) | PagerDuty service `roomsily-platform` (SMS + phone) | Escalates to on-call engineer, then Engineering Director |
| Performance regression (>50% budget burn) | Slack `#alerts-perf` | Auto-created incident thread via Incident Bot |
| Payment failures spike | Slack `#alerts-payments` + Stripe email digest | Payments on-call leads response |
| Database error rate | Slack `#alerts-data` + Datadog | Includes Supabase log excerpts |

## Alert Rules as Code
Alert thresholds and notification routing live in [`observability/alerts/rules.json`](../../observability/alerts/rules.json). The table below lists the key monitors and the runbook sections they point to during an incident.

| Rule ID | Scope | Condition | Escalation | Runbook |
| --- | --- | --- | --- | --- |
| `roomsily-platform-p0` | Next.js / Vercel | 5xx rate ≥ 5 errors/min for 5 minutes | PagerDuty `roomsily-platform`, Slack `#alerts-perf` | [Next.js Deploys on Vercel](#nextjs-deploys-on-vercel) |
| `supabase-latency-warning` | Supabase | RPC latency ≥ 250 ms p95 for 15 minutes | Slack `#alerts-data` | [Supabase Migrations](#supabase-migrations) |
| `stripe-webhook-failures` | Stripe | Webhook failure ratio ≥ 2% for 10 minutes | Slack `#alerts-payments`, payments on-call email | [Stripe Integrations](#stripe-integrations) |
| `error-budget-burn` | Cross-platform | Synthetic uptime anomaly over 4h window | Slack `#alerts-perf` | [Post-incident Checklist](#post-incident-checklist) |

## Incident Response Workflow
1. **Triage:** Acknowledge the alert in PagerDuty/Slack within 5 minutes and assign an Incident Commander (IC) and Communications Lead (CL).
2. **Stabilize:** IC executes the relevant rollback procedure or mitigation, coordinating with feature teams as needed.
3. **Communicate:** CL posts updates every 15 minutes in Slack `#incidents` and on Statuspage if customer-facing.
4. **Document:** Capture a timeline, root cause, and follow-up tasks in the incident retro doc (Notion template `Roomsily / Incidents`).
5. **Review Error Budgets:** Update the burn chart and decide whether to continue the deploy freeze.

## Rollback Procedures

### Next.js Deploys on Vercel
1. Pause current pipeline: set the Vercel project to `Paused` to block auto-deploys.
2. In Vercel, open **Deployments → Production → History**, select the last known good commit, and click **Promote to Production**.
3. Verify the rollback by re-running the synthetic check suite (`npm run test:e2e:smoke` in GitHub Actions or manually via Checkly) and confirming green results in the Vercel analytics dashboard.
4. Re-enable auto-deploys and communicate completion in Slack `#incidents`.

### Supabase Migrations
1. Identify the offending migration in `supabase/migrations` (timestamps map to deploy order). Confirm via `supabase migration list --status applied`.
2. Run `supabase db remote commit` to snapshot the current production state before touching schema.
3. Use `supabase migration revert <timestamp>` (or execute the paired `down.sql` script if a manual rollback file exists) to roll back one migration at a time until errors clear.
4. If automated revert fails, apply the inverse SQL manually through the SQL Editor, then mark the migration as reverted: `supabase migration repair --status reverted <timestamp>`.
5. Re-run smoke tests that touch the affected tables (payments, documents) and monitor Supabase logs for 30 minutes before resuming deploys.

### Stripe Integrations
1. Toggle the **maintenance mode** feature flag (`payments:checkout_enabled=false`) via the configuration service to stop new payment attempts.
2. Revert the Stripe integration change: either redeploy the last green webhook/checkout handler from GitHub (`git revert <sha>` and `vercel deploy --prod`) or re-enable the previous Stripe dashboard configuration.
3. Replay failed webhooks from the Stripe dashboard (`Developers → Webhooks → Retry`) after confirming the handler is healthy.
4. Remove maintenance mode and send a summary to `#alerts-payments`, including any manual charge reconciliations required.

## Post-incident Checklist
- Update the SLO tracking spreadsheet with downtime/latency data.
- File Jira follow-up tasks for long-term fixes within 24 hours.
- Schedule a postmortem review within 2 business days for P1+ incidents.

## Maintenance Checklist
- Review `observability/alerts/rules.json` during the monthly on-call handoff to tune thresholds and confirm notification paths are still relevant.
- Audit `observability/dashboards/**` dashboards quarterly by running `pnpm obs:dashboards:export` and verifying widget coverage against active SLOs.
- Sample alert history in Slack `#alerts-*` at least once per sprint to identify alert fatigue; downgrade noisy monitors or add auto-remediation tasks as needed.
- Confirm Statuspage and PagerDuty contact data every quarter to avoid paging stale distribution lists.

