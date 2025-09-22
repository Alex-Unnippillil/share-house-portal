-- Enable pg_stat_statements to gather execution metrics if it is not already active
create extension if not exists pg_stat_statements;

-- Dedicated schema to hold observability helpers that surface performance insights
create schema if not exists observability;

comment on schema observability is 'Helper views for performance diagnostics (slow queries, N+1 detection, Supabase telemetry).';

create or replace view observability.top_slow_queries as
select
  query,
  calls,
  total_exec_time as total_time_ms,
  mean_exec_time as mean_time_ms,
  min_exec_time as min_time_ms,
  max_exec_time as max_time_ms,
  stddev_exec_time as stddev_time_ms,
  rows,
  (case when calls > 0 then rows::numeric / calls else null end) as rows_per_call,
  (case when calls > 0 then total_exec_time / calls else null end) as avg_time_per_call_ms
from pg_stat_statements
where query is not null
order by mean_exec_time desc
limit 100;

comment on view observability.top_slow_queries is 'Top 100 queries by mean execution time sourced from pg_stat_statements.';

create or replace view observability.n_plus_one_candidates as
select
  query,
  calls,
  rows,
  total_exec_time as total_time_ms,
  mean_exec_time as mean_time_ms,
  (case when calls > 0 then rows::numeric / calls else null end) as rows_per_call,
  (case when calls > 0 then total_exec_time / calls else null end) as avg_time_per_call_ms
from pg_stat_statements
where query is not null
  and calls > 25
  and (case when calls > 0 then rows::numeric / calls else null end) <= 1
order by calls desc
limit 100;

comment on view observability.n_plus_one_candidates is 'High call-count, low row-per-call queries highlighting potential N+1 issues.';

grant usage on schema observability to authenticated, service_role;
grant select on all tables in schema observability to authenticated, service_role;

alter default privileges in schema observability
  grant select on tables to authenticated, service_role;
