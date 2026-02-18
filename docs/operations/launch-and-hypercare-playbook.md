# Launch & Hypercare Playbook

This playbook defines operational rollout phases, role-based onboarding materials, support workflows, and continuous-improvement routines for the first 30 days after launch.

## 1) Phased rollout plan with success criteria

### Phase 0: Internal rollout (staff + test tenants)

**Window:** 5-7 business days  
**Audience:** Internal staff accounts (`admin`, `property_manager`) plus designated test tenants/roommates  
**Goal:** Validate production-like workflows and readiness before external property exposure.

**Scope**

- Authentication and RBAC smoke tests across all role paths.
- End-to-end rehearsal of onboarding, rent payment, document access, amenity booking, visitor logs, and messaging.
- Incident drill for Stripe webhook failure and booking conflict handling.

**Success criteria**

| Metric                                       | Target                                                | Exit criteria                                   |
| -------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Critical defects (P0/P1)                     | `0` open for 48 hours                                 | Blocker for next phase if non-zero              |
| Payment success rate (internal transactions) | `>= 98%`                                              | Includes Stripe Checkout + reconciliation sync  |
| Booking conflict validation accuracy         | `100%` expected conflict prevention on scripted tests | No double-booking escapes in verification suite |
| Time to resolve seeded support tickets       | `<= 1 business day` median                            | Across payment, document, and booking workflows |
| Role-access misconfiguration findings        | `0` high-severity gaps                                | Verified against RBAC matrix                    |

**Go/No-go owners**

- Engineering lead (technical health)
- Product manager (scope confidence)
- Operations lead (runbook readiness)

### Phase 1: Pilot property rollout

**Window:** 2-3 weeks  
**Audience:** One representative property with controlled tenant cohort  
**Goal:** Validate real-world behavior, support load, and operational throughput.

**Scope**

- Full feature access for pilot property tenants and managers.
- Daily monitoring of payment, document, booking, visitor, and messaging signals.
- Structured qualitative feedback collection from pilot users.

**Success criteria**

| Metric                             | Target                                | Exit criteria                                                   |
| ---------------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| Weekly active tenant participation | `>= 70%` of pilot tenant accounts     | Indicates onboarding and utility are adequate                   |
| Payment incident rate              | `<= 2%` of transactions               | Incident includes disputes, failed syncs, or receipt mismatches |
| Document access failure rate       | `< 1%` of document retrieval attempts | Based on API and support ticket trends                          |
| Booking conflict incident rate     | `<= 3` per week and all resolved <24h | Includes policy disputes and slot contention                    |
| CSAT (pilot support interactions)  | `>= 4.2/5` average                    | Gathered from post-ticket survey                                |

**Go/No-go owners**

- Property manager for pilot site
- Customer success lead
- Engineering on-call lead

### Phase 2: Broader rollout

**Window:** Progressive property waves every 1-2 weeks  
**Audience:** Remaining properties in prioritized cohorts  
**Goal:** Scale adoption while preserving reliability and response quality.

**Scope**

- Wave-based enablement using property readiness checklist.
- Hypercare support model maintained for first 30 days per property.
- Weekly launch review to adjust rollout pace.

**Success criteria**

| Metric                                          | Target                                         | Exit criteria                                           |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| Platform availability (tenant-critical routes)  | `>= 99.9%`                                     | Measured weekly during rollout window                   |
| First-response SLA adherence (support tickets)  | `>= 95%` within SLA                            | Across all issue categories                             |
| Escalated incidents per newly launched property | `<= 2` in first 14 days                        | Escalation = engineering intervention required          |
| Time-to-onboard property staff                  | `<= 2 business days` from invite to active use | Includes training completion                            |
| Net launch readiness score                      | `>= 8/10` by rollout committee                 | Composite of reliability, support, and feedback metrics |

**Go/No-go owners**

- Launch review committee (Product + Engineering + Ops + Support)

---

## 2) Admin / property-manager onboarding materials

### Training bundle inventory

Provide each new property team a single onboarding packet containing:

1. **Role map and permissions guide**
   - `admin` vs `property_manager` capability boundaries.
   - Common access-denied troubleshooting steps.
2. **Dashboard quick tour (10-15 min)**
   - Payments reconciliation, document status, booking oversight, visitor logs, moderation queue.
3. **Operational SOP one-pagers**
   - Daily, weekly, and monthly tasks with owner and due times.
4. **Incident escalation matrix**
   - Who to contact by issue category and severity.
5. **FAQ and known limitations**
   - Current product constraints, workarounds, and roadmap notes.

### Quick-start operational guides

#### Guide A: First-day setup (property manager)

1. Confirm property metadata, unit roster, and assigned staff roles.
2. Validate Stripe reconciliation filters for current billing cycle.
3. Verify Documenso template mappings and sample lease retrieval.
4. Confirm amenity calendars are active and policy rules are configured.
5. Run notification test (announcement + direct alert).

**Definition of done:** Property manager can independently complete payment triage, document retrieval, and booking conflict review.

#### Guide B: Daily operations cadence (property manager)

- **Morning (15 min):** Check payment exceptions, overdue tasks, booking conflicts.
- **Midday (10 min):** Review new visitor logs and unresolved maintenance requests.
- **End of day (15 min):** Close resolved tickets, post status update to message board, escalate blockers.

