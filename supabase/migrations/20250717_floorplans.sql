create extension if not exists "pgcrypto";

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'floorplans'
  ) then
    create table public.floorplans (
      id bigint generated always as identity primary key,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      name text not null,
      description text,
      storage_path text not null,
      width integer not null,
      height integer not null,
      household_id uuid not null references public.households(id) on delete cascade,
      overlays jsonb not null default '[]'::jsonb
    );
  else
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'created_at'
    ) then
      alter table public.floorplans
        add column created_at timestamptz not null default now();
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'updated_at'
    ) then
      alter table public.floorplans
        add column updated_at timestamptz not null default now();
    else
      update public.floorplans
         set updated_at = coalesce(updated_at, now());
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'name'
    ) then
      alter table public.floorplans
        add column name text;
      update public.floorplans
         set name = coalesce(name, 'Floorplan ' || id);
      alter table public.floorplans
        alter column name set not null;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'description'
    ) then
      alter table public.floorplans
        add column description text;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'storage_path'
    ) then
      alter table public.floorplans
        add column storage_path text;
    end if;
    update public.floorplans
       set storage_path = coalesce(storage_path, '');
    alter table public.floorplans
      alter column storage_path set default '';
    alter table public.floorplans
      alter column storage_path set not null;
    alter table public.floorplans
      alter column storage_path drop default;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'width'
    ) then
      alter table public.floorplans
        add column width integer;
    end if;
    update public.floorplans
       set width = coalesce(width, 0);
    alter table public.floorplans
      alter column width set default 0;
    alter table public.floorplans
      alter column width set not null;
    alter table public.floorplans
      alter column width drop default;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'height'
    ) then
      alter table public.floorplans
        add column height integer;
    end if;
    update public.floorplans
       set height = coalesce(height, 0);
    alter table public.floorplans
      alter column height set default 0;
    alter table public.floorplans
      alter column height set not null;
    alter table public.floorplans
      alter column height drop default;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'household_id'
    ) then
      alter table public.floorplans
        add column household_id uuid;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'overlays'
    ) then
      alter table public.floorplans
        add column overlays jsonb not null default '[]'::jsonb;
    else
      update public.floorplans
         set overlays = coalesce(overlays, '[]'::jsonb);
      alter table public.floorplans
        alter column overlays set default '[]'::jsonb;
      alter table public.floorplans
        alter column overlays set not null;
    end if;
  end if;
end $$;

alter table public.floorplans enable row level security;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'floorplans'
      and column_name = 'household_id'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'floorplans'
        and column_name = 'household_id'
    ) then
      if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.floorplans'::regclass
          and conname = 'floorplans_household_id_fkey'
      ) then
        alter table public.floorplans
          add constraint floorplans_household_id_fkey
          foreign key (household_id)
          references public.households(id)
          on delete cascade;
      end if;
    end if;

    if not exists (
      select 1
      from public.floorplans
      where household_id is null
      limit 1
    ) then
      begin
        alter table public.floorplans
          alter column household_id set not null;
      exception
        when others then
          null;
      end;
    end if;
  end if;
end $$;

create index if not exists floorplans_household_id_idx
  on public.floorplans (household_id);
