# Notification Integrations & Drill Logging

This document defines how PagerDuty/OpsGenie incidents deliver notifications to Slack and email, plus the quarterly drill process to validate end-to-end paging.

## Slack Integration

1. **Channel Mapping**
   - Primary incident command: `#incidents-war-room` (auto-created per incident using Slack workflow).
   - Stakeholder updates: `#ops-updates` (manual posts every 30–60 minutes).
   - Executive updates (SEV1 only): `#exec-briefings`.

2. **PagerDuty Setup**
   - Install the PagerDuty for Slack app with OAuth scopes `commands`, `incoming-webhook`, and `chat:write`.
   - Connect the `Share House Portal - Production` service to Slack using the `/pd connect` command in `#incidents-war-room`.
   - Enable incident creation from Slack; responders can run `/pd trigger` with severity tags.
   - Configure the Slack "response play" to automatically invite the on-call schedules and post the incident summary.

3. **OpsGenie Setup (if preferred)**
   - Install OpsGenie Slack app, authorize in the same channels.
   - Configure alert actions to send updates when incident state changes (`Triggered`, `Acknowledged`, `Resolved`).
   - Map OpsGenie priority P1/P2 to Slack severity threads.

4. **Operational Checklist**
   - [ ] Confirm Slack channels are public within engineering to allow observers.  
   - [ ] Archive incident-specific channels after post-mortem with transcript export.  
   - [ ] Store Slack message links in the incident timeline for audit readiness.

## Email Integration

1. **Distribution Lists**
   - `tenant-notify@sharehouseportal.com` – customer-facing updates vetted by Communications Lead.
   - `exec-briefings@sharehouseportal.com` – executive-only summaries for SEV1 incidents.
   - `ops-alerts@sharehouseportal.com` – internal summary of all incidents for weekly review.

2. **PagerDuty Email Actions**
   - Configure email rules so that setting severity to SEV1 automatically sends a templated summary to `exec-briefings@`.
   - Add a manual incident action button "Send Customer Update" that opens a prefilled email draft for Communications Lead.
   - Ensure all outbound emails include tracking tag `[Incident <ID>]` for compliance archiving.

3. **OpsGenie Email Actions**
   - Use custom actions to trigger email notifications to the same lists when alert priority is P1/P2.
   - Enable email integration for manual incident creation when stakeholders email `pagerduty@sharehouseportal.com`.

4. **Verification Checklist**
   - [ ] Quarterly deliverability test to each list with sample incident subject/body.  
   - [ ] Validate DKIM/SPF alignment using mail-tester or equivalent.  
   - [ ] Confirm support tooling (Zendesk, HelpScout) automatically logs replies under the incident ticket.

## Quarterly Paging Drill Process

1. **Planning (Week -1)**
   - Choose drill scenario (e.g., Supabase outage, Stripe latency) and severity level.
   - Schedule drill on shared calendar and confirm with on-call participants.
   - Prepare simulated monitoring alerts in PagerDuty/OpsGenie sandbox.

2. **Execution (Week 0)**
   - Trigger drill using sandbox alert routed through production escalation policies during low-traffic window.
   - Observe that PagerDuty/OpsGenie notifies AOC -> POC -> IC per policy.
   - Verify Slack channels receive automated messages and response plays run successfully.
   - Send drill email via "Send Customer Update" action marked clearly as **DRILL**.

3. **Review (Week +1)**
   - Collect metrics: acknowledgment time, resolution time, communication cadence.
   - Document findings in incident tracker with tag `drill` and link to drill transcript.
   - File follow-up tasks for tooling gaps or process improvements.

4. **Logging Requirements**
   - Maintain a `Quarterly Drill Log` table (e.g., in Notion or Google Sheet) with date, scenario, participants, and outcomes.
   - Upload artifacts (Slack transcript, email copies, PagerDuty report) to shared drive `Ops/Incident Drills/<YYYY-Q#>`.
   - Share summary in ops review meeting and attach to quarterly compliance packet.

## Monitoring & Continuous Improvement
- Enable PagerDuty Analytics or OpsGenie Reports to track notification latency and responder performance.
- Audit Slack webhook health monthly via `/pd health` command.
- Confirm email delivery metrics (bounce rate, open rate) using provider dashboard.
- Review integration permissions annually to ensure least privilege and revoke unused tokens.

Adhering to this process keeps notification paths reliable and provides documented assurance that paging works when it matters.
