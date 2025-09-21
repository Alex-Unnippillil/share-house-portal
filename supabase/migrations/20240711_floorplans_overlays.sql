-- Floorplan storage and annotation infrastructure

-- Ensure uuid generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Storage bucket for floorplan assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('floorplans', 'floorplans', false)
ON CONFLICT (id) DO NOTHING;

-- Buildings and units baseline schema
CREATE TABLE IF NOT EXISTS public.buildings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    unit_code text NOT NULL,
    floor integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (building_id, unit_code)
);

CREATE TABLE IF NOT EXISTS public.unit_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_role text DEFAULT 'tenant',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (unit_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS public.building_managers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (building_id, manager_id)
);

CREATE TABLE IF NOT EXISTS public.floorplans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    name text NOT NULL,
    asset_path text NOT NULL,
    content_type text,
    width integer,
    height integer,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (asset_path)
);

CREATE TABLE IF NOT EXISTS public.floorplan_annotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    floorplan_id uuid NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
    label text NOT NULL,
    annotation_type text NOT NULL DEFAULT 'note',
    color text,
    geometry jsonb NOT NULL,
    notes text,
    assigned_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_units_building_id ON public.units(building_id);
CREATE INDEX IF NOT EXISTS idx_unit_assignments_unit_id ON public.unit_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_assignments_tenant_id ON public.unit_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_floorplans_unit_id ON public.floorplans(unit_id);
CREATE INDEX IF NOT EXISTS idx_floorplans_building_id ON public.floorplans(building_id);
CREATE INDEX IF NOT EXISTS idx_floorplan_annotations_floorplan_id ON public.floorplan_annotations(floorplan_id);
CREATE INDEX IF NOT EXISTS idx_floorplan_annotations_assigned_profile_id ON public.floorplan_annotations(assigned_profile_id);

-- Row level security configuration
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplan_annotations ENABLE ROW LEVEL SECURITY;

-- Helper expressions
CREATE OR REPLACE VIEW public.v_admin_profiles AS
SELECT id
FROM public.profiles
WHERE role = 'admin';

-- Buildings policies
CREATE POLICY "Tenants see their building" ON public.buildings
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.unit_assignments ua
        JOIN public.units u ON u.id = ua.unit_id
        WHERE ua.tenant_id = auth.uid() AND u.building_id = buildings.id
    )
    OR EXISTS (
        SELECT 1
        FROM public.building_managers bm
        WHERE bm.manager_id = auth.uid() AND bm.building_id = buildings.id
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

CREATE POLICY "Managers manage buildings" ON public.buildings
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

CREATE POLICY "Admin update buildings" ON public.buildings
FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
);

CREATE POLICY "Admin delete buildings" ON public.buildings
FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
);

-- Units policies
CREATE POLICY "Tenants see their unit" ON public.units
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.unit_assignments ua
        WHERE ua.unit_id = units.id AND ua.tenant_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.building_managers bm
        WHERE bm.manager_id = auth.uid() AND bm.building_id = units.building_id
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

CREATE POLICY "Admins manage units" ON public.units
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
);

-- Unit assignment policies
CREATE POLICY "Tenants view own assignment" ON public.unit_assignments
FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Roommates view shared assignments" ON public.unit_assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.unit_assignments ua_self
        WHERE ua_self.unit_id = unit_assignments.unit_id AND ua_self.tenant_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.building_managers bm
        JOIN public.units u ON u.building_id = bm.building_id
        WHERE bm.manager_id = auth.uid() AND u.id = unit_assignments.unit_id
    )
);

CREATE POLICY "Managers view unit assignments" ON public.unit_assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.building_managers bm
        JOIN public.units u ON u.building_id = bm.building_id
        WHERE bm.manager_id = auth.uid() AND u.id = unit_assignments.unit_id
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

CREATE POLICY "Admins manage assignments" ON public.unit_assignments
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
);

-- Building manager policies
CREATE POLICY "Managers view assignments" ON public.building_managers
FOR SELECT USING (
    manager_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

CREATE POLICY "Admins manage building managers" ON public.building_managers
FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid())
);

-- Floorplan policies
CREATE POLICY "Tenants view unit floorplans" ON public.floorplans
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.unit_assignments ua
        WHERE ua.unit_id = floorplans.unit_id AND ua.tenant_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.building_managers bm
        WHERE bm.manager_id = auth.uid() AND bm.building_id = floorplans.building_id
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

CREATE POLICY "Managers maintain floorplans" ON public.floorplans
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.building_managers bm
        WHERE bm.manager_id = auth.uid() AND bm.building_id = floorplans.building_id
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.building_managers bm
        WHERE bm.manager_id = auth.uid() AND bm.building_id = floorplans.building_id
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

-- Floorplan annotation policies
CREATE POLICY "Tenants view unit overlays" ON public.floorplan_annotations
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.floorplans f
        JOIN public.unit_assignments ua ON ua.unit_id = f.unit_id
        WHERE f.id = floorplan_annotations.floorplan_id AND ua.tenant_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.floorplans f
        JOIN public.building_managers bm ON bm.building_id = f.building_id
        WHERE f.id = floorplan_annotations.floorplan_id AND bm.manager_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

CREATE POLICY "Managers maintain overlays" ON public.floorplan_annotations
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.floorplans f
        JOIN public.building_managers bm ON bm.building_id = f.building_id
        WHERE f.id = floorplan_annotations.floorplan_id AND bm.manager_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.floorplans f
        JOIN public.building_managers bm ON bm.building_id = f.building_id
        WHERE f.id = floorplan_annotations.floorplan_id AND bm.manager_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
    )
);

-- Storage policies for floorplans bucket
CREATE POLICY "Floorplan read access" ON storage.objects
FOR SELECT TO authenticated USING (
    bucket_id = 'floorplans'
    AND (
        EXISTS (
            SELECT 1
            FROM public.floorplans f
            JOIN public.unit_assignments ua ON ua.unit_id = f.unit_id
            WHERE f.asset_path = storage.objects.name AND ua.tenant_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.floorplans f
            JOIN public.building_managers bm ON bm.building_id = f.building_id
            WHERE f.asset_path = storage.objects.name AND bm.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
        )
    )
);

CREATE POLICY "Floorplan asset maintenance" ON storage.objects
FOR ALL TO authenticated USING (
    bucket_id = 'floorplans'
    AND (
        EXISTS (
            SELECT 1
            FROM public.floorplans f
            JOIN public.building_managers bm ON bm.building_id = f.building_id
            WHERE f.asset_path = storage.objects.name AND bm.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
        )
    )
) WITH CHECK (
    bucket_id = 'floorplans'
    AND (
        EXISTS (
            SELECT 1
            FROM public.floorplans f
            JOIN public.building_managers bm ON bm.building_id = f.building_id
            WHERE f.asset_path = storage.objects.name AND bm.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.v_admin_profiles ap WHERE ap.id = auth.uid()
        )
    )
);
