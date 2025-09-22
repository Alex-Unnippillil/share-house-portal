# 0001 - Define Building-Based Multi-Tenant Boundaries

## Status
Accepted

## Date
2024-05-28

## Context
The Roomsily serves multiple property management companies and must
prevent data leakage between buildings owned by different legal entities. Early
prototypes stored tenant records without consistent tenancy identifiers, making
it difficult to guarantee that queries, exports, and messaging stayed within the
correct building context. Regulatory requirements (GDPR, CCPA) and contractual
obligations from property owners require strict segregation of personally
identifiable information (PII) and financial data per building. We also plan to
add operational automation that spans multiple buildings, which necessitates a
clear boundary model for service accounts and background jobs.

## Decision
Adopt `BuildingID` as the primary tenancy boundary across APIs, database tables,
and background processing. All core entities (residents, leases, tickets,
communications, reports) include a non-null `building_id` column with foreign key
constraints. RBAC rules are defined per `(UserID, BuildingID, Role)` tuple, and
API middleware validates every request's BuildingID before execution. Service
accounts must specify explicit BuildingIDs when performing multi-tenant work, and
long-running jobs iterate over each building rather than issuing cross-building
queries. Documentation of roles, permissions, data classification, and retention
policies referencing BuildingID scoping is maintained in
`docs/security/authorization-model.md`.

## Consequences
* Guarantees that resident and financial data is always scoped to the relevant
  building, reducing risk of accidental disclosure.
* Requires migrations to backfill `building_id` on legacy tables and enforce
  database constraints.
* Increases complexity for global reporting; aggregated dashboards must compose
  per-building datasets or use service roles with elevated privileges.
* Simplifies audit logging because BuildingID becomes part of the audit log key.
* Forces developers to consider tenancy in new features, reducing future refactor
  costs when onboarding additional properties.

## Follow-Up Actions
* Implement automated tests that assert tenancy enforcement for each API route.
* Extend developer tooling to generate scaffolds that include BuildingID filters
  by default.
* Monitor performance impact of additional indexes on `building_id` and optimize
  where necessary.

## References
* [Authorization Model](../security/authorization-model.md)
* Supabase Row Level Security documentation (internal wiki)
