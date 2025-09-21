-- Replaces legacy prototype tables with building-scoped schema per ADR-0001.
set check_function_bodies = off;

-- Drop unused legacy tables and supporting policies.
drop table if exists public.chat cascade;
drop table if exists public.countries cascade;
drop table if exists public.inqueries cascade;
drop table if exists public.meetings cascade;
drop table if exists public.members_table cascade;
drop table if exists public.permission_table cascade;
drop table if exists public.todos cascade;

drop table if exists public.profiles cascade;

-- Ensure uuid generation helpers are available.
create extension if not exists "pgcrypto" with schema public;

-- Enum definitions used across the tenancy-aware schema.
do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role_type') then
        create type public.user_role_type as enum (
            'platform_admin',
            'property_manager',
            'building_staff',
            'resident',
            'support_agent'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'lease_status') then
        create type public.lease_status as enum (
            'draft',
            'pending',
            'active',
            'terminated',
            'expired'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'payment_status') then
        create type public.payment_status as enum (
            'scheduled',
            'processing',
            'paid',
            'failed',
            'refunded'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'booking_status') then
        create type public.booking_status as enum (
            'pending',
            'confirmed',
            'cancelled',
            'completed'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'maintenance_status') then
        create type public.maintenance_status as enum (
            'open',
            'in_progress',
            'on_hold',
            'resolved',
            'closed'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'maintenance_priority') then
        create type public.maintenance_priority as enum (
            'low',
            'medium',
            'high',
            'urgent'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'thread_status') then
        create type public.thread_status as enum (
            'open',
            'locked',
            'archived'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'document_category') then
        create type public.document_category as enum (
            'lease',
            'payment',
            'notice',
            'policy',
            'other'
        );
    end if;

    if not exists (select 1 from pg_type where typname = 'visitor_status') then
        create type public.visitor_status as enum (
            'registered',
            'checked_in',
            'checked_out',
            'denied'
        );
    end if;
end $$;

