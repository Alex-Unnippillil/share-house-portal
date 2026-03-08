# Dependency Update PR Triage Workflow

Keeping dependencies up to date improves security and developer velocity, but bot-generated pull requests can easily pile up. Use the following lightweight process each week after Dependabot opens updates.

## 1. Review the PR Summary
- Confirm the PR title and description match the grouped update (e.g. "chore(deps): weekly npm minor and patch updates").
- Skim the changelog links to understand the scope and breaking change risk.

## 2. Run Automated Checks Locally When Needed
- Pull the branch and install dependencies if the lockfile changed (`pnpm install`).
- Run the targeted verification commands:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- If any command fails, leave a comment on the PR with the failure details and label it for follow-up.

## 3. Validate the Application
- Smoke test the main tenant dashboard and any flows touched by the dependency updates.
- For Next.js or Supabase client updates, double-check authentication and API calls.

## 4. Approve and Merge
- If tests pass and the smoke test looks good, approve the PR.
- Use squash merges so the default branch remains clean.
- Delete the dependency branch after merging to keep the repository tidy.

## 5. Escalate Major or Breaking Updates
- If Dependabot raises a major version, remove it from the weekly group and open a tracking issue.
- Assign an engineer to evaluate the migration path and schedule time for the upgrade.

Following this workflow keeps dependency updates predictable and low-risk while ensuring the team remains aware of potential breaking changes.
