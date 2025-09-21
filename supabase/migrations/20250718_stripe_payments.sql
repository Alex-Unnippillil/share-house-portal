create extension if not exists "pgcrypto";

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('property_manager', 'admin')
  );
$$;

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  billing_email text,
  default_payment_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists stripe_customers_profile_id_key
  on public.stripe_customers(profile_id);

create table if not exists public.tenant_billing_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  autopay_enabled boolean not null default false,
  autopay_day smallint,
  autopay_payment_method text,
  subscription_id text,
  rent_amount numeric(12,2),
  currency text not null default 'USD',
  share_percentage numeric(5,2),
  billing_portal_url text,
  last_autopay_at timestamptz,
  next_autopay_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint autopay_day_valid check (autopay_day is null or autopay_day between 1 and 28)
);

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_intent_id text unique,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null,
  billing_period_start date,
  billing_period_end date,
  receipt_url text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists rent_payments_profile_id_idx on public.rent_payments(profile_id);
create index if not exists rent_payments_status_idx on public.rent_payments(status);

alter table public.stripe_customers enable row level security;
alter table public.tenant_billing_settings enable row level security;
alter table public.rent_payments enable row level security;

create policy "tenant access stripe customer"
  on public.stripe_customers
  for select
  using (profile_id = auth.uid() or public.is_staff());

create policy "tenant manage stripe customer"
  on public.stripe_customers
  for all
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid() or public.is_staff());

create policy "tenant access billing settings"
  on public.tenant_billing_settings
  for select
  using (profile_id = auth.uid() or public.is_staff());

create policy "tenant manage billing settings"
  on public.tenant_billing_settings
  for all
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid() or public.is_staff());

create policy "tenant access rent payments"
  on public.rent_payments
  for select
  using (profile_id = auth.uid() or public.is_staff());

create policy "tenant insert rent payments"
  on public.rent_payments
  for insert
  with check (profile_id = auth.uid() or public.is_staff());

create policy "tenant update rent payments"
  on public.rent_payments
  for update
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid() or public.is_staff());

create policy "staff delete rent payments"
  on public.rent_payments
  for delete
  using (public.is_staff());

