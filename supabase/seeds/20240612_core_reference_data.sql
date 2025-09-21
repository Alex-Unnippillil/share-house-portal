-- Core reference data used for local development and automated schema tests.
-- Inserts a canonical building along with amenity definitions and optional
-- role assignments when matching auth.users accounts exist.

insert into public.buildings (id, name, code, address_line1, city, state, postal_code, country, timezone)
values (
    '11111111-1111-1111-1111-111111111111',
    'Test Share House',
    'test-share-house',
    '123 Example Street',
    'Portland',
    'OR',
    '97205',
    'US',
    'America/Los_Angeles'
)
on conflict (id) do update
set
    name = excluded.name,
    code = excluded.code,
    address_line1 = excluded.address_line1,
    city = excluded.city,
    state = excluded.state,
    postal_code = excluded.postal_code,
    country = excluded.country,
    timezone = excluded.timezone,
    updated_at = timezone('utc', now());

insert into public.amenities (id, building_id, slug, name, description, location, is_bookable)
values
    (
        'aaaaaaaa-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        'kitchen',
        'Communal Kitchen',
        'Shared kitchen stocked with cookware and smart appliances.',
        'Level 1',
        true
    ),
    (
        'aaaaaaaa-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'tv-room',
        'Theatre & TV Room',
        'Ultra-short throw projector with Dolby Atmos sound.',
        'Level 2',
        true
    ),
    (
        'aaaaaaaa-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'playstation-nook',
        'PlayStation Gaming Nook',
        'PS5 with VR accessories and weekly tournament board.',
        'Level 2',
        true
    ),
    (
        'aaaaaaaa-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111',
        'parking',
        'Parking Garage',
        'Two tandem EV-ready parking spots.',
        'Sublevel',
        true
    ),
    (
        'aaaaaaaa-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111',
        'shared-computer',
        'Shared Computer Lab',
        'Dual-monitor workstation for printing and research.',
        'Level 3',
        true
    )
on conflict (building_id, slug) do update
set
    name = excluded.name,
    description = excluded.description,
    location = excluded.location,
    is_bookable = excluded.is_bookable,
    updated_at = timezone('utc', now());

-- Optional role fixtures; these execute only when corresponding auth.users
-- accounts already exist (for example, in integration tests).
do $$
declare
    manager_user_id uuid;
    staff_user_id uuid;
    admin_user_id uuid;
begin
    select id into manager_user_id from auth.users where email = 'manager@example.com';
    select id into staff_user_id from auth.users where email = 'staff@example.com';
    select id into admin_user_id from auth.users where email = 'admin@example.com';

    if admin_user_id is not null then
        insert into public.user_roles (user_id, building_id, role)
        values (admin_user_id, '11111111-1111-1111-1111-111111111111', 'platform_admin')
        on conflict (user_id, building_id, role) do nothing;
    end if;

    if manager_user_id is not null then
        insert into public.user_roles (user_id, building_id, role)
        values (manager_user_id, '11111111-1111-1111-1111-111111111111', 'property_manager')
        on conflict (user_id, building_id, role) do nothing;
    end if;

    if staff_user_id is not null then
        insert into public.user_roles (user_id, building_id, role)
        values (staff_user_id, '11111111-1111-1111-1111-111111111111', 'building_staff')
        on conflict (user_id, building_id, role) do nothing;
    end if;
end $$;
