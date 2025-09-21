create extension if not exists "uuid-ossp";

create table if not exists public.stripe_customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  default_payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create table if not exists public.rent_invoices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  amount_due numeric(12, 2) not null,
  currency text not null default 'usd',
  due_date date not null,
  status text not null default 'open',
  description text,
  stripe_invoice_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  invoice_id uuid references public.rent_invoices(id) on delete set null,
  stripe_payment_intent_id text,
  stripe_charge_id text unique,
  amount_paid numeric(12, 2) not null,
  currency text not null default 'usd',
  status text not null,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  status text not null,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create index if not exists rent_invoices_tenant_id_idx on public.rent_invoices (tenant_id);
create index if not exists payments_tenant_id_idx on public.payments (tenant_id);
create index if not exists payments_invoice_id_idx on public.payments (invoice_id);
create index if not exists stripe_subscriptions_tenant_id_idx on public.stripe_subscriptions (tenant_id);

alter table public.stripe_customers enable row level security;
alter table public.rent_invoices enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_subscriptions enable row level security;

create policy if not exists "tenants view their stripe customer" on public.stripe_customers
  for select to authenticated
  using (tenant_id = auth.uid());

create policy if not exists "tenants manage their stripe customer" on public.stripe_customers
  for insert to authenticated
  with check (tenant_id = auth.uid());

create policy if not exists "tenants update their stripe customer" on public.stripe_customers
  for update to authenticated
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

create policy if not exists "service role manages stripe customers" on public.stripe_customers
  for all to service_role
  using (true)
  with check (true);

create policy if not exists "tenants view their invoices" on public.rent_invoices
  for select to authenticated
  using (tenant_id = auth.uid());

create policy if not exists "service role manages invoices" on public.rent_invoices
  for all to service_role
  using (true)
  with check (true);

create policy if not exists "tenants view their payments" on public.payments
  for select to authenticated
  using (tenant_id = auth.uid());

create policy if not exists "service role manages payments" on public.payments
  for all to service_role
  using (true)
  with check (true);

create policy if not exists "tenants view their subscriptions" on public.stripe_subscriptions
  for select to authenticated
  using (tenant_id = auth.uid());

create policy if not exists "tenants manage their subscriptions" on public.stripe_subscriptions
  for insert to authenticated
  with check (tenant_id = auth.uid());

create policy if not exists "tenants update their subscriptions" on public.stripe_subscriptions
  for update to authenticated
  using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

create policy if not exists "service role manages subscriptions" on public.stripe_subscriptions
  for all to service_role
  using (true)
  with check (true);
