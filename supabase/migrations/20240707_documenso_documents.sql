create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  documenso_template_id text not null,
  doc_type text,
  is_active boolean not null default true,
  unique(documenso_template_id)
);

create table if not exists public.lease_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  tenant_profile_id uuid references public.profiles(id) on delete set null,
  version_number integer not null default 1,
  status text not null default 'draft',
  documenso_envelope_id text not null unique,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz
);

create table if not exists public.document_signers (
  id uuid primary key default gen_random_uuid(),
  lease_version_id uuid not null references public.lease_versions(id) on delete cascade,
  documenso_signer_id text,
  name text not null,
  email text not null,
  role text,
  status text not null default 'pending',
  signing_order integer,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint document_signers_lease_email_unique unique (lease_version_id, email)
);

create table if not exists public.document_download_logs (
  id uuid primary key default gen_random_uuid(),
  lease_version_id uuid references public.lease_versions(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  documenso_envelope_id text,
  downloaded_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

alter table public.documents enable row level security;
alter table public.lease_versions enable row level security;
alter table public.document_signers enable row level security;
alter table public.document_download_logs enable row level security;

create index if not exists documents_template_id_idx on public.documents (documenso_template_id);
create index if not exists lease_versions_document_id_idx on public.lease_versions (document_id);
create index if not exists lease_versions_tenant_profile_id_idx on public.lease_versions (tenant_profile_id);
create index if not exists document_signers_lease_version_id_idx on public.document_signers (lease_version_id);
create index if not exists document_download_logs_lease_version_id_idx on public.document_download_logs (lease_version_id);
create index if not exists document_download_logs_profile_id_idx on public.document_download_logs (profile_id);
