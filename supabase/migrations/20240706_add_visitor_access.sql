-- Visitor access control support for overnight guests

create type public.visitor_request_status as enum ('pending', 'approved', 'denied', 'revoked');

create type public.visitor_access_event as enum ('code_issued', 'revocation_scheduled', 'revoked');

create table public.visitor_requests (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null,
  host_profile_id uuid not null references public.profiles(id) on delete cascade,
  guest_name text not null,
  guest_email text,
  visit_reason text,
  visit_start timestamp with time zone not null,
  visit_end timestamp with time zone not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  status public.visitor_request_status not null default 'pending',
  approval_notes text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamp with time zone,
  access_code text unique,
  access_code_issued_at timestamp with time zone,
  access_code_expires_at timestamp with time zone,
  revoked_at timestamp with time zone,
  revocation_reason text,
  constraint visitor_requests_visit_window check (visit_end > visit_start)
);

create index visitor_requests_building_idx on public.visitor_requests (building_id, visit_start desc);
create index visitor_requests_status_idx on public.visitor_requests (status, access_code_expires_at);

alter table public.visitor_requests enable row level security;

create policy "Hosts can view their visitor requests" on public.visitor_requests
  for select using (auth.uid() = host_profile_id);

create policy "Hosts can create visitor requests" on public.visitor_requests
  for insert with check (auth.uid() = host_profile_id);

create policy "Hosts can edit pending visitor requests" on public.visitor_requests
  for update using (auth.uid() = host_profile_id and status = 'pending')
  with check (auth.uid() = host_profile_id);

create table public.visitor_access_audit (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  building_id uuid not null,
  visitor_request_id uuid not null references public.visitor_requests(id) on delete cascade,
  event public.visitor_access_event not null,
  status text not null default 'recorded',
  metadata jsonb,
  actor_profile_id uuid references public.profiles(id) on delete set null
);

create index visitor_access_audit_request_idx on public.visitor_access_audit (visitor_request_id, created_at desc);
create index visitor_access_audit_building_idx on public.visitor_access_audit (building_id, created_at desc);

alter table public.visitor_access_audit enable row level security;

create policy "Hosts can view visitor access audits" on public.visitor_access_audit
  for select using (
    exists (
      select 1
      from public.visitor_requests vr
      where vr.id = visitor_access_audit.visitor_request_id
        and vr.host_profile_id = auth.uid()
    )
  );
