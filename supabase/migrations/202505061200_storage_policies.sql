-- Storage policies and metadata enforcement for household scoped buckets.

-- Ensure household scoping is available on profiles so membership checks can
-- be performed during RLS evaluation.
alter table public.profiles
  add column if not exists household_id uuid;

create index if not exists profiles_household_id_idx
  on public.profiles (household_id);

-- Enable row level security on storage objects in case it was disabled.
alter table storage.objects enable row level security;

-- Drop legacy policies to avoid duplicates when re-running migrations.
drop policy if exists "Allow authenticated users to select objects" on storage.objects;
drop policy if exists "Allow authenticated users to insert objects" on storage.objects;
drop policy if exists "Allow authenticated users to update objects" on storage.objects;
drop policy if exists "Allow authenticated users to delete objects" on storage.objects;
drop policy if exists "Household members can read managed objects" on storage.objects;
drop policy if exists "Household members can insert managed objects" on storage.objects;
drop policy if exists "Household members can update managed objects" on storage.objects;
drop policy if exists "Admins can delete managed objects" on storage.objects;

-- Shared predicate for the managed buckets.
create or replace view storage.managed_buckets as
select unnest(array['floorplans', 'receipts', 'docs']) as bucket_id;

-- Household members can read from managed buckets when the metadata matches
-- their household membership.
create policy "Household members can read managed objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in (select bucket_id from storage.managed_buckets)
    and metadata ? 'household_id'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id is not null
        and p.household_id::text = metadata ->> 'household_id'
    )
  );

-- Only members of the household can create objects and must set metadata to
-- their own identifiers.
create policy "Household members can insert managed objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in (select bucket_id from storage.managed_buckets)
    and metadata ? 'household_id'
    and metadata ? 'member_id'
    and metadata ->> 'member_id' = auth.uid()::text
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id is not null
        and p.household_id::text = metadata ->> 'household_id'
    )
  );

-- Allow the uploader to update their own objects while keeping household
-- membership enforced.
create policy "Household members can update managed objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in (select bucket_id from storage.managed_buckets)
    and owner = auth.uid()
    and metadata ? 'member_id'
    and metadata ->> 'member_id' = auth.uid()::text
    and metadata ? 'household_id'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id is not null
        and p.household_id::text = metadata ->> 'household_id'
    )
  )
  with check (
    metadata ? 'member_id'
    and metadata ->> 'member_id' = auth.uid()::text
    and metadata ? 'household_id'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.household_id is not null
        and p.household_id::text = metadata ->> 'household_id'
    )
  );

-- Admins can delete any object inside managed buckets regardless of uploader.
create policy "Admins can delete managed objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in (select bucket_id from storage.managed_buckets)
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