create table public.buildings (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code text not null unique,
    address_line1 text not null,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text,
    timezone text not null default 'UTC',
    is_active boolean not null default true,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.buildings is 'Authoritative list of managed properties. Every core entity references buildings.id for tenancy boundaries (ADR-0001).';

create table public.profiles (
    id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    full_name text,
    phone_number text,
    avatar_url text,
    default_building_id uuid references public.buildings(id),
    onboarding_completed_at timestamptz,
    preferences jsonb not null default '{}'::jsonb
);

comment on table public.profiles is 'Extended auth profile metadata for portal users. Building membership is tracked via user_roles.';

create table public.user_roles (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    building_id uuid not null references public.buildings(id) on delete cascade,
    role public.user_role_type not null,
    granted_by uuid references auth.users(id),
    granted_at timestamptz not null default timezone('utc', now()),
    constraint user_roles_unique_membership unique (user_id, building_id, role)
);

comment on table public.user_roles is 'Maps a user to a specific building and role for RBAC enforcement.';

create index idx_user_roles_building_role on public.user_roles (building_id, role);
create index idx_user_roles_user on public.user_roles (user_id);

create table public.units (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    unit_number text not null,
    floor integer,
    bedrooms integer,
    bathrooms numeric(4,2),
    square_feet integer,
    rent_amount numeric(10,2),
    status text not null default 'available',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint unique_unit_per_building unique (building_id, unit_number)
);

create index idx_units_building on public.units (building_id);

create table public.leases (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    unit_id uuid not null references public.units(id) on delete restrict,
    primary_tenant_id uuid not null references auth.users(id) on delete restrict,
    status public.lease_status not null default 'pending',
    start_date date not null,
    end_date date,
    rent_amount numeric(10,2) not null,
    security_deposit numeric(10,2),
    billing_cycle_day integer not null default 1,
    stripe_customer_id text,
    notes text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint leases_unit_active_unique unique (unit_id, status) deferrable initially deferred
);

create unique index leases_building_id_id_idx on public.leases (building_id, id);
create index leases_unit_idx on public.leases (unit_id);

create table public.lease_tenants (
    id bigserial primary key,
    building_id uuid not null references public.buildings(id) on delete cascade,
    lease_id uuid not null,
    tenant_id uuid not null references auth.users(id) on delete cascade,
    rent_share numeric(5,2),
    joined_at timestamptz not null default timezone('utc', now()),
    constraint lease_tenants_unique unique (lease_id, tenant_id),
    constraint lease_tenants_lease_fk foreign key (building_id, lease_id) references public.leases (building_id, id) on delete cascade
);

create index lease_tenants_building_idx on public.lease_tenants (building_id);
create index lease_tenants_lease_idx on public.lease_tenants (lease_id);

create table public.rent_payments (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    lease_id uuid not null,
    amount numeric(10,2) not null,
    due_date date not null,
    paid_at timestamptz,
    status public.payment_status not null default 'scheduled',
    stripe_payment_intent_id text,
    memo text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint rent_payments_lease_fk foreign key (building_id, lease_id) references public.leases (building_id, id) on delete cascade
);

create index rent_payments_building_idx on public.rent_payments (building_id);
create index rent_payments_lease_idx on public.rent_payments (lease_id);

create table public.amenities (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    slug text not null,
    name text not null,
    description text,
    location text,
    is_bookable boolean not null default true,
    calcom_event_type_id text,
    open_time time,
    close_time time,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint amenities_unique_slug unique (building_id, slug)
);

create index amenities_building_idx on public.amenities (building_id);
create unique index amenities_building_id_id_idx on public.amenities (building_id, id);

create table public.amenity_bookings (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    amenity_id uuid not null,
    lease_id uuid,
    booked_by uuid not null references auth.users(id) on delete cascade,
    status public.booking_status not null default 'pending',
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    notes text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint amenity_booking_time_check check (ends_at > starts_at),
    constraint amenity_bookings_amenity_fk foreign key (building_id, amenity_id) references public.amenities (building_id, id) on delete cascade,
    constraint amenity_bookings_lease_fk foreign key (building_id, lease_id) references public.leases (building_id, id) on delete cascade
);

create index amenity_bookings_building_idx on public.amenity_bookings (building_id);
create index amenity_bookings_amenity_idx on public.amenity_bookings (amenity_id);
create index amenity_bookings_lease_idx on public.amenity_bookings (lease_id);

create table public.visitor_logs (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    lease_id uuid not null,
    host_user_id uuid not null references auth.users(id) on delete cascade,
    visitor_name text not null,
    status public.visitor_status not null default 'registered',
    arrival_at timestamptz not null,
    departure_at timestamptz,
    purpose text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint visitor_logs_lease_fk foreign key (building_id, lease_id) references public.leases (building_id, id) on delete cascade
);

create index visitor_logs_building_idx on public.visitor_logs (building_id);
create index visitor_logs_lease_idx on public.visitor_logs (lease_id);

create table public.maintenance_requests (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    unit_id uuid not null references public.units(id) on delete restrict,
    lease_id uuid,
    reported_by uuid not null references auth.users(id) on delete cascade,
    assigned_to uuid references auth.users(id) on delete set null,
    status public.maintenance_status not null default 'open',
    priority public.maintenance_priority not null default 'medium',
    category text,
    summary text not null,
    description text,
    metadata jsonb not null default '{}'::jsonb,
    requested_at timestamptz not null default timezone('utc', now()),
    resolved_at timestamptz,
    closed_at timestamptz,
    constraint maintenance_requests_lease_fk foreign key (building_id, lease_id) references public.leases (building_id, id) on delete set null
);

create index maintenance_requests_building_idx on public.maintenance_requests (building_id);
create index maintenance_requests_unit_idx on public.maintenance_requests (unit_id);
create index maintenance_requests_status_idx on public.maintenance_requests (status);

create table public.floorplans (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    unit_id uuid references public.units(id) on delete set null,
    name text not null,
    storage_path text not null,
    version integer not null default 1,
    uploaded_by uuid references auth.users(id) on delete set null,
    uploaded_at timestamptz not null default timezone('utc', now()),
    is_active boolean not null default true
);

create index floorplans_building_idx on public.floorplans (building_id);
create index floorplans_unit_idx on public.floorplans (unit_id);
create unique index floorplans_building_id_id_idx on public.floorplans (building_id, id);

create table public.floorplan_annotations (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    floorplan_id uuid not null,
    created_by uuid not null references auth.users(id) on delete cascade,
    label text not null,
    payload jsonb not null,
    visibility text not null default 'private',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint floorplan_annotations_floorplan_fk foreign key (building_id, floorplan_id) references public.floorplans (building_id, id) on delete cascade
);

create index floorplan_annotations_building_idx on public.floorplan_annotations (building_id);
create index floorplan_annotations_floorplan_idx on public.floorplan_annotations (floorplan_id);

create table public.documents (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    lease_id uuid,
    uploaded_by uuid not null references auth.users(id) on delete cascade,
    category public.document_category not null default 'other',
    title text not null,
    storage_path text not null,
    version integer not null default 1,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    constraint documents_lease_fk foreign key (building_id, lease_id) references public.leases (building_id, id) on delete set null
);

create index documents_building_idx on public.documents (building_id);
create index documents_lease_idx on public.documents (lease_id);

create table public.threads (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    subject text not null,
    created_by uuid not null references auth.users(id) on delete cascade,
    status public.thread_status not null default 'open',
    is_private boolean not null default false,
    is_pinned boolean not null default false,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index threads_building_idx on public.threads (building_id);
create index threads_status_idx on public.threads (status);
create unique index threads_building_id_id_idx on public.threads (building_id, id);

create table public.messages (
    id uuid primary key default gen_random_uuid(),
    building_id uuid not null references public.buildings(id) on delete cascade,
    thread_id uuid not null,
    sender_id uuid not null references auth.users(id) on delete cascade,
    body text not null,
    attachments jsonb not null default '[]'::jsonb,
    is_system boolean not null default false,
    reply_to uuid references public.messages(id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint messages_thread_fk foreign key (building_id, thread_id) references public.threads (building_id, id) on delete cascade
);

create index messages_building_idx on public.messages (building_id);
create index messages_thread_idx on public.messages (thread_id);

-- Helper functions used by policies.
create or replace function public.has_building_role(target_building uuid, allowed_roles public.user_role_type[] default null)
returns boolean
language sql
stable
as $$
    select
        coalesce(
            exists (
                select 1
                from public.user_roles ur
                where ur.user_id = auth.uid()
                  and (
                    ur.role = 'platform_admin'::public.user_role_type
                    or (
                        ur.building_id = target_building
                        and (
                            allowed_roles is null
                            or array_length(allowed_roles, 1) is null
                            or ur.role = any(allowed_roles)
                        )
                    )
                )
            ), false
        )
        or auth.role() = 'service_role';
$$;

comment on function public.has_building_role(uuid, public.user_role_type[]) is 'Returns true when the authenticated user has one of the required roles for the provided building or holds the service role.';

create or replace function public.has_shared_building(target_user uuid, allowed_roles public.user_role_type[] default null)
returns boolean
language sql
stable
as $$
    select
        coalesce(
            exists (
                select 1
                from public.user_roles target
                join public.user_roles actor
                  on actor.building_id = target.building_id
                where target.user_id = target_user
                  and actor.user_id = auth.uid()
                  and (
                    actor.role = 'platform_admin'::public.user_role_type
                    or (
                        allowed_roles is null
                        or array_length(allowed_roles, 1) is null
                        or actor.role = any(allowed_roles)
                    )
                )
            ), false
        )
        or auth.role() = 'service_role';
$$;

comment on function public.has_shared_building(uuid, public.user_role_type[]) is 'Checks whether the authenticated user shares a building with the target user with one of the permitted roles.';

-- Enable row level security and apply tenancy-aware policies.
alter table public.buildings enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.units enable row level security;
alter table public.leases enable row level security;
alter table public.lease_tenants enable row level security;
alter table public.rent_payments enable row level security;
alter table public.amenities enable row level security;
alter table public.amenity_bookings enable row level security;
alter table public.visitor_logs enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.floorplans enable row level security;
alter table public.floorplan_annotations enable row level security;
alter table public.documents enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;

-- Buildings policies
create policy "Building members can read building metadata" on public.buildings
    for select
    using (public.has_building_role(buildings.id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members can read building metadata" on public.buildings is 'Allows any role assigned to a building to view its configuration per authorization model.';

create policy "Only platform admins manage buildings" on public.buildings
    for all
    using (public.has_building_role(buildings.id, array['platform_admin']::public.user_role_type[]))
    with check (public.has_building_role(buildings.id, array['platform_admin']::public.user_role_type[]));
comment on policy "Only platform admins manage buildings" on public.buildings is 'Restricts create/update/delete of building records to platform administrators or service role.';

-- Profiles policies
create policy "Profiles are visible to self and scoped staff" on public.profiles
    for select
    using (auth.uid() = id or public.has_shared_building(id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role_type[]));
comment on policy "Profiles are visible to self and scoped staff" on public.profiles is 'Residents see their own profile; staff roles can view profiles for shared buildings.';

create policy "Profiles are self managed" on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
comment on policy "Profiles are self managed" on public.profiles is 'Users may update only their own profile fields.';

create policy "Profiles inserted by service actors" on public.profiles
    for insert
    with check (auth.role() = 'service_role');
comment on policy "Profiles inserted by service actors" on public.profiles is 'Profile creation occurs via backend provisioning using the service role.';

-- User roles policies
create policy "Users can view their own role assignments" on public.user_roles
    for select
    using (auth.uid() = user_id or public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]));
comment on policy "Users can view their own role assignments" on public.user_roles is 'Surface memberships for the current user while allowing managers to audit roles per building.';

create policy "Building managers maintain memberships" on public.user_roles
    for insert
    with check (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]));
comment on policy "Building managers maintain memberships" on public.user_roles is 'Platform admins and property managers can assign roles within their buildings.';

create policy "Building managers update memberships" on public.user_roles
    for update
    using (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]));
