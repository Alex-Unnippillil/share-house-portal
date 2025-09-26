# Contributing to Roomsily

Thanks for your interest in contributing to Roomsily! This guide describes the project conventions and the workflow we expect contributors to follow. Please review it before opening a pull request.

## Branching Strategy

- The `main` branch reflects the latest production-ready code. Never commit directly to `main`.
- Create feature branches from `main` using the pattern `type/short-description`, for example `feature/amenity-booking` or `fix/payment-webhook`.
- Keep branches focused. If a branch begins to cover more than one logical change, split it into smaller feature branches.
- Rebase your branch on top of the latest `main` before opening a pull request to minimize merge conflicts and ensure CI stability.

## Database Migrations

- Define schema changes with the Supabase CLI (`supabase migration new <name>`). Commit the generated SQL files in `supabase/migrations`.
- Write migration names that describe the change, e.g. `add_amenity_capacity_column`.
- Every migration must be reversible. Provide corresponding down migrations when the tooling supports it, or document manual rollback steps in the migration file comments.
- After creating or modifying migrations, run `supabase db reset` locally to confirm the schema initializes cleanly from scratch.

## Testing Expectations

- Install dependencies with `pnpm install` (preferred), `npm install`, or `npm ci` as appropriate for your setup.
- Run unit and integration tests locally using `pnpm test` (or the equivalent npm script) before pushing changes.
- For code that affects the UI, run `pnpm lint` and, when possible, capture screenshots or recordings of the updated flows.
- When changes touch database interactions, execute any relevant end-to-end or Playwright suites to validate critical paths (onboarding, payments, bookings, messaging).
- Include evidence of the tests you executed (command output, screenshots, or notes) in your pull request.

## Commit Conventions

- Write atomic commits that capture a single logical change.
- Format commit messages using the imperative mood (e.g. `Add amenity booking validation`).
- Reference related issues in the commit body using GitHub keywords (`Fixes #123`) when applicable.
- Do not amend or force-push commits after a review has started unless you coordinate with the reviewer.

Following these conventions helps us ship high-quality features quickly and reliably. Thank you for contributing!