#### Guide C: Weekly controls (admin)

- Audit failed payment trends and recovery outcomes.
- Review document access logs for anomalies.
- Validate booking policy compliance and override usage.
- Review moderation actions and unresolved flags.
- Share weekly operational health snapshot with leadership.

### Enablement format and schedule

- **Live kickoff:** 60-minute instructor-led session.
- **Hands-on lab:** 45-minute scenario walkthrough (dispute + document + booking conflict).
- **Certification check:** 10-question readiness quiz + practical workflow completion.
- **Reinforcement:** Week-1 and week-3 office hours.

---

## 3) Tenant support workflows

### Intake and triage model

**Primary intake channels**

- In-app support form (preferred, auto-tagged by category)
- Support email alias
- Escalation from property manager

**Severity model**

- **Sev-1:** Blocked core journey for multiple tenants (payments, auth, documents).
- **Sev-2:** Single-tenant critical issue or multi-tenant degraded experience.
- **Sev-3:** Non-critical usability/help request.

### Workflow A: Payment disputes

1. Verify transaction metadata (tenant ID, Stripe payment intent, timestamp).
2. Cross-check ledger state and receipt generation status.
3. If mismatch exists, apply reconciliation playbook and label as `payments-dispute`.
4. Respond to tenant with expected resolution timeline.
5. Close with final outcome note (`refund`, `correction`, `no action`) and root-cause tag.

**SLA targets:** first response <= 4 business hours; resolution <= 2 business days (non-bank investigation).

### Workflow B: Document access issues

1. Confirm user role/unit entitlement and document association.
2. Validate Documenso envelope status and storage access path.
3. Reissue access token or regenerate signed URL if permission is valid.
4. Escalate to engineering only for persistent permission mismatch or envelope sync failure.

**SLA targets:** first response <= 2 business hours; resolution <= 1 business day.

### Workflow C: Booking conflicts

1. Validate requested slot versus recorded booking and policy constraints.
2. Check for duplicate webhook events or stale sync state.
3. Apply conflict policy (priority rules, override eligibility, alternative slot options).
4. Notify affected roommates/property manager with standardized resolution message.
5. Record conflict reason taxonomy for trend analysis.

**SLA targets:** first response <= 2 business hours; resolution <= 24 hours.

### Escalation lanes

- Product gap or policy ambiguity -> Product manager + Ops lead.
- Recurrent technical failure pattern -> Engineering on-call + incident commander.
- Compliance-sensitive document/payment case -> Security/compliance owner.

---

## 4) Feedback loops and 30-day triage cadence

### Feedback sources

- In-app micro-surveys after key flows (payment completion, booking completion, support closure).
- Weekly pulse survey to pilot and newly launched properties.
- Property-manager office hours notes.
- Support ticket categorization analytics.
- Usage telemetry (drop-off in onboarding, failed transaction funnels).

### Triage cadence (first 30 days)

- **Daily (Mon-Fri):** 20-minute launch standup for incident review and hotfix decisions.
- **Twice weekly:** Cross-functional triage (Product/Eng/Ops/Support) for backlog reprioritization.
- **Weekly:** Rollout committee review with metric snapshot and go/slow decisions.
- **Day 30:** Hypercare exit review and ownership handoff to steady-state teams.

### Prioritization rubric

Score each item 1-5 for:

- Tenant impact magnitude
- Frequency/reproducibility
- Revenue or compliance risk
- Time-to-mitigate

Use weighted score to classify:

- `Now` (same-week fix)
- `Next` (next sprint)
- `Later` (backlog)

### 30-day reporting pack

Include:

- Launch KPI trend lines vs targets
- Top 10 support drivers and resolution times
- Highest-friction tenant journeys and remediation status
- Risks and mitigation plan for next rollout wave

---

## 5) Launch checklist location + post-launch retrospective template

### Launch checklist status (deprecated in this file)

The launch execution checklist previously maintained in this playbook has been **deprecated** and moved to the canonical checklist:

- `docs/testing/launch-audit-checklist.md`

Use that document for all current and future launch tasks, dependencies, priority tiers, and evidence/sign-off requirements.

### Post-launch retrospective template

```md
# Launch Retrospective - <property / wave name>

## 1. Context

- Launch date:
- Cohort size (tenants/properties):
- Features in scope:
- Success criteria targets:

## 2. Outcomes vs targets

| Metric | Target | Actual | Status (Met/At risk/Missed) | Notes |
| ------ | ------ | ------ | --------------------------- | ----- |

## 3. What went well

-

## 4. What did not go well

-

## 5. Incident and support summary

- Total tickets:
- Top categories:
- Sev-1/Sev-2 incidents:
- SLA adherence:

## 6. Tenant and manager feedback highlights

- Positive themes:
- Friction themes:
- Representative quotes:

## 7. Root causes and corrective actions

| Issue | Root cause | Corrective action | Owner | Due date |
| ----- | ---------- | ----------------- | ----- | -------- |

## 8. Follow-up plan (next 30 days)

- Immediate fixes:
- Medium-term improvements:
- Policy/process updates:

## 9. Rollout recommendation

- Proceed / Pause / Narrow scope
- Rationale:
```
