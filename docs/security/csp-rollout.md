# Content Security Policy Rollout Plan

## Goals
- Ship a Content Security Policy (CSP) that blocks malicious inline script/style execution while allowing required third-party integrations.
- Capture CSP violation reports during rollout so regressions can be remediated before the policy is enforced in production.
- Provide operations playbooks for tightening directives over time without disrupting tenants or property managers.

## Reporting Configuration
- `next.config.js` now emits both `Content-Security-Policy` (enforced) and `Content-Security-Policy-Report-Only` headers for every route. The report-only header includes future tightening directives (`script-src-attr 'none'`, `style-src-attr 'none'`) so we can surface inline handler usage that would break once enforcement flips.
- Both headers append `report-to` and `report-uri` directives that reference the `Report-To` endpoint group `csp-endpoint`.
- Set the environment variable `CSP_REPORT_URI` in every environment. When unset, the build falls back to the shared Report URI endpoint `https://report-uri.com/api/d/default/share-house-portal/csp`.
- The `Report-To` response header serializes the endpoint definition so modern browsers stream JSON violation reports to Report URI. Legacy browsers will rely on the `report-uri` directive.

## Rollout Timeline
### Phase 0 – Baseline (Week 0)
1. Deploy the dual CSP headers to staging.
2. Configure Report URI with an endpoint slug dedicated to the Share House Portal (e.g., `/csp`). Enable email + Slack digests for the security distribution list.
3. Smoke test the staging app on desktop and mobile flows (auth, payments, booking, messaging) to ensure no hard blocks occur.

### Phase 1 – Observation (Week 1)
1. Promote the changes to production while keeping the report-only header active.
2. Review violation reports daily inside Report URI. Categorize each as **false positive**, **requires code change**, or **third-party integration**.
3. File remediation tickets in the security backlog for any issues that require engineering work. Assign owners and SLAs based on severity:
   - High (bypasses core directive): 2 business days.
   - Medium (affects specific browser or flow): 5 business days.
   - Low (noise/legacy browsers): monitor and document.

### Phase 2 – Remediation (Weeks 2–3)
1. Implement fixes and validate in staging. Common remediations include adding nonces, migrating inline scripts to modules, or expanding allowlists for vetted third parties.
2. When a change is deployed, annotate the Report URI dashboard and verify the violation volume drops over the next 48 hours.
3. Maintain a shared spreadsheet (linked from the security backlog epic) tracking each violation class, owner, mitigation, and status.

### Phase 3 – Enforcement (Week 4)
1. Once all high/medium violations are resolved and the report-only feed remains quiet for 7 consecutive days, schedule the enforcement cutover.
2. Remove legacy inline fallbacks that are no longer needed (e.g., event handler attributes) and tighten the enforced header to match the report-only directives.
3. Flip the `script-src-attr`/`style-src-attr` directives into the enforced header via a PR. Keep the report-only header during the first week post-enforcement to catch regressions.

## Ongoing Monitoring & Incident Response
- Configure long-term retention in Report URI so historical trends are available for quarterly security reviews.
- Create an automation (e.g., a scheduled GitHub Action calling the Report URI API) that exports weekly violation summaries into the security data warehouse.
- If an enforced violation spikes, treat it as a SEV2 operational incident: gather the offending URL, user agent, and stack trace from Report URI, then roll back or hotfix within the established SEV2 SLA (4 business hours).
- Document notable incidents and lessons learned in the security runbook wiki.

## Change Management Checklist
- [ ] Update `CSP_REPORT_URI` secrets in all environments (Vercel preview, staging, production).
- [ ] Notify frontend and platform teams about the report-only phase start via the #security Slack channel.
- [ ] Add CSP regression scenarios to the automated test suite (e.g., vitest checks that nonces render for dynamic scripts).
- [ ] Review CSP directives quarterly to account for new integrations (Documenso, Cal.com) and retire unused origins.
