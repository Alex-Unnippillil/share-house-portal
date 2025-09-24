-- Demo seed script for validating household chore relationships
-- Inserts sample households and related chores for local development/testing

-- Ensure demo households exist
INSERT INTO public.households (id, name)
VALUES
  ('11111111-2222-3333-4444-555555555501', 'Demo Household Alpha'),
  ('11111111-2222-3333-4444-555555555502', 'Demo Household Beta')
ON CONFLICT DO NOTHING;

-- Starter chores for Demo Household Alpha
WITH target_household AS (
  SELECT id
  FROM public.households
  WHERE id = '11111111-2222-3333-4444-555555555501'
)
INSERT INTO public.chores (household_id, title, cadence, points, active)
SELECT target_household.id, chore.title, chore.cadence, chore.points, chore.active
FROM target_household
CROSS JOIN (
  VALUES
    ('Take out trash', 'weekly', 5, TRUE),
    ('Kitchen wipe-down', 'daily', 2, TRUE),
    ('Laundry rotation', 'biweekly', 4, TRUE),
    ('Deep clean fridge', 'monthly', 8, FALSE)
) AS chore(title, cadence, points, active)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.chores existing
WHERE existing.household_id = target_household.id
  AND existing.title = chore.title
);

-- Demo messaging moderation queue to mirror the live queue UI
WITH upsert_thread AS (
  INSERT INTO public.messaging_threads (id, subject, summary, category, unit_label)
  VALUES (
    '33333333-4444-5555-6666-777777777701',
    'Quiet hours disruption',
    'Three late-night noise reports escalated the thread for property review.',
    'Community',
    'Unit 3B'
  )
  ON CONFLICT (id) DO UPDATE SET
    subject = EXCLUDED.subject,
    summary = EXCLUDED.summary,
    category = EXCLUDED.category,
    unit_label = EXCLUDED.unit_label
  RETURNING id
)
INSERT INTO public.messaging_moderation_queue (
  id,
  thread_id,
  severity,
  status,
  flags,
  flagged_by_profile_id,
  flagged_by_display,
  flagged_reason,
  next_step,
  watchers,
  last_activity
)
SELECT
  '33333333-4444-5555-6666-777777777702',
  upsert_thread.id,
  'high',
  'needs_review',
  3,
  NULL,
  'Aisha • Roommate',
  'Three roommates reported repeated noise after 11pm quiet hours.',
  'Escalate to onsite staff if the thread is still active after today''s follow-up.',
  ARRAY['Night concierge', 'Property care team'],
  NOW() - INTERVAL '2 hours'
FROM upsert_thread
ON CONFLICT (id) DO UPDATE SET
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  flags = EXCLUDED.flags,
  flagged_reason = EXCLUDED.flagged_reason,
  next_step = EXCLUDED.next_step,
  watchers = EXCLUDED.watchers,
  last_activity = EXCLUDED.last_activity;

INSERT INTO public.messaging_moderation_messages (
  id,
  queue_id,
  sender_profile_id,
  sender_name,
  sent_at,
  content,
  is_flagged
)
VALUES
  (
    '33333333-4444-5555-6666-777777777703',
    '33333333-4444-5555-6666-777777777702',
    NULL,
    'Aisha',
    NOW() - INTERVAL '2 hours 8 minutes',
    'Could we please keep the TV volume down after quiet hours? It''s been waking me up all week.',
    TRUE
  ),
  (
    '33333333-4444-5555-6666-777777777704',
    '33333333-4444-5555-6666-777777777702',
    NULL,
    'Jordan',
    NOW() - INTERVAL '2 hours 2 minutes',
    'Just seeing this now. I''ll turn it down and make sure guests know the policy.',
    FALSE
  ),
  (
    '33333333-4444-5555-6666-777777777705',
    '33333333-4444-5555-6666-777777777702',
    NULL,
    'Automated moderation',
    NOW() - INTERVAL '2 hours',
    'Thread flagged for review: three quiet-hour violations detected this month.',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  sender_name = EXCLUDED.sender_name,
  sent_at = EXCLUDED.sent_at,
  content = EXCLUDED.content,
  is_flagged = EXCLUDED.is_flagged;

INSERT INTO public.messaging_moderation_events (
  id,
  queue_id,
  occurred_at,
  description,
  recorded_by_profile_id
)
VALUES
  (
    '33333333-4444-5555-6666-777777777706',
    '33333333-4444-5555-6666-777777777702',
    NOW() - INTERVAL '2 hours',
    'Policy engine flagged the thread for repeated quiet-hour violations.',
    NULL
  ),
  (
    '33333333-4444-5555-6666-777777777707',
    '33333333-4444-5555-6666-777777777702',
    NOW() - INTERVAL '1 hour 55 minutes',
    'Auto-reply reminded roommates of the quiet hours clause in the lease.',
    NULL
  ),
  (
    '33333333-4444-5555-6666-777777777708',
    '33333333-4444-5555-6666-777777777702',
    NOW() - INTERVAL '1 hour 30 minutes',
    'Awaiting property manager decision: escalate or archive once resolved.',
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  occurred_at = EXCLUDED.occurred_at,
  description = EXCLUDED.description;

-- Starter chores for Demo Household Beta
WITH target_household AS (
  SELECT id
  FROM public.households
  WHERE id = '11111111-2222-3333-4444-555555555502'
)
INSERT INTO public.chores (household_id, title, cadence, points, active)
SELECT target_household.id, chore.title, chore.cadence, chore.points, chore.active
FROM target_household
CROSS JOIN (
  VALUES
    ('Water indoor plants', 'weekly', 3, TRUE),
    ('Vacuum hallways', 'weekly', 4, TRUE),
    ('Inspect smoke detectors', 'one_time', 6, TRUE)
) AS chore(title, cadence, points, active)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.chores existing
  WHERE existing.household_id = target_household.id
    AND existing.title = chore.title
);
