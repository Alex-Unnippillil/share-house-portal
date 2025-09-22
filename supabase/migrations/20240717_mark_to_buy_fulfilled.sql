DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'to_buy_items'
  ) THEN
    ALTER TABLE public.to_buy_items
      ADD COLUMN IF NOT EXISTS fulfilled_at timestamp with time zone;

    CREATE INDEX IF NOT EXISTS to_buy_items_supply_item_id_idx
      ON public.to_buy_items (supply_item_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_purchase_to_buy_fulfillment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.to_buy_items
  SET fulfilled_at = COALESCE(NEW.purchased_at, timezone('utc', now()))
  WHERE supply_item_id = NEW.supply_item_id
    AND fulfilled_at IS NULL;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'purchases'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'to_buy_items'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'purchases_mark_to_buy_fulfilled'
    ) THEN
      EXECUTE 'DROP TRIGGER purchases_mark_to_buy_fulfilled ON public.purchases';
    END IF;

    EXECUTE 'CREATE TRIGGER purchases_mark_to_buy_fulfilled
      AFTER INSERT OR UPDATE OF supply_item_id, purchased_at ON public.purchases
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_purchase_to_buy_fulfillment()';
  END IF;
END
$$;
