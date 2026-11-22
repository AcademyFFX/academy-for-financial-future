-- AFF secure examinations: isolated staging migration CANDIDATE (not executed)
-- Phase 1: protected canonical exams and single-use attempt ledger.
-- Does NOT change public.exams, certification records, or legacy student UI.
-- Requires explicit staging approval and migration review before execution.
BEGIN;

CREATE TABLE IF NOT EXISTS public.aff_secure_exam_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_exam_id text NOT NULL,
  course_id bigint NOT NULL REFERENCES public.courses(id),
  lesson_id bigint REFERENCES public.lessons(id),
  quiz_asset_id uuid REFERENCES public.course_assets(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Published','Retired')),
  passing_score integer NOT NULL CHECK (passing_score BETWEEN 0 AND 100),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  max_attempts integer NOT NULL CHECK (max_attempts > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, legacy_exam_id, id)
);

CREATE TABLE IF NOT EXISTS public.aff_secure_exam_questions (
  exam_version_id uuid NOT NULL REFERENCES public.aff_secure_exam_versions(id) ON DELETE RESTRICT,
  question_id text NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL CHECK (jsonb_typeof(options) = 'object'),
  correct_option_id text NOT NULL,
  display_order integer NOT NULL,
  PRIMARY KEY (exam_version_id, question_id),
  UNIQUE (exam_version_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.aff_secure_exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_version_id uuid NOT NULL REFERENCES public.aff_secure_exam_versions(id),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  result_id bigint UNIQUE REFERENCES public.exams(id),
  UNIQUE (auth_user_id, exam_version_id, attempt_number),
  CHECK (expires_at > started_at),
  CHECK (consumed_at IS NULL OR result_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS aff_secure_exam_sessions_user_idx
 ON public.aff_secure_exam_sessions(auth_user_id, exam_version_id, started_at DESC);

ALTER TABLE public.aff_secure_exam_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_secure_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_secure_exam_sessions ENABLE ROW LEVEL SECURITY;

-- Fail closed: no student direct access to answer keys or token ledger.
REVOKE ALL ON public.aff_secure_exam_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.aff_secure_exam_questions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.aff_secure_exam_sessions FROM PUBLIC, anon, authenticated;

-- No policies granted here: access must be through reviewed server-only
-- privileged procedures. Do not expose question rows to clients.
-- Follow-up phase: transactional begin/submit RPC with auth.uid(),
-- row locking, protected grading, authoritative exams insert, and rollback.
COMMIT;
