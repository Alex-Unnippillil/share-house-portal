# Directory Service Data Model

This project contains an EF Core data model for the directory service. It defines schema objects for buildings, residential units, tenancy accounts, residents, building staff, authorization roles and permissions, and an audit log for operational traceability.

## Tenancy constraints

The data model enforces multi-tenant safety by scoping every tenant-facing aggregate with a `BuildingId` foreign key and index:

- **Buildings** own the tenancy lifecycle; dependent records cascade from the building identifier.
- **Units** carry the building scope in unique `(BuildingId, Identifier)` keys to prevent cross-building collisions.
- **Accounts** include `BuildingId` and `UnitId` with unique `(BuildingId, AccountNumber)` indexes so an account number is unique within a building. Accounts retain a decimal balance and duration window (`StartDate`/`EndDate`) to support compliance checks.
- **Residents** are linked to both the building and their account; indexes on `BuildingId`, `AccountId`, and `(BuildingId, Email)` accelerate tenant lookups and enforce that a resident email is unique per building.
- **Staff** records carry a building scope and unique email constraint per building so staff can be shared across properties without collisions.

Join tables (`StaffRoles`, `RolePermissions`) also store building identifiers or rely on parent scopes so that authorization state remains constrained to a building context.

## Audit logging approach

All mutating operations should emit entries into the `AuditLogs` table:

- Each log row stores `BuildingId`, the impacted `EntityName` and `EntityId`, the action verb, serialized change payload, actor identity, timestamp, and optional correlation identifier.
- Indexes on `(BuildingId, PerformedAtUtc)` and `BuildingId` enable efficient chronological reviews per property and support compliance exports.
- The seed data demonstrates how system bootstrap operations can log their work using the `system-seed` actor and a well-defined correlation id.

Application services should wrap write operations in transactions that emit both the domain change and a corresponding audit record to maintain immutable provenance.
