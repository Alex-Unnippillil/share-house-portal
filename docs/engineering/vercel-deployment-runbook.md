# Vercel Deployment Runbook

This runbook covers preview validation, production promotion, and rollback for Share House Portal.

## 1) Pull Request Preview Flow
1. Open a pull request from a feature branch.
2. Confirm the `CI` and `css-size` workflows pass in GitHub Actions.
3. Wait for Vercel to publish a preview deployment.
4. Validate critical flows on preview:
   - Authentication and onboarding
   - Rent payment pages and webhook readiness
   - Amenity booking UI and message board rendering
5. (Optional) Run the `Lighthouse CI` workflow manually against the preview URL.

## 2) Promote to Production
1. Ensure PR is approved and all required checks are green.
2. Merge into `main` (no direct push).
3. In Vercel, verify the `main` deployment reaches `Ready` status.
4. Run quick smoke checks in production:
   - Login/logout
   - Dashboard load
   - Stripe checkout session creation
   - Booking page load
5. Confirm observability signals are healthy (error rates, webhook processing, payment failures).

## 3) Rollback Procedure
Use rollback when production smoke checks fail or critical metrics regress.

1. Open the Vercel project Deployments tab.
2. Locate the most recent known-good production deployment.
3. Click **Promote to Production** on that stable deployment.
4. Re-run smoke checks after rollback promotion.
5. Post incident notes in the failed PR/incident channel, including:
   - Fault summary
   - Customer impact window
   - Mitigation and follow-up actions

## 4) Secrets and Environment Hygiene
- Verify `development`, `staging`, and `production` variables match the contract in `docs/engineering/environment-contract.md`.
- Rotate webhook secrets if signatures fail unexpectedly after deploys.
- Never move `production` secrets into non-production Vercel environments.
