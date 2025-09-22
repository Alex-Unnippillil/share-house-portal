-- Create amenities table to describe bookable household resources
CREATE TABLE public.amenities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_duration_minutes > 0),
  buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  open_hour INTEGER NOT NULL DEFAULT 8 CHECK (open_hour >= 0 AND open_hour < 24),
  close_hour INTEGER NOT NULL DEFAULT 22 CHECK (close_hour > 0 AND close_hour <= 24),
  max_advance_days INTEGER NOT NULL DEFAULT 14 CHECK (max_advance_days >= 0),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  metadata JSONB
);

-- Track confirmed amenity bookings
CREATE TABLE public.amenity_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_amenity_bookings_amenity_id ON public.amenity_bookings(amenity_id);
CREATE INDEX idx_amenity_bookings_household_id ON public.amenity_bookings(household_id);
CREATE INDEX idx_amenity_bookings_time_range ON public.amenity_bookings(start_time, end_time);

-- Household level roommate balance snapshot
CREATE TABLE public.roommate_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  roommate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  unit_label TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  monthly_share NUMERIC(12, 2) NOT NULL,
  autopay_day INTEGER NOT NULL DEFAULT 1 CHECK (autopay_day BETWEEN 1 AND 28),
  autopay_status TEXT NOT NULL DEFAULT 'active' CHECK (autopay_status IN ('active', 'paused', 'disabled')),
  last_payment_date DATE,
  last_payment_amount NUMERIC(12, 2),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roommate_id, household_id)
);

CREATE TABLE public.roommate_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  balance_id UUID NOT NULL REFERENCES public.roommate_balances(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  due_date DATE NOT NULL,
  original_amount NUMERIC(12, 2) NOT NULL,
  outstanding_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partial', 'paid', 'waived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_roommate_charges_balance_id ON public.roommate_charges(balance_id);
CREATE INDEX idx_roommate_charges_due_date ON public.roommate_charges(due_date);
CREATE INDEX idx_roommate_charges_status ON public.roommate_charges(status);

-- Enable row level security for new tables
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_charges ENABLE ROW LEVEL SECURITY;

-- Policies for amenity resources (amenities are visible to authenticated users)
CREATE POLICY "Authenticated users can view amenities" ON public.amenities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view amenity bookings" ON public.amenity_bookings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policies for roommate balances mirror payments visibility rules
CREATE POLICY "Roommates can view their balances" ON public.roommate_balances
  FOR SELECT USING (auth.uid() = roommate_id);

CREATE POLICY "Property managers can view all balances" ON public.roommate_balances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

CREATE POLICY "Roommates can view their charges" ON public.roommate_charges
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.roommate_balances rb
      WHERE rb.id = roommate_charges.balance_id AND rb.roommate_id = auth.uid()
    )
  );

CREATE POLICY "Property managers can view all charges" ON public.roommate_charges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('property_manager', 'admin')
    )
  );

-- Helper trigger to maintain updated_at columns
CREATE TRIGGER update_amenity_bookings_updated_at
  BEFORE UPDATE ON public.amenity_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roommate_balances_updated_at
  BEFORE UPDATE ON public.roommate_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roommate_charges_updated_at
  BEFORE UPDATE ON public.roommate_charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC: compute available amenity slots
