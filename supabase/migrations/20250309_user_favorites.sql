-- Create user_favorites table for storing pinned entities per user
CREATE TABLE public.user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate favorites per user and entity
CREATE UNIQUE INDEX user_favorites_user_entity_unique
  ON public.user_favorites (user_id, entity_type, entity_id);

-- Index for retrieving a user's favorites ordered by sort metadata
CREATE INDEX user_favorites_user_order_idx
  ON public.user_favorites (user_id, sort_order, pinned_at DESC);

-- Enable row level security
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies to ensure users may only manage their own favorites
CREATE POLICY "Users can view their favorites" ON public.user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their favorites" ON public.user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their favorites" ON public.user_favorites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their favorites" ON public.user_favorites
  FOR DELETE USING (auth.uid() = user_id);
