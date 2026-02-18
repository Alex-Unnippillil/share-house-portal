-- Demo seed script for foundational Share House Portal entities.
-- Inserts one property, a shared unit, tenant roommates, manager/admin users,
-- and linked domain records for payments, bookings, messaging, documents, and logs.

BEGIN;

-- Stable UUIDs for repeatable local seeding.
WITH constants AS (
  SELECT
    '00000000-0000-0000-0000-000000000001'::uuid AS admin_id,
    '00000000-0000-0000-0000-000000000002'::uuid AS manager_id,
    '00000000-0000-0000-0000-000000000003'::uuid AS roommate_one_id,
    '00000000-0000-0000-0000-000000000004'::uuid AS roommate_two_id,
    '10000000-0000-0000-0000-000000000001'::uuid AS property_id,
    '20000000-0000-0000-0000-000000000001'::uuid AS unit_id,
    '30000000-0000-0000-0000-000000000001'::uuid AS amenity_kitchen_id,
    '30000000-0000-0000-0000-000000000002'::uuid AS amenity_parking_id
)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT c.admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@harborheights.demo', crypt('demo-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Avery Admin"}'::jsonb, now(), now() FROM constants c
UNION ALL
SELECT c.manager_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@harborheights.demo', crypt('demo-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Morgan Manager"}'::jsonb, now(), now() FROM constants c
UNION ALL
SELECT c.roommate_one_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sam.roommate@harborheights.demo', crypt('demo-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Sam Roommate"}'::jsonb, now(), now() FROM constants c
UNION ALL
SELECT c.roommate_two_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jules.roommate@harborheights.demo', crypt('demo-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Jules Roommate"}'::jsonb, now(), now() FROM constants c
ON CONFLICT (id) DO NOTHING;

