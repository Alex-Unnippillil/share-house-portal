CREATE OR REPLACE FUNCTION public.log_document_access_bulk(
  p_document_ids UUID[],
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF COALESCE(array_length(p_document_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
    INSERT INTO public.document_access_logs (document_id, user_id, action, metadata)
    SELECT doc_id, auth.uid(), p_action, p_metadata
    FROM unnest(p_document_ids) AS doc_id
    RETURNING id;
END;
$$;
