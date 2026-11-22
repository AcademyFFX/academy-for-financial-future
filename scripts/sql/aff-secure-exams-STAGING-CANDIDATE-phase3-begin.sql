-- AFF secure exams: STAGING CANDIDATE phase 3, not executed.
-- Depends on phases 1 and 2; isolated staging only after separate approval.
-- Start session and return public questions without answer keys.
BEGIN;

CREATE OR REPLACE FUNCTION public.aff_begin_secure_exam(p_exam_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
 v_uid uuid := auth.uid();
 v_exam public.aff_secure_exam_versions%ROWTYPE;
 v_attempt integer;
 v_token text;
 v_session_id uuid;
 v_questions jsonb;
BEGIN
 IF v_uid IS NULL OR nullif(trim(p_exam_id),'') IS NULL THEN
   RAISE EXCEPTION 'Authentication and exam ID required';
 END IF;

 -- Fail closed when multiple published versions use the same legacy ID.
 SELECT v.* INTO STRICT v_exam
 FROM public.aff_secure_exam_versions v
 WHERE v.legacy_exam_id = p_exam_id AND v.status = 'Published';

 IF NOT EXISTS (
   SELECT 1 FROM public.students st
   JOIN public.enrollments e ON e.student_id=st.id
   WHERE st.auth_user_id=v_uid AND e.course_id=v_exam.course_id
     AND lower(trim(coalesce(e.enrollment_status,'')))
       IN ('active','in progress','completed')
 ) THEN RAISE EXCEPTION 'Eligible enrollment required'; END IF;

 -- Serialize concurrent begin calls for same user and version.
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||v_exam.id::text,0));

 IF EXISTS (
   SELECT 1 FROM public.aff_secure_exam_sessions s
   JOIN public.exams ex ON ex.id=s.result_id
   WHERE s.auth_user_id=v_uid AND s.exam_version_id=v_exam.id AND ex.passed
 ) THEN RAISE EXCEPTION 'Examination already passed'; END IF;

 IF EXISTS (
   SELECT 1 FROM public.aff_secure_exam_sessions s
   WHERE s.auth_user_id=v_uid AND s.exam_version_id=v_exam.id
     AND s.consumed_at IS NULL AND s.expires_at > clock_timestamp()
 ) THEN RAISE EXCEPTION 'Active examination attempt already exists'; END IF;

 SELECT coalesce(max(s.attempt_number),0)+1 INTO v_attempt
 FROM public.aff_secure_exam_sessions s
 WHERE s.auth_user_id=v_uid AND s.exam_version_id=v_exam.id;
 IF v_attempt > v_exam.max_attempts THEN
   RAISE EXCEPTION 'Examination attempt limit reached';
 END IF;

 SELECT jsonb_agg(jsonb_build_object(
   'id',q.question_id,'question',q.question_text,'options',q.options
 ) ORDER BY q.display_order) INTO v_questions
 FROM public.aff_secure_exam_questions q
 WHERE q.exam_version_id=v_exam.id;

 IF v_questions IS NULL THEN RAISE EXCEPTION 'Exam has no questions'; END IF;

 -- Requires pgcrypto gen_random_bytes availability in the selected schema.
 v_token := encode(gen_random_bytes(32),'hex');
 INSERT INTO public.aff_secure_exam_sessions(
   auth_user_id,exam_version_id,token_hash,attempt_number,
   started_at,expires_at
 ) VALUES (
   v_uid,v_exam.id,encode(sha256(convert_to(v_token,'UTF8')),'hex'),
   v_attempt,clock_timestamp(),
   clock_timestamp()+make_interval(secs=>v_exam.duration_seconds)
 ) RETURNING id INTO v_session_id;

 RETURN jsonb_build_object(
   'ok',true,'session_id',v_session_id,'exam_id',v_exam.legacy_exam_id,
   'token',v_token,'attempt_number',v_attempt,
   'duration_seconds',v_exam.duration_seconds,
   'questions',v_questions
 );
EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
 RAISE EXCEPTION 'Examination unavailable or ambiguous';
END;
$$;

REVOKE ALL ON FUNCTION public.aff_begin_secure_exam(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aff_begin_secure_exam(text) TO authenticated;
COMMIT;

-- BLOCKERS BEFORE STAGING EXECUTION:
-- 1. Phase 1 lacks immutable version/answer-key enforcement.
-- 2. The phase 2 submit function must be verified against trigger semantics.
-- 3. The phase 2 adapter uses p_exam_id/p_token/p_answers; update client only
--    after server functions pass staging security and concurrency tests.
-- 4. Published versions must have unambiguous legacy_exam_id values, or
--    change begin RPC to accept an internal UUID plus course context.
-- 5. Verify pgcrypto availability, SECURITY DEFINER owner, and function
--    resolution in the target PostgreSQL/Supabase environment.
-- 6. A failed or abandoned attempt consumes an attempt number by design;
--    confirm policy and expiry tolerance before release.
-- 7. Existing browser exam remains forgeable until separately approved cutover.
