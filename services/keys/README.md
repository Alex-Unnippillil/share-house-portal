# Key Management Services

This package contains the domain-level APIs required to manage digital key lifecycles
and integrate with on-premises key cabinets. It is framework agnostic and can be used
from React Server Actions, traditional API routes, background jobs, or any other
TypeScript runtime that provides the Fetch API.

## Overview of modules

- `service.ts` – high-level orchestration for checkout, return, overdue alerts, and
  policy evaluations.
- `policies.ts` – reusable policy validator with built-in time window, role, and
  max duration rules.
- `connector.ts` – connector contract and default HTTP-based implementation for an
  on-premise key cabinet.
- `errors.ts` – strongly typed error hierarchy.
- `types.ts` – shared DTOs, contracts, and policy definitions.

Importing from `services/keys` re-exports everything you need:

```ts
import { KeyService, OnPremKeyCabinetConnector, KeyPolicyValidator } from '@/services/keys';
```

## Digital key APIs

### Checkout a key

Use `KeyService.checkoutKey` to orchestrate validation, persistence, and cabinet
notifications.

```ts
const service = new KeyService({
  repository,
  notificationService,
  cabinetConnector,
});

await service.checkoutKey({
  keyId: 'front-door',
  userId: 'resident-123',
  userRole: 'resident',
  issuedAt: new Date(),
  expectedReturnAt: addHours(new Date(), 2),
  policies: [timeWindowPolicy, rolePolicy],
});
```

1. Policies are validated via `KeyPolicyValidator`. Violations surface as
   `PolicyViolationError` (see below).
2. `repository.checkout` is invoked to persist the transaction.
3. When a `KeyCabinetConnector` is configured, the checkout event is forwarded to
   the physical cabinet.

### Return a key

```ts
await service.returnKey({
  transactionId: 'txn-123',
  keyId: 'front-door',
  userId: 'resident-123',
  returnedAt: new Date(),
});
```

The repository is responsible for updating the transaction status and return time.
If a cabinet connector is present the return is synchronised with the cabinet.

### Overdue alerts

Call `KeyService.triggerOverdueAlerts()` on a schedule to notify residents and
managers of overdue keys. The method returns a summary that indicates successes
and failures without throwing unless the underlying repository query fails.

```ts
const summary = await service.triggerOverdueAlerts();

console.log(summary);
// {
//   referenceDate: Date,
//   totalOverdue: number,
//   alertsSent: number,
//   failures: Array<{ record, error }>
// }
```

Failures are wrapped in `KeyServiceError` instances with the `NOTIFICATION_ERROR`
code so they can be logged, retried, or escalated.

### Policy validation

`KeyService.validatePolicies` (or `KeyPolicyValidator` directly) can be used to
pre-flight a request without mutating state.

Supported rule types out of the box:

- `timeWindow`: restricts checkouts to configured hours/days/time zones and
  optionally a country.
- `role`: enforces allowed user roles.
- `maxDuration`: caps the time between issue and expected return.
- `custom`: plug in arbitrary validation logic with async support.

You can provide contextual data (time zone, custom attributes, etc.) using the
`context` property on `KeyCheckoutRequest`.

## Error handling contract

All operational errors surface as `KeyServiceError` (or subclasses) with a `code`
property that allows reliable classification. The following codes are used across
APIs:

| Code | Meaning |
| ---- | ------- |
| `VALIDATION_ERROR` | Unexpected issue while running schema/policy validation. |
| `POLICY_VIOLATION` | One or more policies failed. Violations are attached. |
| `REPOSITORY_ERROR` | Persistence or data retrieval failed. |
| `NOTIFICATION_ERROR` | Downstream notification provider rejected the alert. |
| `CONNECTOR_ERROR` | The cabinet connector rejected the call or could not be reached. |
| `CONFIGURATION_ERROR` | Misconfiguration detected (e.g., missing Fetch API implementation). |

`PolicyViolationError` is a specialised `KeyServiceError` that exposes a
`violations` array and the `PolicyValidationResult` that produced them.

When you need to wrap unexpected exceptions, use `KeyServiceError.from(cause, code, message, details)`.
This helper automatically preserves existing `KeyServiceError` instances and
annotates new ones with the original cause.

## On-prem cabinet integration

`OnPremKeyCabinetConnector` is an opinionated HTTP connector that translates
service events into REST calls:

- `syncInventory()` → `GET /cabinets/:id/inventory`
- `dispatchCheckout()` → `POST /cabinets/:id/transactions/checkout`
- `dispatchReturn()` → `POST /cabinets/:id/transactions/return`
- `streamAlerts()` → long-polls `GET /cabinets/:id/alerts` for audit and tamper
  events

### Configuration

```ts
const connector = new OnPremKeyCabinetConnector({
  baseUrl: 'https://cabinet.local/api',
  apiKey: process.env.CABINET_API_KEY!,
  cabinetId: 'cabinet-01',
  timeoutMs: 5_000,
  defaultAlertPollIntervalMs: 10_000,
});
```

- `baseUrl` should point to the cabinet middleware endpoint.
- `apiKey` is used for Bearer authentication. Additional headers can be provided
  via the `fetch` instance passed in `config.fetch`.
- `timeoutMs` controls how long HTTP calls will wait before aborting.
- The connector relies on the global `fetch`. Provide a polyfill or custom
  implementation when running in environments that do not ship with the Fetch API.

### Alert streaming contract

`streamAlerts` returns an async iterator that yields normalised alerts. Use an
`AbortController` to close the stream gracefully:

```ts
const abortController = new AbortController();

for await (const alert of connector.streamAlerts({ pollIntervalMs: 5_000, signal: abortController.signal })) {
  console.log(alert.event, alert.occurredAt);
  if (shouldStop(alert)) {
    abortController.abort();
  }
}
```

Alert payloads include the canonical cabinet ID, key ID, slot ID, severity, and
arbitrary details. Unknown events are mapped to the `unknown` event type so the
application can decide how to handle them.

## Repository and notification contracts

Implementors must provide:

- `KeyRepository` with methods for checkout, return, and finding overdue
  transactions.
- `KeyNotificationService` capable of delivering overdue alerts (email, SMS,
  push, etc.).

These abstractions enable integration with Supabase, PostgreSQL, or any other
persistence layer without coupling the service to a specific database driver.
