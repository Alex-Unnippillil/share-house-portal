CREATE TABLE public.visitor_requests (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  member_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  date_range daterange NOT NULL,
  reason text NOT NULL,
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT visitor_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text]))
);

CREATE INDEX visitor_requests_member_id_idx ON public.visitor_requests (member_id);
CREATE INDEX visitor_requests_status_idx ON public.visitor_requests (status);

ALTER TABLE public.visitor_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roommates and admins can view visitor requests"
  ON public.visitor_requests
  FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR approved_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'property_manager')
    )
  );

CREATE POLICY "Roommates can register visitor requests"
  ON public.visitor_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "Roommates and admins can update visitor requests"
  ON public.visitor_requests
  FOR UPDATE
  TO authenticated
  USING (
    member_id = auth.uid()
    OR approved_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'property_manager')
    )
  )
  WITH CHECK (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'property_manager')
    )
  );

CREATE POLICY "Roommates can remove their visitor requests"
  ON public.visitor_requests
  FOR DELETE
  TO authenticated
  USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'property_manager')
    )
  );

CREATE OR REPLACE FUNCTION public.set_visitor_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER visitor_requests_set_updated_at
BEFORE UPDATE ON public.visitor_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_visitor_requests_updated_at();
