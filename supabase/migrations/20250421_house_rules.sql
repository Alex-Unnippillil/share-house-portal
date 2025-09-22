create table public.house_rules (
  version integer primary key,
  content text not null,
  created_by uuid not null default auth.uid(),
  published_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.house_rules enable row level security;

create policy "All authenticated users can read house rules" on public.house_rules
  for select
  to authenticated
  using (true);

create policy "Admins can publish house rules" on public.house_rules
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'property_manager')
    )
  );

create policy "Admins can update house rules" on public.house_rules
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'property_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'property_manager')
    )
  );

create policy "Admins can delete house rules" on public.house_rules
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'property_manager')
    )
  );

create index house_rules_published_at_idx on public.house_rules (published_at desc);
