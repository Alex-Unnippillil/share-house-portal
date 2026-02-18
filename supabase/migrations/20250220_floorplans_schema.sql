-- Floorplans schema: SVG storage references, annotations, and version history.
CREATE TABLE IF NOT EXISTS public.floorplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID,
  unit_id UUID,
  storage_path TEXT NOT NULL,
  original_file_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.floorplan_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id UUID NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  marker_type TEXT NOT NULL CHECK (marker_type IN ('room', 'storage', 'chore')),
  label TEXT NOT NULL,
  note TEXT,
  x_position NUMERIC(5,2) NOT NULL CHECK (x_position >= 0 AND x_position <= 100),
  y_position NUMERIC(5,2) NOT NULL CHECK (y_position >= 0 AND y_position <= 100),
  visibility_scope TEXT NOT NULL DEFAULT 'all_roommates' CHECK (visibility_scope IN ('all_roommates', 'selected_roommates', 'private')),
  visible_to_user_ids UUID[] NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.floorplan_annotation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES public.floorplan_annotations(id) ON DELETE CASCADE,
  floorplan_id UUID NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'rollback')),
  snapshot JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_floorplans_property_unit ON public.floorplans (property_id, unit_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_floorplan_annotations_floorplan ON public.floorplan_annotations (floorplan_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_floorplan_annotations_visibility ON public.floorplan_annotations USING GIN (visible_to_user_ids);
CREATE INDEX IF NOT EXISTS idx_floorplan_annotation_versions_annotation ON public.floorplan_annotation_versions (annotation_id, version DESC);

ALTER TABLE public.floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplan_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplan_annotation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Floorplans are visible to household users" ON public.floorplans
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          (floorplans.unit_id IS NOT NULL AND p.unit_id = floorplans.unit_id)
          OR p.role IN ('property_manager', 'admin')
        )
    )
  );

CREATE POLICY IF NOT EXISTS "Managers can create floorplans" ON public.floorplans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Managers can update floorplans" ON public.floorplans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Floorplan annotations selectable by unit members" ON public.floorplan_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.floorplans f
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE f.id = floorplan_annotations.floorplan_id
        AND (
          p.role IN ('property_manager', 'admin')
          OR p.unit_id = f.unit_id
        )
        AND (
          floorplan_annotations.visibility_scope = 'all_roommates'
          OR (floorplan_annotations.visibility_scope = 'private' AND floorplan_annotations.created_by = auth.uid())
          OR (floorplan_annotations.visibility_scope = 'selected_roommates' AND auth.uid() = ANY(floorplan_annotations.visible_to_user_ids))
        )
    )
  );

CREATE POLICY IF NOT EXISTS "Roommates can create annotations" ON public.floorplan_annotations
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1
      FROM public.floorplans f
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE f.id = floorplan_annotations.floorplan_id
        AND (p.unit_id = f.unit_id OR p.role IN ('property_manager', 'admin'))
    )
  );

CREATE POLICY IF NOT EXISTS "Authors and managers can update annotations" ON public.floorplan_annotations
  FOR UPDATE USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Version history visible to annotation readers" ON public.floorplan_annotation_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.floorplan_annotations a
      WHERE a.id = floorplan_annotation_versions.annotation_id
    )
  );

CREATE OR REPLACE FUNCTION public.floorplan_annotations_version_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_action TEXT;
  v_record public.floorplan_annotations;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_record := NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
    v_record := NEW;
  ELSE
    v_action := 'deleted';
    v_record := OLD;
  END IF;

  INSERT INTO public.floorplan_annotation_versions (
    annotation_id,
    floorplan_id,
    version,
    action,
    snapshot,
    changed_by,
    changed_at
  )
  VALUES (
    v_record.id,
    v_record.floorplan_id,
    v_record.version,
    v_action,
    to_jsonb(v_record),
    auth.uid(),
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS floorplan_annotations_version_audit_insert ON public.floorplan_annotations;
DROP TRIGGER IF EXISTS floorplan_annotations_version_audit_update ON public.floorplan_annotations;
DROP TRIGGER IF EXISTS floorplan_annotations_version_audit_delete ON public.floorplan_annotations;

CREATE TRIGGER floorplan_annotations_version_audit_insert
  AFTER INSERT ON public.floorplan_annotations
  FOR EACH ROW EXECUTE FUNCTION public.floorplan_annotations_version_audit();

CREATE TRIGGER floorplan_annotations_version_audit_update
  BEFORE UPDATE ON public.floorplan_annotations
  FOR EACH ROW EXECUTE FUNCTION public.floorplan_annotations_version_audit();

CREATE TRIGGER floorplan_annotations_version_audit_delete
  BEFORE DELETE ON public.floorplan_annotations
  FOR EACH ROW EXECUTE FUNCTION public.floorplan_annotations_version_audit();
