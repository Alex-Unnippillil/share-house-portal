# Security Policy
See `next.config.js` for CSP and header config. The phased rollout plan and remediation workflow live in [`docs/security/csp-rollout.md`](docs/security/csp-rollout.md).

## Content Security Policy

- Production responses include both `Content-Security-Policy` and `Content-Security-Policy-Report-Only` headers while the team iterates on tighter directives.
- CSP violation reports are streamed to the endpoint defined by the `CSP_REPORT_URI` environment variable (defaults to the Report URI shared project).
- Review violation trends weekly and follow the change management checklist in the rollout document before promoting stricter directives to enforcement.

## Reporting a Vulnerability

Please head to Advisories to submit a private vulnerability report.
If needed, check out the docs explaining [how to submit a private vulnerability report](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository#enabling-or-disabling-private-vulnerability-reporting-for-a-repository).
