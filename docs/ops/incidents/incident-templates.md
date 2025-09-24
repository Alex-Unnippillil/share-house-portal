# Incident Response Templates

This guide provides reusable templates for managing operational incidents affecting the Share House Portal. Duplicate the relevant template into your incident tracking tool (Notion, Linear, Jira) at the start of an event and keep it updated as the incident progresses.

## Severity Matrix

| Severity | Description | Example Signals | Target Time to Mitigate |
| --- | --- | --- | --- |
| SEV1 | Critical outage affecting all tenants or exposing sensitive data. | Complete app downtime, authentication failures, leaked PII. | 30 minutes |
| SEV2 | Major degradation impacting a majority of users or core workflows. | Payments failing for multiple tenants, realtime messaging offline. | 1 hour |
| SEV3 | Partial degradation or single-feature disruption with workarounds. | Specific amenity booking failures, delayed notifications. | 4 hours |
| SEV4 | Low-impact bugs or cosmetic issues with no SLA breach. | Typos, minor UI alignment issues. | Next release |

## Major Incident Template (SEV1–SEV2)

**Title:** `<Date> - <Service> - <Summary>`

**Commander:** `<Name>`  
**Deputy/Operations:** `<Name>`  
**Communications Lead:** `<Name>`  
**Scribe:** `<Name>`

### 1. Situation Overview
- **Start time:** `<UTC timestamp>`
- **Detection source:** `<PagerDuty alert, monitoring dashboard, user report>`
- **Current impact:** `<Who is affected, what functionality is impaired>`
- **Systems involved:** `<Services, databases, third parties>`

### 2. Immediate Actions
- [ ] Acknowledge the PagerDuty/OpsGenie incident and assign Commander.  
- [ ] Join the `#incidents-war-room` Slack channel (auto-created via integration).  
- [ ] Notify stakeholders using the Internal Communication Checklist.  
- [ ] Initiate mitigation or rollback steps.  
- [ ] Capture all actions in the incident timeline.

### 3. Communication Log
| Time (UTC) | Channel | Audience | Message summary | Owner |
| --- | --- | --- | --- | --- |
| `<00:00>` | Slack `#incidents-war-room` | Response team | `<Initial status>` | `<Name>` |
| `<00:15>` | Slack `#eng-leads` | Engineering leads | `<Impact + ETA>` | `<Name>` |
| `<00:30>` | Email distro `tenant-notify@` | Customers (if required) | `<External update>` | `<Name>` |

### 4. Timeline of Events
| Time (UTC) | Event | Owner |
| --- | --- | --- |
| `<00:00>` | Incident detected via `<monitor>` | `<Name>` |
| `<00:05>` | Commander assigned | `<Name>` |
| `<00:10>` | Initial mitigation applied | `<Name>` |

### 5. Technical Details
- **Root cause hypothesis:** `<Working theory>`
- **Mitigation steps:** `<What actions were taken>`
- **Monitoring signals:** `<Relevant dashboards, logs>`

### 6. Resolution
- **End time:** `<UTC timestamp>`
- **Resolution summary:** `<What fixed the issue>`
- **Residual risk:** `<Open risks or follow-up actions>`

### 7. Post-Incident Follow-up
- [ ] Schedule post-incident review within 72 hours.  
- [ ] File follow-up tasks in Linear/Jira.  
- [ ] Update runbooks or playbooks as needed.  
- [ ] Deliver external post-mortem (if required by incident policy).

## Minor Incident Template (SEV3–SEV4)

**Title:** `<Date> - <Feature> - <Summary>`

**Responder:** `<Name>`  
**Advisor (optional):** `<Name>`

### 1. Quick Facts
- **Start time:** `<UTC timestamp>`
- **Reported by:** `<User, monitoring, QA>`
- **Impacted scope:** `<Feature(s) / tenant subset>`

### 2. Initial Response Checklist
- [ ] Acknowledge alert and assign responder.  
- [ ] Validate customer impact.  
- [ ] Communicate status in `#ops-updates`.  
- [ ] Decide on hotfix vs. backlog path.

### 3. Communication Log (Condensed)
| Time (UTC) | Channel | Message |
| --- | --- | --- |
| `<00:00>` | Slack `#ops-updates` | `<Initial note>` |
| `<00:30>` | Incident ticket comment | `<Progress update>` |

### 4. Resolution Notes
- **Fix applied:** `<Summary>`
- **Verification:** `<Tests, monitoring checks>`
- **Customer follow-up:** `<Emails, in-app messages>`

### 5. Learnings
- **Prevention ideas:** `<Automation, alerts, process improvements>`
- **Documentation updates needed:** `<Runbooks, dashboards>`

## Communication Checklists

### Internal Communication Checklist (All Severities)
- [ ] Confirm Commander is communicating every 30 minutes (SEV1/2) or 60 minutes (SEV3).  
- [ ] Update `#incidents-war-room` Slack topic with current severity and next update time.  
- [ ] Post summary in `#ops-updates` Slack channel including impact, mitigation status, and next ETA.  
- [ ] DM property manager on-call for incidents affecting tenant communications.  
- [ ] Record each update in the incident timeline for auditability.

### External Communication Checklist (Customer-Facing Incidents)
- [ ] Determine if customer notification is required based on severity matrix.  
- [ ] Draft message using approved template: impact, actions taken, expected resolution.  
- [ ] Route draft through Communications Lead for approval.  
- [ ] Send via tenant email distro `tenant-notify@` and in-app banner (if high visibility).  
- [ ] Update status page (if activated) and include link in communications.  
- [ ] Provide closure notice once incident is resolved and mitigation verified.

### Executive Communication Checklist (SEV1 Only)
- [ ] Page the executive sponsor via PagerDuty executive escalation policy.  
- [ ] Provide 15-minute cadence updates in `#exec-briefings`.  
- [ ] Supply incident summary and expected recovery timeline.  
- [ ] Deliver final report within 24 hours highlighting customer and revenue impact.

---

**Template Usage Tips**
- Store copies of filled templates alongside related tickets for historical reference.  
- Convert timelines into post-incident review documents to accelerate RCA preparation.  
- Keep checklists updated when tooling or teams change to avoid drift.
