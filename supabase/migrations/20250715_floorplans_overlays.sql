CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO storage.buckets (id, name, public)
SELECT 'floorplans', 'floorplans', false
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'floorplans'
);

CREATE TYPE public.floorplan_annotation_type AS ENUM ('storage', 'chore', 'note', 'other');
CREATE TYPE public.unit_membership_role AS ENUM ('tenant', 'roommate', 'property_manager');

CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  street_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  bedrooms smallint,
  bathrooms smallint,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (building_id, unit_number)
);

CREATE TABLE public.unit_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_role public.unit_membership_role NOT NULL DEFAULT 'tenant',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (unit_id, profile_id)
);

CREATE TABLE public.property_manager_buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (manager_id, building_id)
);

CREATE TABLE public.floorplans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/svg+xml',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (building_id, unit_id, name)
);

CREATE TABLE public.floorplan_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id uuid NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  label text NOT NULL,
  annotation_type public.floorplan_annotation_type NOT NULL DEFAULT 'other',
  geometry jsonb NOT NULL,
  metadata jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX floorplan_annotations_floorplan_id_idx ON public.floorplan_annotations (floorplan_id);
CREATE INDEX floorplan_annotations_profile_id_idx ON public.floorplan_annotations (profile_id);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_manager_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplan_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage buildings" ON public.buildings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Members view assigned buildings" ON public.buildings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unit_memberships um
      JOIN public.units u ON u.id = um.unit_id
      WHERE um.profile_id = auth.uid()
        AND u.building_id = buildings.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      WHERE pmb.manager_id = auth.uid()
        AND pmb.building_id = buildings.id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins manage units" ON public.units
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Managers manage assigned units" ON public.units
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      WHERE pmb.manager_id = auth.uid()
        AND pmb.building_id = units.building_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      WHERE pmb.manager_id = auth.uid()
        AND pmb.building_id = units.building_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Residents view units" ON public.units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unit_memberships um
      WHERE um.profile_id = auth.uid()
        AND um.unit_id = units.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      WHERE pmb.manager_id = auth.uid()
        AND pmb.building_id = units.building_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins manage unit memberships" ON public.unit_memberships
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Managers manage unit memberships" ON public.unit_memberships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      JOIN public.units u ON u.building_id = pmb.building_id
      WHERE pmb.manager_id = auth.uid()
        AND u.id = unit_memberships.unit_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      JOIN public.units u ON u.building_id = pmb.building_id
      WHERE pmb.manager_id = auth.uid()
        AND u.id = unit_memberships.unit_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Members view shared unit memberships" ON public.unit_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unit_memberships um
      WHERE um.unit_id = unit_memberships.unit_id
        AND um.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      JOIN public.units u ON u.building_id = pmb.building_id
      WHERE pmb.manager_id = auth.uid()
        AND u.id = unit_memberships.unit_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins manage manager assignments" ON public.property_manager_buildings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Managers view building assignments" ON public.property_manager_buildings
  FOR SELECT
  TO authenticated
  USING (
    property_manager_buildings.manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins manage floorplans" ON public.floorplans
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Managers manage assigned floorplans" ON public.floorplans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      WHERE pmb.manager_id = auth.uid()
        AND pmb.building_id = floorplans.building_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      WHERE pmb.manager_id = auth.uid()
        AND pmb.building_id = floorplans.building_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Residents view unit floorplans" ON public.floorplans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.unit_memberships um
      JOIN public.units u ON u.id = um.unit_id
      WHERE um.profile_id = auth.uid()
        AND (
          floorplans.unit_id = um.unit_id
          OR (floorplans.unit_id IS NULL AND u.building_id = floorplans.building_id)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_manager_buildings pmb
      WHERE pmb.manager_id = auth.uid()
        AND pmb.building_id = floorplans.building_id
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins manage floorplan annotations" ON public.floorplan_annotations
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY "Managers manage assigned annotations" ON public.floorplan_annotations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.floorplans fp
      JOIN public.property_manager_buildings pmb ON pmb.building_id = fp.building_id
      WHERE fp.id = floorplan_annotations.floorplan_id
        AND pmb.manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.floorplans fp
      JOIN public.property_manager_buildings pmb ON pmb.building_id = fp.building_id
      WHERE fp.id = floorplan_annotations.floorplan_id
        AND pmb.manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Residents view floorplan annotations" ON public.floorplan_annotations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.floorplans fp
      JOIN public.unit_memberships um ON um.unit_id = fp.unit_id
      WHERE fp.id = floorplan_annotations.floorplan_id
        AND fp.unit_id IS NOT NULL
        AND um.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.floorplans fp
      JOIN public.units u ON u.building_id = fp.building_id
      JOIN public.unit_memberships um ON um.unit_id = u.id
      WHERE fp.id = floorplan_annotations.floorplan_id
        AND fp.unit_id IS NULL
        AND um.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.floorplans fp
      JOIN public.property_manager_buildings pmb ON pmb.building_id = fp.building_id
      WHERE fp.id = floorplan_annotations.floorplan_id
        AND pmb.manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Managers maintain floorplan assets" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'floorplans'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'floorplans'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Members view floorplan assets" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'floorplans'
    AND (
      EXISTS (
        SELECT 1
        FROM public.floorplans fp
        JOIN public.unit_memberships um ON um.unit_id = fp.unit_id
        WHERE fp.storage_path = storage.objects.name
          AND fp.unit_id IS NOT NULL
          AND um.profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.floorplans fp
        JOIN public.units u ON u.building_id = fp.building_id
        JOIN public.unit_memberships um ON um.unit_id = u.id
        WHERE fp.storage_path = storage.objects.name
          AND fp.unit_id IS NULL
          AND um.profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.floorplans fp
        JOIN public.property_manager_buildings pmb ON pmb.building_id = fp.building_id
        WHERE fp.storage_path = storage.objects.name
          AND pmb.manager_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );
