-- Ensure supply_items includes unit + default split columns and supporting enum
create type if not exists public.supply_default_split as enum ('equal', 'weighted');

-- Create the supply_items table if it does not exist so deployments remain idempotent
-- The table captures catalog metadata for common household supplies
-- enabling admins to configure default purchasing expectations per unit.
do $$
begin
        if to_regclass('public.supply_items') is null then
                create table public.supply_items (
                        id uuid primary key default gen_random_uuid(),
                        created_at timestamptz not null default now(),
                        updated_at timestamptz not null default now(),
                        name text not null,
                        category text not null,
                        description text,
                        unit text not null default 'each',
                        default_quantity integer not null default 1,
                        default_split public.supply_default_split not null default 'equal',
                        is_active boolean not null default true
                );
        end if;
end
$$;

-- Align existing columns with the new defaults
alter table if exists public.supply_items
        add column if not exists unit text not null default 'each';

alter table if exists public.supply_items
        add column if not exists default_split public.supply_default_split not null default 'equal';

alter table if exists public.supply_items
        add column if not exists default_quantity integer not null default 1;

alter table if exists public.supply_items
        add column if not exists is_active boolean not null default true;

alter table if exists public.supply_items
        add column if not exists created_at timestamptz not null default now();

alter table if exists public.supply_items
        add column if not exists updated_at timestamptz not null default now();

alter table if exists public.supply_items
        add column if not exists category text not null default 'general';

alter table if exists public.supply_items
        add column if not exists name text not null default 'Unnamed supply';

-- Coerce any pre-existing default_split text column to the enum type
-- and normalize existing rows.
do $$
begin
        if exists (
                select 1
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'supply_items'
                  and column_name = 'default_split'
        ) then
                alter table public.supply_items
                        alter column default_split type public.supply_default_split
                        using default_split::public.supply_default_split;
        end if;
end
$$;

update public.supply_items
set
        unit = coalesce(nullif(trim(unit), ''), 'each'),
        default_split = coalesce(default_split, 'equal'::public.supply_default_split),
        default_quantity = greatest(default_quantity, 1),
        updated_at = now()
where true;
