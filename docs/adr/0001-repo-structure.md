# ADR 0001: Repository Structure Strategy

- Status: Accepted
- Deciders: Platform Engineering Guild
- Date: 2024-04-05

## Context

The Roomsily platform includes multiple backend services, web and mobile clients, shared libraries, and infrastructure-as-code definitions. Product teams collaborate across these domains, share UI and API contracts, and rely on consistent tooling to deliver features quickly. Historically, related codebases have lived in separate repositories, which increased coordination cost for cross-cutting changes, duplicated CI/CD configuration, and complicated dependency management.

## Decision

We will adopt a **monorepo** for the Roomsily platform. All product-critical services, clients, infrastructure definitions, and shared packages will live in this repository.

### Rationale

- **Coordinated changes**: Cross-service updates (API contracts, shared libraries, schema migrations) can be implemented and reviewed atomically.
- **Unified tooling**: Build, lint, and release automation is centralized, reducing duplicated configuration and enabling consistent quality gates.
- **Discoverability**: Engineers can locate related services, assets, and documentation without traversing multiple repos.
- **Developer experience**: Local development environments can be orchestrated from a single workspace, simplifying onboarding and reducing context switching.

### Alternatives Considered

- **Polyrepo**: Keeping each service or client in its own repository would isolate release cadences and allow tailored tooling. However, the coordination overhead, fragmented visibility, and duplicated infra outweighed these benefits for our current team size and roadmap.

## Consequences

### Positive

- End-to-end features can be delivered within a single pull request.
- Shared code evolves faster because teams can co-own packages and see usage sites.
- Centralized governance makes it easier to enforce security and compliance policies.

### Negative

- The repository will grow large; we must invest in incremental builds, partial CI pipelines, and workspace tooling to keep feedback loops fast.
- Access controls must be role-based within the repo (e.g., code owners) since repository-level ACLs are no longer granular.

### Follow-up Actions

1. Establish code ownership rules (CODEOWNERS) for critical directories.
2. Configure workspace-aware tooling (e.g., Turborepo, Nx, or pnpm workspaces) to support selective builds and tests.
3. Document contribution workflows and release processes for teams sharing the monorepo.
