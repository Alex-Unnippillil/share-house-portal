-- Migration: Establish multi-tenant building schema and retire legacy tables
-- This migration aligns with ADR-0001 and the authorization model documentation.

create extension if not exists "pgcrypto";

-- Drop unused legacy tables that conflicted with the new tenancy-aware schema.
drop table if exists public.chat cascade;
drop table if exists public.countries cascade;
drop table if exists public.inqueries cascade;
drop table if exists public.meetings cascade;
drop table if exists public.members_table cascade;
drop table if exists public.permission_table cascade;
drop table if exists public.todos cascade;
drop table if exists public.ai_agent_documents cascade;
drop table if exists public.ai_agent_runs cascade;
drop table if exists public.ai_agents cascade;
drop table if exists public.ai_sessions cascade;
drop table if exists public.ai_tools cascade;

drop type if exists public.ai_agent_run_status cascade;
drop type if exists public.ai_session_status cascade;

-- ---------------------------------------------------------------------------
-- Enum definitions
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'platform_admin',
  'property_manager',
  'building_staff',
  'resident',
  'support_agent'
);

create type public.lease_status as enum (
  'draft',
  'pending',
  'active',
  'terminated'
);

create type public.lease_resident_role as enum (
  'primary',
  'roommate',
  'guarantor'
);

create type public.rent_payment_status as enum (
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded'
);

create type public.amenity_type as enum (
  'kitchen',
  'tv_room',
  'game_room',
  'parking',
  'workspace',
  'other'
);

create type public.amenity_booking_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed'
);

create type public.visitor_log_status as enum (
  'requested',
  'approved',
  'denied',
  'checked_in',
  'checked_out'
);

create type public.maintenance_status as enum (
  'open',
  'in_progress',
  'on_hold',
  'resolved',
  'closed'
);

create type public.maintenance_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type public.document_category as enum (
  'lease',
  'notice',
  'invoice',
  'policy',
  'other'
);

create type public.document_visibility as enum (
  'building',
  'unit',
  'lease',
  'private'
);

create type public.floorplan_annotation_visibility as enum (
  'private',
  'unit',
  'building'
);

-- ---------------------------------------------------------------------------
-- Core tenancy tables
-- ---------------------------------------------------------------------------
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  timezone text not null,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.buildings is 'Portfolio of managed properties. Every business entity references a building_id.';

create table public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_number text not null,
  floor text,
  bedrooms integer,
  bathrooms integer,
  square_feet integer,
  rent_cents integer,
  is_occupied boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, unit_number)
);
comment on table public.units is 'Individual dwelling units scoped to a building.';
alter table public.units add constraint units_building_scope unique (id, building_id);
create index units_building_idx on public.units(building_id);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete restrict,
  status public.lease_status not null default 'pending',
  start_date date not null,
  end_date date,
  rent_cents integer not null,
  security_deposit_cents integer,
  autopay_enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leases_unit_building_fk
    foreign key (unit_id, building_id)
    references public.units(id, building_id)
    on delete restrict
);
comment on table public.leases is 'Lease agreements for a specific unit and building.';
create index leases_building_idx on public.leases(building_id);
create index leases_unit_idx on public.leases(unit_id);

create table public.lease_residents (
  id bigserial primary key,
  building_id uuid not null references public.buildings(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.lease_resident_role not null default 'roommate',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (lease_id, profile_id)
);
comment on table public.lease_residents is 'Joins residents to leases with an explicit role.';
create index lease_residents_building_idx on public.lease_residents(building_id);
create index lease_residents_profile_idx on public.lease_residents(profile_id);

create table public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  lease_id uuid not null references public.leases(id) on delete cascade,
  amount_cents integer not null,
  due_date date not null,
  status public.rent_payment_status not null default 'pending',
  stripe_payment_intent_id text,
  memo text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.rent_payments is 'Stripe-synchronized rent payment records per lease.';
create index rent_payments_building_idx on public.rent_payments(building_id);
create index rent_payments_lease_idx on public.rent_payments(lease_id);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  slug text not null,
  name text not null,
  amenity_type public.amenity_type not null,
  description text,
  requires_approval boolean not null default false,
  is_reservable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, slug)
);
comment on table public.amenities is 'Amenity definitions per building (kitchen, TV room, parking, etc.).';
create index amenities_building_idx on public.amenities(building_id);

create table public.amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  lease_id uuid references public.leases(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.amenity_booking_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint amenity_bookings_no_overlap check (ends_at > starts_at)
);
comment on table public.amenity_bookings is 'Resident amenity reservation requests scoped by building.';
create index amenity_bookings_building_idx on public.amenity_bookings(building_id);
create index amenity_bookings_amenity_idx on public.amenity_bookings(amenity_id);
create index amenity_bookings_timespan_idx on public.amenity_bookings(building_id, starts_at);

