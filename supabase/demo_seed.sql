-- Demo seeding script for shared supply items
-- Run this script in a Supabase SQL editor or via psql to populate demo data.

WITH households AS (
  SELECT id
  FROM public.households
)
INSERT INTO public.supply_items (household_id, name, unit)
SELECT households.id, items.name, items.unit
FROM households
CROSS JOIN (
  VALUES
    ('Paper Towels', 'roll'),
    ('Dish Soap', 'bottle'),
    ('Laundry Detergent', 'bottle')
) AS items(name, unit)
ON CONFLICT (household_id, name) DO NOTHING;
