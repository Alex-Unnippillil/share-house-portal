create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  tenant_profile_id uuid not null references public.profiles(id) on delete cascade,
  property_name text not null,
  unit_label text not null,
  start_date date not null,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leases enable row level security;

create index if not exists leases_tenant_profile_id_idx on public.leases (tenant_profile_id);

create trigger set_leases_updated_at
before update on public.leases
for each row
execute function public.set_updated_at();

create policy if not exists "Tenants and staff can view leases"
on public.leases
for select
using (
  tenant_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can insert leases"
on public.leases
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can update leases"
on public.leases
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can delete leases"
on public.leases
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create table if not exists public.lease_documents (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  storage_path text not null,
  title text not null,
  effective_date date not null,
  expiration_date date,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lease_documents enable row level security;

create index if not exists lease_documents_lease_id_idx on public.lease_documents (lease_id);
create unique index if not exists lease_documents_lease_id_version_key on public.lease_documents (lease_id, version);

create trigger set_lease_documents_updated_at
before update on public.lease_documents
for each row
execute function public.set_updated_at();

create policy if not exists "Lease parties can view documents"
on public.lease_documents
for select
using (
  exists (
    select 1
    from public.leases l
    where l.id = lease_documents.lease_id
      and l.tenant_profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can insert lease documents"
on public.lease_documents
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can update lease documents"
on public.lease_documents
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can delete lease documents"
on public.lease_documents
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

insert into storage.buckets (id, name, public)
values ('lease-documents', 'lease-documents', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy if not exists "Lease parties can read lease document storage"
on storage.objects
for select
using (
  bucket_id = 'lease-documents'
  and (
    exists (
      select 1
      from public.lease_documents ld
      where ld.storage_path = storage.objects.name
        and (
          exists (
            select 1
            from public.leases l
            where l.id = ld.lease_id
              and l.tenant_profile_id = auth.uid()
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role in ('staff', 'admin')
          )
        )
    )
  )
);

create policy if not exists "Staff can insert lease document storage"
on storage.objects
for insert
with check (
  bucket_id = 'lease-documents'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can update lease document storage"
on storage.objects
for update
using (
  bucket_id = 'lease-documents'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
)
with check (
  bucket_id = 'lease-documents'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);

create policy if not exists "Staff can delete lease document storage"
on storage.objects
for delete
using (
  bucket_id = 'lease-documents'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('staff', 'admin')
  )
);
