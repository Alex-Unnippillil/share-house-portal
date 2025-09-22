# Engineering Conventions

This document summarizes the agreed structure for the Roomsily monorepo and the coding standards all teams follow when contributing to it.

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

These conventions will evolve with the platform. Propose updates via a new ADR or an update to this document and circulate it in the Platform Engineering Guild for approval.
