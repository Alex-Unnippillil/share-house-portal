# Canonical Launch Readiness Checklist (Multi-Agent)

> This is the **single source of truth** for launch execution tasks across Engineering, Product, Ops, and Support. All launch task orchestration and agent assignment should start here.

## How agents execute this checklist

1. **Pick only unblocked tasks**: an agent may start a task only when every item in `blocks` is complete.
2. **Respect strict sequencing for blockers**: all `P0 launch blocker` tasks must complete before any launch-day execution task starts.
3. **Parallelize safely**: tasks marked with `can-run-in-parallel: yes` can run concurrently as long as dependencies are satisfied.
4. **Honor ownership boundaries**: `owner-role` defines the accountable approver; contributors can assist but cannot self-sign-off for another role.
5. **Attach evidence before status changes**: no task is marked complete until all required evidence links, test output, and sign-off are recorded.
6. **Escalate dependency deadlocks**: if a blocked task cannot proceed within SLA, escalate in launch standup and record the blocker in the task evidence log.

## Task stub contract (required fields)

Every task must follow this format:

- **priority-tier**: `P0 launch blocker` | `P1 pre-GA` | `P2 post-launch`
- **dependency-tags**:
  - `blocks`: list of upstream task IDs
  - `can-run-in-parallel`: `yes` | `no`
  - `owner-role`: accountable owner (`engineering`, `product`, `ops`, `support`, `security`)
- **acceptance-criteria**: objective done conditions
- **evidence-requirements**:
  - artifact links (dashboard screenshots, docs, PRs, tickets)
  - test outputs (command + pass/fail status)
  - sign-off owner (name/role)

---

## Launch tasks

### LCH-001 — Unit/integration test gate

- **priority-tier**: `P0 launch blocker`
- **dependency-tags**:
  - `blocks`: `[]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `engineering`
- **acceptance-criteria**:
  - Unit + integration suites pass on release candidate commit.
  - No unresolved `P0/P1` regressions in test-report notes.
- **evidence-requirements**:
  - Artifact links: CI run URL and release candidate commit link.
  - Test outputs: `pnpm test:unit` + `pnpm test:perf` outputs attached.
  - Sign-off owner: Engineering lead.

### LCH-002 — Accessibility audit gate

- **priority-tier**: `P0 launch blocker`
- **dependency-tags**:
  - `blocks`: `[]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `engineering`
- **acceptance-criteria**:
  - Keyboard navigation, landmark semantics, and core navigation discoverability pass for launch journeys.
  - Staging-only a11y issues are triaged with owners + due dates.
- **evidence-requirements**:
  - Artifact links: accessibility report and triage ticket links.
  - Test outputs: `pnpm test:a11y` output attached.
  - Sign-off owner: Accessibility DRI (Engineering).

### LCH-003 — CSS/performance budget check

- **priority-tier**: `P0 launch blocker`
- **dependency-tags**:
  - `blocks`: `[]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `engineering`
- **acceptance-criteria**:
  - CSS payload remains within agreed budget.
  - API cache and suspense skeleton regression checks pass.
- **evidence-requirements**:
  - Artifact links: performance report, bundle-size artifact.
  - Test outputs: `pnpm css:purge` and `pnpm test:perf` outputs attached.
  - Sign-off owner: Performance DRI (Engineering).

### LCH-004 — Staging E2E tenant/manager rehearsal

- **priority-tier**: `P0 launch blocker`
- **dependency-tags**:
  - `blocks`: `[LCH-001, LCH-002, LCH-003]`
  - `can-run-in-parallel`: `no`
  - `owner-role`: `engineering`
- **acceptance-criteria**:
  - Tenant + property-manager critical journeys pass in staging.
  - Any failures have remediation PRs merged or launch risk formally accepted.
- **evidence-requirements**:
  - Artifact links: Playwright report + issue tracker links.
  - Test outputs: `pnpm playwright test e2e/tenant-manager-journeys.spec.ts` output attached.
  - Sign-off owner: QA/Engineering on-call lead.

### LCH-005 — Production config + webhook readiness

- **priority-tier**: `P0 launch blocker`
- **dependency-tags**:
  - `blocks`: `[]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `ops`
- **acceptance-criteria**:
  - Required production environment variables are present and validated.
  - Stripe/Cal.com/Documenso webhooks are configured and signature checks pass.
