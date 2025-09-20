-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Status enums
create type public.lease_status as enum ('pending', 'active', 'ended', 'terminated');
create type public.rent_invoice_status as enum ('draft', 'open', 'paid', 'overdue', 'void');
create type public.rent_payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

-- Core property data model
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  street text,
  city text,
  state text,
  postal_code text,
  country text,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_number text not null,
  bedrooms integer,
  bathrooms numeric(3,1),
  square_feet integer,
  status text not null default 'vacant',
  metadata jsonb not null default '{}'::jsonb
);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unit_id uuid not null references public.units(id) on delete restrict,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date,
  rent_amount numeric(10,2) not null,
  deposit_amount numeric(10,2) not null default 0,
  status public.lease_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb
);

create table public.rent_invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  period_start date,
  period_end date,
  due_date date not null,
  amount numeric(10,2) not null,
  paid_amount numeric(10,2) not null default 0,
  status public.rent_invoice_status not null default 'open',
  description text,
  metadata jsonb not null default '{}'::jsonb
);

create index rent_invoices_due_date_idx on public.rent_invoices (due_date);
create index rent_invoices_lease_due_date_idx on public.rent_invoices (lease_id, due_date);

create table public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  invoice_id uuid references public.rent_invoices(id) on delete set null,
  provider text not null,
  provider_session_id text,
  provider_payment_id text,
  amount numeric(10,2) not null,
  status public.rent_payment_status not null default 'pending',
  processed_at timestamptz,
  receipt_url text,
  metadata jsonb not null default '{}'::jsonb
);

create index rent_payments_lease_created_idx on public.rent_payments (lease_id, created_at);

-- Row level security policies to keep tenant data isolated
alter table public.leases enable row level security;
alter table public.rent_invoices enable row level security;
alter table public.rent_payments enable row level security;

create policy "Tenants can view their leases" on public.leases
  for select
  to authenticated
  using (tenant_id = auth.uid());

create policy "Tenants can view their rent invoices" on public.rent_invoices
  for select
  to authenticated
  using (exists (
    select 1 from public.leases l
    where l.id = rent_invoices.lease_id
      and l.tenant_id = auth.uid()
  ));

create policy "Tenants can view their rent payments" on public.rent_payments
  for select
  to authenticated
  using (exists (
    select 1 from public.leases l
    where l.id = rent_payments.lease_id
      and l.tenant_id = auth.uid()
  ));

create policy "Tenants can insert their rent payments" on public.rent_payments
  for insert
  to authenticated
  with check (exists (
    select 1 from public.leases l
    where l.id = rent_payments.lease_id
      and l.tenant_id = auth.uid()
  ));

create policy "Tenants can update their rent payments" on public.rent_payments
  for update
  to authenticated
  using (exists (
    select 1 from public.leases l
    where l.id = rent_payments.lease_id
      and l.tenant_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.leases l
    where l.id = rent_payments.lease_id
      and l.tenant_id = auth.uid()
  ));

-- Maintain updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp
before update on public.properties
for each row
execute function public.handle_updated_at();

create trigger set_timestamp
before update on public.units
for each row
execute function public.handle_updated_at();

create trigger set_timestamp
before update on public.leases
for each row
execute function public.handle_updated_at();
