BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure common updated_at trigger helper exists early in the migration chain
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Properties represent a collection of units managed by property staff
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  timezone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Units represent individual rentable spaces within a property
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  unit_number TEXT,
  floor TEXT,
  bedrooms SMALLINT,
  bathrooms NUMERIC(3,1),
  rent_amount INTEGER,
  rent_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (rent_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  rent_due_day SMALLINT CHECK (rent_due_day BETWEEN 1 AND 31),
  square_feet INTEGER,
  occupancy_limit SMALLINT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX idx_units_property_label ON public.units(property_id, label);
CREATE INDEX idx_units_status ON public.units(status);

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Households group roommates that share a unit and its amenities
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX idx_households_unit_id ON public.households(unit_id) WHERE unit_id IS NOT NULL;

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles extend auth.users with tenant specific metadata
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  email TEXT,
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
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_unit_id ON public.profiles(unit_id);
CREATE INDEX idx_profiles_email ON public.profiles(LOWER(email));

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Master list of amenities that can be booked or referenced in the UI
CREATE TABLE public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  amenity_type TEXT NOT NULL,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  booking_buffer_minutes INTEGER DEFAULT 15 CHECK (booking_buffer_minutes >= 0),
  booking_window_start TIME,
  booking_window_end TIME,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_amenities_property_id ON public.amenities(property_id);
CREATE INDEX idx_amenities_unit_id ON public.amenities(unit_id);
CREATE INDEX idx_amenities_type ON public.amenities(amenity_type);

CREATE TRIGGER update_amenities_updated_at
  BEFORE UPDATE ON public.amenities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meetings capture synced calendar events such as property walkthroughs
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  google_event_id TEXT,
  summary TEXT,
  description TEXT,
  google_event_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_meetings_user_id ON public.meetings(user_id);
CREATE INDEX idx_meetings_start_time ON public.meetings(start_time);

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User tokens store external provider refresh tokens for integrations like Google Calendar
CREATE TABLE public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX idx_user_tokens_user_id ON public.user_tokens(user_id);

CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messaging threads power the roommate discussion board
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived', 'locked')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_message_threads_unit_id ON public.message_threads(unit_id);
CREATE INDEX idx_message_threads_household_id ON public.message_threads(household_id);
CREATE INDEX idx_message_threads_status ON public.message_threads(status);
CREATE INDEX idx_message_threads_last_activity ON public.message_threads(last_activity_at DESC);

CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Messages hold individual posts within a thread
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL DEFAULT 'message' CHECK (message_type IN ('message', 'system', 'announcement', 'poll')),
  body TEXT,
  rich_content JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX idx_messages_author_id ON public.messages(author_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reactions capture quick emoji acknowledgement on a message
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message_id ON public.message_reactions(message_id);

-- Attachments reference files stored in Supabase Storage for a given message
CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);

-- Tracks when a roommate has read a specific message
CREATE TABLE public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE (message_id, user_id)
);

CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);

-- Poll definitions allow threads to gather roommate consensus
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  allow_multiple BOOLEAN DEFAULT FALSE,
  closes_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_polls_thread_id ON public.polls(thread_id);

CREATE TRIGGER update_polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_poll_options_poll_id ON public.poll_options(poll_id);

CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE (poll_id, voter_id, option_id)
);

CREATE INDEX idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_voter_id ON public.poll_votes(voter_id);

-- Floorplans allow per-tenant overlays and annotations
CREATE TABLE public.floorplans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  svg_document TEXT,
  image_url TEXT,
  storage_path TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_floorplans_unit_id ON public.floorplans(unit_id);
CREATE INDEX idx_floorplans_household_id ON public.floorplans(household_id);

CREATE TRIGGER update_floorplans_updated_at
  BEFORE UPDATE ON public.floorplans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.floorplan_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floorplan_id UUID NOT NULL REFERENCES public.floorplans(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  annotation_type TEXT NOT NULL DEFAULT 'note' CHECK (annotation_type IN ('storage', 'chore', 'maintenance', 'note', 'other')),
  description TEXT,
  coordinates JSONB NOT NULL,
  color TEXT,
  visibility_scope TEXT NOT NULL DEFAULT 'household' CHECK (visibility_scope IN ('roommate', 'household', 'property_manager', 'public')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_floorplan_annotations_floorplan_id ON public.floorplan_annotations(floorplan_id);
CREATE INDEX idx_floorplan_annotations_created_by ON public.floorplan_annotations(created_by);

CREATE TRIGGER update_floorplan_annotations_updated_at
  BEFORE UPDATE ON public.floorplan_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security configuration
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floorplan_annotations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Property staff can manage profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

-- Helper condition for residents tied to a unit
CREATE VIEW public.user_unit_context AS
  SELECT
    p.id AS user_id,
    p.unit_id,
    h.id AS household_id,
    u.property_id
  FROM public.profiles p
  LEFT JOIN public.households h ON h.unit_id = p.unit_id
  LEFT JOIN public.units u ON u.id = p.unit_id;

CREATE POLICY "Residents can view their properties" ON public.properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid() AND ctx.property_id = public.properties.id
    )
  );

CREATE POLICY "Property staff manage properties" ON public.properties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents can view their units" ON public.units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid() AND ctx.unit_id = public.units.id
    )
  );

