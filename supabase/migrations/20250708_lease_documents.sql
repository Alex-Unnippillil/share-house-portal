-- Leases and document management tables
create type if not exists public.lease_document_status as enum (
  'draft',
  'awaiting_signature',
  'completed',
  'declined',
  'cancelled'
);

create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  title text not null,
  description text,
  effective_date date,
  termination_date date,
  documenso_template_id text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.lease_documents (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  name text not null,
  status public.lease_document_status not null default 'draft',
  documenso_document_id text not null,
  documenso_envelope_id text,
  documenso_download_url text,
  signing_embed_url text,
  storage_path text,
  requested_at timestamptz,
  completed_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  constraint lease_documents_documenso_document_id_key unique (documenso_document_id),
  constraint lease_documents_lease_id_name_key unique (lease_id, name),
  constraint lease_documents_name_check check (char_length(name) > 0)
);

create index if not exists lease_documents_lease_id_idx on public.lease_documents (lease_id);

create table if not exists public.resident_leases (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'tenant',
  is_primary boolean not null default false,
  documenso_recipient_id text,
  signed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint resident_leases_unique_member unique (lease_id, resident_id)
);

create index if not exists resident_leases_resident_idx on public.resident_leases (resident_id);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger handle_public_leases_updated_at
before update on public.leases
for each row execute procedure public.handle_updated_at();

create trigger handle_public_lease_documents_updated_at
before update on public.lease_documents
for each row execute procedure public.handle_updated_at();

create trigger handle_public_resident_leases_updated_at
before update on public.resident_leases
for each row execute procedure public.handle_updated_at();

alter table public.leases enable row level security;
alter table public.lease_documents enable row level security;
alter table public.resident_leases enable row level security;

create policy if not exists "Residents can view their leases" on public.leases
for select using (
  exists (
    select 1 from public.resident_leases rl
    where rl.lease_id = leases.id
      and rl.resident_id = auth.uid()
  )
);

create policy if not exists "Service role can manage leases" on public.leases
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy if not exists "Residents can view their lease documents" on public.lease_documents
for select using (
  exists (
    select 1 from public.resident_leases rl
    where rl.lease_id = lease_documents.lease_id
      and rl.resident_id = auth.uid()
  )
);

create policy if not exists "Service role can manage lease documents" on public.lease_documents
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy if not exists "Residents can view their lease assignments" on public.resident_leases
for select using (resident_id = auth.uid());

create policy if not exists "Service role can manage lease assignments" on public.resident_leases
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public)
values ('lease-documents', 'lease-documents', false)
on conflict (id) do nothing;

create policy if not exists "Residents can read lease document files" on storage.objects
for select using (
  bucket_id = 'lease-documents'
  and exists (
    select 1 from public.lease_documents ld
    join public.resident_leases rl on rl.lease_id = ld.lease_id
    where ld.storage_path is not null
      and ld.storage_path = objects.name
      and rl.resident_id = auth.uid()
  )
);

create policy if not exists "Service role can manage lease document files" on storage.objects
for all using (
  bucket_id = 'lease-documents' and auth.role() = 'service_role'
) with check (
  bucket_id = 'lease-documents' and auth.role() = 'service_role'
);
