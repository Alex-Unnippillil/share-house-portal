# Security Operations Playbook

This playbook codifies how Share House Portal engineers and operators detect, respond to, and recover from security events. It covers incident handling, on-call expectations, and procedures for rotating sensitive credentials.

## Incident Handling Lifecycle

1. **Detection & Reporting**
   - Automated alerts from Vercel, Supabase, Stripe, or Datadog immediately notify the on-call engineer via PagerDuty.
   - Community or tenant reports routed through the vulnerability disclosure process must be acknowledged within 2 business hours.
   - For suspected payment abuse, cross-reference Stripe Radar alerts and Supabase audit logs for anomalous activity.

2. **Triage & Classification**
   - On-call engineer assesses severity (Critical, High, Medium, Low) within 30 minutes.
   - Verify scope: impacted tenants, environment (production vs. staging), and potential data exposure.
   - Engage subject-matter experts (payments, auth, infrastructure) when specialized knowledge is required.

3. **Containment & Mitigation**
   - Apply temporary controls (firewall rules, feature flags, Supabase RLS tweaks) to halt active exploitation.
   - Revoke compromised credentials using the checklists below.
   - Coordinate with product and support teams to pause affected user actions if necessary.

4. **Communication**
   - For Critical/High incidents, notify security@sharehouse.local, engineering leadership, and the property management liaison within 1 hour.
   - Post updates to the incident Slack channel at least every 60 minutes until containment.
   - Publish tenant-facing communication (email or in-app banner) when data access or payment processing is disrupted.

5. **Eradication & Recovery**
   - Patch vulnerabilities, backport fixes, or roll back to last known good deployment.
   - Restore affected data from Supabase backups if integrity is compromised.
   - Validate recovery by re-running automated tests, verifying Stripe webhook delivery, and confirming Supabase RLS policies.

6. **Post-Incident Review**
   - Schedule a postmortem within 5 business days covering timeline, root cause, and remediation tasks.
   - Document follow-up tickets in Linear, tagging `security` and `infra` squads.
   - Update this playbook and related runbooks with lessons learned.

## On-Call Expectations

- **Coverage**: Engineers rotate weekly; shifts start Tuesday 16:00 UTC. Backup on-call must be reachable within 15 minutes.
- **Preparedness**: Ensure laptop access to Vercel, Supabase, Stripe, Cal.com, and Documenso admin consoles with MFA configured before shift handoff.
- **Response Times**:
  - Critical: acknowledge in 5 minutes, mitigation in progress within 30 minutes.
  - High: acknowledge in 15 minutes, mitigation in progress within 1 hour.
  - Medium/Low: acknowledge within 4 business hours.
- **Handoff**: Share outstanding investigations, temporary mitigations, and active alerts in the on-call Slack channel before rotation ends.
- **Wellness**: Swap shifts proactively when unable to meet expectations; alert engineering management if a replacement cannot be found.

## Credential Management

### General Guidance

- Store secrets exclusively in Vercel Projects and the internal password manager; never commit credentials to source control.
- Maintain separate credentials per environment (development, staging, production) and rotate production secrets first.
- Document every rotation in the security change log, referencing ticket ID and approvers.

### Stripe Secret Key Rotation Checklist

- [ ] Create a new restricted secret key in the Stripe Dashboard (`Developers` → `API keys`).
- [ ] Update Vercel environment variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) for staging, then production.
- [ ] Redeploy Next.js application from the updated Vercel environment.
- [ ] Rotate webhook signing secret via Stripe Dashboard (`Developers` → `Webhooks`) and update Supabase Edge Functions if applicable.
- [ ] Trigger a test webhook event to confirm successful verification and processing.
- [ ] Invalidate the old secret key in Stripe once new deployments are verified.

### Supabase Credential Revocation Checklist

- [ ] Generate replacement service role and anon keys in the Supabase Project Settings (`API` tab).
- [ ] Update Vercel environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for staging, then production.
- [ ] Rotate database passwords for any direct connections (`supabase` and `postgres` users) via Supabase Dashboard.
- [ ] Review and update local `.env` files for engineering laptops using `doppler` or approved secret sync tooling.
- [ ] Re-run Supabase migrations (`supabase db push`) in staging to ensure connectivity, then deploy to production.
- [ ] Purge old JWTs and invalidate refresh tokens by toggling Supabase Auth keys.
- [ ] Archive the previous keys in the secret manager as `revoked` and document the rotation in the security change log.

---

For additional guidance, contact `#security-ops` in Slack or email security@sharehouse.local.
