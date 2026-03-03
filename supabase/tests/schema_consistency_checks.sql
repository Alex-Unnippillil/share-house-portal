-- Schema and data consistency checks for migration readiness.
-- Usage:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/schema_consistency_checks.sql

BEGIN;

DO $$
DECLARE
  missing_fk_count integer;
  missing_unique_count integer;
  missing_enum_count integer;
  missing_exclusion_count integer;
  orphan_count bigint;
BEGIN
  WITH expected_fks AS (
    SELECT *
    FROM (VALUES
      ('profiles', 'profiles_property_id_fkey'),
      ('profiles', 'profiles_unit_id_fkey'),
      ('units', 'units_property_id_fkey'),
      ('leases', 'leases_property_id_fkey'),
      ('leases', 'leases_unit_id_fkey'),
      ('leases', 'leases_tenant_id_fkey'),
      ('rent_payments', 'rent_payments_property_id_fkey'),
      ('rent_payments', 'rent_payments_unit_id_fkey'),
      ('rent_payments', 'rent_payments_lease_id_fkey'),
      ('rent_payments', 'rent_payments_tenant_id_fkey'),
      ('bookings', 'bookings_property_id_fkey'),
      ('bookings', 'bookings_amenity_id_fkey'),
      ('bookings', 'bookings_unit_id_fkey'),
      ('bookings', 'bookings_booked_by_fkey'),
      ('documents', 'documents_property_id_fkey'),
      ('documents', 'documents_unit_id_fkey'),
      ('documents', 'documents_tenant_id_fkey')
    ) AS x(table_name, constraint_name)
  )
  SELECT count(*)
  INTO missing_fk_count
  FROM expected_fks fk
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = fk.table_name
      AND tc.constraint_name = fk.constraint_name
      AND tc.constraint_type = 'FOREIGN KEY'
  );

  IF missing_fk_count > 0 THEN
    RAISE EXCEPTION 'Missing % expected foreign-key constraints', missing_fk_count;
  END IF;

  WITH expected_unique AS (
    SELECT *
    FROM (VALUES
      ('properties', 'properties_slug_key'),
      ('units', 'units_property_id_unit_number_key'),
      ('profiles', 'profiles_email_key'),
      ('rent_payments', 'rent_payments_stripe_payment_intent_id_key'),
      ('amenities', 'amenities_property_id_name_key'),
      ('floorplans', 'floorplans_property_id_name_version_key'),
      ('floorplan_annotations', 'floorplan_annotations_floorplan_id_profile_id_annotation_key_key')
    ) AS x(table_name, constraint_name)
  )
  SELECT count(*)
  INTO missing_unique_count
  FROM expected_unique uq
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = uq.table_name
      AND tc.constraint_name = uq.constraint_name
      AND tc.constraint_type = 'UNIQUE'
  );

  IF missing_unique_count > 0 THEN
    RAISE EXCEPTION 'Missing % expected unique constraints', missing_unique_count;
  END IF;

  WITH expected_enums AS (
    SELECT *
    FROM (VALUES
      ('profile_role', ARRAY['tenant', 'roommate', 'property_manager', 'admin']::text[]),
      ('payment_status', ARRAY['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']::text[]),
      ('booking_status', ARRAY['pending', 'confirmed', 'cancelled', 'completed', 'no_show']::text[]),
      ('document_status', ARRAY['draft', 'pending_signature', 'signed', 'expired', 'cancelled']::text[])
    ) AS x(type_name, expected_values)
  )
  SELECT count(*)
  INTO missing_enum_count
  FROM expected_enums e
  WHERE EXISTS (
    SELECT 1
    FROM unnest(e.expected_values) v(value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum pe ON pe.enumtypid = t.oid
      WHERE t.typname = e.type_name
        AND pe.enumlabel = v.value
    )
  );

  IF missing_enum_count > 0 THEN
    RAISE EXCEPTION 'Enum coverage mismatch detected for % enum type(s)', missing_enum_count;
  END IF;

  SELECT count(*)
  INTO missing_exclusion_count
  FROM (VALUES
    ('bookings', 'bookings_no_overlapping_active_slots')
  ) AS expected_exclusion(table_name, constraint_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = expected_exclusion.constraint_name
      AND c.conrelid = format('public.%s', expected_exclusion.table_name)::regclass
      AND c.contype = 'x'
  );

  IF missing_exclusion_count > 0 THEN
    RAISE EXCEPTION 'Missing % expected exclusion constraints', missing_exclusion_count;
  END IF;

  SELECT
    COALESCE((SELECT count(*) FROM public.rent_payments rp LEFT JOIN public.profiles p ON p.id = rp.tenant_id WHERE rp.tenant_id IS NOT NULL AND p.id IS NULL), 0)
    + COALESCE((SELECT count(*) FROM public.bookings b LEFT JOIN public.amenities a ON a.id = b.amenity_id WHERE a.id IS NULL), 0)
    + COALESCE((SELECT count(*) FROM public.documents d LEFT JOIN public.units u ON u.id = d.unit_id WHERE d.unit_id IS NOT NULL AND u.id IS NULL), 0)
  INTO orphan_count;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned records across rent_payments/bookings/documents', orphan_count;
  END IF;
END
$$;

ROLLBACK;
