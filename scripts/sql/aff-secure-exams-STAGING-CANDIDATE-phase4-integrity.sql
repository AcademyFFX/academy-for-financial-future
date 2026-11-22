-- AFF Secure Exams Phase 4: Published-version integrity
-- STAGING CANDIDATE ONLY. DO NOT RUN ON PRODUCTION OR CIVIC STAGING.
-- Depends on Phase 1 schema. Requires review and isolated staging approval.
BEGIN;

-- The begin RPC resolves by legacy_exam_id only; it must be unambiguous.
-- Partial uniqueness is deliberately global (not per course).
CREATE UNIQUE INDEX IF NOT EXISTS aff_secure_exam_one_published_legacy_id
  ON public.aff_secure_exam_versions(legacy_exam_id)
  WHERE status = 'Published';

CREATE OR REPLACE FUNCTION public.aff_secure_exam_version_guard()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $guard$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('Published', 'Retired') THEN
      RAISE EXCEPTION 'Published or retired exam versions cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- A published version may only transition to Retired. All assessment
    -- content and settings must remain identical.
    IF OLD.status = 'Published' THEN
      IF NEW.status = 'Retired'
         AND (to_jsonb(NEW) - 'status') = (to_jsonb(OLD) - 'status') THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Published exam versions are immutable';
    END IF;

    IF OLD.status = 'Retired' THEN
      RAISE EXCEPTION 'Retired exam versions are immutable';
    END IF;

    -- Draft versions cannot be retired without first publishing.
    IF OLD.status = 'Draft' AND NEW.status = 'Retired' THEN
      RAISE EXCEPTION 'Draft exams cannot be retired directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS trg_aff_secure_exam_version_guard
  ON public.aff_secure_exam_versions;
CREATE TRIGGER trg_aff_secure_exam_version_guard
BEFORE UPDATE OR DELETE ON public.aff_secure_exam_versions
FOR EACH ROW EXECUTE FUNCTION public.aff_secure_exam_version_guard();

CREATE OR REPLACE FUNCTION public.aff_secure_exam_question_guard()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $guard$
DECLARE
  v_version_id uuid;
  v_status text;
BEGIN
  -- Prevent moving questions between versions, including from a locked one.
  IF TG_OP = 'UPDATE' AND NEW.exam_version_id IS DISTINCT FROM OLD.exam_version_id THEN
    RAISE EXCEPTION 'Moving exam questions between versions is forbidden';
  END IF;

  v_version_id := CASE WHEN TG_OP = 'INSERT'
    THEN NEW.exam_version_id ELSE OLD.exam_version_id END;

  -- Row lock prevents concurrent publication racing with question edits.
  SELECT status INTO v_status
  FROM public.aff_secure_exam_versions
  WHERE id = v_version_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown examination version';
  END IF;

  IF v_status <> 'Draft' THEN
    RAISE EXCEPTION 'Published and retired examination questions are immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS trg_aff_secure_exam_question_guard
  ON public.aff_secure_exam_questions;
CREATE TRIGGER trg_aff_secure_exam_question_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.aff_secure_exam_questions
FOR EACH ROW EXECUTE FUNCTION public.aff_secure_exam_question_guard();

-- Publish only complete, valid drafts with matching answer option IDs.
CREATE OR REPLACE FUNCTION public.aff_secure_exam_publish_guard()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $guard$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'Draft'
     AND NEW.status = 'Published' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.aff_secure_exam_questions q
      WHERE q.exam_version_id = NEW.id
    ) OR EXISTS (
      SELECT 1 FROM public.aff_secure_exam_questions q
      WHERE q.exam_version_id = NEW.id
        AND NOT (q.options ? q.correct_option_id)
    ) THEN
      RAISE EXCEPTION 'Exam requires questions with valid answer keys';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS trg_aff_secure_exam_publish_guard
  ON public.aff_secure_exam_versions;
CREATE TRIGGER trg_aff_secure_exam_publish_guard
BEFORE UPDATE ON public.aff_secure_exam_versions
FOR EACH ROW EXECUTE FUNCTION public.aff_secure_exam_publish_guard();

COMMIT;

-- Review gates:
-- 1. Version guard and publish guard trigger ordering; verify both in staging.
-- 2. PostgreSQL privileges: prevent untrusted users from replacing triggers
--    or changing schema objects. No public/student table grants.
-- 3. Retiring a published version prevents new begin/submit calls under
--    Phase 2; decide how in-flight sessions should finish before retirement.
-- 4. Confirm that the course/lesson/quiz asset relationships are consistent.
-- 5. Run concurrency tests for publication versus question editing.
-- 6. This phase does not remove the legacy browser grading bypass.