comment on policy "Building managers update memberships" on public.user_roles is 'Managers can adjust assigned roles within their authorized buildings.';

create policy "Platform admins remove memberships" on public.user_roles
    for delete
    using (public.has_building_role(building_id, array['platform_admin']::public.user_role_type[]));
comment on policy "Platform admins remove memberships" on public.user_roles is 'Only platform administrators or the service role may revoke role assignments.';

-- Units policies
create policy "Building members read units" on public.units
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members read units" on public.units is 'Expose unit metadata to all building roles for onboarding and support flows.';

create policy "Managers manage units" on public.units
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]));
comment on policy "Managers manage units" on public.units is 'Only platform admins and property managers can create or update units.';

-- Leases policies
create policy "Staff view leases" on public.leases
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role_type[]));
comment on policy "Staff view leases" on public.leases is 'Staff roles within a building may review lease records for operations.';

create policy "Residents view their leases" on public.leases
    for select
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and (
            primary_tenant_id = auth.uid()
            or exists (
                select 1 from public.lease_tenants lt
                where lt.lease_id = leases.id
                  and lt.tenant_id = auth.uid()
            )
        )
    );
comment on policy "Residents view their leases" on public.leases is 'Residents can access lease records where they are listed as tenants.';

create policy "Managers modify leases" on public.leases
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]));
comment on policy "Managers modify leases" on public.leases is 'Lease creation and updates are restricted to property managers and platform admins.';

