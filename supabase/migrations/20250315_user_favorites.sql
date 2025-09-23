-- Create user_favorites table to track pinned entities for quick access
CREATE TABLE public.user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('document', 'thread', 'booking')),
  entity_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Prevent duplicate favorites per entity for a given user
CREATE UNIQUE INDEX user_favorites_unique_entity
  ON public.user_favorites(profile_id, entity_type, entity_id);

-- Support ordered retrieval by user and type
CREATE INDEX user_favorites_profile_position
  ON public.user_favorites(profile_id, position ASC);

CREATE INDEX user_favorites_profile_entity_type
  ON public.user_favorites(profile_id, entity_type);

-- Enable row level security and scope access to the owning user
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their favorites" ON public.user_favorites
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their favorites" ON public.user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their favorites" ON public.user_favorites
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their favorites" ON public.user_favorites
  FOR DELETE
  USING (auth.uid() = profile_id);
