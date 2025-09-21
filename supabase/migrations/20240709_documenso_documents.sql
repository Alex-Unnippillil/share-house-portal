-- Documenso document management schema
create type if not exists public.document_status as enum (
  'draft',
  'sent',
  'viewed',
  'completed',
  'declined',
  'expired',
  'cancelled'
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  documenso_template_id text not null,
  active_envelope_id text,
  status public.document_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lease_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  documenso_envelope_id text not null,
  status public.document_status not null default 'draft',
  signers jsonb not null default '[]'::jsonb,
  sent_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lease_versions_document_version_unique unique (document_id, version)
);

create table if not exists public.document_download_audit (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  lease_version_id uuid references public.lease_versions(id) on delete set null,
  downloaded_by uuid references public.profiles(id) on delete set null,
  documenso_envelope_id text,
  source text,
  remote_addr inet,
  user_agent text,
  downloaded_at timestamptz not null default timezone('utc', now()),
  notes text
);

create index if not exists documents_tenant_id_idx on public.documents(tenant_id);
create index if not exists lease_versions_document_id_idx on public.lease_versions(document_id);
create index if not exists lease_versions_envelope_id_idx on public.lease_versions(documenso_envelope_id);
create index if not exists document_download_audit_document_id_idx on public.document_download_audit(document_id);
create index if not exists document_download_audit_downloaded_by_idx on public.document_download_audit(downloaded_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists lease_versions_updated_at on public.lease_versions;
create trigger lease_versions_updated_at
before update on public.lease_versions
for each row execute function public.set_updated_at();

alter table public.documents enable row level security;
alter table public.lease_versions enable row level security;
alter table public.document_download_audit enable row level security;

create policy if not exists "documents_viewer_access"
  on public.documents
  for select
  using (
    tenant_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "documents_manager_insert"
  on public.documents
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "documents_manager_update"
  on public.documents
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "documents_manager_delete"
  on public.documents
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "lease_versions_viewer_access"
  on public.lease_versions
  for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = lease_versions.document_id
        and (
          d.tenant_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role in ('property_manager', 'admin')
          )
        )
    )
  );

create policy if not exists "lease_versions_manager_write"
  on public.lease_versions
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );

create policy if not exists "document_download_audit_read"
  on public.document_download_audit
  for select
  using (
    downloaded_by = auth.uid()
    or exists (
      select 1 from public.documents d
      where d.id = document_download_audit.document_id
        and (
          d.tenant_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid()
              and p.role in ('property_manager', 'admin')
          )
        )
    )
  );

create policy if not exists "document_download_audit_insert"
  on public.document_download_audit
  for insert
  with check (
    downloaded_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
  );
