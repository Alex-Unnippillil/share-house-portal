-- Add per-tenant security controls for IP allowlists and session TTL enforcement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'ip_allow_cidrs'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN ip_allow_cidrs cidr[] NOT NULL DEFAULT ARRAY[]::cidr[];
    COMMENT ON COLUMN public.profiles.ip_allow_cidrs IS 'List of CIDR ranges that may access the tenant portal for this profile.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'session_ttl_seconds'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN session_ttl_seconds integer;
    COMMENT ON COLUMN public.profiles.session_ttl_seconds IS 'Optional session lifetime override in seconds for this profile.';
  END IF;
END $$;
