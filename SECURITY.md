# Security Policy
See nextconfig.js for CSP and header config. 

## Reporting a Vulnerability

Please head to Advisories to submit a private vulnerability report.
If needed, check out the docs explaining [how to submit a private vulnerability report](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository#enabling-or-disabling-private-vulnerability-reporting-for-a-repository).

## CODEOWNERS & Branch Protection Expectations

- `.github/CODEOWNERS` enumerates the teams responsible for major areas of the repository (e.g., `app/`, `lib/`, `supabase/`). Update the file as soon as ownership changes or new surface areas are introduced so that review responsibilities remain accurate.
- Coordinate with the GitHub organization administrators to ensure all protected branches (at minimum `main` and any release branches) have the **Require review from Code Owners** branch protection rule enabled. This keeps high-sensitivity areas gated on the appropriate subject-matter experts.
- When onboarding or offboarding teammates, update CODEOWNERS within one business day and confirm the corresponding GitHub teams remain in sync. Document significant ownership changes in the engineering changelog to maintain situational awareness.