CREATE POLICY "Property staff manage units" ON public.units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents can view their household" ON public.households
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid() AND ctx.household_id = public.households.id
    )
  );

CREATE POLICY "Property staff manage households" ON public.households
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents view amenities" ON public.amenities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid()
        AND (
          ctx.unit_id = public.amenities.unit_id OR
          ctx.property_id = public.amenities.property_id
        )
    )
  );

CREATE POLICY "Property staff manage amenities" ON public.amenities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Users manage their meetings" ON public.meetings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their tokens" ON public.user_tokens
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Residents view message threads" ON public.message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid()
        AND (
          (public.message_threads.unit_id IS NOT NULL AND ctx.unit_id = public.message_threads.unit_id) OR
          (public.message_threads.household_id IS NOT NULL AND ctx.household_id = public.message_threads.household_id)
        )
    )
  );

CREATE POLICY "Residents create message threads" ON public.message_threads
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid()
        AND (
          (unit_id IS NOT NULL AND ctx.unit_id = unit_id) OR
          (household_id IS NOT NULL AND ctx.household_id = household_id)
        )
    )
  );

CREATE POLICY "Residents update their threads" ON public.message_threads
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Property staff manage threads" ON public.message_threads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.message_threads t
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE t.id = public.messages.thread_id AND (
        (t.unit_id IS NOT NULL AND ctx.unit_id = t.unit_id) OR
        (t.household_id IS NOT NULL AND ctx.household_id = t.household_id)
      )
    )
  );

CREATE POLICY "Residents create messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND EXISTS (
      SELECT 1
      FROM public.message_threads t
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE t.id = thread_id AND (
        (t.unit_id IS NOT NULL AND ctx.unit_id = t.unit_id) OR
        (t.household_id IS NOT NULL AND ctx.household_id = t.household_id)
      )
    )
  );

CREATE POLICY "Residents update their messages" ON public.messages
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Property staff moderate messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents manage message reactions" ON public.message_reactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Property staff manage message reactions" ON public.message_reactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents view attachments" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.message_threads t ON t.id = m.thread_id
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE m.id = public.message_attachments.message_id AND (
        (t.unit_id IS NOT NULL AND ctx.unit_id = t.unit_id) OR
        (t.household_id IS NOT NULL AND ctx.household_id = t.household_id)
      )
    )
  );

CREATE POLICY "Residents add attachments" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.messages m
      WHERE m.id = message_id AND m.author_id = auth.uid()
    )
  );

CREATE POLICY "Property staff manage attachments" ON public.message_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents manage message reads" ON public.message_reads
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Property staff view message reads" ON public.message_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents view polls" ON public.polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.message_threads t
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE t.id = public.polls.thread_id AND (
        (t.unit_id IS NOT NULL AND ctx.unit_id = t.unit_id) OR
        (t.household_id IS NOT NULL AND ctx.household_id = t.household_id)
      )
    )
  );

CREATE POLICY "Residents create polls" ON public.polls
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1
      FROM public.message_threads t
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE t.id = thread_id AND (
        (t.unit_id IS NOT NULL AND ctx.unit_id = t.unit_id) OR
        (t.household_id IS NOT NULL AND ctx.household_id = t.household_id)
      )
    )
  );

CREATE POLICY "Residents vote in polls" ON public.poll_votes
  FOR ALL USING (auth.uid() = voter_id)
  WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Residents view poll options" ON public.poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.polls p
      JOIN public.message_threads t ON t.id = p.thread_id
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE p.id = public.poll_options.poll_id AND (
        (t.unit_id IS NOT NULL AND ctx.unit_id = t.unit_id) OR
        (t.household_id IS NOT NULL AND ctx.household_id = t.household_id)
      )
    )
  );

CREATE POLICY "Property staff view poll options" ON public.poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Property staff view poll votes" ON public.poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Property staff oversee polls" ON public.polls
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Residents view floorplans" ON public.floorplans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_unit_context ctx
      WHERE ctx.user_id = auth.uid() AND (
        (public.floorplans.unit_id IS NOT NULL AND ctx.unit_id = public.floorplans.unit_id) OR
        (public.floorplans.household_id IS NOT NULL AND ctx.household_id = public.floorplans.household_id)
      )
    )
  );

CREATE POLICY "Residents annotate floorplans" ON public.floorplan_annotations
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND EXISTS (
      SELECT 1 FROM public.floorplans f
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE f.id = floorplan_id AND (
        (f.unit_id IS NOT NULL AND ctx.unit_id = f.unit_id) OR
        (f.household_id IS NOT NULL AND ctx.household_id = f.household_id)
      )
    )
  );

CREATE POLICY "Residents view annotations" ON public.floorplan_annotations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.floorplans f
      JOIN public.user_unit_context ctx ON ctx.user_id = auth.uid()
      WHERE f.id = public.floorplan_annotations.floorplan_id AND (
        (f.unit_id IS NOT NULL AND ctx.unit_id = f.unit_id) OR
        (f.household_id IS NOT NULL AND ctx.household_id = f.household_id)
      )
    )
  );

CREATE POLICY "Property staff manage floorplans" ON public.floorplans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Property staff manage annotations" ON public.floorplan_annotations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles staff
      WHERE staff.id = auth.uid() AND staff.role IN ('property_manager', 'admin')
    )
  );

COMMIT;
