-- Core schema foundations for Roomsily domain objects.
-- This migration runs before other feature-specific migrations so later files
-- can safely reference these tables, policies, and helper functions.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ------------------------------------------------------------
-- Households keep shared chores scoped to a group of roommates.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'households'
      AND policyname = 'Authenticated users can view households'
  ) THEN
    EXECUTE $$CREATE POLICY "Authenticated users can view households"
      ON public.households
      FOR SELECT
      USING (auth.uid() IS NOT NULL);$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_households_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_households_updated_at
      BEFORE UPDATE ON public.households
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

-- ------------------------------------------------------------
-- Units represent an individual rentable space inside a building.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  building_id UUID,
  unit_number TEXT NOT NULL,
  name TEXT,
  description TEXT,
  bedrooms SMALLINT,
  bathrooms SMALLINT,
  square_feet INTEGER,
  rent_cents INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_units_building_id ON public.units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_unit_number ON public.units(unit_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_units_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_units_updated_at
      BEFORE UPDATE ON public.units
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

-- ------------------------------------------------------------
-- Profiles extend auth.users with tenant specific metadata.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT UNIQUE,
  full_name TEXT,
  username TEXT UNIQUE,
  website TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'roommate', 'property_manager', 'admin', 'user')),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  phone TEXT,
  language TEXT,
  stripe_customer_id TEXT,
  rent_share NUMERIC(5,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can view their profile'
  ) THEN
    EXECUTE $$CREATE POLICY "Users can view their profile"
      ON public.profiles
      FOR SELECT
      USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can modify their profile'
  ) THEN
    EXECUTE $$CREATE POLICY "Users can modify their profile"
      ON public.profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can update their profile'
  ) THEN
    EXECUTE $$CREATE POLICY "Users can update their profile"
      ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Property staff manage profiles'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage profiles"
      ON public.profiles
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_profiles_unit_id ON public.profiles(unit_id);
CREATE INDEX IF NOT EXISTS idx_profiles_unit_role ON public.profiles(unit_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

-- Policies that rely on profiles for household and unit access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'households'
      AND policyname = 'Property staff manage households'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage households"
      ON public.households
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'units'
      AND policyname = 'Members can view their unit'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can view their unit"
      ON public.units
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('property_manager', 'admin') OR p.unit_id = units.id)
      ));$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'units'
      AND policyname = 'Property staff manage units'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage units"
      ON public.units
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

