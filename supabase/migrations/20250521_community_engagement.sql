BEGIN;

CREATE TYPE public.publish_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
CREATE TYPE public.comment_parent_type AS ENUM ('announcement', 'bulletin_post', 'survey');
CREATE TYPE public.survey_question_type AS ENUM (
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'rating',
  'boolean'
);

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  published_by uuid,
  title text NOT NULL,
  summary text,
  content text,
  status public.publish_status NOT NULL DEFAULT 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  target_all boolean NOT NULL DEFAULT true,
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT announcements_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT announcements_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE INDEX announcements_status_idx ON public.announcements (status);
CREATE INDEX announcements_published_at_idx ON public.announcements (published_at);

CREATE TABLE public.announcement_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT announcement_targets_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE,
  CONSTRAINT announcement_targets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT announcement_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT announcement_targets_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT announcement_targets_unique_target UNIQUE (announcement_id, profile_id)
);

ALTER TABLE public.announcement_targets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bulletin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  published_by uuid,
  title text NOT NULL,
  body text NOT NULL,
  status public.publish_status NOT NULL DEFAULT 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  target_all boolean NOT NULL DEFAULT true,
  allow_comments boolean NOT NULL DEFAULT true,
  CONSTRAINT bulletin_posts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT bulletin_posts_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT bulletin_posts_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX bulletin_posts_status_idx ON public.bulletin_posts (status);
CREATE INDEX bulletin_posts_published_at_idx ON public.bulletin_posts (published_at);

CREATE TABLE public.bulletin_post_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_post_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT bulletin_post_targets_bulletin_post_id_fkey FOREIGN KEY (bulletin_post_id) REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
  CONSTRAINT bulletin_post_targets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT bulletin_post_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT bulletin_post_targets_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT bulletin_post_targets_unique_target UNIQUE (bulletin_post_id, profile_id)
);

ALTER TABLE public.bulletin_post_targets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  retention_expires_at timestamptz NOT NULL DEFAULT now() + interval '180 days',
  author_id uuid NOT NULL,
  parent_type public.comment_parent_type NOT NULL,
  parent_id uuid NOT NULL,
  body text NOT NULL,
  CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT comments_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT comments_retention_check CHECK (retention_expires_at >= created_at)
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX comments_parent_idx ON public.comments (parent_type, parent_id, created_at);

CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid NOT NULL,
  published_by uuid,
  title text NOT NULL,
  description text,
  status public.publish_status NOT NULL DEFAULT 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  closes_at timestamptz,
  target_all boolean NOT NULL DEFAULT true,
  allow_multiple_submissions boolean NOT NULL DEFAULT false,
  CONSTRAINT surveys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT surveys_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT surveys_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE INDEX surveys_status_idx ON public.surveys (status);
CREATE INDEX surveys_published_at_idx ON public.surveys (published_at);

CREATE TABLE public.survey_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT survey_targets_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE,
  CONSTRAINT survey_targets_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT survey_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT survey_targets_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT survey_targets_unique_target UNIQUE (survey_id, profile_id)
);

ALTER TABLE public.survey_targets ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  prompt text NOT NULL,
  description text,
  question_type public.survey_question_type NOT NULL,
  options jsonb,
  is_required boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT survey_questions_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE,
  CONSTRAINT survey_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT survey_questions_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

CREATE INDEX survey_questions_survey_idx ON public.survey_questions (survey_id, position);

CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  question_id uuid NOT NULL,
  respondent_id uuid NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  retention_expires_at timestamptz NOT NULL DEFAULT now() + interval '365 days',
  CONSTRAINT survey_responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE,
  CONSTRAINT survey_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  CONSTRAINT survey_responses_respondent_id_fkey FOREIGN KEY (respondent_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT survey_responses_deleted_at_check CHECK (deleted_at IS NULL OR deleted_at >= created_at),
  CONSTRAINT survey_responses_retention_check CHECK (retention_expires_at >= created_at)
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE INDEX survey_responses_survey_idx ON public.survey_responses (survey_id, respondent_id);

-- Row level security policies
CREATE POLICY "Announcements visible when targeted" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR target_all
      OR EXISTS (
        SELECT 1 FROM public.announcement_targets t
        WHERE t.announcement_id = announcements.id
          AND t.profile_id = auth.uid()
          AND t.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Announcement creators manage" ON public.announcements
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Announcement creators update" ON public.announcements
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Announcement targets visible" ON public.announcement_targets
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      profile_id = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.id = announcement_targets.announcement_id
          AND a.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Announcement targets manage" ON public.announcement_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_targets.announcement_id
        AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Announcement targets update" ON public.announcement_targets
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_targets.announcement_id
        AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Bulletins visible when targeted" ON public.bulletin_posts
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR target_all
      OR EXISTS (
        SELECT 1 FROM public.bulletin_post_targets t
        WHERE t.bulletin_post_id = bulletin_posts.id
          AND t.profile_id = auth.uid()
          AND t.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Bulletin creators manage" ON public.bulletin_posts
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Bulletin creators update" ON public.bulletin_posts
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Bulletin targets visible" ON public.bulletin_post_targets
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      profile_id = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.bulletin_posts b
        WHERE b.id = bulletin_post_targets.bulletin_post_id
          AND b.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Bulletin targets manage" ON public.bulletin_post_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bulletin_posts b
      WHERE b.id = bulletin_post_targets.bulletin_post_id
        AND b.created_by = auth.uid()
    )
  );

CREATE POLICY "Bulletin targets update" ON public.bulletin_post_targets
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bulletin_posts b
      WHERE b.id = bulletin_post_targets.bulletin_post_id
        AND b.created_by = auth.uid()
    )
  );

