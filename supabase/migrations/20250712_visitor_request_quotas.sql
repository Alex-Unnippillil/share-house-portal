-- Visitor request quota enforcement

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'visitor_request_status'
      AND t.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.visitor_request_status AS ENUM (
      'pending',
      'approved',
      'denied',
      'cancelled'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.visitor_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  building_id uuid NOT NULL,
  host_profile_id uuid NOT NULL,
  room_id uuid NOT NULL,
  arrival_date date NOT NULL,
  departure_date date NOT NULL,
  status public.visitor_request_status NOT NULL DEFAULT 'pending',
  guest_name text,
  purpose text,
  CONSTRAINT visitor_requests_departure_after_arrival CHECK (departure_date > arrival_date)
);

CREATE OR REPLACE FUNCTION public.visitor_nights_in_month(
  arrival date,
  departure date,
  month_start date
) RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(
    0,
    LEAST(departure, (month_start + interval '1 month')::date)
      - GREATEST(arrival, month_start)
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_visitor_request_quota()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  month_start date;
  month_end date;
  last_month date;
  month_label text;
  request_nights integer;
  member_nights integer;
  room_nights integer;
  member_limit CONSTANT integer := 10;
  room_limit CONSTANT integer := 20;
BEGIN
  -- Only enforce limits for approved stays.
  IF NEW.status <> 'approved' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.departure_date <= NEW.arrival_date THEN
    RAISE EXCEPTION USING MESSAGE =
      format('Visitor request %s has invalid stay length: departure date must be after arrival date.',
             COALESCE(NEW.id::text, 'pending'));
  END IF;

  month_start := date_trunc('month', NEW.arrival_date)::date;
  last_month := date_trunc('month', (NEW.departure_date - interval '1 day'))::date;

  LOOP
    month_end := (month_start + interval '1 month')::date;
    request_nights := public.visitor_nights_in_month(NEW.arrival_date, NEW.departure_date, month_start);

    IF request_nights > 0 THEN
      SELECT COALESCE(SUM(public.visitor_nights_in_month(v.arrival_date, v.departure_date, month_start)), 0)
        INTO member_nights
      FROM public.visitor_requests v
      WHERE v.status = 'approved'
        AND v.host_profile_id = NEW.host_profile_id
        AND v.building_id = NEW.building_id
        AND v.departure_date > month_start
        AND v.arrival_date < month_end
        AND (TG_OP = 'INSERT' OR v.id <> NEW.id);

      member_nights := member_nights + request_nights;

      IF member_nights > member_limit THEN
        month_label := to_char(month_start, 'YYYY-MM');
        RAISE EXCEPTION USING MESSAGE =
          format('Visitor quota exceeded for host %s in %s: %s nights would exceed the %s-night monthly limit.',
                 NEW.host_profile_id::text,
                 month_label,
                 member_nights,
                 member_limit);
      END IF;

      SELECT COALESCE(SUM(public.visitor_nights_in_month(v.arrival_date, v.departure_date, month_start)), 0)
        INTO room_nights
      FROM public.visitor_requests v
      WHERE v.status = 'approved'
        AND v.room_id = NEW.room_id
        AND v.building_id = NEW.building_id
        AND v.departure_date > month_start
        AND v.arrival_date < month_end
        AND (TG_OP = 'INSERT' OR v.id <> NEW.id);

      room_nights := room_nights + request_nights;

      IF room_nights > room_limit THEN
        month_label := to_char(month_start, 'YYYY-MM');
        RAISE EXCEPTION USING MESSAGE =
          format('Visitor quota exceeded for room %s in %s: %s nights would exceed the %s-night monthly limit.',
                 NEW.room_id::text,
                 month_label,
                 room_nights,
                 room_limit);
      END IF;
    END IF;

    EXIT WHEN month_start >= last_month;
    month_start := month_end;
  END LOOP;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS visitor_requests_quota_enforcement ON public.visitor_requests;
CREATE TRIGGER visitor_requests_quota_enforcement
  BEFORE INSERT OR UPDATE ON public.visitor_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_visitor_request_quota();

CREATE INDEX IF NOT EXISTS visitor_requests_host_month_idx
  ON public.visitor_requests (host_profile_id, building_id, arrival_date, departure_date)
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS visitor_requests_room_month_idx
  ON public.visitor_requests (room_id, building_id, arrival_date, departure_date)
  WHERE status = 'approved';
