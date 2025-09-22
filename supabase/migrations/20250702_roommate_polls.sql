CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NULL
  );
END;
$$;

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id uuid NOT NULL REFERENCES public.threads (id) ON DELETE CASCADE,
    author_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NULL
  );
END;
$$;

CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.threads (id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.messages (id) ON DELETE SET NULL,
  question text NOT NULL,
  options text[] NOT NULL CHECK (array_length(options, 1) >= 2),
  allow_anonymous boolean NOT NULL DEFAULT false,
  closes_at timestamptz NOT NULL,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  closed_at timestamptz NULL,
  CONSTRAINT polls_closes_after_creation CHECK (closes_at > created_at)
);

CREATE INDEX IF NOT EXISTS polls_thread_id_idx ON public.polls (thread_id);
CREATE INDEX IF NOT EXISTS polls_closes_at_idx ON public.polls (closes_at DESC);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls (id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  option_index integer NOT NULL CHECK (option_index >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT poll_votes_unique_vote UNIQUE (poll_id, voter_id)
);

CREATE INDEX IF NOT EXISTS poll_votes_poll_id_idx ON public.poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_voter_idx ON public.poll_votes (voter_id);
