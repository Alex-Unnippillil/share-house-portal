-- Add notification preferences columns to profiles for digest scheduling
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS digest_frequency TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN digest_frequency SET DEFAULT 'daily';

UPDATE public.profiles
SET digest_frequency = 'daily'
WHERE digest_frequency IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN digest_frequency SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_digest_frequency_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_digest_frequency_check
      CHECK (digest_frequency IN ('daily', 'weekly'));
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME WITHOUT TIME ZONE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME WITHOUT TIME ZONE;
