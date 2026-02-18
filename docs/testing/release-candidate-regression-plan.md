# Release Candidate Freeze & Mandatory Regression Paths

## 1) Freeze the release candidate branch

Run the freeze from the latest green `main` commit:

```bash
git fetch origin
git checkout main
git pull --ff-only
git checkout -b release/rc-$(date +%Y%m%d)
git push -u origin release/rc-$(date +%Y%m%d)
```

### RC freeze controls
- Allow merges to `release/rc-*` only from hotfix PRs tagged `rc-hotfix`.
- Require all CI checks to pass before each RC hotfix merge.
- Reject feature scope increases after freeze; only regression fixes are allowed.
- Track every post-freeze commit in the QA report with linked evidence.

## 2) Mandatory regression paths by role

### Tenant
1. Authenticate and reach dashboard shell.
2. Start a rent payment attempt; verify success and failure states are visible.
3. Create amenity booking validation request (valid and invalid times).
4. Create an overnight visitor request and verify confirmation.
5. Reach messaging and documents entry points.

### Property manager
1. Review maintenance dashboard and request triage cards.
2. Access visitor oversight and verify tenant-submitted entries appear.
3. Validate booking conflicts are visible in manager booking workflows.
4. Export finance/bookings/maintenance data using permitted routes.

### Admin
1. Access operations dashboard sections (payments, bookings, search).
2. Verify privileged exports and reconciliation endpoints remain role-gated.
3. Validate webhook-driven data snapshots (payments/bookings/documents) are present.
4. Confirm unauthorized users are redirected/blocked from admin-only surfaces.

## 3) Regression evidence requirements
- Every mandatory path needs one automated artifact (test result/log) or manual capture.
- Negative-path evidence is required for:
  - payment failures,
  - booking conflicts,
  - unauthorized access rejection.
- Any failed mandatory path is a **No-Go** until fixed and re-tested.
