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
