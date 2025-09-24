# API Contract Testing

This project uses [Pact](https://docs.pact.io/) to capture the expectations that our web clients have of the Next.js API layer. Consumer contracts live alongside their generating tests in `tests/contracts/` and the resulting pact files are committed to version control so that provider changes are validated in CI.

## Consumer contracts

- `tenant.contract.test.ts` models the **TenantPortalClient** experience. It covers:
  - Fetching the latest `/api/documents` payload.
  - Conditional requests that rely on the `If-None-Match`/`ETag` handshake.
- `admin.contract.test.ts` models the **AdminOperationsClient** controls. It verifies:
  - Accessing historical document revisions via `/api/documents?revision=revision2`.
  - Conditional requests for revision snapshots.

Run the consumer suite to refresh pact files:

```bash
pnpm contract:test
```

Pact files are emitted to `tests/contracts/pacts/` and should be committed whenever an interaction changes. Use meaningful commit messages describing the scenario change so reviewers can track the contract history. Pact automatically records the specification version in the JSON metadata; when we intentionally ship a breaking change to a consumer, bump the `version` field in `package.json` so the new contract is tagged with the matching consumer version.

## Provider verification workflow

Local verification requires a running Next.js API server. Use a dedicated port to avoid clashes with any dev server:

```bash
pnpm next build
pnpm next start --hostname 127.0.0.1 --port 3001
PACT_PROVIDER_URL=http://127.0.0.1:3001 pnpm contract:verify
```

The verification script loads every pact under `tests/contracts/pacts/` and checks that the live API responses match the recorded expectations. Set `PACT_LOG_LEVEL=info` locally if you need more insight into the verification requests.

## Continuous integration

The `Contract Testing` GitHub workflow keeps the provider in sync with the committed contracts:

1. Install dependencies with `pnpm`.
2. Generate the latest consumer pacts (`pnpm contract:test`).
3. Build and start the Next.js API (`pnpm next build` + `pnpm next start --port 3001`).
4. Run `pnpm contract:verify` against the running server.

If verification fails, the workflow surfaces the mismatch so we can either update the API implementation or adjust the consumer contract. Always update the pact files in the same pull request as the implementation change so CI exercises the correct expectations.
