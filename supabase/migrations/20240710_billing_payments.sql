create extension if not exists "uuid-ossp";

create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references auth.users(id) on delete cascade,
  amount_due integer not null,
  currency text not null default 'usd',
  description text,
  due_date date,
  status text not null default 'open',
  stripe_invoice_id text unique,
  stripe_customer_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "Tenants can view their invoices" on public.invoices
  for select using (tenant_id = auth.uid());

create policy "Tenants can insert their invoices" on public.invoices
  for insert with check (tenant_id = auth.uid());

create policy "Tenants can update their invoices" on public.invoices
  for update using (tenant_id = auth.uid())
  with check (tenant_id = auth.uid());

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_intent_id text not null unique,
  status text not null,
  amount integer not null,
  currency text not null,
  payment_method_type text not null,
  client_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Tenants can view their payments" on public.payments
  for select using (
    exists(
      select 1 from public.invoices
      where invoices.id = payments.invoice_id and invoices.tenant_id = auth.uid()
    )
  );

create policy "Tenants can insert their payments" on public.payments
  for insert with check (
    exists(
      select 1 from public.invoices
      where invoices.id = payments.invoice_id and invoices.tenant_id = auth.uid()
    )
  );

create policy "Tenants can update their payments" on public.payments
  for update using (
    exists(
      select 1 from public.invoices
      where invoices.id = payments.invoice_id and invoices.tenant_id = auth.uid()
    )
  )
  with check (
    exists(
      select 1 from public.invoices
      where invoices.id = payments.invoice_id and invoices.tenant_id = auth.uid()
    )
  );

create index if not exists invoices_tenant_id_idx on public.invoices(tenant_id);
create index if not exists payments_invoice_id_idx on public.payments(invoice_id);
