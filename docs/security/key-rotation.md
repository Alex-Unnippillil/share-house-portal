# Secret Rotation Runbook

This runbook documents how to rotate credentials and API keys for the third-party platforms that power Share House Portal. It covers Supabase, Stripe, Documenso, and Cal.com, and establishes a repeatable, auditable process that emphasises staged rollout and rollback readiness.

## Governance
- **Owner:** Security & Platform Engineering
- **Change window:** Tuesdays 09:00-11:00 local engineering time unless incident response dictates otherwise.
- **Notification:** Announce upcoming rotations in `#eng-announcements` and via email to on-call property managers at least 24 hours in advance.
- **Tooling:** Use 1Password for secret storage, GitHub Actions for pipeline secrets, Vercel for runtime environment variables, and Supabase CLI for database credentials.

## Rotation Cadence
| Provider   | Production Rotation | Staging Rotation | Notes |
|------------|---------------------|------------------|-------|
| Supabase   | Quarterly (first Tuesday of January, April, July, October) | Monthly (first Tuesday) | Rotate service role and anon keys together. |
| Stripe     | Quarterly (second Tuesday of January, April, July, October) | Monthly (second Tuesday) | Include webhook signing secrets. |
| Documenso  | Semi-annual (March & September) | Quarterly | Align with Documenso server upgrades. |
| Cal.com    | Semi-annual (February & August) | Quarterly | Tokens scoped to amenity sync integration. |

## Standard Rotation Workflow
Each provider rotation follows three stages with provider-specific implementation details below.

1. **Generate**
   - Authenticate to the provider dashboard using hardware-backed MFA.
   - Create a new secret or API key with least-privilege scopes.
   - Store the secret in 1Password with the timestamp, environment, and rotation owner.
2. **Deploy**
   - Update secrets in Vercel (`vercel env pull`/`push`) and GitHub Actions (`gh secret set`).
   - Update Supabase configuration (if applicable) via `supabase secrets set`.
   - Run smoke tests in staging (`pnpm test`, `pnpm lint`, targeted end-to-end tests) before promoting to production.
   - Document the change in this runbook under **Rotation History**.
3. **Revoke**
   - Once production verification completes, revoke the superseded secret in the provider dashboard.
   - Update audit log (Notion page + GitHub issue) with the revocation confirmation.

## Provider Procedures

### Supabase
1. **Generate**
   - Navigate to Supabase Project Settings → API.
   - Rotate both the `service_role` key and the `anon` key; download the new keys.
2. **Deploy**
   - Update `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel staging, then production.
   - Update Supabase Edge Function secrets if present (`supabase functions secrets set`).
   - Redeploy the Next.js app (`pnpm run deploy` or trigger Vercel redeploy) and run regression tests focusing on auth, storage, and realtime flows.
3. **Revoke**
   - Confirm all environments read the new keys by checking Vercel deployment logs and Supabase auth success.
   - Disable the prior keys in the Supabase dashboard.

**Rollback Guidance**
- If authentication requests begin failing, restore the previous keys from 1Password and redeploy environments immediately.
- Reopen revoked keys by contacting Supabase support if dashboard disablement already occurred; provide project ID and incident reference.

### Stripe
1. **Generate**
   - In the Stripe Dashboard → Developers → API keys, create a restricted key with required scopes (`charges`, `customers`, `payment_methods`).
   - Generate new webhook signing secrets for each environment endpoint.
2. **Deploy**
   - Update Vercel and GitHub Action secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
   - Refresh Supabase stored Stripe keys if any server functions use them.
   - Run checkout flow in staging with test cards and confirm webhook delivery.
3. **Revoke**
   - In Stripe, roll key to "read-only" for 24 hours before deletion; monitor error rates.
   - Delete old API key and webhook secrets once stable.

**Rollback Guidance**
- Restore prior API key from 1Password and update environments if payment creation fails.
- Reconfigure webhook secret in Stripe if signature verification errors spike; keep the old signing secret for 24 hours in case of reprocessing.

### Documenso
1. **Generate**
   - Access the Documenso admin panel → API Tokens → Generate new token with "envelope:write" and "template:read" scopes.
2. **Deploy**
   - Update Vercel secrets (`DOCUMENSO_API_KEY`) for staging, run document creation smoke test, then promote to production.
   - Ensure backend scheduled jobs pick up new credentials by restarting the worker deployment.
3. **Revoke**
   - Delete the previous token in the Documenso admin panel after confirming document creation success in production.

**Rollback Guidance**
- Reapply the previous token stored in 1Password and restart worker processes if document generation fails.
- If Documenso locks you out after revocation, contact Documenso support with tenant ID for temporary token reactivation.

### Cal.com
1. **Generate**
   - From the Cal.com admin dashboard → API Keys, issue a new key scoped to the Share House Portal integration.
2. **Deploy**
   - Update `CALCOM_API_KEY` and, if applicable, embedded widget tokens in Vercel.
   - Trigger sync job to refresh amenity availability and validate bookings in staging.
3. **Revoke**
   - Remove the previous key in Cal.com and clear any cached tokens in Supabase.

**Rollback Guidance**
- Reinstate the former key from 1Password and rerun the amenity sync if booking widgets fail to load.
- If Cal.com rejects reactivation, file a priority support ticket referencing the integration ID.

## Staged Rollout Checklist
- [ ] Create rotation ticket with scope, owner, and planned window.
- [ ] Follow **Generate → Deploy → Revoke** stages in staging first.
- [ ] Capture validation evidence (logs, test screenshots) in the ticket.
- [ ] Hold for one monitoring interval (30 minutes) before production promotion.
- [ ] Repeat the stages in production.
- [ ] Update ticket with revocation confirmation.

## Rollback Playbook
1. Declare a rotation rollback in `#incident-response` and page the on-call engineer.
2. Restore previous secret(s) from 1Password and redeploy affected services.
3. Revert any GitHub Actions/Vercel secret changes to prior values (`vercel env edit`, `gh secret set`).
4. Notify stakeholders about rollback status and reason.
5. Open a post-incident review to update this runbook with findings.

## Rotation Drills
- **Staging Drill Frequency:** Monthly, aligned with staging rotation cadence.
- **Drill Scope:** Execute the full rotation workflow in staging for one provider per month (cycle through Supabase → Stripe → Documenso → Cal.com).
- **Participants:** On-call engineer, security engineer, representative from product operations.
- **Success Criteria:** No failed smoke tests, secrets updated across Vercel, GitHub Actions, and Supabase, revocation confirmed.
- **Documentation:** Log drill outcomes in the table below and summarize lessons learned in the **Drill Retrospectives** section.

### Drill Log
| Date | Provider | Outcome | Follow-up Actions |
|------|----------|---------|-------------------|
| YYYY-MM-DD | Supabase | ✅ Successful / ⚠️ Issues | Notes |

### Drill Retrospectives
Use this section to capture lessons from each drill, including tooling gaps, documentation updates, or automation opportunities.

## Rotation History
Document real rotations here for audit purposes.

| Date | Provider | Environment | Owner | Notes |
|------|----------|-------------|-------|-------|
| YYYY-MM-DD | Supabase | Production | Name | Summary |

