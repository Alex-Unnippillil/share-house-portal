# Ping Endpoint

The `/api/ping` endpoint exposes a lightweight health probe for the Roomsily portal. It is implemented as a Rust function and deployed on Vercel using the `vercel-rust` runtime.

## Request

```
GET /api/ping
```

No authentication headers or payload are required.

## Response

- **Status:** `200 OK`
- **Body:**

```json
{
  "version": "0.1.0",
  "status": "ok"
}
```

- `version` reflects the compiled crate version for the Rust handlers (`CARGO_PKG_VERSION`).
- `status` is always `"ok"` when the handler executes successfully.

## Usage

Use this endpoint for uptime monitoring, Vercel health checks, or lightweight diagnostics. Any non-`200` status code indicates an issue with the underlying deployment or build artifact.
