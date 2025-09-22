# Tenant Balance Materialized View

## Purpose
`tenant_balance_mv` snapshots monthly payment performance for each tenant using data from `rent_payments`. The view consolidates:

- Total payments captured (`gross_amount`)
- Successful, pending, and failed amounts
- Net position per month (`net_amount`)
- Latest payment metadata (status, amount, timestamp)

The materialized view allows dashboards and reporting loaders to fetch aggregated balances without repeatedly scanning the live payments table.

## Refresh Strategy
A statement-level trigger (`refresh_tenant_balance_mv_trigger`) fires whenever `rent_payments` receives inserts, updates, deletes, or truncations. The trigger invokes `REFRESH MATERIALIZED VIEW tenant_balance_mv`, keeping the snapshot current after each mutation.

Because the refresh runs inside the originating transaction, callers always see fully up-to-date data once their change commits. The view also holds a primary key and unique index on `(tenant_id, month)` so the refresh can be promoted to a concurrent refresh later if lock contention becomes an issue.

## Failure Handling
- **Trigger failures**: If the refresh fails, the originating data change aborts and the client receives the error. Retry the write once the underlying issue (e.g., lock timeout, unexpected NULL tenant IDs) is resolved.
- **Manual recovery**: Administrators can run `REFRESH MATERIALIZED VIEW tenant_balance_mv;` manually to repopulate the snapshot after any outage or schema change.
- **Monitoring**: Add database monitoring or use Supabase logs to alert on repeated refresh failures. In high-volume environments consider moving the refresh into a `pg_cron` job or background worker so that transient issues do not block writes.

## Cadence Adjustments
For environments where immediate consistency is not required, disable the trigger and schedule a Supabase `pg_cron` job (e.g., every 5 minutes) executing `REFRESH MATERIALIZED VIEW tenant_balance_mv`. Document the chosen cadence in infra runbooks so downstream consumers know the staleness window.
