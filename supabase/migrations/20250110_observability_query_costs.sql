create schema if not exists observability;

create table if not exists observability.query_costs (
  id uuid primary key default gen_random_uuid(),
  trace_id uuid,
  route text,
  actor text,
  operation text,
  entity text,
  method text not null,
  path text not null,
  status_code integer,
  row_count integer default 0,
  total_exec_time_ms numeric not null,
  alert_level text,
  metadata jsonb,
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists query_costs_recorded_at_idx
  on observability.query_costs (recorded_at desc);

create index if not exists query_costs_alert_level_idx
  on observability.query_costs (alert_level);

create index if not exists query_costs_entity_idx
  on observability.query_costs (entity);
