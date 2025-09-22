-- Seed demo roommate profiles so fairness metrics are visible immediately in development
INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Avery Chen', 'avery.chen@example.com', 'roommate', NULL),
  ('22222222-2222-2222-2222-222222222222', 'Jordan Blake', 'jordan.blake@example.com', 'roommate', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Priya Desai', 'priya.desai@example.com', 'roommate', NULL)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  avatar_url = EXCLUDED.avatar_url;

-- Provide chore participation history with a mix of completed and missed runs
INSERT INTO public.chore_participation_logs (id, member_id, chore_name, occurrence_date, status, recorded_at, metadata)
VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111', '11111111-1111-1111-1111-111111111111', 'Kitchen deep clean', DATE '2024-06-01', 'completed', '2024-06-01T15:00:00Z', jsonb_build_object('weight', 2)),
  ('aaaa1111-aaaa-1111-aaaa-111111111112', '11111111-1111-1111-1111-111111111111', 'Trash night', DATE '2024-06-04', 'completed', '2024-06-04T20:30:00Z', jsonb_build_object('weight', 1)),
  ('aaaa1111-aaaa-1111-aaaa-111111111113', '11111111-1111-1111-1111-111111111111', 'Bathroom reset', DATE '2024-06-08', 'missed', '2024-06-08T09:00:00Z', jsonb_build_object('weight', 1)),
  ('aaaa1111-aaaa-1111-aaaa-111111111114', '11111111-1111-1111-1111-111111111111', 'Living room dusting', DATE '2024-06-12', 'completed', '2024-06-12T18:45:00Z', jsonb_build_object('weight', 1)),

  ('bbbb2222-bbbb-2222-bbbb-222222222221', '22222222-2222-2222-2222-222222222222', 'Kitchen deep clean', DATE '2024-06-01', 'missed', '2024-06-01T15:30:00Z', jsonb_build_object('weight', 2)),
  ('bbbb2222-bbbb-2222-bbbb-222222222222', '22222222-2222-2222-2222-222222222222', 'Trash night', DATE '2024-06-05', 'completed', '2024-06-05T21:15:00Z', jsonb_build_object('weight', 1)),
  ('bbbb2222-bbbb-2222-bbbb-222222222223', '22222222-2222-2222-2222-222222222222', 'Bathroom reset', DATE '2024-06-09', 'completed', '2024-06-09T10:15:00Z', jsonb_build_object('weight', 1)),
  ('bbbb2222-bbbb-2222-bbbb-222222222224', '22222222-2222-2222-2222-222222222222', 'Living room dusting', DATE '2024-06-13', 'missed', '2024-06-13T19:00:00Z', jsonb_build_object('weight', 1)),

  ('cccc3333-cccc-3333-cccc-333333333331', '33333333-3333-3333-3333-333333333333', 'Kitchen deep clean', DATE '2024-06-01', 'missed', '2024-06-01T14:30:00Z', jsonb_build_object('weight', 2)),
  ('cccc3333-cccc-3333-cccc-333333333332', '33333333-3333-3333-3333-333333333333', 'Trash night', DATE '2024-06-04', 'missed', '2024-06-04T20:00:00Z', jsonb_build_object('weight', 1)),
  ('cccc3333-cccc-3333-cccc-333333333333', '33333333-3333-3333-3333-333333333333', 'Bathroom reset', DATE '2024-06-08', 'missed', '2024-06-08T09:30:00Z', jsonb_build_object('weight', 1)),
  ('cccc3333-cccc-3333-cccc-333333333334', '33333333-3333-3333-3333-333333333333', 'Living room dusting', DATE '2024-06-12', 'completed', '2024-06-12T18:00:00Z', jsonb_build_object('weight', 1))
ON CONFLICT (id) DO UPDATE
SET
  member_id = EXCLUDED.member_id,
  chore_name = EXCLUDED.chore_name,
  occurrence_date = EXCLUDED.occurrence_date,
  status = EXCLUDED.status,
  recorded_at = EXCLUDED.recorded_at,
  metadata = EXCLUDED.metadata;
