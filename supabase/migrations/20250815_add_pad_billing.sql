create extension if not exists "pgcrypto";

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  pad_mandate_id text,
  pad_mandate_reference text,
  pad_payment_method_id text,
  pad_status text not null default 'not_enrolled' check (pad_status in ('not_enrolled','pending','active','action_required')),
  auto_pay_enabled boolean not null default false,
  pad_enrolled_at timestamp with time zone,
  pad_last_error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint members_user_id_key unique (user_id)
);

alter table public.members enable row level security;

create policy "Users can view their member profile"
on public.members for select
using (auth.uid() = user_id);

create policy "Users can insert their member profile"
on public.members for insert
with check (auth.uid() = user_id);

create policy "Users can update their member profile"
on public.members for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.rent_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  due_date date not null,
  amount integer not null,
  currency text not null default 'cad',
  status text not null default 'pending' check (status in ('pending','processing','paid','failed')),
  payment_intent_id text,
  mandate_id text,
  failure_reason text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  metadata jsonb
);

create index if not exists rent_ledger_entries_due_date_idx
  on public.rent_ledger_entries (due_date, status);

alter table public.rent_ledger_entries enable row level security;

create policy "Members can view their ledger entries"
on public.rent_ledger_entries for select
using (
  exists (
    select 1
    from public.members m
    where m.id = rent_ledger_entries.member_id
      and m.user_id = auth.uid()
  )
);