-- Lease tenants policies
create policy "Lease tenant visibility" on public.lease_tenants
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','support_agent','resident']::public.user_role_type[]));
comment on policy "Lease tenant visibility" on public.lease_tenants is 'Members of a building can view assigned residents for collaboration.';

create policy "Residents manage own membership" on public.lease_tenants
    for delete
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and tenant_id = auth.uid()
    );
comment on policy "Residents manage own membership" on public.lease_tenants is 'Allows residents to leave roommate groups when they have building access.';

create policy "Managers administer lease tenants" on public.lease_tenants
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]));
comment on policy "Managers administer lease tenants" on public.lease_tenants is 'Managers can add or update resident allocations for leases.';

-- Rent payments policies
create policy "Staff view rent payments" on public.rent_payments
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','support_agent']::public.user_role_type[]));
comment on policy "Staff view rent payments" on public.rent_payments is 'Finance and support roles review rent payment status within a building.';

create policy "Residents view their rent payments" on public.rent_payments
    for select
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and exists (
            select 1 from public.leases l
            left join public.lease_tenants lt on lt.lease_id = l.id and lt.tenant_id = auth.uid()
            where l.id = rent_payments.lease_id
              and (l.primary_tenant_id = auth.uid() or lt.tenant_id = auth.uid())
        )
    );
