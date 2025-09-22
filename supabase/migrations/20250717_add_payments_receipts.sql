create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payer_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  due_date date,
  description text,
  receipt_path text
);

alter table public.payments enable row level security;

create index if not exists payments_payer_id_idx on public.payments (payer_id);

create policy "Payers can view their payments" on public.payments
  for select
  using (
    payer_id = auth.uid()
  );

create policy "Payers can update their payments" on public.payments
  for update
  using (
    payer_id = auth.uid()
  )
  with check (
    payer_id = auth.uid()
  );

create policy "Admins can manage payments" on public.payments
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) = 'admin'
    )
  );

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "Restrict receipt uploads to payer or admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and metadata ? 'payment_id'
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and lower(coalesce(p.role, '')) = 'admin'
      )
      or exists (
        select 1 from public.payments pay
        where pay.id::text = metadata ->> 'payment_id'
          and pay.payer_id = auth.uid()
      )
    )
  );

create policy "Restrict receipt access to payer or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and metadata ? 'payment_id'
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and lower(coalesce(p.role, '')) = 'admin'
      )
      or exists (
        select 1 from public.payments pay
        where pay.id::text = metadata ->> 'payment_id'
          and pay.payer_id = auth.uid()
      )
    )
  );

create policy "Restrict receipt deletion to payer or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and metadata ? 'payment_id'
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and lower(coalesce(p.role, '')) = 'admin'
      )
      or exists (
        select 1 from public.payments pay
        where pay.id::text = metadata ->> 'payment_id'
          and pay.payer_id = auth.uid()
      )
    )
  );
