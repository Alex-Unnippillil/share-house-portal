# Share House Portal API Contracts

This directory hosts the canonical OpenAPI specification for the Share House Portal internal REST handlers and the generated SDKs that are committed to the repository for consumers.

## Specification lifecycle

- The OpenAPI definition lives at [`docs/api/openapi.yaml`](./openapi.yaml). Update the `info.version` field whenever a backwards-incompatible change ships.
- Validate changes locally with `pnpm openapi:validate`. CI runs the same command to block invalid specs.
- Regenerate the TypeScript and Python SDKs after every schema change with `pnpm openapi:generate`. The script runs validation before emitting clients into `sdk/typescript` and `sdk/python`.
- Keep diffs focused by re-running the generator after formatting or schema changes; the output is deterministic when the spec does not change.

## Versioning & release notes

We follow semantic versioning for the published contract:

- Patch (`0.1.x`) for documentation-only tweaks or additive, backwards-compatible schema changes.
- Minor (`0.x.0`) for additive endpoints or fields that may require client work.
- Major (`x.0.0`) when removing, renaming, or altering request/response semantics.

Record notable changes under **Release notes** below so internal consumers can track additions. Each entry should include the version, date, summary, and any migration steps.

### Release notes

- `0.1.0` (2024-07-09): Initial publication covering authentication, documents, notifications, payments, and Stripe webhook handlers.

## Consuming the generated SDKs

### TypeScript

```ts
import { Configuration, DefaultApi } from "../../sdk/typescript"

const api = new DefaultApi(
  new Configuration({ basePath: "https://app.roomsily.example" })
)

const documents = await api.listDocuments()
```

### Python

```python
from share_house_portal_sdk import Configuration, ApiClient
from share_house_portal_sdk.api.default_api import DefaultApi

config = Configuration(host="https://app.roomsily.example")
with ApiClient(config) as api_client:
    api = DefaultApi(api_client)
    documents = api.list_documents()
```

To use the Python client without publishing to PyPI, add `sdk/python` to `PYTHONPATH` and install the dependencies listed in `sdk/python/requirements.txt` (the Vitest smoke test demonstrates this pattern).

## Verification

- `pnpm openapi:validate` — verifies the OpenAPI spec
- `pnpm openapi:generate` — rebuilds the TypeScript and Python SDKs
- `pnpm test` — runs Vitest, including smoke tests for both SDKs against local HTTP mocks