comment on policy "Residents view their rent payments" on public.rent_payments is 'Residents can see payment history for leases where they are participants.';

create policy "Managers manage rent payments" on public.rent_payments
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager']::public.user_role_type[]));
comment on policy "Managers manage rent payments" on public.rent_payments is 'Only platform admins and property managers can create or adjust payment records.';

-- Amenities policies
create policy "Building members view amenities" on public.amenities
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members view amenities" on public.amenities is 'All building roles need read access to amenity configuration for scheduling.';

create policy "Managers and staff manage amenities" on public.amenities
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Managers and staff manage amenities" on public.amenities is 'Property managers and staff can configure amenity availability.';

-- Amenity bookings policies
create policy "Building members view bookings" on public.amenity_bookings
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members view bookings" on public.amenity_bookings is 'All roles can review booking schedules for coordination.';

create policy "Residents create amenity bookings" on public.amenity_bookings
    for insert
    with check (
        public.has_building_role(building_id, array['resident','platform_admin','property_manager','building_staff']::public.user_role_type[])
        and booked_by = auth.uid()
    );
comment on policy "Residents create amenity bookings" on public.amenity_bookings is 'Residents and staff can schedule amenities for their building; the actor must be the creator.';

create policy "Residents manage their bookings" on public.amenity_bookings
    for update
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and booked_by = auth.uid()
    )
    with check (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and booked_by = auth.uid()
    );
comment on policy "Residents manage their bookings" on public.amenity_bookings is 'Residents may adjust their own bookings while scoped to their building.';

create policy "Managers override amenity bookings" on public.amenity_bookings
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Managers override amenity bookings" on public.amenity_bookings is 'Property teams can create, update, or cancel bookings for operational needs.';

-- Visitor logs policies
create policy "Staff view visitor logs" on public.visitor_logs
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role_type[]));
comment on policy "Staff view visitor logs" on public.visitor_logs is 'Visitor oversight is limited to authorized building staff and support roles.';

create policy "Residents see their visitor logs" on public.visitor_logs
    for select
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and host_user_id = auth.uid()
    );
comment on policy "Residents see their visitor logs" on public.visitor_logs is 'Residents can review visitor submissions that they created.';

create policy "Residents manage their visitor logs" on public.visitor_logs
    for update
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and host_user_id = auth.uid()
    )
    with check (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and host_user_id = auth.uid()
    );
comment on policy "Residents manage their visitor logs" on public.visitor_logs is 'Residents can edit upcoming visitor records that they submitted.';

create policy "Managers manage visitor logs" on public.visitor_logs
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Managers manage visitor logs" on public.visitor_logs is 'Operational staff may create, update, or delete visitor records as needed.';

-- Maintenance requests policies
create policy "Building staff view maintenance" on public.maintenance_requests
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role_type[]));
comment on policy "Building staff view maintenance" on public.maintenance_requests is 'Maintenance tickets are visible to operational teams and support.';

create policy "Residents view their maintenance" on public.maintenance_requests
    for select
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and reported_by = auth.uid()
    );
comment on policy "Residents view their maintenance" on public.maintenance_requests is 'Residents may follow maintenance requests they submit.';

create policy "Residents submit maintenance" on public.maintenance_requests
    for insert
    with check (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and reported_by = auth.uid()
    );
comment on policy "Residents submit maintenance" on public.maintenance_requests is 'Residents can open tickets scoped to their building.';

create policy "Residents update their maintenance" on public.maintenance_requests
    for update
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and reported_by = auth.uid()
    )
    with check (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and reported_by = auth.uid()
    );
comment on policy "Residents update their maintenance" on public.maintenance_requests is 'Residents can add context or close their own maintenance requests.';

create policy "Staff manage maintenance" on public.maintenance_requests
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Staff manage maintenance" on public.maintenance_requests is 'Building staff and managers can triage and resolve tickets.';