CREATE POLICY "Comments readable" ON public.comments
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND retention_expires_at >= now());

CREATE POLICY "Comment authors insert" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

CREATE POLICY "Comment authors update" ON public.comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Surveys visible when targeted" ON public.surveys
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR target_all
      OR EXISTS (
        SELECT 1 FROM public.survey_targets t
        WHERE t.survey_id = surveys.id
          AND t.profile_id = auth.uid()
          AND t.deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Survey creators manage" ON public.surveys
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Survey creators update" ON public.surveys
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Survey targets visible" ON public.survey_targets
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      profile_id = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.surveys s
        WHERE s.id = survey_targets.survey_id
          AND s.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Survey targets manage" ON public.survey_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_targets.survey_id
        AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Survey targets update" ON public.survey_targets
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_targets.survey_id
        AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Survey questions visible" ON public.survey_questions
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_questions.survey_id
        AND (
          s.created_by = auth.uid()
          OR s.target_all
          OR EXISTS (
            SELECT 1 FROM public.survey_targets t
            WHERE t.survey_id = s.id
              AND t.profile_id = auth.uid()
              AND t.deleted_at IS NULL
          )
        )
    )
  );

CREATE POLICY "Survey question creators insert" ON public.survey_questions
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Survey question creators update" ON public.survey_questions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Survey responses visible" ON public.survey_responses
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      respondent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.surveys s
        WHERE s.id = survey_responses.survey_id
          AND s.created_by = auth.uid()
      )
    )
    AND retention_expires_at >= now()
  );

CREATE POLICY "Survey responses insert" ON public.survey_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    respondent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_responses.survey_id
        AND (
          s.target_all
          OR s.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.survey_targets t
            WHERE t.survey_id = s.id
              AND t.profile_id = auth.uid()
              AND t.deleted_at IS NULL
          )
        )
    )
  );

CREATE POLICY "Survey responses update" ON public.survey_responses
  FOR UPDATE TO authenticated
  USING (respondent_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (respondent_id = auth.uid());

-- Seed data for new content features
WITH creator AS (
  SELECT id
  FROM public.profiles
  ORDER BY created_at NULLS LAST
  LIMIT 1
), announcement_insert AS (
  INSERT INTO public.announcements (
    title,
    summary,
    content,
    status,
    publish_at,
    published_at,
    expires_at,
    created_by,
    published_by,
    target_all
  )
  SELECT
    'Welcome to the community',
    'Kick-off note for residents',
    'We are excited to launch new tools for staying informed. Stay tuned for weekly updates!',
    'published',
    now() - interval '1 day',
    now() - interval '1 day',
    now() + interval '14 days',
    creator.id,
    creator.id,
    false
  FROM creator
  RETURNING id, created_by
), bulletin_insert AS (
  INSERT INTO public.bulletin_posts (
    title,
    body,
    status,
    publish_at,
    published_at,
    expires_at,
    created_by,
    published_by,
    target_all
  )
  SELECT
    'Community garden work day',
    'Join us this weekend to refresh the garden beds and plant herbs for everyone to enjoy.',
    'published',
    now() - interval '2 days',
    now() - interval '2 days',
    now() + interval '5 days',
    creator.id,
    creator.id,
    true
  FROM creator
  RETURNING id, created_by
), survey_insert AS (
  INSERT INTO public.surveys (
    title,
    description,
    status,
    publish_at,
    published_at,
    closes_at,
    created_by,
    published_by,
    target_all
  )
  SELECT
    'Monthly feedback survey',
    'Let us know how community services are working for you.',
    'published',
    now() - interval '3 days',
    now() - interval '3 days',
    now() + interval '7 days',
    creator.id,
    creator.id,
    false
  FROM creator
  RETURNING id, created_by
), announcement_target_insert AS (
  INSERT INTO public.announcement_targets (announcement_id, profile_id, created_by)
  SELECT announcement_insert.id, announcement_insert.created_by, announcement_insert.created_by
  FROM announcement_insert
), survey_target_insert AS (
  INSERT INTO public.survey_targets (survey_id, profile_id, created_by)
  SELECT survey_insert.id, survey_insert.created_by, survey_insert.created_by
  FROM survey_insert
), survey_questions_insert AS (
  INSERT INTO public.survey_questions (
    survey_id,
    position,
    prompt,
    description,
    question_type,
    options,
    is_required,
    created_by
  )
  SELECT
    survey_insert.id,
    1,
    'How satisfied are you with the shared amenities?',
    'Choose the option that best matches your experience.',
    'single_choice',
    '["Very satisfied","Satisfied","Neutral","Unsatisfied"]'::jsonb,
    true,
    survey_insert.created_by
  FROM survey_insert
  UNION ALL
  SELECT
    survey_insert.id,
    2,
    'What would you like us to improve next?',
    NULL,
    'long_text',
    NULL,
    false,
    survey_insert.created_by
  FROM survey_insert
  RETURNING id, survey_id, created_by, position
), comment_seed AS (
  INSERT INTO public.comments (
    author_id,
    parent_type,
    parent_id,
    body
  )
  SELECT
    announcement_insert.created_by,
    'announcement',
    announcement_insert.id,
    'Thanks for the update! Looking forward to the new changes.'
  FROM announcement_insert
  RETURNING id
)
INSERT INTO public.survey_responses (
  survey_id,
  question_id,
  respondent_id,
  response
)
SELECT
  sq.survey_id,
  sq.id,
  sq.created_by,
  CASE
    WHEN sq.position = 1 THEN jsonb_build_object('choice', 'Very satisfied')
    ELSE jsonb_build_object('text', 'More storage in the bike room would be great.')
  END
FROM survey_questions_insert sq;

COMMIT;
