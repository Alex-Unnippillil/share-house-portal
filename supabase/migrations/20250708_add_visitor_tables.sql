create extension if not exists "pgcrypto";

create type public.visitor_status as enum (
  'pending',
  'approved',
  'denied',
  'cancelled',
  'completed'
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  building_name text not null,
  unit_number text not null,
  manager_profile_id uuid references public.profiles(id) on delete set null,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint units_building_unit_unique unique (building_name, unit_number)
);

alter table public.units enable row level security;

create table public.unit_memberships (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null default 'tenant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_memberships_unique unique (unit_id, profile_id)
);

alter table public.unit_memberships enable row level security;

create table public.visitor_rules (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  max_consecutive_nights integer not null default 3,
  max_visitors_per_month integer,
  max_active_requests integer,
  max_guests_per_stay integer,
  approval_required boolean not null default true,
  lead_time_hours integer not null default 24,
  notes text,
  effective_start_date date not null default now(),
  effective_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  constraint visitor_rules_positive_nights check (max_consecutive_nights >= 0),
  constraint visitor_rules_positive_lead_time check (lead_time_hours >= 0)
);

alter table public.visitor_rules enable row level security;

create table public.visitor_logs (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  rule_id uuid references public.visitor_rules(id),
  host_profile_id uuid not null references public.profiles(id),
  guest_full_name text not null,
  guest_email text,
  arrival_date date not null,
  departure_date date not null,
  reason text,
  status public.visitor_status not null default 'pending',
  expected_guests integer not null default 1,
  roommate_recipient_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  denied_by uuid references public.profiles(id),
  denied_at timestamptz,
  denial_reason text,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancellation_by uuid references public.profiles(id),
  last_notification_at timestamptz,
  stay_summary text,
  property_manager_notified boolean not null default false,
  constraint visitor_logs_valid_dates check (departure_date >= arrival_date),
  constraint visitor_logs_expected_guests_positive check (expected_guests > 0)
);

alter table public.visitor_logs enable row level security;

create table public.visitor_audit_events (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.visitor_logs(id) on delete cascade,
  event_type text not null,
  event_status public.visitor_status,
  message text,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.visitor_audit_events enable row level security;

create index visitor_rules_unit_id_idx on public.visitor_rules (unit_id);
create index visitor_logs_unit_id_idx on public.visitor_logs (unit_id);
create index visitor_logs_host_profile_idx on public.visitor_logs (host_profile_id);
create index visitor_audit_events_log_id_idx on public.visitor_audit_events (log_id);
create index unit_memberships_profile_idx on public.unit_memberships (profile_id);
create index unit_memberships_unit_idx on public.unit_memberships (unit_id);

create policy "Units visible to household members" on public.units
  for select
  using (
    exists (
      select 1
      from public.unit_memberships um
      where um.unit_id = units.id
        and um.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('property_manager', 'admin')
    )
    or units.manager_profile_id = auth.uid()
  );

create policy "Units manageable by managers" on public.units
  for all
  using (
    units.manager_profile_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    (units.manager_profile_id = auth.uid())
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- RLS policies for unit memberships
create policy "Members can view their unit memberships" on public.unit_memberships
  for select
  using (
    unit_memberships.profile_id = auth.uid()
    or exists (
      select 1
      from public.units u
      where u.id = unit_memberships.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  );

create policy "Managers manage unit memberships" on public.unit_memberships
  for all
  using (
    exists (
      select 1
      from public.units u
      where u.id = unit_memberships.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  )
  with check (
    exists (
      select 1
      from public.units u
      where u.id = unit_memberships.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  );

-- RLS policies for visitor rules
create policy "Households can view visitor rules" on public.visitor_rules
  for select
  using (
    exists (
      select 1
      from public.unit_memberships um
      where um.unit_id = visitor_rules.unit_id
        and um.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.units u
      where u.id = visitor_rules.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  );

create policy "Managers manage visitor rules" on public.visitor_rules
  for all
  using (
    exists (
      select 1
      from public.units u
      where u.id = visitor_rules.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  )
  with check (
    exists (
      select 1
      from public.units u
      where u.id = visitor_rules.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  );

-- RLS policies for visitor logs
create policy "Household can view visitor logs" on public.visitor_logs
  for select
  using (
    exists (
      select 1
      from public.unit_memberships um
      where um.unit_id = visitor_logs.unit_id
        and um.profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.units u
      where u.id = visitor_logs.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  );

create policy "Hosts can create visitor logs" on public.visitor_logs
  for insert
  with check (
    visitor_logs.host_profile_id = auth.uid()
    and exists (
      select 1
      from public.unit_memberships um
      where um.unit_id = visitor_logs.unit_id
        and um.profile_id = auth.uid()
    )
  );

create policy "Hosts can manage their visitor logs" on public.visitor_logs
  for update
  using (
    visitor_logs.host_profile_id = auth.uid()
    and visitor_logs.status in ('pending', 'approved', 'cancelled')
  )
  with check (
    visitor_logs.host_profile_id = auth.uid()
    and visitor_logs.status in ('pending', 'approved', 'cancelled')
  );

create policy "Managers manage visitor logs" on public.visitor_logs
  for update
  using (
    exists (
      select 1
      from public.units u
      where u.id = visitor_logs.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  )
  with check (
    exists (
      select 1
      from public.units u
      where u.id = visitor_logs.unit_id
        and (u.manager_profile_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.role = 'admin'
          ))
    )
  );

-- RLS policies for visitor audit events
create policy "Household can view visitor audit events" on public.visitor_audit_events
  for select
  using (
    exists (
      select 1
      from public.visitor_logs vl
      where vl.id = visitor_audit_events.log_id
        and (
          exists (
            select 1
            from public.unit_memberships um
            where um.unit_id = vl.unit_id
              and um.profile_id = auth.uid()
          )
          or exists (
            select 1
            from public.units u
            where u.id = vl.unit_id
              and (u.manager_profile_id = auth.uid()
                or exists (
                  select 1
                  from public.profiles p
                  where p.id = auth.uid()
                    and p.role = 'admin'
                ))
          )
        )
    )
  );

create policy "Participants can add audit events" on public.visitor_audit_events
  for insert
  with check (
    visitor_audit_events.performed_by = auth.uid()
    and exists (
      select 1
      from public.visitor_logs vl
      where vl.id = visitor_audit_events.log_id
        and (
          vl.host_profile_id = auth.uid()
          or exists (
            select 1
            from public.units u
            where u.id = vl.unit_id
              and (u.manager_profile_id = auth.uid()
                or exists (
                  select 1
                  from public.profiles p
                  where p.id = auth.uid()
                    and p.role = 'admin'
                ))
          )
        )
    )
  );

