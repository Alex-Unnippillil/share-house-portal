-- Floorplan storage bucket
insert into storage.buckets (id, name, public)
select 'floorplans', 'floorplans', false
where not exists (
  select 1 from storage.buckets where id = 'floorplans'
);

-- Core floorplan tables
create table public.floorplans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  name text not null,
  description text,
  unit_label text not null,
  base_image_bucket text not null default 'floorplans',
  base_image_path text not null,
  metadata jsonb,
  is_active boolean not null default true
);

create table public.floorplan_overlays (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  floorplan_id uuid not null references public.floorplans(id) on delete cascade,
  name text not null,
  overlay_type text not null,
  geometry jsonb not null,
  is_interactive boolean not null default true,
  occupant_profile_id uuid references public.profiles(id) on delete set null,
  metadata jsonb,
  display_order integer not null default 0
);

create table public.resident_floorplans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  floorplan_id uuid not null references public.floorplans(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete cascade,
  effective_start date not null default current_date,
  effective_end date,
  is_primary boolean not null default true,
  constraint resident_floorplans_unique_assignment unique (floorplan_id, resident_id, effective_start)
);

create index floorplan_overlays_floorplan_id_idx on public.floorplan_overlays(floorplan_id);
create index floorplan_overlays_display_order_idx on public.floorplan_overlays(display_order);
create index resident_floorplans_resident_id_idx on public.resident_floorplans(resident_id);
create index resident_floorplans_floorplan_id_idx on public.resident_floorplans(floorplan_id);

alter table public.floorplans enable row level security;
alter table public.floorplan_overlays enable row level security;
alter table public.resident_floorplans enable row level security;

create policy "Staff manage floorplans" on public.floorplans
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  );

create policy "Residents view assigned floorplans" on public.floorplans
  for select using (
    exists (
      select 1 from public.resident_floorplans rf
      where rf.floorplan_id = floorplans.id
        and rf.resident_id = auth.uid()
        and rf.effective_start <= current_date
        and (rf.effective_end is null or rf.effective_end >= current_date)
    )
  );

create policy "Staff manage floorplan overlays" on public.floorplan_overlays
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  );

create policy "Residents view assigned overlays" on public.floorplan_overlays
  for select using (
    exists (
      select 1 from public.resident_floorplans rf
      where rf.floorplan_id = floorplan_overlays.floorplan_id
        and rf.resident_id = auth.uid()
        and rf.effective_start <= current_date
        and (rf.effective_end is null or rf.effective_end >= current_date)
    )
  );

create policy "Staff manage resident floorplans" on public.resident_floorplans
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  );

create policy "Residents view their floorplan assignments" on public.resident_floorplans
  for select using (
    resident_id = auth.uid()
  );

create policy "Allow staff to manage floorplan assets" on storage.objects
  for all using (
    bucket_id = 'floorplans' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  )
  with check (
    bucket_id = 'floorplans' and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.role, 'tenant') in ('admin', 'property_manager', 'staff')
    )
  );

create policy "Allow residents to view assigned floorplan assets" on storage.objects
  for select using (
    bucket_id = 'floorplans' and
    exists (
      select 1 from public.resident_floorplans rf
      join public.floorplans f on f.id = rf.floorplan_id
      where f.base_image_path = storage.objects.name
        and rf.resident_id = auth.uid()
        and rf.effective_start <= current_date
        and (rf.effective_end is null or rf.effective_end >= current_date)
    )
  );
