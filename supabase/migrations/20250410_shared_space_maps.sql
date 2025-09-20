-- Create storage bucket for shared space diagrams if it does not already exist
insert into storage.buckets (id, name, public)
values ('shared-space-diagrams', 'shared-space-diagrams', false)
on conflict (id) do nothing;

-- Helper function to maintain updated_at timestamps
create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Table linking leases/units to diagram assets and metadata
create table public.shared_space_maps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  lease_id uuid not null,
  unit_id uuid,
  tenant_profile_id uuid not null references public.profiles(id) on delete cascade,
  bucket_id text not null default 'shared-space-diagrams',
  diagram_path text not null,
  title text,
  description text,
  metadata jsonb not null default '{"roomLabels": [], "notes": null}'::jsonb,
  last_uploaded_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles(id),
  constraint shared_space_maps_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index shared_space_maps_tenant_idx on public.shared_space_maps (tenant_profile_id);
create index shared_space_maps_lease_idx on public.shared_space_maps (lease_id);
create index shared_space_maps_unit_idx on public.shared_space_maps (unit_id);

create trigger set_public_shared_space_maps_updated_at
before update on public.shared_space_maps
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.shared_space_maps enable row level security;

create policy "Tenants can view their shared space maps"
on public.shared_space_maps
for select
using (
  tenant_profile_id = auth.uid()
  or auth.role() = 'service_role'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "Property staff can manage shared space maps"
on public.shared_space_maps
for all
to authenticated
using (
  auth.role() = 'service_role'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.role() = 'service_role'
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
