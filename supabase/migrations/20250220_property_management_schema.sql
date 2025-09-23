-- Multi-tenant property management schema
-- Defines properties, units, and membership tables to support roommate workflows

-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  property_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create units table
CREATE TABLE IF NOT EXISTS public.units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor INTEGER,
  bedrooms INTEGER,
  bathrooms NUMERIC(4,1),
  square_feet INTEGER,
  rent_amount INTEGER,
  rent_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (rent_frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table tracking unit membership history
CREATE TABLE IF NOT EXISTS public.unit_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('tenant', 'roommate', 'property_manager', 'admin')),
  invite_status TEXT NOT NULL DEFAULT 'accepted' CHECK (invite_status IN ('pending', 'accepted', 'declined', 'revoked')),
  rent_share NUMERIC(6,2),
  move_in_date DATE,
  move_out_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (unit_id, profile_id)
);

-- Ensure profile unit references align with new units table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_unit_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_unit_id_fkey
      FOREIGN KEY (unit_id)
      REFERENCES public.units(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'unit_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'documents_unit_id_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_unit_id_fkey
      FOREIGN KEY (unit_id)
      REFERENCES public.units(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'maintenance_requests'
      AND column_name = 'unit_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'maintenance_requests_unit_id_fkey'
  ) THEN
    ALTER TABLE public.maintenance_requests
      ADD CONSTRAINT maintenance_requests_unit_id_fkey
      FOREIGN KEY (unit_id)
      REFERENCES public.units(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'visitor_logs'
      AND column_name = 'unit_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'visitor_logs_unit_id_fkey'
  ) THEN
    ALTER TABLE public.visitor_logs
      ADD CONSTRAINT visitor_logs_unit_id_fkey
      FOREIGN KEY (unit_id)
      REFERENCES public.units(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rent_payments'
      AND column_name = 'unit_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rent_payments_unit_id_fkey'
  ) THEN
    ALTER TABLE public.rent_payments
      ADD CONSTRAINT rent_payments_unit_id_fkey
      FOREIGN KEY (unit_id)
      REFERENCES public.units(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_properties_property_manager ON public.properties(property_manager_id);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON public.properties(city, state);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_rent_amount ON public.units(rent_amount);
CREATE INDEX IF NOT EXISTS idx_unit_members_unit_id ON public.unit_members(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_profile_id ON public.unit_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_unit_members_role ON public.unit_members(role);

-- Enable row level security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_members ENABLE ROW LEVEL SECURITY;

-- Policies for properties
CREATE POLICY "Managers can manage their properties" ON public.properties
  FOR ALL USING (
    property_manager_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles cup
      WHERE cup.id = auth.uid()
        AND cup.role = 'admin'
    )
  )
  WITH CHECK (
    property_manager_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles cup
      WHERE cup.id = auth.uid()
        AND cup.role = 'admin'
    )
  );

CREATE POLICY "Residents can view their property" ON public.properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.profiles p ON p.unit_id = u.id
      WHERE u.property_id = properties.id
        AND p.id = auth.uid()
    )
  );

-- Policies for units
CREATE POLICY "Managers can manage property units" ON public.units
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.properties pr
      WHERE pr.id = units.property_id
        AND (
          pr.property_manager_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles cup
            WHERE cup.id = auth.uid()
              AND cup.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.properties pr
      WHERE pr.id = units.property_id
        AND (
          pr.property_manager_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles cup
            WHERE cup.id = auth.uid()
              AND cup.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "Residents can view their unit" ON public.units
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unit_id = units.id
    )
  );

-- Policies for unit members
CREATE POLICY "Managers can manage unit members" ON public.unit_members
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties pr ON pr.id = u.property_id
      WHERE u.id = unit_members.unit_id
        AND (
          pr.property_manager_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles cup
            WHERE cup.id = auth.uid()
              AND cup.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.units u
      JOIN public.properties pr ON pr.id = u.property_id
      WHERE u.id = unit_members.unit_id
        AND (
          pr.property_manager_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles cup
            WHERE cup.id = auth.uid()
              AND cup.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "Members can view their household roster" ON public.unit_members
  FOR SELECT USING (
    unit_members.profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unit_id = unit_members.unit_id
    )
  );

-- Update triggers for timestamps
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unit_members_updated_at
  BEFORE UPDATE ON public.unit_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
