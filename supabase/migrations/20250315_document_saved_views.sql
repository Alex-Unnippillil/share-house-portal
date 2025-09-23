-- Saved views for document filters per user
CREATE TABLE public.document_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX document_saved_views_user_id_name_idx
  ON public.document_saved_views(user_id, name);

ALTER TABLE public.document_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their document saved views"
  ON public.document_saved_views
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage any document saved view"
  ON public.document_saved_views
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE FUNCTION public.set_document_saved_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_saved_views_updated_at
  BEFORE UPDATE ON public.document_saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_saved_views_updated_at();
