-- Create tables to support rent billing workflows
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  status text not null default 'active',
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text,
  metadata jsonb
);

alter table public.properties enable row level security;

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  status text not null default 'available',
  bedrooms integer,
  bathrooms integer,
  square_feet integer,
  rent_amount numeric(12, 2) not null default 0,
  metadata jsonb
);

alter table public.units enable row level security;

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date,
  rent_amount numeric(12, 2) not null,
  deposit_amount numeric(12, 2),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leases enable row level security;

create table if not exists public.rent_invoices (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  due_date date not null,
  period_start date,
  period_end date,
  amount_due numeric(12, 2) not null,
  status text not null default 'open',
  description text,
  currency text not null default 'usd',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rent_invoices enable row level security;

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  invoice_id uuid references public.rent_invoices(id) on delete set null,
  payment_provider text not null default 'stripe',
  provider_session_id text,
  provider_payment_id text,
  amount numeric(12, 2) not null,
  status text not null default 'pending',
  currency text not null default 'usd',
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb
);

alter table public.rent_payments enable row level security;

-- Helpful indexes for billing workflows
create index if not exists rent_invoices_due_date_idx on public.rent_invoices (due_date);
create index if not exists rent_invoices_status_due_date_idx on public.rent_invoices (status, due_date);
create index if not exists rent_invoices_lease_idx on public.rent_invoices (lease_id);
create index if not exists rent_payments_invoice_idx on public.rent_payments (invoice_id);
create index if not exists rent_payments_processed_at_idx on public.rent_payments (processed_at desc nulls last);
create index if not exists leases_status_idx on public.leases (tenant_id, status);
create unique index if not exists leases_active_unit_idx on public.leases (unit_id) where status = 'active';

-- Tenant focused row level security policies
create policy "Authenticated users can read properties" on public.properties
  for select to authenticated using (true);

create policy "Authenticated users can read units" on public.units
  for select to authenticated using (true);

create policy "Tenants can view their leases" on public.leases
  for select to authenticated using (tenant_id = auth.uid());

create policy "Tenants can view their invoices" on public.rent_invoices
  for select to authenticated using (
    lease_id in (
      select l.id from public.leases l where l.tenant_id = auth.uid()
    )
  );

create policy "Tenants can view their payments" on public.rent_payments
  for select to authenticated using (
    lease_id in (
      select l.id from public.leases l where l.tenant_id = auth.uid()
    )
  );

create policy "Tenants can insert their payments" on public.rent_payments
  for insert to authenticated with check (
    lease_id in (
      select l.id from public.leases l where l.tenant_id = auth.uid()
    )
  );

create policy "Tenants can update their payments" on public.rent_payments
  for update to authenticated using (
    lease_id in (
      select l.id from public.leases l where l.tenant_id = auth.uid()
    )
  ) with check (
    lease_id in (
      select l.id from public.leases l where l.tenant_id = auth.uid()
    )
  );
