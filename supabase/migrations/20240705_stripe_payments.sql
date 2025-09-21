create extension if not exists "pgcrypto";

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  stripe_customer_id text not null,
  billing_email text,
  default_payment_method_id text,
  livemode boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_customers_tenant_id_fkey foreign key (tenant_id) references public.profiles (id) on delete cascade,
  constraint stripe_customers_tenant_id_key unique (tenant_id),
  constraint stripe_customers_customer_id_key unique (stripe_customer_id)
);

create index if not exists stripe_customers_tenant_idx on public.stripe_customers (tenant_id);

alter table public.stripe_customers enable row level security;

create policy if not exists "Tenants and managers can view stripe customers" on public.stripe_customers
  for select using (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Tenants manage their stripe customer" on public.stripe_customers
  for all using (auth.uid() = tenant_id)
  with check (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create table if not exists public.tenant_billing_metadata (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  monthly_rent_cents integer,
  currency text not null default 'usd',
  autopay_enabled boolean not null default false,
  autopay_day_of_month smallint,
  autopay_payment_method_id text,
  autopay_status text,
  stripe_subscription_id text,
  default_payment_method_id text,
  next_billing_date date,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_billing_metadata_tenant_id_fkey foreign key (tenant_id) references public.profiles (id) on delete cascade,
  constraint tenant_billing_metadata_tenant_id_key unique (tenant_id),
  constraint tenant_billing_metadata_autopay_day_check check (
    autopay_day_of_month is null
    or (autopay_day_of_month >= 1 and autopay_day_of_month <= 28)
  )
);

create index if not exists tenant_billing_metadata_tenant_idx on public.tenant_billing_metadata (tenant_id);

alter table public.tenant_billing_metadata enable row level security;

create policy if not exists "Tenant billing metadata access" on public.tenant_billing_metadata
  for select using (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Tenant billing metadata changes" on public.tenant_billing_metadata
  for all using (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  )
  with check (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  stripe_charge_id text,
  description text,
  amount_due_cents integer not null,
  amount_paid_cents integer,
  currency text not null default 'usd',
  status text not null default 'pending',
  due_date date,
  billing_period_start date,
  billing_period_end date,
  paid_at timestamptz,
  receipt_url text,
  failure_code text,
  failure_message text,
  line_items jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rent_payments_tenant_id_fkey foreign key (tenant_id) references public.profiles (id) on delete cascade,
  constraint rent_payments_checkout_session_key unique (stripe_checkout_session_id),
  constraint rent_payments_payment_intent_key unique (stripe_payment_intent_id)
);

create index if not exists rent_payments_tenant_idx on public.rent_payments (tenant_id);
create index if not exists rent_payments_status_idx on public.rent_payments (status);
create index if not exists rent_payments_due_date_idx on public.rent_payments (due_date);
create index if not exists rent_payments_invoice_idx on public.rent_payments (stripe_invoice_id);
create index if not exists rent_payments_subscription_idx on public.rent_payments (stripe_subscription_id);

alter table public.rent_payments enable row level security;

create policy if not exists "Tenant rent payment access" on public.rent_payments
  for select using (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "Tenant rent payment changes" on public.rent_payments
  for all using (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  )
  with check (
    auth.uid() = tenant_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

comment on table public.rent_payments is 'Tracks tenant rent payment intents and Stripe identifiers.';
comment on table public.stripe_customers is 'Stores Stripe customer IDs mapped to tenant profiles.';
comment on table public.tenant_billing_metadata is 'Per-tenant billing configuration including autopay preferences.';
