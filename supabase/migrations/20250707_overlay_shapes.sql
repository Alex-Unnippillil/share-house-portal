create extension if not exists "pgcrypto";

create table if not exists public.floorplans (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    name text not null,
    image_url text not null,
    description text null
);

alter table public.floorplans enable row level security;

create table if not exists public.overlay_shapes (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    floorplan_id uuid not null references public.floorplans(id) on delete cascade,
    type text not null,
    polygon jsonb not null,
    label text not null,
    tenant_id uuid null references public.profiles(id) on delete set null,
    constraint overlay_shapes_polygon_is_array check (jsonb_typeof(polygon) = 'array')
);

alter table public.overlay_shapes enable row level security;

create index if not exists overlay_shapes_floorplan_idx on public.overlay_shapes (floorplan_id);
create index if not exists overlay_shapes_tenant_idx on public.overlay_shapes (tenant_id);
create index if not exists overlay_shapes_polygon_gin on public.overlay_shapes using gin (polygon);
