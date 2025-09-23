-- Add locale and timezone preferences to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text;

ALTER TABLE public.profiles
  ALTER COLUMN locale SET DEFAULT 'en-US';

ALTER TABLE public.profiles
  ALTER COLUMN timezone SET DEFAULT 'UTC';

WITH profile_defaults AS (
  SELECT
    p.id,
    NULLIF(p.locale, '') AS existing_locale,
    NULLIF(p.timezone, '') AS existing_timezone,
    NULLIF(u.raw_user_meta_data->>'locale', '') AS auth_locale,
    NULLIF(
      COALESCE(
        u.raw_user_meta_data->>'timezone',
        u.raw_user_meta_data->>'timeZone',
        u.raw_user_meta_data->>'preferred_timezone',
        u.raw_user_meta_data->>'preferredTimeZone'
      ),
      ''
    ) AS auth_timezone
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
),
computed_preferences AS (
  SELECT
    pd.id,
    COALESCE(pd.existing_locale, pd.auth_locale, 'en-US') AS resolved_locale,
    COALESCE(tz.name, pd.existing_timezone, 'UTC') AS resolved_timezone
  FROM profile_defaults pd
  LEFT JOIN LATERAL (
    SELECT name
    FROM pg_timezone_names tz
    WHERE tz.name = pd.auth_timezone
    LIMIT 1
  ) AS tz ON TRUE
)
UPDATE public.profiles AS p
SET
  locale = computed_preferences.resolved_locale,
  timezone = computed_preferences.resolved_timezone,
  updated_at = timezone('utc', now())
FROM computed_preferences
WHERE computed_preferences.id = p.id
  AND (
    COALESCE(p.locale, '') <> COALESCE(computed_preferences.resolved_locale, '')
    OR COALESCE(p.timezone, '') <> COALESCE(computed_preferences.resolved_timezone, '')
  );

UPDATE public.profiles AS p
SET timezone = 'UTC'
WHERE timezone IS NULL
  OR timezone = ''
  OR NOT EXISTS (
    SELECT 1
    FROM pg_timezone_names tz
    WHERE tz.name = p.timezone
  );

CREATE INDEX IF NOT EXISTS idx_profiles_locale ON public.profiles(locale);
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON public.profiles(timezone);
