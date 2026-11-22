-- AFF Secure Exams: REVIEW-ONLY schema draft.
-- Intentionally never commits or creates tables. Do not deploy as migration.
BEGIN;
DO $guard$ BEGIN
 RAISE EXCEPTION 'AFF SECURE EXAMS: review-only SQL; execution prohibited pending staging approval';
END $guard$;
-- Future implementation proposal (not executable here):
-- CREATE TABLE public.aff_exam_versions (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   course_id bigint NOT NULL REFERENCES public.courses(id),
--   status text NOT NULL CHECK (status IN ('Draft','Published','Retired')),
--   passing_score integer NOT NULL CHECK (passing_score BETWEEN 0 AND 100),
--   duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
--   max_attempts integer NOT NULL CHECK (max_attempts > 0),
--   created_at timestamptz NOT NULL DEFAULT now()
-- );
-- CREATE TABLE public.aff_exam_attempt_sessions (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   auth_user_id uuid NOT NULL REFERENCES auth.users(id),
--   exam_version_id uuid NOT NULL REFERENCES public.aff_exam_versions(id),
--   token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
--   attempt_number integer NOT NULL CHECK (attempt_number > 0),
--   started_at timestamptz NOT NULL DEFAULT now(),
--   expires_at timestamptz NOT NULL,
--   consumed_at timestamptz,
--   result_id bigint,
--   UNIQUE (auth_user_id, exam_version_id, attempt_number),
--   CHECK (expires_at > started_at)
-- );
-- CREATE TABLE public.aff_exam_question_keys (
--   exam_version_id uuid NOT NULL REFERENCES public.aff_exam_versions(id),
--   question_id text NOT NULL,
--   correct_option_id text NOT NULL,
--   PRIMARY KEY (exam_version_id, question_id)
-- );
-- ALTER TABLE public.aff_exam_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.aff_exam_attempt_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.aff_exam_question_keys ENABLE ROW LEVEL SECURITY;
-- REVOKE ALL ON public.aff_exam_question_keys FROM anon, authenticated;
-- REVOKE ALL ON public.aff_exam_attempt_sessions FROM anon, authenticated;
-- IMPORTANT: Design transactional grading RPC with fixed search_path, explicit
-- auth.uid() checks, locked token consumption and authoritative result insert
-- before enabling. Validate actual FK column types before converting to migration.
ROLLBACK;