create table public.visitor_logs (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  lease_id uuid references public.leases(id) on delete set null,
  host_profile_id uuid references public.profiles(id) on delete set null,
  visitor_name text not null,
  arrival timestamptz not null,
  departure timestamptz,
  status public.visitor_log_status not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.visitor_logs is 'Overnight and day guest registrations per building.';
create index visitor_logs_building_idx on public.visitor_logs(building_id);

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  lease_id uuid references public.leases(id) on delete set null,
  reported_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  summary text not null,
  description text,
  status public.maintenance_status not null default 'open',
  priority public.maintenance_priority not null default 'medium',
  category text,
  requested_entry_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.maintenance_requests is 'Maintenance tickets scoped to a building and optionally a lease.';
create index maintenance_requests_building_idx on public.maintenance_requests(building_id);
create index maintenance_requests_status_idx on public.maintenance_requests(status);

create table public.floorplans (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  storage_path text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, unit_id, version)
);
comment on table public.floorplans is 'SVG or image floorplans stored in Supabase Storage.';
create index floorplans_building_idx on public.floorplans(building_id);

create table public.floorplan_annotations (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  floorplan_id uuid not null references public.floorplans(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  label text not null,
  details text,
  geometry jsonb not null,
  visibility public.floorplan_annotation_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.floorplan_annotations is 'Annotations layered on top of floorplans with tenancy-aware visibility.';
create index floorplan_annotations_building_idx on public.floorplan_annotations(building_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  lease_id uuid references public.leases(id) on delete set null,
  category public.document_category not null default 'other',
  visibility public.document_visibility not null default 'lease',
  title text not null,
  storage_path text not null,
  documenso_envelope_id text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.documents is 'Documenso-synchronized files available to residents and staff.';
create index documents_building_idx on public.documents(building_id);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  subject text not null,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);
comment on table public.threads is 'Message board threads scoped to a building.';
create index threads_building_idx on public.threads(building_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  visibility public.document_visibility not null default 'lease'
);
comment on table public.messages is 'Threaded roommate communication scoped to building.';
create index messages_building_idx on public.messages(building_id);
create index messages_thread_idx on public.messages(thread_id);

create table public.user_roles (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  role public.user_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, building_id, role)
);
comment on table public.user_roles is 'Role membership per building used for RLS decisions.';
create index user_roles_building_idx on public.user_roles(building_id);
create index user_roles_user_idx on public.user_roles(user_id);

-- Track default tenancy preference for profiles.
alter table public.profiles
  add column if not exists default_building_id uuid references public.buildings(id);

-- ---------------------------------------------------------------------------
-- Security helpers
-- ---------------------------------------------------------------------------
create or replace function public.has_any_role(required_roles public.user_role[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and (ur.role = any(required_roles) or ur.role = 'platform_admin')
    );
$$;
comment on function public.has_any_role(public.user_role[]) is 'Determines if the current authenticated user holds any of the supplied roles across buildings.';

create or replace function public.has_building_access(target_building uuid, allowed_roles public.user_role[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and (
          ur.role = 'platform_admin'
          or (ur.role = any(allowed_roles) and ur.building_id = target_building)
        )
    );
$$;
comment on function public.has_building_access(uuid, public.user_role[]) is 'Validates that the current user may interact with a specific building.';

create or replace function public.is_lease_member(target_lease uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.lease_residents lr
      where lr.lease_id = target_lease
        and lr.profile_id = auth.uid()
    );
$$;
comment on function public.is_lease_member(uuid) is 'True when the current user is associated with the provided lease.';

-- ---------------------------------------------------------------------------
-- Row Level Security Policies
-- ---------------------------------------------------------------------------
alter table public.buildings enable row level security;
create policy "Platform roles can read building metadata" on public.buildings
  for select
  using (public.has_building_access(id, array['property_manager','building_staff','resident','support_agent']::public.user_role[]));
create policy "Platform admins manage buildings" on public.buildings
  for all
  using (public.has_any_role(array['platform_admin']::public.user_role[]))
  with check (public.has_any_role(array['platform_admin']::public.user_role[]));

alter table public.units enable row level security;
create policy "Scoped access to units" on public.units
  for select using (public.has_building_access(building_id, array['property_manager','building_staff','resident','support_agent']::public.user_role[]));
create policy "Managers may modify units" on public.units
  for all using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.leases enable row level security;
create policy "Staff and residents read leases" on public.leases
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or public.is_lease_member(id)
  );
create policy "Managers manage leases" on public.leases
  for all using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.lease_residents enable row level security;
create policy "Members can view their lease memberships" on public.lease_residents
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or profile_id = auth.uid()
  );
create policy "Managers manage lease residents" on public.lease_residents
  for all using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.rent_payments enable row level security;
create policy "Payments visible to authorized roles" on public.rent_payments
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or (
      public.is_lease_member(lease_id)
    )
  );
create policy "Managers manage payments" on public.rent_payments
  for all using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.amenities enable row level security;
create policy "Amenities visible to building roles" on public.amenities
  for select using (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role[]));
