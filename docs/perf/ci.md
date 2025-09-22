# Lighthouse CI in Roomsily

## Overview
The Lighthouse CI workflow validates core preview routes against the Web Vitals
budgets defined in [`.lighthouserc.js`](../../.lighthouserc.js). Each run audits
shared tenant flows (dashboard, payments, messaging, visitors, maintenance, and
more) and fails when any category score drops below 90 or when LCP, FCP, TBT,
Speed Index, or CLS regress beyond our budgets.

## When it runs
- **Preview deployments** &mdash; Every successful non-production deployment
  automatically triggers the `Lighthouse CI` workflow once the hosting provider
  posts an updated preview URL.
- **Manual checks** &mdash; Platform or feature teams can trigger ad-hoc runs from the
  Actions tab when debugging a regression, testing a hotfix, or validating
  marketing experiments.

## Rerunning the workflow
Use the approach that best matches your situation:

### Re-run a failed or outdated job
1. Navigate to **Actions → Lighthouse CI**.
2. Open the run you want to replay.
3. Click **Re-run jobs → Re-run failed jobs** (or **Re-run all jobs** if you want
   a clean comparison).

### Trigger a fresh audit with a preview URL
1. Navigate to **Actions → Lighthouse CI → Run workflow**.
2. Paste the full preview base URL (for example, the Vercel preview link shared
   in the pull request comment or Deployments pane).
3. Select the target branch (defaults to the current branch) and click
   **Run workflow**.

The workflow exports the URL to `LHCI_PREVIEW_BASE_URL`, collects reports for the
core routes listed in `.lighthouserc.js`, and uploads HTML output to
`artifacts/lighthouse/` together with a markdown score table in the job summary.
