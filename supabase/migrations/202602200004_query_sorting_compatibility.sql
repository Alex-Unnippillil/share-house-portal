BEGIN;

-- Align public.bookings with application query expectations.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS amenity_name text,
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_booking_id text,
  ADD COLUMN IF NOT EXISTS source_event_type_id text,
  ADD COLUMN IF NOT EXISTS source_payload jsonb,
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb,
  ADD COLUMN IF NOT EXISTS recurrence_id text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

UPDATE public.bookings b
SET tenant_id = COALESCE(b.tenant_id, b.booked_by)
WHERE b.tenant_id IS NULL
  AND b.booked_by IS NOT NULL;

UPDATE public.bookings b
SET amenity_name = COALESCE(b.amenity_name, a.name)
FROM public.amenities a
WHERE b.amenity_id = a.id
  AND b.amenity_name IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_source_check'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_source_check
      CHECK (source IN ('calcom', 'manual'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_source_booking_id_idx
  ON public.bookings (source, source_booking_id)
  WHERE source_booking_id IS NOT NULL;

-- Add the indexes required by filtering + ordered timeline views.
CREATE INDEX IF NOT EXISTS idx_documents_tenant_status_created_at
  ON public.documents(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_unit_status_created_at
  ON public.documents(unit_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_envelope_id
  ON public.documents(documenso_envelope_id);

CREATE INDEX IF NOT EXISTS idx_profiles_unit_role
  ON public.profiles(unit_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_bookings_property_start_time
  ON public.bookings(property_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_amenity_time_window
  ON public.bookings(amenity_id, start_time DESC, end_time DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status_start_time
  ON public.bookings(tenant_id, status, start_time DESC);

-- Align visitor log columns used by API routes and sorting/export actions.
ALTER TABLE public.visitor_logs
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS host_roommate_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS check_in_date timestamptz,
  ADD COLUMN IF NOT EXISTS check_out_date timestamptz,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS special_notes text,
  ADD COLUMN IF NOT EXISTS requires_manager_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision_notes text,
  ADD COLUMN IF NOT EXISTS policy_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS policy_violations jsonb,
  ADD COLUMN IF NOT EXISTS consecutive_nights integer,
  ADD COLUMN IF NOT EXISTS last_action_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz;

UPDATE public.visitor_logs
SET check_in_date = COALESCE(check_in_date, arrival_date::timestamptz),
    check_out_date = COALESCE(check_out_date, departure_date::timestamptz),
    approval_status = COALESCE(approval_status, status::text),
    purpose = COALESCE(purpose, reason)
WHERE check_in_date IS NULL
   OR check_out_date IS NULL
   OR purpose IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'visitor_logs_approval_status_check'
      AND conrelid = 'public.visitor_logs'::regclass
  ) THEN
    ALTER TABLE public.visitor_logs
      ADD CONSTRAINT visitor_logs_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_visitor_logs_unit_created_at
  ON public.visitor_logs(unit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_host_created_at
  ON public.visitor_logs(host_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_check_in_date
  ON public.visitor_logs(check_in_date DESC);

COMMIT;
