# Security Policy
See nextconfig.js for CSP and header config.

## Code Scanning & Triage Expectations

Automated [CodeQL](https://codeql.github.com/) analysis runs for JavaScript/TypeScript on every pull request targeting `main`, every push to `main`, and on a scheduled weekly scan. Alerts surface inline on PRs and in the repository **Security > Code scanning alerts** tab.

When a CodeQL alert fires:

- Treat high or critical severity findings as release blockers. Resolve or mitigate them before merging the PR.
- For medium/low severity alerts, document the risk and planned remediation in the PR discussion or open an issue before merging.
- If an alert is a false positive, dismiss it in the Security tab with a justification so we keep an auditable trail.
- Assign remediation follow-up issues to the feature owner and track them through completion.

The security champion for the sprint should review open CodeQL alerts at least once per week to ensure nothing regresses.

## Reporting a Vulnerability

Please head to Advisories to submit a private vulnerability report.
If needed, check out the docs explaining [how to submit a private vulnerability report](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository#enabling-or-disabling-private-vulnerability-reporting-for-a-repository).
