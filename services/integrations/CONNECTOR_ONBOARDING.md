# Connector Onboarding Guide

This guide explains how to build, register, and launch new connectors on top of the integrations runtime located in `services/integrations`.

## 1. Understand the Runtime Building Blocks

- **Job runner** – `IntegrationJobRunner` orchestrates connector execution, manages retries, and dispatches log + metric events. Jobs specify a `connectorKey`, an `operation`, optional payload, and a credential reference.
- **Credential vault** – `CredentialVault` encrypts connector secrets in-memory using AES-256-GCM. In production you should back this interface with a persistent store; extend or replace the class while preserving the method contract (`setCredentials`, `getCredentials`, `updateCredentials`, etc.).
- **Connector SDK** – Extend `IntegrationConnector` to gain helpers for logging, credential access, payload validation, abort handling, and emitting custom metrics. Metadata declared on a connector drives registration and discovery.

Review the reference connectors in `services/integrations/connectors` for concrete examples (accounting, access control, and package lockers) and note the placeholders for IoT devices and voice assistants.

## 2. Scaffold a New Connector

1. Create a file within `services/integrations/connectors/<domain>.ts`.
2. Export a `ConnectorFactory` with unique `metadata.key` and a `create` function that instantiates your connector.
3. Extend `IntegrationConnector` and implement the required methods:
   - `validateConfig(config)` – synchronously or asynchronously validate configuration supplied in jobs. Throw to reject invalid requests.
   - `run(job, runtime)` – execute the requested operation. Use helper methods such as `assertPayloadShape`, `readCredentials`, and `abortIfRequested` to keep code concise.
4. Register your factory with the job runner: `runner.registerConnector(myConnectorFactory)`.

> **Tip:** Keep connector metadata descriptive. The `capabilities` array is surfaced in tooling and documentation; prefer namespaced strings such as `locks:sync` or `payments:collect`.

## 3. Manage Credentials Securely

- Store credentials once during connector installation via `CredentialVault#setCredentials`. The vault hashes the configured secret (env var `INTEGRATIONS_VAULT_SECRET`) into an AES key before encrypting payloads.
- Fetch credentials during job execution with `readCredentials(credentialId)` to receive a typed payload.
- Rotate secrets by calling `updateCredentials`, ideally from an administrative workflow.
- Do not embed credentials inside job payloads—always reference them by ID.

## 4. Handle Operations and Payloads

- Connectors typically dispatch on `job.operation`. Use union-style payload types or runtime guards to validate the inputs needed for each operation.
- Apply `assertPayloadShape` for quick required-field checks and `abortIfRequested(runtime)` to honor cancellation requests.
- Return a `ConnectorJobResult` describing success state, structured data, optional metrics, and follow-up scheduling (`nextRunAt`).

## 5. Testing and Observability

- Use the job runner directly in tests to simulate queue execution. The runner logs lifecycle events and re-enqueues failed jobs (default `maxAttempts = 3`).
- Provide synthetic metrics through `emitMetric` so operators can validate end-to-end flows while developing a new connector.
- Add rich logging context (e.g., tenant IDs, resource identifiers) to accelerate debugging.

## 6. Release Checklist

- [ ] Comprehensive config validation and error messages.
- [ ] Credentials stored with the vault and never logged in plaintext.
- [ ] Job operations documented internally and mirrored in API/UI workflows.
- [ ] Happy-path and failure-path tests executed via the job runner.
- [ ] Observability hooks (metrics, structured logs) in place.
- [ ] Documentation updated (this guide + product docs) with connector-specific notes.

## 7. Extending the Framework

If you need custom retry/backoff strategies, extend `IntegrationJobRunner` or compose it with an external queue. The runner intentionally exposes simple primitives so you can integrate with background job systems like BullMQ, Cloud Tasks, or Supabase queues.

For domain-specific SDK additions (e.g., rate limiting helpers, multi-tenant telemetry), add utilities adjacent to your connector file or extend the shared base class. Submit improvements back to this folder so future connectors benefit from the enhancements.
