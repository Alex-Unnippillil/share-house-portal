-- RBAC/RLS verification script
-- Run after migrations + seed in a disposable DB:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/rls_rbac_verification.sql

BEGIN;

-- Example seeded identities (replace UUIDs with your seed values if needed)
-- tenant_a_1 / roommate_a_1 belong to unit_a
-- tenant_b_1 belongs to unit_b
-- manager_a assigned to unit_a, manager_b to unit_b
-- admin_1 is global admin

-- Configure helper variables for readability.
SELECT
  set_config('request.jwt.claim.role', 'authenticated', true),
  set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true); -- tenant_a_1

-- Positive path: tenant can read their own unit document.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.documents d
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE d.unit_id = p.unit_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Expected tenant to read at least one document in their own unit';
  END IF;
END;
$$;

-- Negative path: tenant cannot read cross-unit documents.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.documents
  WHERE unit_id = '00000000-0000-0000-0000-00000000b001'::uuid;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-unit document read should be denied for tenant';
  END IF;
END;
$$;

-- Manager in unit A can access unit A payments.
SELECT
  set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000m1', true); -- manager_a

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.rent_payments
  WHERE unit_id = '00000000-0000-0000-0000-00000000a001'::uuid;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Manager should be able to read assigned unit payments';
  END IF;
END;
$$;

-- Manager in unit A cannot access unit B payments.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.rent_payments
  WHERE unit_id = '00000000-0000-0000-0000-00000000b001'::uuid;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Manager cross-unit payment read should be denied';
  END IF;
END;
$$;

-- Admin override can read everything.
SELECT
  set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', true); -- admin_1

DO $$
DECLARE
  v_docs integer;
  v_payments integer;
BEGIN
  SELECT count(*) INTO v_docs FROM public.documents;
  SELECT count(*) INTO v_payments FROM public.rent_payments;

  IF v_docs = 0 OR v_payments = 0 THEN
    RAISE EXCEPTION 'Admin should have global visibility for docs and payments';
  END IF;
END;
$$;

ROLLBACK;
