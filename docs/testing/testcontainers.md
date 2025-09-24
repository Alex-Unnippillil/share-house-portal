# Testing with Testcontainers

The Vitest suite now boots an ephemeral Supabase-like stack (Postgres + PostgREST) for integration tests. This environment is provisioned via [Testcontainers](https://testcontainers.com/) and automatically applies a lightweight schema that mirrors the tables used by the data access layer.

## Prerequisites

- Docker Desktop or another Docker engine must be running locally. Testcontainers talks directly to the Docker daemon.
- Node.js 20+ with `pnpm` (the repo already pins `pnpm` 10.x in CI).
- Enough disk space for pulling the Postgres (`postgres:15-alpine`) and PostgREST (`postgrest/postgrest:v12.0.3`) images the first time the suite runs.

## Running the tests

```bash
pnpm install
pnpm test
```

The first run may take a little longer while Docker pulls the required images and the schema is initialised. Subsequent runs reuse the same container inside the Vitest process so test execution stays fast.

### Customising container images

You can override the default images by exporting the following environment variables before running the tests:

- `TEST_SUPABASE_POSTGRES_IMAGE` – defaults to `postgres:15-alpine`.
- `TEST_SUPABASE_POSTGREST_IMAGE` – defaults to `postgrest/postgrest:v12.0.3`.

This is useful if you want to validate against a different Postgres version or a custom PostgREST build.

## Enabling container reuse between runs

Testcontainers can keep containers alive across multiple test commands which dramatically reduces setup time. To opt in:

1. Allow reuse in your global Testcontainers configuration:

   ```bash
   echo "testcontainers.reuse.enable=true" >> ~/.testcontainers.properties
   ```

2. (Optional) Disable the Ryuk resource reaper when you trust the host environment:

   ```bash
   export TESTCONTAINERS_RYUK_DISABLED=true
   ```

3. Run the tests as normal. Testcontainers will recycle previously-started containers when the configuration matches.

> ⚠️  When reuse is enabled you are responsible for removing cached containers and volumes if they become stale. Use `docker ps -a` and `docker rm`/`docker volume rm` as needed.

## Caching pulled images

Docker handles image caching natively. For CI or remote caches you can persist Testcontainers' metadata directory (`~/.cache/testcontainers`) to avoid repeated downloads of health-check binaries.

## Troubleshooting

- **`Error: Supabase test environment has not been initialised`** – ensure `pnpm test` is executed; the helper automatically provisions the containers during Vitest setup.
- **`connect ECONNREFUSED`** – verify Docker is running and accessible to your user.
- **Slow first test run** – the initial migration pass creates the required tables; subsequent runs reuse the same schema unless you clean Docker volumes.
