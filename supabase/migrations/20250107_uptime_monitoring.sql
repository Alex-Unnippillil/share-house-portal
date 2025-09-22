create table if not exists public.uptime_checks (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default timezone('utc'::text, now()),
  region text not null,
  region_label text not null,
  endpoint text not null,
  http_method text not null default 'GET',
  full_url text not null,
  status_code integer,
  success boolean not null,
  latency_ms integer,
  error_message text,
  response_excerpt text,
  consecutive_failures integer not null default 0,
  config_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.uptime_checks is 'Stores uptime probe results for regional health checks.';
comment on column public.uptime_checks.checked_at is 'Timestamp when the probe executed.';
comment on column public.uptime_checks.region is 'Machine-readable region identifier (e.g., americas, emea, apac).';
comment on column public.uptime_checks.region_label is 'Human-readable region label to display in dashboards.';
comment on column public.uptime_checks.endpoint is 'Path that was checked (e.g., /health).';
comment on column public.uptime_checks.http_method is 'HTTP method used when probing the endpoint.';
comment on column public.uptime_checks.full_url is 'Absolute URL that was probed.';
comment on column public.uptime_checks.status_code is 'HTTP status code returned by the probe.';
comment on column public.uptime_checks.success is 'Flag set to true when the probe response was 2xx/3xx.';
comment on column public.uptime_checks.latency_ms is 'Total response time measured in milliseconds.';
comment on column public.uptime_checks.error_message is 'Failure reason captured for unsuccessful probes.';
comment on column public.uptime_checks.response_excerpt is 'Truncated body excerpt stored for debugging.';
comment on column public.uptime_checks.consecutive_failures is 'Number of consecutive failures observed for this region+endpoint pair.';
comment on column public.uptime_checks.config_version is 'Version of config/uptime.json used to run the probe.';
comment on column public.uptime_checks.metadata is 'JSON metadata captured for the probe execution.';

create index if not exists uptime_checks_region_endpoint_checked_at_idx
  on public.uptime_checks (region, endpoint, checked_at desc);

create index if not exists uptime_checks_checked_at_idx
  on public.uptime_checks (checked_at desc);
