-- Seed data for development and testing. Safe to run multiple times.
with upsert_building as (
  insert into public.buildings (id, code, name, timezone, address_line1, city, state, postal_code, country)
  values (
    '11111111-1111-1111-1111-111111111111',
    'demo-hq',
    'Demo Share House',
    'America/New_York',
    '123 Demo Street',
    'New York',
    'NY',
    '10001',
    'USA'
  )
  on conflict (code) do update
    set name = excluded.name,
        timezone = excluded.timezone,
        address_line1 = excluded.address_line1,
        city = excluded.city,
        state = excluded.state,
        postal_code = excluded.postal_code,
        country = excluded.country,
        updated_at = now()
  returning id
)
insert into public.amenities (building_id, slug, name, amenity_type, description, requires_approval, is_reservable, is_active)
select
  upsert_building.id,
  data.slug,
  data.name,
  data.amenity_type::public.amenity_type,
  data.description,
  data.requires_approval,
  true,
  true
from upsert_building,
  (values
    ('community_kitchen', 'Community Kitchen', 'kitchen', 'Shared cooking space with stocked appliances.', false),
    ('media_room', 'Media Room', 'tv_room', 'Large television and sound system for movie nights.', true),
    ('console_corner', 'Console Corner', 'game_room', 'PlayStation nook with seating for tournaments.', false),
    ('parking_bay', 'Parking Bay', 'parking', 'Reserved on-site parking spot', true),
    ('coworking', 'Coworking Lounge', 'workspace', 'Shared workspace with dedicated desks and Wi-Fi.', false)
  ) as data(slug, name, amenity_type, description, requires_approval)
on conflict (building_id, slug) do update
  set name = excluded.name,
      description = excluded.description,
      amenity_type = excluded.amenity_type,
      requires_approval = excluded.requires_approval,
      is_active = true,
      updated_at = now();

with admin_user as (
  select id
  from auth.users
  where email = 'admin@example.com'
),
selected_building as (
  select id from public.buildings where code = 'demo-hq'
)
insert into public.user_roles (user_id, building_id, role, granted_by)
select admin_user.id, selected_building.id, 'platform_admin', admin_user.id
from admin_user, selected_building
on conflict (user_id, building_id, role) do nothing;