-- Floorplans policies
create policy "Building members view floorplans" on public.floorplans
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members view floorplans" on public.floorplans is 'All roles need read access to floorplan assets for collaboration.';

create policy "Staff manage floorplans" on public.floorplans
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Staff manage floorplans" on public.floorplans is 'Only staff can upload or version floorplans.';

-- Floorplan annotations policies
create policy "Building members view annotations" on public.floorplan_annotations
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members view annotations" on public.floorplan_annotations is 'Annotations are shared across building roles for coordination.';

create policy "Creators manage annotations" on public.floorplan_annotations
    for update
    using (
        public.has_building_role(building_id, array['resident','building_staff','property_manager','platform_admin']::public.user_role_type[])
        and created_by = auth.uid()
    )
    with check (
        public.has_building_role(building_id, array['resident','building_staff','property_manager','platform_admin']::public.user_role_type[])
        and created_by = auth.uid()
    );
comment on policy "Creators manage annotations" on public.floorplan_annotations is 'Users can maintain annotations they created when still assigned to the building.';

create policy "Staff curate annotations" on public.floorplan_annotations
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Staff curate annotations" on public.floorplan_annotations is 'Staff can moderate or remove annotations as needed.';

-- Documents policies
create policy "Staff read documents" on public.documents
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','support_agent']::public.user_role_type[]));
comment on policy "Staff read documents" on public.documents is 'Documents like leases and notices are accessible to support and property teams.';

create policy "Residents read their documents" on public.documents
    for select
    using (
        public.has_building_role(building_id, array['resident']::public.user_role_type[])
        and (
            uploaded_by = auth.uid()
            or exists (
                select 1 from public.leases l
                left join public.lease_tenants lt on lt.lease_id = l.id and lt.tenant_id = auth.uid()
                where l.id = documents.lease_id
                  and (l.primary_tenant_id = auth.uid() or lt.tenant_id = auth.uid())
            )
        )
    );
comment on policy "Residents read their documents" on public.documents is 'Residents can access documents they uploaded or that are tied to their lease.';

create policy "Staff manage documents" on public.documents
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Staff manage documents" on public.documents is 'Document creation and updates are restricted to staff roles.';

-- Threads policies
create policy "Building members view threads" on public.threads
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members view threads" on public.threads is 'Community conversations are visible to all roles within the building scope.';

create policy "Building members post threads" on public.threads
    for insert
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role_type[]));
comment on policy "Building members post threads" on public.threads is 'Residents and staff can initiate new discussions when scoped to their building.';

create policy "Thread owners manage threads" on public.threads
    for update
    using (
        public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role_type[])
        and created_by = auth.uid()
    )
    with check (
        public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role_type[])
        and created_by = auth.uid()
    );
comment on policy "Thread owners manage threads" on public.threads is 'Thread creators can edit their posts while they remain members of the building.';

create policy "Staff moderate threads" on public.threads
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Staff moderate threads" on public.threads is 'Staff can update or delete threads to enforce community guidelines.';

-- Messages policies
create policy "Building members read messages" on public.messages
    for select
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident','support_agent']::public.user_role_type[]));
comment on policy "Building members read messages" on public.messages is 'Messages inside a thread follow the same building-scoped visibility rules.';

create policy "Members send messages" on public.messages
    for insert
    with check (
        public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role_type[])
        and sender_id = auth.uid()
    );
comment on policy "Members send messages" on public.messages is 'Residents and staff can send messages to conversations inside their building.';

create policy "Message authors edit" on public.messages
    for update
    using (
        public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role_type[])
        and sender_id = auth.uid()
    )
    with check (
        public.has_building_role(building_id, array['platform_admin','property_manager','building_staff','resident']::public.user_role_type[])
        and sender_id = auth.uid()
    );
comment on policy "Message authors edit" on public.messages is 'Authors can update their own messages while retaining building membership.';

create policy "Staff moderate messages" on public.messages
    for all
    using (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]))
    with check (public.has_building_role(building_id, array['platform_admin','property_manager','building_staff']::public.user_role_type[]));
comment on policy "Staff moderate messages" on public.messages is 'Staff can moderate conversations within their buildings.';