- **evidence-requirements**:
  - Artifact links: config checklist, webhook validation logs.
  - Test outputs: webhook smoke-test output and health-check command results.
  - Sign-off owner: Ops lead.

### LCH-006 — Monitoring + alert-routing verification

- **priority-tier**: `P0 launch blocker`
- **dependency-tags**:
  - `blocks`: `[LCH-005]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `ops`
- **acceptance-criteria**:
  - Dashboards for payments, bookings, docs, and messaging are live.
  - Alert routes are tested for paging + Slack/email delivery.
- **evidence-requirements**:
  - Artifact links: dashboard URLs and alert test screenshots/logs.
  - Test outputs: alert simulation output with timestamps.
  - Sign-off owner: Ops on-call owner.

### LCH-007 — Property-manager onboarding certification

- **priority-tier**: `P1 pre-GA`
- **dependency-tags**:
  - `blocks`: `[]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `product`
- **acceptance-criteria**:
  - Target property managers complete training and pass certification check.
  - SOP packet and escalation matrix distributed.
- **evidence-requirements**:
  - Artifact links: attendance sheet, certification results, onboarding packet.
  - Test outputs: N/A (attach completion log instead).
  - Sign-off owner: Product manager.

### LCH-008 — Support staffing + escalation coverage

- **priority-tier**: `P1 pre-GA`
- **dependency-tags**:
  - `blocks`: `[LCH-007]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `support`
- **acceptance-criteria**:
  - Hypercare support schedule published for launch week.
  - Sev-1/Sev-2 escalation chain validated with named backups.
- **evidence-requirements**:
  - Artifact links: staffing roster, escalation matrix, coverage calendar.
  - Test outputs: mock escalation drill summary.
  - Sign-off owner: Support lead.

### LCH-009 — Tenant communication + release freeze

- **priority-tier**: `P1 pre-GA`
- **dependency-tags**:
  - `blocks`: `[LCH-004, LCH-005, LCH-006, LCH-008]`
  - `can-run-in-parallel`: `no`
  - `owner-role`: `product`
- **acceptance-criteria**:
  - Tenant-facing launch communication is approved and sent.
  - Non-essential deployments are frozen for launch window.
- **evidence-requirements**:
  - Artifact links: communication copy, send confirmation, freeze announcement.
  - Test outputs: release freeze checklist confirmation.
  - Sign-off owner: Product manager.

### LCH-010 — Go/No-go committee approval

- **priority-tier**: `P0 launch blocker`
- **dependency-tags**:
  - `blocks`: `[LCH-004, LCH-006, LCH-009]`
  - `can-run-in-parallel`: `no`
  - `owner-role`: `product`
- **acceptance-criteria**:
  - Engineering, Product, Ops, and Support all provide explicit go/no-go disposition.
  - Any accepted risks are documented with owner and mitigation ETA.
- **evidence-requirements**:
  - Artifact links: signed go/no-go record and risk register.
  - Test outputs: consolidated launch-gate test summary.
  - Sign-off owner: Launch review committee chair.

### LCH-011 — Launch-day war-room execution

- **priority-tier**: `P1 pre-GA`
- **dependency-tags**:
  - `blocks`: `[LCH-010]`
  - `can-run-in-parallel`: `no`
  - `owner-role`: `ops`
- **acceptance-criteria**:
  - Feature enablement for target cohort completed.
  - First 2-hour real-time monitoring completed with hourly support review.
- **evidence-requirements**:
  - Artifact links: war-room notes, dashboard snapshots, issue log.
  - Test outputs: launch-day health-check command outputs.
  - Sign-off owner: Incident commander.

### LCH-012 — Hypercare day 1-30 cadence

- **priority-tier**: `P2 post-launch`
- **dependency-tags**:
  - `blocks`: `[LCH-011]`
  - `can-run-in-parallel`: `yes`
  - `owner-role`: `ops`
- **acceptance-criteria**:
  - Daily standups and twice-weekly triage meetings run for 30 days.
  - Week-2 and week-4 health reviews completed with prioritized action plan.
- **evidence-requirements**:
  - Artifact links: meeting notes, KPI reports, retrospective doc.
  - Test outputs: SLA/CSAT trend exports.
  - Sign-off owner: Ops lead.

---

## Execution notes

- Historical references to launch checklists in other docs should redirect to this file.
- When creating child tasks in project tooling, preserve the same task IDs (`LCH-###`) and required stub contract fields.
