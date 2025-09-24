# Domain Event Registry

Roomsily emits structured domain events to describe state changes across visitor bookings, maintenance, payments, and document workflows. Each event is versioned with a JSON Schema stored under `docs/events/schemas/` so producers and consumers can coordinate deployments with confidence.

## Available events

| Event name | Version | Description | Schema |
| --- | --- | --- | --- |
| `visitor.booking.submitted` | 1.0.0 | A roommate submitted an overnight visitor booking that must be reviewed by roommates and the property manager. | [`visitor-booking-submitted.v1.0.0.json`](./schemas/visitor-booking-submitted.v1.0.0.json) |
| `maintenance.request.submitted` | 1.0.0 | A tenant created a maintenance request ticket that routes to the assigned property manager. | [`maintenance-request-submitted.v1.0.0.json`](./schemas/maintenance-request-submitted.v1.0.0.json) |
| `rent.payment.recorded` | 1.0.0 | A rent payment cleared and the tenant receipt workflow was triggered. | [`rent-payment-recorded.v1.0.0.json`](./schemas/rent-payment-recorded.v1.0.0.json) |
| `document.signed` | 1.0.0 | A tenant or manager completed a Documenso signing flow. | [`document-signed.v1.0.0.json`](./schemas/document-signed.v1.0.0.json) |

## Schema change workflow

1. **Add, don't edit.** Published schema files are immutable. When payload requirements change, create a new file with an incremented semantic version (for example `visitor-booking-submitted.v1.1.0.json`).
2. **Update producers.** Bump event payload builders to emit the new version while keeping support for the previous version until all consumers migrate.
3. **Document the change.** Update this registry with a short summary of the new version and any migration notes for downstream services.
4. **Validate locally.** Run `pnpm events:check` (or `npm run events:check`) before opening a pull request. The script rejects modifications to published schemas and enforces naming conventions.
5. **Communicate widely.** Share the change in the Platform Engineering channel along with the effective date so analytics, integrations, and support tooling teams can adjust.

## Versioning guidelines

- Use [semantic versioning](https://semver.org/) for schemas. Breaking changes require a major bump, additive optional fields use a minor bump, and documentation-only fixes use a patch bump.
- Keep payload fields machine friendly (ISO 8601 timestamps, UUID identifiers, ISO currency codes) to simplify downstream processing.
- Include an `occurredAt` timestamp in every event so consumers can order or replay messages deterministically.

## Validation and compatibility checks

The repository ships an automated guardrail to ensure backward compatibility:

- `scripts/check-event-schemas.cjs` runs in CI via the `events:check` package script.
- The script fails if an existing schema file is modified or deleted, ensuring published versions remain immutable.
- It also verifies file naming (`<event-name>.v<major>.<minor>.<patch>.json`) and cross-checks the embedded `version` constant.

Extend the script if additional invariants (such as schema diffing) are required in the future.
