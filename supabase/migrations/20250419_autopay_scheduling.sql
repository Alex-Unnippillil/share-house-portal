create extension if not exists "pgcrypto" with schema public;

create table if not exists public.rent_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  rent_amount_cents integer not null check (rent_amount_cents > 0),
  currency text not null default 'USD',
  day_of_month smallint not null check (day_of_month between 1 and 31),
  timezone text not null default 'UTC',
  autopay_enabled boolean not null default true,
  grace_period_days integer not null default 0 check (grace_period_days >= 0),
  late_fee_type text not null default 'flat' check (late_fee_type in ('flat', 'percentage')),
  late_fee_flat_cents integer check (late_fee_flat_cents is null or late_fee_flat_cents >= 0),
  late_fee_percent numeric(5,2) check (late_fee_percent is null or (late_fee_percent >= 0 and late_fee_percent <= 100)),
  late_fee_cap_cents integer check (late_fee_cap_cents is null or late_fee_cap_cents >= 0),
  anchor_date date not null,
  next_run_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rent_payment_schedules_tenant_unique unique (tenant_id)
);

alter table public.rent_payment_schedules
  add constraint rent_payment_schedules_currency_length check (char_length(currency) between 3 and 10);

alter table public.rent_payment_schedules enable row level security;

create table if not exists public.rent_payment_occurrences (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.rent_payment_schedules(id) on delete cascade,
  due_date date not null,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'scheduled' check (status in ('scheduled','queued','processing','paid','failed','overdue','skipped')),
  autopay_run_at timestamptz,
  paid_at timestamptz,
  late_fee_cents integer not null default 0 check (late_fee_cents >= 0),
  grace_expires_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rent_payment_occurrences_unique unique (schedule_id, due_date)
);

create index if not exists rent_payment_occurrences_schedule_due_idx
  on public.rent_payment_occurrences (schedule_id, due_date);

alter table public.rent_payment_occurrences enable row level security;

create policy "Tenants manage their AutoPay schedule" on public.rent_payment_schedules
  for all
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

create policy "Tenants view their AutoPay schedule" on public.rent_payment_schedules
  for select
  using (tenant_id = auth.uid());

create policy "Tenants manage their AutoPay occurrences" on public.rent_payment_occurrences
  for all
  using (
    exists (
      select 1
      from public.rent_payment_schedules s
      where s.id = rent_payment_occurrences.schedule_id
        and s.tenant_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.rent_payment_schedules s
      where s.id = rent_payment_occurrences.schedule_id
        and s.tenant_id = auth.uid()
    )
  );

create policy "Tenants view their AutoPay occurrences" on public.rent_payment_occurrences
  for select
  using (
    exists (
      select 1
      from public.rent_payment_schedules s
      where s.id = rent_payment_occurrences.schedule_id
        and s.tenant_id = auth.uid()
    )
  );
