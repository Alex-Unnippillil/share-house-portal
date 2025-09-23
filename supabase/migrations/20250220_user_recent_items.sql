-- Track recently visited entities per user
CREATE TABLE public.user_recent_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  label TEXT NOT NULL,
  last_visited_route TEXT NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT user_recent_items_unique_visit UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX idx_user_recent_items_user_id ON public.user_recent_items(user_id);
CREATE INDEX idx_user_recent_items_visited_at ON public.user_recent_items(visited_at DESC);

ALTER TABLE public.user_recent_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their recent items" ON public.user_recent_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their recent items" ON public.user_recent_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their recent items" ON public.user_recent_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their recent items" ON public.user_recent_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_recent_items_updated_at
  BEFORE UPDATE ON public.user_recent_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
