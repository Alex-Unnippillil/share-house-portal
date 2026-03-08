# On-Call Scheduling and Escalation Policies

This playbook explains how on-call coverage is structured for the Share House Portal and how to configure the required schedules and policies in PagerDuty or OpsGenie.

## Team Structure

| Role | Primary Responsibility | Backup Coverage |
| --- | --- | --- |
| Application On-Call (AOC) | Respond to application layer incidents, triage API and frontend issues. | Platform On-Call when AOC unavailable. |
| Platform On-Call (POC) | Manage infrastructure, Supabase, Vercel deployments, CI/CD failures. | Application On-Call after 15 minutes. |
| Incident Commander (IC) | Coordinate response during SEV1/SEV2 incidents, own communication cadence. | Engineering Manager on-call. |
| Executive Sponsor | Business visibility for SEV1, stakeholder updates. | COO or delegate. |

Each role maintains a 1-week rotation starting Tuesdays at 09:00 local time to align with sprint kickoffs.

## PagerDuty/OpsGenie Configuration

### Services & Integrations
1. **Create a Service** named `Share House Portal - Production` with integrations for monitoring sources (Vercel, Supabase, Stripe webhooks, custom alerts).
2. **Enable Slack Extension** targeting `#incidents-war-room` for incident creation and updates.
3. **Configure Email Integration** using `pagerduty@sharehouseportal.com` to collect manual reports.

### Schedules
Create the following schedules (24/7 coverage):

1. **AOC Schedule**
   - Rotation length: 1 week, starting Tuesday 09:00 local.
   - Participants: Engineers from tenant experience team.
   - Ensure handoffs overlap by 30 minutes for context transfer.

2. **POC Schedule**
   - Rotation length: 1 week, starting Tuesday 09:00 local.
   - Participants: Platform/infra engineers.
   - Add override for product launches using PagerDuty "Overrides" or OpsGenie "Rotations" feature.

3. **Incident Commander Schedule**
   - Rotation length: 1 week.
   - Participants: Engineering managers and senior ICs.
   - Configure "Follow the sun" coverage if team spans time zones, otherwise enable dynamic reassignments during PTO.

4. **Executive Sponsor Schedule**
   - Rotation length: 1 week.
   - Participants: Director-level stakeholders.
   - Configure as final escalation only for SEV1 incidents.

### Escalation Policies

Create two escalation policies and associate them with the relevant service.

1. **Primary Engineering Policy**
   1. Notify AOC schedule immediately.
   2. If unacknowledged after 10 minutes, notify POC schedule.
   3. If still open after 20 minutes, notify Incident Commander schedule.
   4. Auto-assign Commander role in incident timeline via PagerDuty response plays.

2. **Executive Escalation Policy** (Triggered for SEV1 only)
   1. Notify Incident Commander schedule when severity is set to SEV1.
   2. After 15 minutes without mitigation, page Executive Sponsor schedule.
   3. Send summary email to `exec-briefings@sharehouseportal.com` via email integration.

### Runbooks & Response Plays
- Attach the `Incident Response Templates` document to the service as a runbook link.
- Configure automatic response play to post `/pd auto` command in `#incidents-war-room` to summarize incident context.
- For OpsGenie, map tags `sev:1`, `sev:2`, etc., to the proper notification templates.

## Rotation Management
- Maintain the participant list in sync with HR changes; review monthly.
- Document upcoming PTO on the schedule and create overrides at least 1 week in advance.
- Use PagerDuty "Handoff Reports" or OpsGenie "On-call Timeline" to confirm coverage before weekends and holidays.

## Escalation Scenarios

### Example: Supabase Outage (SEV1)
1. Monitoring triggers alert -> Primary Engineering policy notifies AOC.
2. AOC acknowledges and assumes Commander role if IC unavailable.
3. Commander starts war room, invites POC for database expertise.
4. Severity flagged as SEV1 -> Executive Escalation policy pages Executive Sponsor and sends email.

### Example: Stripe Webhook Delay (SEV2)
1. Alert routes to Primary Engineering policy.
2. AOC investigates, loops in payments SME via manual add responder.
3. Incident Commander coordinates messaging to property managers.
4. Executive escalation not triggered because severity < SEV1.

## Metrics & Review Cadence
- **Weekly:** Review incidents, acknowledgments, and response times during ops sync.
- **Monthly:** Audit schedule accuracy, confirm overrides, and verify no stale users remain on rotations.
- **Quarterly:** Run full-scale drill (see Notification Integrations doc) and capture lessons learned.

Keeping schedules current and escalation policies precise ensures alerts reach the right people quickly and reduces time to mitigation.