create policy "Managers manage amenities" on public.amenities
  for all using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.amenity_bookings enable row level security;
create policy "Residents and staff view bookings" on public.amenity_bookings
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or (profile_id = auth.uid())
    or (lease_id is not null and public.is_lease_member(lease_id))
  );
create policy "Residents may create bookings" on public.amenity_bookings
  for insert with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role[])
    and (
      public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
      or (lease_id is not null and public.is_lease_member(lease_id))
    )
  );
create policy "Staff manage bookings" on public.amenity_bookings
  for update using (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[]));
create policy "Staff cancel bookings" on public.amenity_bookings
  for delete using (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[]));

alter table public.visitor_logs enable row level security;
create policy "Visitor logs visible to roles" on public.visitor_logs
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or (host_profile_id = auth.uid())
    or (lease_id is not null and public.is_lease_member(lease_id))
  );
create policy "Residents register visitors" on public.visitor_logs
  for insert with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role[])
    and (lease_id is null or public.is_lease_member(lease_id))
  );
create policy "Staff update visitor logs" on public.visitor_logs
  for update using (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[]));
create policy "Staff remove visitor logs" on public.visitor_logs
  for delete using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.maintenance_requests enable row level security;
create policy "Tickets visible to roles" on public.maintenance_requests
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or (reported_by = auth.uid())
    or (lease_id is not null and public.is_lease_member(lease_id))
  );
create policy "Residents create tickets" on public.maintenance_requests
  for insert with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role[])
    and (lease_id is null or public.is_lease_member(lease_id))
  );
create policy "Staff manage tickets" on public.maintenance_requests
  for update using (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[]));
create policy "Managers close tickets" on public.maintenance_requests
  for delete using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.floorplans enable row level security;
create policy "Floorplans visible to residents and staff" on public.floorplans
  for select using (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role[]));
create policy "Managers manage floorplans" on public.floorplans
  for all using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.floorplan_annotations enable row level security;
create policy "Annotations visible per visibility rules" on public.floorplan_annotations
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
    or (
      visibility = 'building'
      and public.has_building_access(building_id, array['resident','support_agent']::public.user_role[])
    )
    or (
      visibility = 'unit'
      and profile_id = auth.uid()
    )
    or profile_id = auth.uid()
  );
create policy "Residents create annotations" on public.floorplan_annotations
  for insert with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role[])
  );
create policy "Creators update annotations" on public.floorplan_annotations
  for update using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
    or profile_id = auth.uid()
  )
  with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
    or profile_id = auth.uid()
  );
create policy "Managers delete annotations" on public.floorplan_annotations
  for delete using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[])
    or profile_id = auth.uid());

alter table public.documents enable row level security;
create policy "Document visibility by scope" on public.documents
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or (
      visibility = 'building'
      and public.has_building_access(building_id, array['resident']::public.user_role[])
    )
    or (
      visibility = 'unit'
      and lease_id is not null
      and public.is_lease_member(lease_id)
    )
    or (
      visibility = 'lease'
      and lease_id is not null
      and public.is_lease_member(lease_id)
    )
    or (visibility = 'private' and uploaded_by = auth.uid())
  );
create policy "Managers manage documents" on public.documents
  for all using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]))
  with check (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[]));

alter table public.threads enable row level security;
create policy "Threads visible to building members" on public.threads
  for select using (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role[]));
create policy "Residents create threads" on public.threads
  for insert with check (public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role[]));
create policy "Staff update threads" on public.threads
  for update using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
    or created_by = auth.uid()
  )
  with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
    or created_by = auth.uid()
  );
create policy "Managers delete threads" on public.threads
  for delete using (public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[])
    or created_by = auth.uid());

alter table public.messages enable row level security;
create policy "Messages visible to members" on public.messages
  for select using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role[])
    or (
      visibility in ('building','unit','lease')
      and exists (
        select 1
        from public.threads t
        where t.id = thread_id
          and public.has_building_access(t.building_id, array['resident']::public.user_role[])
      )
    )
    or author_profile_id = auth.uid()
  );
create policy "Residents post messages" on public.messages
  for insert with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role[])
  );
create policy "Authors edit own messages" on public.messages
  for update using (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
    or author_profile_id = auth.uid()
  )
  with check (
    public.has_building_access(building_id, array['platform_admin','property_manager','building_staff']::public.user_role[])
    or author_profile_id = auth.uid()
  );
create policy "Managers delete messages" on public.messages
  for delete using (
    public.has_building_access(building_id, array['platform_admin','property_manager']::public.user_role[])
    or author_profile_id = auth.uid()
  );

alter table public.user_roles enable row level security;
create policy "Admins read user roles" on public.user_roles
  for select using (public.has_any_role(array['platform_admin','property_manager']::public.user_role[]));
create policy "Admins manage user roles" on public.user_roles
  for all using (public.has_any_role(array['platform_admin']::public.user_role[]))
  with check (public.has_any_role(array['platform_admin']::public.user_role[]));

