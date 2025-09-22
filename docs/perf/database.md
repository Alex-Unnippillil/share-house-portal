# Supabase Database Performance Guide

This guide documents how we keep Supabase database connections healthy while
running on Vercel edge/serverless infrastructure.

## 1. Enable PgBouncer connection pooling

1. In the Supabase dashboard open **Database → Connection pooling**.
2. Enable the **PgBouncer** pooler if it is not already on.
3. Copy the pooled connection string (host ends with `.pooler.supabase.com`) and
   ensure it targets port `6543` with `sslmode=require`.
4. Use the pooled credentials for any long-running job, background worker, or
   monitoring script. The pooled endpoint automatically balances sessions across
   the available database connections.

> **Tip:** When connecting to the PgBouncer admin database, append `/pgbouncer`
> to the DSN so that `SHOW POOLS;` works.

## 2. Environment variables / DSNs

Update `.env.local` (and deployment secrets) with the new pooling variables:

```bash
# Supabase credentials
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="anon_key"
SUPABASE_SERVICE_ROLE_KEY="service_role_key"
SUPABASE_JWT_SECRET="jwt_secret"

# Direct and pooled Postgres DSNs
SUPABASE_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"
SUPABASE_DB_POOLER_URL="postgresql://user:password@project-ref.pooler.supabase.com:6543/postgres"

# Alert thresholds (override defaults when required)
SUPABASE_POOLER_WARNING_THRESHOLD="0.7"
SUPABASE_POOLER_CRITICAL_THRESHOLD="0.9"
```

`SUPABASE_DB_URL` is still used for local Supabase CLI workflows, whereas
`SUPABASE_DB_POOLER_URL` powers PgBouncer aware scripts.

## 3. Reusing Supabase clients with keep-alive

The shared Supabase module now reuses clients across requests and configures an
Undici agent with keep-alive so that serverless executions do not spawn new TCP
sessions for every call.

Key helpers:

- `getSupabaseServiceRoleClient()` – shared service-role client used by API
  routes and background jobs.
- `getSupabaseAnonClient()` – server-side anon client reuse for internal tasks.
- `resetSupabaseClients()` – allows tests to reset cached clients and close the
  shared agent.

Any code that previously constructed a new Supabase service client (e.g. the
Stripe webhook and admin auth helper) now imports `getSupabaseServiceRoleClient`
so that a single connection pool is shared across invocations.

## 4. Monitoring PgBouncer saturation

`lib/monitoring/pgbouncer.ts` exposes helpers to query `SHOW POOLS;` over the
pooling DSN and compute saturation/alert levels.

Available utilities:

- `fetchConnectionPoolStats()` – raw metrics per database/user pool.
- `analyzeConnectionSaturation()` – returns stats plus any alerts triggered by
  threshold rules.
- `monitorConnectionPool()` – convenience helper that logs warnings and invokes
  an optional callback for alerting.

Example usage (run as a cron job or serverless scheduled function):

```ts
import { monitorConnectionPool } from '@/lib/monitoring/pgbouncer'
import { sendEmailNotification } from '@/lib/notifications'

await monitorConnectionPool({
  async onAlert(alert) {
    await sendEmailNotification({
      to: 'infra@sharehouse.app',
      subject: `[DB] ${alert.level.toUpperCase()} saturation for ${alert.database}`,
      template: 'db-alert',
      data: alert.stats,
    })
  },
})
```

By default alerts fire at 70% (`warning`) and 90% (`critical`) saturation, but
those can be overridden via environment variables or the options passed into the
monitor.

## 5. Operational checklist

- ✅ PgBouncer is enabled and the pooled DSN is used for all long-running jobs.
- ✅ Service role Supabase clients reuse the global keep-alive agent.
- ✅ `monitorConnectionPool` is scheduled (e.g. GitHub Action, Vercel Cron) and
  routes alerts to the on-call channel.
- ✅ Thresholds reflect production capacity expectations.
