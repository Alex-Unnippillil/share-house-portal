# Branch Protection Expectations

The `main` branch is protected and must remain deployable at all times.

## Rules
- **No direct pushes to `main`**. All changes land through pull requests.
- **At least one approving review** is required before merge.
- **Dismiss stale approvals** when new commits are pushed.
- **Require conversation resolution** before merge.
- **Require linear history** (no merge commits) where repository settings allow it.

## Required Status Checks
The following checks should be marked as required in GitHub branch protection:
- `CI / Lint, typecheck, test, and build`
- `css-size / Purge & audit CSS bundle`

If Lighthouse runs on preview deployments for a PR, treat failures as blocking even when not configured as a required check.

## Admin Expectations
- Admin bypass should be avoided except for incidents.
- Emergency merges must be documented in the PR description and followed by a retro.