CREATE OR REPLACE FUNCTION public.get_available_amenity_slots(
  p_amenity_slug TEXT,
  p_household_id UUID DEFAULT NULL,
  p_range_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_range_end TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
)
RETURNS TABLE (
  slot_start TIMESTAMP WITH TIME ZONE,
  slot_end TIMESTAMP WITH TIME ZONE,
  is_peak BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_amenity RECORD;
  v_start TIMESTAMP WITH TIME ZONE;
  v_end TIMESTAMP WITH TIME ZONE;
  v_slot_interval INTERVAL;
  v_buffer INTERVAL;
BEGIN
  SELECT *
    INTO v_amenity
  FROM public.amenities
  WHERE slug = p_amenity_slug
    AND (p_household_id IS NULL OR household_id = p_household_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Amenity % not found for household %', p_amenity_slug, p_household_id;
  END IF;

  IF p_range_end <= p_range_start THEN
    RAISE EXCEPTION 'range_end must be after range_start';
  END IF;

  v_slot_interval := make_interval(mins => v_amenity.slot_duration_minutes);
  v_buffer := make_interval(mins => v_amenity.buffer_minutes);
  v_start := greatest(p_range_start, NOW());
  v_end := least(p_range_end, NOW() + (v_amenity.max_advance_days || ' days')::INTERVAL);

  RETURN QUERY
  WITH raw_slots AS (
    SELECT
      slot_start,
      slot_start + v_slot_interval AS slot_end,
      slot_start AT TIME ZONE v_amenity.timezone AS local_start,
      (slot_start + v_slot_interval) AT TIME ZONE v_amenity.timezone AS local_end
    FROM generate_series(
      date_trunc('minute', v_start),
      date_trunc('minute', v_end - v_slot_interval),
      v_slot_interval
    ) AS slot_start
  ),
  filtered_slots AS (
    SELECT
      slot_start,
      slot_end,
      local_start,
      local_end
    FROM raw_slots
    WHERE extract(hour FROM local_start) >= v_amenity.open_hour
      AND extract(hour FROM local_end) <= v_amenity.close_hour
  ),
  conflicting AS (
    SELECT
      fs.slot_start,
      fs.slot_end,
      COUNT(ab.id) AS conflict_count
    FROM filtered_slots fs
    LEFT JOIN public.amenity_bookings ab
      ON ab.amenity_id = v_amenity.id
      AND ab.status IN ('pending', 'confirmed')
      AND ab.start_time < fs.slot_end + v_buffer
      AND ab.end_time > fs.slot_start - v_buffer
    GROUP BY fs.slot_start, fs.slot_end
  )
  SELECT
    slot_start,
    slot_end,
    (extract(hour FROM slot_start AT TIME ZONE v_amenity.timezone) BETWEEN 17 AND 21) AS is_peak
  FROM conflicting
  WHERE conflict_count = 0
  ORDER BY slot_start;
END;
$$;

COMMENT ON FUNCTION public.get_available_amenity_slots IS 'Return open booking slots for an amenity within the requested range';

-- RPC: return roommate balances with next due invoices
CREATE OR REPLACE FUNCTION public.get_next_due_invoices(
  p_household_id UUID DEFAULT NULL,
  p_roommate_id UUID DEFAULT NULL
)
RETURNS TABLE (
  balance_id UUID,
  roommate_id UUID,
  roommate_name TEXT,
  unit_label TEXT,
  currency TEXT,
  monthly_share NUMERIC(12, 2),
  autopay_day INTEGER,
  autopay_status TEXT,
  last_payment_date DATE,
  last_payment_amount NUMERIC(12, 2),
  metadata JSONB,
  outstanding_total NUMERIC(12, 2),
  next_charge JSONB,
  charges JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    b.id AS balance_id,
    b.roommate_id,
    COALESCE(p.full_name, p.username, 'Roommate') AS roommate_name,
    b.unit_label,
    b.currency,
    b.monthly_share,
    b.autopay_day,
    b.autopay_status,
    b.last_payment_date,
    b.last_payment_amount,
    b.metadata,
    COALESCE(SUM(c.outstanding_amount) FILTER (WHERE c.status IN ('open', 'partial')), 0)::NUMERIC(12, 2) AS outstanding_total,
    (
      SELECT TO_JSONB(sub) FROM (
        SELECT
          c.id,
          c.description,
          c.category,
          c.due_date,
          c.original_amount,
          c.outstanding_amount,
          c.status
        FROM public.roommate_charges c
        WHERE c.balance_id = b.id
          AND c.status IN ('open', 'partial')
        ORDER BY c.due_date ASC, c.created_at ASC
        LIMIT 1
      ) sub
    ) AS next_charge,
    (
      SELECT COALESCE(JSONB_AGG(to_jsonb(ch) ORDER BY ch.due_date, ch.created_at), '[]'::JSONB)
      FROM (
        SELECT
          c.id,
          c.description,
          c.category,
          c.due_date,
          c.original_amount,
          c.outstanding_amount,
          c.status
        FROM public.roommate_charges c
        WHERE c.balance_id = b.id
        ORDER BY c.due_date ASC, c.created_at ASC
      ) ch
    ) AS charges
  FROM public.roommate_balances b
  JOIN public.profiles p ON p.id = b.roommate_id
  LEFT JOIN public.roommate_charges c ON c.balance_id = b.id
  WHERE (p_household_id IS NULL OR b.household_id = p_household_id)
    AND (p_roommate_id IS NULL OR b.roommate_id = p_roommate_id)
  GROUP BY b.id, p.full_name, p.username
  ORDER BY outstanding_total DESC, roommate_name;
$$;

COMMENT ON FUNCTION public.get_next_due_invoices IS 'Aggregate roommate balances and expose next due invoice with outstanding totals.';