WITH constants AS (
  SELECT
    '00000000-0000-0000-0000-000000000001'::uuid AS admin_id,
    '00000000-0000-0000-0000-000000000002'::uuid AS manager_id,
    '00000000-0000-0000-0000-000000000003'::uuid AS roommate_one_id,
    '00000000-0000-0000-0000-000000000004'::uuid AS roommate_two_id,
    '10000000-0000-0000-0000-000000000001'::uuid AS property_id,
    '20000000-0000-0000-0000-000000000001'::uuid AS unit_id,
    '30000000-0000-0000-0000-000000000001'::uuid AS amenity_kitchen_id,
    '30000000-0000-0000-0000-000000000002'::uuid AS amenity_parking_id,
    '40000000-0000-0000-0000-000000000001'::uuid AS lease_roommate_one_id,
    '40000000-0000-0000-0000-000000000002'::uuid AS lease_roommate_two_id,
    '50000000-0000-0000-0000-000000000001'::uuid AS booking_id,
    '50000000-0000-0000-0000-000000000002'::uuid AS visitor_log_id,
    '50000000-0000-0000-0000-000000000003'::uuid AS maintenance_request_id,
    '50000000-0000-0000-0000-000000000004'::uuid AS thread_id,
    '50000000-0000-0000-0000-000000000005'::uuid AS message_id,
    '50000000-0000-0000-0000-000000000006'::uuid AS document_id,
    '50000000-0000-0000-0000-000000000007'::uuid AS floorplan_id,
    '50000000-0000-0000-0000-000000000008'::uuid AS floorplan_annotation_id,
    '50000000-0000-0000-0000-000000000009'::uuid AS payment_one_id,
    '50000000-0000-0000-0000-000000000010'::uuid AS payment_two_id
),
property_seed AS (
  INSERT INTO public.properties (id, name, slug, address_line_1, city, state, postal_code, country, timezone, manager_id, created_by)
  SELECT c.property_id, 'Harbor Heights Shared Living', 'harbor-heights-shared-living', '101 Harbor Lane', 'Seattle', 'WA', '98101', 'US', 'America/Los_Angeles', c.manager_id, c.admin_id
  FROM constants c
  ON CONFLICT (id) DO NOTHING
  RETURNING id
),
unit_seed AS (
  INSERT INTO public.units (id, property_id, unit_number, floor_label, bedrooms, bathrooms, monthly_rent, occupancy_limit, created_by)
  SELECT c.unit_id, c.property_id, '2A', 'Floor 2', 2, 1.5, 240000, 2, c.manager_id
  FROM constants c
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
INSERT INTO public.profiles (id, property_id, unit_id, role, email, full_name, phone, created_by)
SELECT c.admin_id, c.property_id, NULL, 'admin', 'admin@harborheights.demo', 'Avery Admin', '+1-206-555-0100', c.admin_id FROM constants c
UNION ALL
SELECT c.manager_id, c.property_id, NULL, 'property_manager', 'manager@harborheights.demo', 'Morgan Manager', '+1-206-555-0101', c.admin_id FROM constants c
UNION ALL
SELECT c.roommate_one_id, c.property_id, c.unit_id, 'roommate', 'sam.roommate@harborheights.demo', 'Sam Roommate', '+1-206-555-0102', c.manager_id FROM constants c
UNION ALL
SELECT c.roommate_two_id, c.property_id, c.unit_id, 'roommate', 'jules.roommate@harborheights.demo', 'Jules Roommate', '+1-206-555-0103', c.manager_id FROM constants c
ON CONFLICT (id) DO UPDATE
SET
  property_id = EXCLUDED.property_id,
  unit_id = EXCLUDED.unit_id,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  updated_at = timezone('utc', now());

INSERT INTO public.amenities (id, property_id, name, amenity_type, description, capacity, created_by)
SELECT c.amenity_kitchen_id, c.property_id, 'Community Kitchen', 'kitchen', 'Shared kitchen booking slots for meal prep.', 4, c.manager_id FROM constants c
UNION ALL
SELECT c.amenity_parking_id, c.property_id, 'Covered Parking Spot 1', 'parking', 'Reserved overnight parking space.', 1, c.manager_id FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leases (id, property_id, unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount, status, created_by)
SELECT c.lease_roommate_one_id, c.property_id, c.unit_id, c.roommate_one_id, DATE '2026-01-01', DATE '2026-12-31', 120000, 60000, 'active', c.manager_id FROM constants c
UNION ALL
SELECT c.lease_roommate_two_id, c.property_id, c.unit_id, c.roommate_two_id, DATE '2026-01-01', DATE '2026-12-31', 120000, 60000, 'active', c.manager_id FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rent_payments (id, property_id, unit_id, lease_id, tenant_id, amount, currency, due_date, paid_at, status, stripe_payment_intent_id, created_by)
SELECT c.payment_one_id, c.property_id, c.unit_id, c.lease_roommate_one_id, c.roommate_one_id, 120000, 'usd', DATE '2026-02-01', timezone('utc', now()) - interval '10 days', 'succeeded', 'pi_demo_roommate_1', c.roommate_one_id FROM constants c
UNION ALL
SELECT c.payment_two_id, c.property_id, c.unit_id, c.lease_roommate_two_id, c.roommate_two_id, 120000, 'usd', DATE '2026-02-01', NULL, 'pending', 'pi_demo_roommate_2', c.roommate_two_id FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.maintenance_requests (id, property_id, unit_id, requester_id, assignee_id, title, description, priority, status, requested_for, created_by)
SELECT c.maintenance_request_id, c.property_id, c.unit_id, c.roommate_one_id, c.manager_id, 'Bathroom sink leak', 'Leak under sink cabinet appears overnight.', 'high', 'in_progress', daterange(current_date, current_date + 7, '[]'), c.roommate_one_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bookings (id, property_id, amenity_id, unit_id, booked_by, status, start_time, end_time, notes, created_by)
SELECT c.booking_id, c.property_id, c.amenity_kitchen_id, c.unit_id, c.roommate_two_id, 'confirmed', timezone('utc', now()) + interval '2 days', timezone('utc', now()) + interval '2 days 1 hour', 'Meal prep for the week.', c.roommate_two_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.visitor_logs (id, property_id, unit_id, host_id, guest_name, reason, arrival_date, departure_date, status, approved_by, created_by)
SELECT c.visitor_log_id, c.property_id, c.unit_id, c.roommate_one_id, 'Casey Guest', 'Weekend stay', current_date + 3, current_date + 5, 'approved', c.manager_id, c.roommate_one_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.threads (id, property_id, unit_id, author_id, title, body, status, is_pinned, created_by)
SELECT c.thread_id, c.property_id, c.unit_id, c.roommate_one_id, 'Kitchen cleanup rotation', 'Can we rotate deep-clean duty weekly?', 'active', true, c.roommate_one_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (id, property_id, unit_id, thread_id, author_id, body, status, created_by)
SELECT c.message_id, c.property_id, c.unit_id, c.thread_id, c.roommate_two_id, 'Yes, I can take the first Saturday cleanup.', 'active', c.roommate_two_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.documents (id, property_id, unit_id, tenant_id, title, document_type, status, file_url, documenso_envelope_id, created_by)
SELECT c.document_id, c.property_id, c.unit_id, c.roommate_one_id, '2026 Lease Agreement - Unit 2A', 'lease', 'signed', 'https://example.local/documents/lease-unit-2a-v1.pdf', 'env_demo_lease_2a', c.manager_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floorplans (id, property_id, unit_id, name, svg_url, version, created_by)
SELECT c.floorplan_id, c.property_id, c.unit_id, 'Unit 2A Floorplan', 'https://example.local/floorplans/unit-2a-v1.svg', 1, c.manager_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.floorplan_annotations (id, floorplan_id, profile_id, annotation_key, annotation_value, created_by)
SELECT c.floorplan_annotation_id, c.floorplan_id, c.roommate_one_id, 'storage-locker', jsonb_build_object('label', 'Locker A', 'color', '#2B6CB0'), c.roommate_one_id
FROM constants c
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (property_id, unit_id, actor_id, entity_type, entity_id, action, old_values, new_values, metadata)
SELECT c.property_id, c.unit_id, c.manager_id, 'maintenance_requests', c.maintenance_request_id, 'status_change',
       jsonb_build_object('status', 'open'),
       jsonb_build_object('status', 'in_progress'),
       jsonb_build_object('source', 'demo_seed')
FROM constants c;

COMMIT;
