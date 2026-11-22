-- AFF secure examination submission RPC — STAGING CANDIDATE PHASE 2
-- NOT EXECUTED. Requires phase1 schema and explicit isolated-staging approval.
-- Review security definer ownership, Supabase extension schemas, enrollment statuses,
-- and exam progress trigger before deployment. No production cutover in this file.
BEGIN;

CREATE OR REPLACE FUNCTION public.aff_submit_secure_exam(
  p_exam_id text, p_token text, p_answers jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.aff_secure_exam_sessions%ROWTYPE;
  v_exam public.aff_secure_exam_versions%ROWTYPE;
  v_total integer;
  v_correct integer;
  v_score integer;
  v_result_id bigint;
  v_answered integer;
  v_question_bank jsonb;
  v_started_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_exam_id IS NULL OR length(trim(p_exam_id)) = 0
     OR p_token IS NULL OR length(p_token) < 32
     OR jsonb_typeof(p_answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid examination submission';
  END IF;

  -- One session lock serializes simultaneous submissions with same token.
  SELECT * INTO v_session
  FROM public.aff_secure_exam_sessions s
  WHERE s.token_hash = encode(sha256(convert_to(p_token,'UTF8')), 'hex')
  FOR UPDATE;
  IF NOT FOUND OR v_session.auth_user_id <> v_uid
     OR v_session.consumed_at IS NOT NULL OR v_session.result_id IS NOT NULL
     OR v_session.expires_at < clock_timestamp() THEN
    RAISE EXCEPTION 'Examination session invalid or expired';
  END IF;

  SELECT * INTO v_exam FROM public.aff_secure_exam_versions v
  WHERE v.id = v_session.exam_version_id AND v.legacy_exam_id = p_exam_id
    AND v.status = 'Published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Examination not available'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id
    WHERE st.auth_user_id = v_uid AND e.course_id = v_exam.course_id
      AND lower(trim(coalesce(e.enrollment_status,''))) IN
        ('active','in progress','completed')
  ) THEN
    RAISE EXCEPTION 'Eligible enrollment required';
  END IF;

  IF v_session.attempt_number > v_exam.max_attempts THEN
    RAISE EXCEPTION 'Attempt limit exceeded';
  END IF;
  IF v_session.started_at > clock_timestamp()
     OR v_session.expires_at > v_session.started_at
          + make_interval(secs => v_exam.duration_seconds + 60) THEN
    RAISE EXCEPTION 'Invalid examination timing';
  END IF;

  SELECT count(*) INTO v_total FROM public.aff_secure_exam_questions q
  WHERE q.exam_version_id = v_exam.id;
  IF v_total = 0 OR (SELECT count(*) FROM jsonb_object_keys(p_answers)) <> v_total THEN
    RAISE EXCEPTION 'Incomplete or invalid answers';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_answers) AS k(question_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.aff_secure_exam_questions q
      WHERE q.exam_version_id = v_exam.id AND q.question_id = k.question_id
        AND jsonb_typeof(p_answers -> k.question_id) = 'string'
        AND q.options ? (p_answers ->> k.question_id)
    )
  ) THEN
    RAISE EXCEPTION 'Unknown question or option';
  END IF;

  SELECT count(*) INTO v_correct
  FROM public.aff_secure_exam_questions q
  WHERE q.exam_version_id = v_exam.id
    AND p_answers ->> q.question_id = q.correct_option_id;
  v_score := round(100.0 * v_correct / v_total)::integer;

  SELECT jsonb_agg(jsonb_build_object(
    'id',q.question_id,'question',q.question_text,'options',q.options
  ) ORDER BY q.display_order)
  INTO v_question_bank FROM public.aff_secure_exam_questions q
  WHERE q.exam_version_id = v_exam.id;

  -- Legacy table requires student_id as auth UUID, NOT students.id bigint.
  INSERT INTO public.exams (
    student_id, auth_user_id, course_id, lesson_id, quiz_id,
    exam_id, exam_name, exam_title, passing_score,
    answers, selected_answers, question_bank,
    score, result, passed, attempt_number, max_attempts,
    duration_seconds, total_points, earned_points, percentage, submitted_at
  ) VALUES (
    v_uid, v_uid, v_exam.course_id, v_exam.lesson_id,
    v_exam.quiz_asset_id::text, v_exam.legacy_exam_id, v_exam.title,
    v_exam.title, v_exam.passing_score,
    p_answers, p_answers, coalesce(v_question_bank,'[]'::jsonb),
    v_score, CASE WHEN v_score >= v_exam.passing_score THEN 'Pass' ELSE 'Fail' END,
    v_score >= v_exam.passing_score, v_session.attempt_number, v_exam.max_attempts,
    greatest(0,extract(epoch from clock_timestamp()-v_session.started_at)::integer),
    v_total, v_correct, v_score, clock_timestamp()
  ) RETURNING id INTO v_result_id;

  UPDATE public.aff_secure_exam_sessions
  SET consumed_at = clock_timestamp(), result_id = v_result_id
  WHERE id = v_session.id AND consumed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt was already consumed'; END IF;

  RETURN jsonb_build_object('ok',true,'result_id',v_result_id,
    'score',v_score,'passed',v_score >= v_exam.passing_score);
END;
$$;

REVOKE ALL ON FUNCTION public.aff_submit_secure_exam(text,text,jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aff_submit_secure_exam(text,text,jsonb)
  TO authenticated;
COMMIT;

-- PRE-DEPLOYMENT BLOCKERS:
-- 1. PostgreSQL jsonb_object_length may not exist in target version: replace
--    with (SELECT count(*) FROM jsonb_object_keys(p_answers)) before execution.
-- 2. Ensure SECURITY DEFINER owner is least-privileged and can access protected tables.
-- 3. Version/question immutability and secure session issuance are not yet implemented.
-- 4. Existing student INSERT policy still allows forged legacy exam results.
-- 5. Existing Civic/CTI progress matching permits NULL lesson_id wildcard.
-- 6. Existing score normalization and grading semantics require staging tests.
