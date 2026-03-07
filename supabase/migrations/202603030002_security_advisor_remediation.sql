BEGIN;

-- Ensure compatibility views execute with caller permissions, not creator privileges.
ALTER VIEW IF EXISTS public.amenity_bookings
  SET (security_invoker = true);

-- Secure floorplan annotation overlays with explicit RLS.
ALTER TABLE IF EXISTS public.floorplan_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Floorplan annotations read scoped" ON public.floorplan_annotations;
CREATE POLICY "Floorplan annotations read scoped" ON public.floorplan_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.floorplans f
      WHERE f.id = floorplan_annotations.floorplan_id
        AND public.can_access_unit(f.unit_id)
    )
    AND (
      floorplan_annotations.profile_id IS NULL
      OR floorplan_annotations.profile_id = auth.uid()
      OR public.current_user_role() IN ('property_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Floorplan annotations create scoped" ON public.floorplan_annotations;
CREATE POLICY "Floorplan annotations create scoped" ON public.floorplan_annotations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.floorplans f
      WHERE f.id = floorplan_annotations.floorplan_id
        AND public.can_access_unit(f.unit_id)
    )
    AND (
      created_by = auth.uid()
      OR public.current_user_role() IN ('property_manager', 'admin')
    )
    AND (
      profile_id IS NULL
      OR profile_id = auth.uid()
      OR public.current_user_role() IN ('property_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Floorplan annotations update scoped" ON public.floorplan_annotations;
CREATE POLICY "Floorplan annotations update scoped" ON public.floorplan_annotations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.floorplans f
      WHERE f.id = floorplan_annotations.floorplan_id
        AND public.can_access_unit(f.unit_id)
    )
    AND (
      created_by = auth.uid()
      OR public.current_user_role() IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.floorplans f
      WHERE f.id = floorplan_annotations.floorplan_id
        AND public.can_access_unit(f.unit_id)
    )
    AND (
      created_by = auth.uid()
      OR public.current_user_role() IN ('property_manager', 'admin')
    )
    AND (
      profile_id IS NULL
      OR profile_id = auth.uid()
      OR public.current_user_role() IN ('property_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Floorplan annotations delete scoped" ON public.floorplan_annotations;
CREATE POLICY "Floorplan annotations delete scoped" ON public.floorplan_annotations
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.floorplans f
      WHERE f.id = floorplan_annotations.floorplan_id
        AND public.can_access_unit(f.unit_id)
    )
    AND (
      created_by = auth.uid()
      OR public.current_user_role() IN ('property_manager', 'admin')
    )
  );

-- Protect integrity findings table (contains potentially sensitive operational context).
ALTER TABLE IF EXISTS public.data_integrity_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view integrity findings" ON public.data_integrity_findings;
CREATE POLICY "Managers can view integrity findings" ON public.data_integrity_findings
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Service role can manage integrity findings" ON public.data_integrity_findings;
CREATE POLICY "Service role can manage integrity findings" ON public.data_integrity_findings
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;
