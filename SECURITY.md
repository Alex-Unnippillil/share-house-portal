# Security Policy

See `next.config.js` for CSP and header configuration.

## GitHub Advanced Security enforcement

Secret scanning and push protection **must** remain enabled for this repository whenever the organisation has a GitHub Advanced Security licence available. To verify or configure the settings:

1. Navigate to **Settings → Code security and analysis**.
2. In the **GitHub Advanced Security** section, ensure **Secret scanning** and **Push protection** are both switched on for the repository (or managed via the organisation policy).
3. If the toggles are disabled because licences are exhausted, contact the security team to request allocation before merging changes that expand the use of secrets.

### Handling blocked pushes

When push protection identifies a credential:

1. Review the push feedback for the file path and detected secret type.
2. Remove the secret from the commit history (for example, with `git revert`, `git reset`, or `git commit --amend`) and ensure the secret does not exist in any staged files.
3. Rotate or revoke the exposed credential in the upstream system before attempting another push.
4. Re-run your push after the secret is removed. Only request a temporary bypass from the security team when a detection is a confirmed false positive and document the justification in the pull request.

## Automated secret scanning

In addition to GitHub Advanced Security, the repository runs a `gitleaks` workflow on every push to `main` and on all pull requests. The workflow produces a SARIF report that is published to GitHub code scanning for long-lived visibility. Update the workflow or provide a custom allowlist if newly-added files trigger intentional findings.

## Reporting a Vulnerability

Please head to Advisories to submit a private vulnerability report. If needed, check out the docs explaining [how to submit a private vulnerability report](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository#enabling-or-disabling-private-vulnerability-reporting-for-a-repository).
