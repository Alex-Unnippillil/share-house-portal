# Engineering Conventions

This document summarizes the agreed structure for the Share House monorepo and the coding standards all teams follow when contributing to it.

## Top-level Folder Structure

The repository is organized to keep infrastructure, services, clients, and shared assets discoverable. New projects should align with these conventions.

| Directory | Description |
| --- | --- |
| `infra/` | Infrastructure as code modules, pipeline definitions, Terraform/Terragrunt stacks, and environment specific configuration. Each subfolder should own its deployment documentation and automation scripts. |
| `services/` | Backend services (REST, GraphQL, background workers, cron jobs). Each service keeps its own README, deployment manifests, and service-level tests. |
| `apps/web/` | Web clients and portals built with Next.js or other frontend frameworks. Feature apps sit under `apps/web/<app-name>/` and share UI kits from `packages/ui`. |
| `apps/mobile/` | React Native or native mobile clients. Each mobile app must define build configuration, platform-specific assets, and release checklists in its own subfolder. |
| `packages/` | Shared libraries used across services and clients (e.g., domain models, API SDKs, UI component libraries, lint configs). Packages should be published via workspaces and versioned with semantic releases. |
| `tools/` | Developer tooling such as code generators, database migration CLIs, and integration test harnesses. |
| `docs/` | Architecture decision records, onboarding guides, runbooks, and engineering policies. |

> **Note:** Legacy directories (`app/`, `components/`, etc.) will be migrated into the structure above. New code must follow the structure immediately.

## Coding Standards

### General Principles

- Prefer readability over cleverness; optimize for maintainability and clarity in code reviews.
- Keep functions small and focused. Extract shared logic into well-named helpers or packages.
- Write self-documenting code and complement with inline comments only when business logic is non-obvious.
- Every directory must contain a README outlining purpose, setup, and test instructions.

### TypeScript / JavaScript

- Use TypeScript by default for frontend and Node.js services.
- Enforce strict compiler options (`"strict": true`) and rely on ESLint/Prettier configurations defined in the repository root.
- Follow functional component patterns with hooks in React. Avoid legacy class components unless required by dependencies.
- Group tests alongside implementation files using the `.test.ts(x)` suffix.
- Favor named exports; use default exports only for Next.js page components.

### Go (Backend Services)

- Organize modules with `cmd/<service>` for entrypoints and `internal/` for shared implementation details.
- Use `golangci-lint` with the shared configuration from `packages/config/golangci.yml`.
- Provide unit tests covering core business rules and integration tests for external systems.
- Keep configuration in environment variables, parsed via a dedicated config package.

### Python (Data / Automation)

- Target Python 3.11+ and manage dependencies with Poetry. Lock files must be committed.
- Format code with `black`, lint with `ruff`, and type-check with `mypy` using shared configs from `packages/config`.
- Store notebooks in `notebooks/` with clear metadata and export production code into reusable modules.

### Testing and CI

- All new features require automated tests. Failing tests block merges.
- CI pipelines should leverage workspace-aware tooling (e.g., Turborepo) to run only affected tasks.
- Include contract tests when changing API schemas or shared libraries.

### Documentation

- Update relevant ADRs, READMEs, and runbooks when architecture or operational behavior changes.
- Each service must expose health-check endpoints and document observability dashboards.
- Pull requests must reference related Jira tickets and include release notes when user-facing changes occur.

### Security & Compliance

- Secrets must never be committed; use the centralized secret manager integration referenced in `infra/secrets/`.
- Follow least-privilege principles when defining IAM roles or service accounts.
- Ensure dependency scanning and container image scanning steps succeed before requesting review.

### Supabase Entity Relationships

- **households** — Anchor record for each shared property; all tenant data links back here via `household_id` and each row carries `created_at`/`updated_at` metadata for auditing.
- **members** — Roommates, property managers, and admins scoped to a household.
  - `members.household_id → households.id`
  - `members.user_id → auth.users.id`
- **amenities** — Household-specific shared resources (kitchen, parking, TV room, etc.).
  - `amenities.household_id → households.id`
- **bookings** — Time-bound reservations against amenities.
  - `bookings.household_id → households.id`
  - `bookings.amenity_id → amenities.id`
  - `bookings.member_id → members.id`
- **chores** — Recurring or ad hoc household responsibilities.
  - `chores.household_id → households.id`
- **chore_assignments** — Links chores to the members responsible for completing them.
  - `chore_assignments.household_id → households.id`
  - `chore_assignments.chore_id → chores.id`
  - `chore_assignments.member_id → members.id`
- **supply_items** — Consumables the household tracks jointly.
  - `supply_items.household_id → households.id`
- **supply_purchases** — Purchases of tracked supplies and who bought them.
  - `supply_purchases.household_id → households.id`
  - `supply_purchases.supply_item_id → supply_items.id`
  - `supply_purchases.member_id → members.id`
- **supply_shares** — Cost-splitting records for each purchase.
  - `supply_shares.household_id → households.id`
  - `supply_shares.supply_purchase_id → supply_purchases.id`
  - `supply_shares.member_id → members.id`
- **threads** — Discussion topics per household with optional author attribution.
  - `threads.household_id → households.id`
  - `threads.member_id → members.id`
- **messages** — Posts within a thread authored by members.
  - `messages.household_id → households.id`
  - `messages.thread_id → threads.id`
  - `messages.member_id → members.id`
- **leases** — Active or historical contractual agreements for a household.
  - `leases.household_id → households.id`
  - `leases.member_id → members.id`
- **invoices** — Rent and fee statements tied to a lease or individual member share.
  - `invoices.household_id → households.id`
  - `invoices.lease_id → leases.id`
  - `invoices.member_id → members.id`
- **payments** — Tenant payments recorded against invoices.
  - `payments.household_id → households.id`
  - `payments.invoice_id → invoices.id`
  - `payments.member_id → members.id`
- **floorplans** — Uploaded floorplan assets for a household.
  - `floorplans.household_id → households.id`
- **overlay_shapes** — Member-specific annotations layered on top of a floorplan.
  - `overlay_shapes.household_id → households.id`
  - `overlay_shapes.floorplan_id → floorplans.id`
  - `overlay_shapes.member_id → members.id`
- **garbage_events** — Scheduled trash, recycling, or compost pickups with optional assignees.
  - `garbage_events.household_id → households.id`
  - `garbage_events.member_id → members.id`

All household-scoped tables share consistent `created_at` and `updated_at` columns to support reconciliation and time-based analytics.

These conventions will evolve with the platform. Propose updates via a new ADR or an update to this document and circulate it in the Platform Engineering Guild for approval.
