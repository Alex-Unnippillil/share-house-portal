-- Enable text search helpers required for member search.
create extension if not exists pg_trgm with schema public;
create extension if not exists unaccent with schema public;

-- Add a generated tsvector column for accelerated search lookups.
do
$$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'search_document'
  ) then
    alter table public.profiles
      add column search_document tsvector
      generated always as (
        setweight(
          to_tsvector('simple', unaccent(coalesce(full_name, ''))),
          'A'
        )
        || setweight(
          to_tsvector('simple', unaccent(coalesce(email, ''))),
          'B'
        )
        || setweight(
          to_tsvector(
            'simple',
            unaccent(
              coalesce(role::text, '') || ' ' || replace(coalesce(role::text, ''), '_', ' ')
            )
          ),
          'C'
        )
        || setweight(
          to_tsvector('simple', unaccent(coalesce(unit_id, ''))),
          'D'
        )
      ) stored;
  end if;
end;
$$;

-- Create indexes supporting both full-text and trigram similarity search.
create index if not exists idx_profiles_search_document
  on public.profiles using gin (search_document);

create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists idx_profiles_email_trgm
  on public.profiles using gin (email gin_trgm_ops);

-- Synonym catalog for shared search vocabulary.
create table if not exists public.member_search_synonyms (
  term text primary key,
  synonyms text[] not null,
  updated_at timestamptz not null default now()
);

insert into public.member_search_synonyms (term, synonyms)
values
  ('tenant', array['roommate', 'resident', 'occupant']),
  ('roommate', array['flatmate', 'housemate', 'co-tenant']),
  ('property manager', array['pm', 'manager', 'property_manager']),
  ('admin', array['administrator', 'property manager', 'supervisor']),
  ('maintenance', array['repair', 'fix', 'work order']),
  ('rent', array['payment', 'due', 'lease'])
on conflict (term) do update
set synonyms = excluded.synonyms,
    updated_at = now();

-- Helper to expand the incoming search string using the synonym map.
create or replace function public.expand_member_search_terms(search_input text)
returns text[]
language plpgsql
as
$$
declare
  normalized text;
  aggregated text[];
begin
  normalized := nullif(lower(trim(coalesce(search_input, ''))), '');

  if normalized is null then
    return array[]::text[];
  end if;

  select array_agg(distinct value)
  into aggregated
  from (
    select normalized as value
    union all
    select unnest(s.synonyms)
    from public.member_search_synonyms s
    where s.term = normalized
       or normalized = any(s.synonyms)
  ) as combined;

  if aggregated is null or array_length(aggregated, 1) = 0 then
    return array[normalized];
  end if;

  return aggregated;
end;
$$;

-- Core search function powering the API.
create or replace function public.search_members(
  search_input text default null,
  role_filters text[] default null,
  unit_filters text[] default null,
  result_limit integer default 20
)
returns table (
  id text,
  full_name text,
  email text,
  role text,
  unit_id text,
  highlight text,
  rank double precision
)
language plpgsql
stable
as
$$
declare
  normalized_query text;
  expanded_terms text[];
  ts_query tsquery;
  limit_value integer := greatest(1, least(coalesce(result_limit, 20), 100));
  normalized_roles text[] := null;
  normalized_units text[] := null;
  include_unassigned boolean := false;
begin
  normalized_query := nullif(trim(coalesce(search_input, '')), '');

  if role_filters is not null and array_length(role_filters, 1) > 0 then
    select array_agg(distinct lower(trim(val)))
    into normalized_roles
    from unnest(role_filters) as val
    where val is not null and trim(val) <> '';
  end if;

  if unit_filters is not null and array_length(unit_filters, 1) > 0 then
    include_unassigned := array_position(unit_filters, '__unassigned__') is not null;
    normalized_units := array_remove(unit_filters, '__unassigned__');

    if normalized_units is not null then
      select array_agg(distinct trim(unit_val))
      into normalized_units
      from unnest(normalized_units) as unit_val
      where unit_val is not null and trim(unit_val) <> '';
    end if;
  end if;

  if normalized_query is not null then
    expanded_terms := public.expand_member_search_terms(normalized_query);

    if array_length(expanded_terms, 1) > 0 then
      select websearch_to_tsquery(
        'simple',
        array_to_string(expanded_terms, ' | ')
      )
      into ts_query;
    end if;
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.role::text,
    p.unit_id,
    case
      when ts_query is null then null
      else ts_headline(
        'simple',
        coalesce(p.full_name, '') || ' <' || coalesce(p.email, '') || '>',
        ts_query,
        'MaxFragments=3,MaxWords=8,MinWords=2,StartSel=<mark>,StopSel=</mark>'
      )
    end as highlight,
    case
      when ts_query is null then 0
      else ts_rank_cd(p.search_document, ts_query)
    end as rank
  from public.profiles p
  where
    (
      ts_query is null
      or p.search_document @@ ts_query
      or exists (
        select 1
        from unnest(coalesce(expanded_terms, array[]::text[])) as expanded_term
        where
          lower(expanded_term) % lower(unaccent(coalesce(p.full_name, '')))
          or lower(expanded_term) % lower(unaccent(coalesce(p.email, '')))
          or lower(expanded_term) % lower(unaccent(coalesce(p.role::text, '')))
          or lower(expanded_term) % lower(unaccent(coalesce(p.unit_id, '')))
      )
    )
    and (
      normalized_roles is null
      or array_length(normalized_roles, 1) = 0
      or lower(p.role::text) = any(normalized_roles)
    )
    and (
      unit_filters is null
      or array_length(unit_filters, 1) = 0
      or (
        (normalized_units is not null and array_length(normalized_units, 1) > 0 and p.unit_id = any(normalized_units))
        or (include_unassigned and p.unit_id is null)
      )
    )
  order by
    case when ts_query is null then 0 else 1 end desc,
    rank desc,
    p.updated_at desc nulls last,
    p.full_name nulls last
  limit limit_value;
end;
$$;

-- Aggregate facet counts for the active search query.
create or replace function public.search_members_facets(
  search_input text default null,
  role_filters text[] default null,
  unit_filters text[] default null
)
returns table (
  facet text,
  value text,
  count bigint
)
language sql
stable
as
$$
  with matches as (
    select *
    from public.search_members(search_input, role_filters, unit_filters, 500)
  )
  select 'role'::text as facet, coalesce(role, 'unknown') as value, count(*)
  from matches
  group by coalesce(role, 'unknown')
  union all
  select 'unit'::text as facet, coalesce(unit_id, '__unassigned__') as value, count(*)
  from matches
  group by coalesce(unit_id, '__unassigned__');
$$;
