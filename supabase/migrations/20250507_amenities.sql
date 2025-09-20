CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA public;

CREATE TABLE public.amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL UNIQUE,
  description text,
  rules text,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.amenity_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  lease_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  CONSTRAINT amenity_reservations_status_check CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  CONSTRAINT amenity_reservations_time_check CHECK (start_time < end_time)
);

ALTER TABLE public.amenity_reservations ENABLE ROW LEVEL SECURITY;

CREATE INDEX amenity_reservations_amenity_start_idx ON public.amenity_reservations (amenity_id, start_time);
CREATE INDEX amenity_reservations_lease_idx ON public.amenity_reservations (lease_id, start_time);

CREATE UNIQUE INDEX amenity_reservations_no_overlap
ON public.amenity_reservations
USING gist (
  amenity_id,
  tstzrange(start_time, end_time, '[)')
)
WHERE status IN ('pending', 'approved');

CREATE POLICY "Authenticated users can view amenities" ON public.amenities
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff can manage amenities" ON public.amenities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
  )
);

CREATE POLICY "Tenants can view own reservations" ON public.amenity_reservations
FOR SELECT
TO authenticated
USING (lease_id = auth.uid());

CREATE POLICY "Tenants can manage own reservations" ON public.amenity_reservations
FOR INSERT
TO authenticated
WITH CHECK (lease_id = auth.uid());

CREATE POLICY "Tenants can update own reservations" ON public.amenity_reservations
FOR UPDATE
TO authenticated
USING (lease_id = auth.uid())
WITH CHECK (lease_id = auth.uid());

CREATE POLICY "Tenants can delete own reservations" ON public.amenity_reservations
FOR DELETE
TO authenticated
USING (lease_id = auth.uid());

CREATE POLICY "Staff can view all reservations" ON public.amenity_reservations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
  )
);

CREATE POLICY "Staff can manage reservations" ON public.amenity_reservations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
  )
);