-- ------------------------------------------------------------
-- Amenities and bookings orchestrate shared resource usage.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  building_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  capacity INTEGER,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_amenities_unit_id ON public.amenities(unit_id);
CREATE INDEX IF NOT EXISTS idx_amenities_building_id ON public.amenities(building_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_amenities_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_amenities_updated_at
      BEFORE UPDATE ON public.amenities
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'amenities'
      AND policyname = 'Members can view amenities'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can view amenities"
      ON public.amenities
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('property_manager', 'admin') OR p.unit_id = amenities.unit_id)
      ));$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'amenities'
      AND policyname = 'Property staff manage amenities'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage amenities"
      ON public.amenities
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  building_id UUID,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  recurrence_rule TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bookings_building_start_time ON public.bookings(building_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_amenity_time_window ON public.bookings(amenity_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_creator_status ON public.bookings(created_by, status, start_time DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_bookings_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON public.bookings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Members can view bookings they are involved with'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can view bookings they are involved with"
      ON public.bookings
      FOR SELECT
      USING (
        auth.uid() = created_by
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND (p.role IN ('property_manager', 'admin') OR p.unit_id = bookings.unit_id)
        )
      );$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Members can create bookings'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can create bookings"
      ON public.bookings
      FOR INSERT
      WITH CHECK (auth.uid() = created_by);$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Members can update their bookings'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can update their bookings"
      ON public.bookings
      FOR UPDATE
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bookings'
      AND policyname = 'Property staff manage bookings'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage bookings"
      ON public.bookings
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

-- ------------------------------------------------------------
-- Messaging system for roommate collaboration.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'archived')),
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_threads_unit_id ON public.threads(unit_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_threads_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_threads_updated_at
      BEFORE UPDATE ON public.threads
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'threads'
      AND policyname = 'Members can view unit threads'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can view unit threads"
      ON public.threads
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND (p.role IN ('property_manager', 'admin') OR p.unit_id = threads.unit_id)
        )
      );$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'threads'
      AND policyname = 'Members can create threads'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can create threads"
      ON public.threads
      FOR INSERT
      WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND (p.role IN ('property_manager', 'admin') OR p.unit_id = threads.unit_id)
        )
      );$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'threads'
      AND policyname = 'Members can update their threads'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can update their threads"
      ON public.threads
      FOR UPDATE
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'threads'
      AND policyname = 'Property staff manage threads'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage threads"
      ON public.threads
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'announcement', 'system')),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_thread_id_created_at ON public.messages(thread_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_messages_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_messages_updated_at
      BEFORE UPDATE ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Members can view thread messages'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can view thread messages"
      ON public.messages
      FOR SELECT
      USING (EXISTS (
        SELECT 1
        FROM public.threads t
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE t.id = messages.thread_id
          AND (p.role IN ('property_manager', 'admin') OR p.unit_id = t.unit_id)
      ));$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Members can post messages'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can post messages"
      ON public.messages
      FOR INSERT
      WITH CHECK (
        auth.uid() = sender_id AND EXISTS (
          SELECT 1
          FROM public.threads t
          JOIN public.profiles p ON p.id = auth.uid()
          WHERE t.id = messages.thread_id
            AND (p.role IN ('property_manager', 'admin') OR p.unit_id = t.unit_id)
        )
      );$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Members can edit their messages'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can edit their messages"
      ON public.messages
      FOR UPDATE
      USING (auth.uid() = sender_id)
      WITH CHECK (auth.uid() = sender_id);$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND policyname = 'Property staff moderate messages'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff moderate messages"
      ON public.messages
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

-- ------------------------------------------------------------
-- Floorplans with roommate-specific annotations.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.floorplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  svg_url TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.floorplans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_floorplans_unit_id ON public.floorplans(unit_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_floorplans_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_floorplans_updated_at
      BEFORE UPDATE ON public.floorplans
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'floorplans'
      AND policyname = 'Members can view floorplans'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can view floorplans"
      ON public.floorplans
      FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.role IN ('property_manager', 'admin') OR p.unit_id = floorplans.unit_id)
      ));$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'floorplans'
      AND policyname = 'Property staff manage floorplans'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage floorplans"
      ON public.floorplans
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.floorplan_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  floorplan_id UUID NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  coordinates JSONB NOT NULL,
  color TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.floorplan_annotations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_floorplan_annotations_floorplan_id ON public.floorplan_annotations(floorplan_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_floorplan_annotations_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_floorplan_annotations_updated_at
      BEFORE UPDATE ON public.floorplan_annotations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'floorplan_annotations'
      AND policyname = 'Members can view floorplan annotations'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can view floorplan annotations"
      ON public.floorplan_annotations
      FOR SELECT
      USING (EXISTS (
        SELECT 1
        FROM public.floorplans f
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE f.id = floorplan_annotations.floorplan_id
          AND (p.role IN ('property_manager', 'admin') OR p.unit_id = f.unit_id)
      ));$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'floorplan_annotations'
      AND policyname = 'Members can manage their annotations'
  ) THEN
    EXECUTE $$CREATE POLICY "Members can manage their annotations"
      ON public.floorplan_annotations
      FOR ALL
      USING (auth.uid() = created_by)
      WITH CHECK (auth.uid() = created_by);$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'floorplan_annotations'
      AND policyname = 'Property staff manage annotations'
  ) THEN
    EXECUTE $$CREATE POLICY "Property staff manage annotations"
      ON public.floorplan_annotations
      FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('property_manager', 'admin')
      ));$$;
  END IF;
END$$;

-- ------------------------------------------------------------
-- Meetings and user tokens support integrations with external APIs.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  google_event_id TEXT,
  summary TEXT,
  description TEXT,
  google_event_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meetings'
      AND policyname = 'Users manage their meetings'
  ) THEN
    EXECUTE $$CREATE POLICY "Users manage their meetings"
      ON public.meetings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_meetings_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_meetings_updated_at
      BEFORE UPDATE ON public.meetings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_tokens'
      AND policyname = 'Users manage their tokens'
  ) THEN
    EXECUTE $$CREATE POLICY "Users manage their tokens"
      ON public.user_tokens
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);$$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_tokens_updated_at'
  ) THEN
    EXECUTE $$CREATE TRIGGER update_user_tokens_updated_at
      BEFORE UPDATE ON public.user_tokens
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();$$;
  END IF;
END$$;
