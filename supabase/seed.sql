-- Seed sample invoices so each member has current and historical billing records
DO $$
DECLARE
  member_column_count integer;
BEGIN
  SELECT COUNT(*)
  INTO member_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'members'
    AND column_name IN ('id', 'household_id');

  IF member_column_count = 2 THEN
    EXECUTE format($sql$
      WITH member_data AS (
        SELECT
          m.id,
          m.household_id,
          ROW_NUMBER() OVER (PARTITION BY m.household_id ORDER BY m.id) AS rn
        FROM public.members m
      ),
      invoice_samples AS (
        SELECT
          id,
          household_id,
          (95000 + (rn * 5000))::int AS amount_cents,
          date_trunc('month', now()) - interval '15 days' AS due_at,
          %L::public.invoice_status AS status
        FROM member_data
        UNION ALL
        SELECT
          id,
          household_id,
          (100000 + (rn * 5000))::int AS amount_cents,
          date_trunc('month', now()) + interval '15 days' AS due_at,
          %L::public.invoice_status AS status
        FROM member_data
        UNION ALL
        SELECT
          id,
          household_id,
          (105000 + (rn * 4000))::int AS amount_cents,
          date_trunc('month', now()) - interval '45 days' AS due_at,
          %L::public.invoice_status AS status
        FROM member_data
      )
      INSERT INTO public.invoices (household_id, member_id, amount_cents, due_at, status)
      SELECT
        household_id,
        id,
        amount_cents,
        due_at,
        status
      FROM invoice_samples sample
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.member_id = sample.id
          AND i.due_at = sample.due_at
      );
    $sql$, 'paid', 'sent', 'overdue');
  END IF;
END
$$;
