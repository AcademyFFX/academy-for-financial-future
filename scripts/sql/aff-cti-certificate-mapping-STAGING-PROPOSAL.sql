-- AFF CTI certificate mapping: STAGING PROPOSAL ONLY / NOT AUTHORIZED TO RUN
-- Intentionally fails until an operator removes this guard after separate staging approval.
BEGIN;
DO $$
DECLARE
  v_slug text := 'aff-critical-thinking-independent-judgment';
  v_id bigint;
  v_count integer;
  v_existing integer;
  v_conflicts integer;
BEGIN
  RAISE EXCEPTION 'SAFETY STOP: unapproved staging-only proposal. Do not run in production or Civic staging.';
  -- The code below is unreachable by design. Review, adapt, and test only in an approved isolated staging environment.
  SELECT count(*) INTO v_count FROM public.courses
    WHERE course_code IN (SELECT 'AFF-CTI-' || n::text FROM generate_series(101,112) n);
  IF v_count <> 12 THEN
    RAISE EXCEPTION 'Expected 12 verified CTI courses; found %', v_count;
  END IF;
  SELECT count(*) INTO v_conflicts FROM (
    SELECT course_code FROM public.courses
    WHERE course_code IN (SELECT 'AFF-CTI-' || n::text FROM generate_series(101,112) n)
    GROUP BY course_code HAVING count(*) <> 1
  ) duplicates;
  IF v_conflicts <> 0 THEN RAISE EXCEPTION 'Duplicate course codes detected'; END IF;
  SELECT id INTO v_id FROM public.certification_catalog WHERE slug=v_slug;
  IF v_id IS NULL THEN
    INSERT INTO public.certification_catalog
      (slug,certificate_name,description,passing_score,status,course_id)
    VALUES
      (v_slug,'Certificate in Critical Thinking & Independent Judgment',
       'Draft integration record; academic policy and issuance not activated.',80,'Draft',
       (SELECT id FROM public.courses WHERE course_code='AFF-CTI-112'))
    RETURNING id INTO v_id;
  ELSIF EXISTS (SELECT 1 FROM public.certification_catalog WHERE id=v_id AND status <> 'Draft') THEN
    RAISE EXCEPTION 'Existing certificate is not Draft; refusing to alter it';
  END IF;
  SELECT count(*) INTO v_existing FROM public.certification_required_courses WHERE certification_id=v_id;
  IF v_existing > 0 AND EXISTS (
    SELECT 1 FROM public.certification_required_courses rc
    LEFT JOIN public.courses c ON c.id=rc.course_id
    WHERE rc.certification_id=v_id AND (c.course_code NOT IN
      (SELECT 'AFF-CTI-' || n::text FROM generate_series(101,112) n) OR
      rc.display_order <> (substring(c.course_code from 9)::int - 100))
  ) THEN
    RAISE EXCEPTION 'Existing mapping conflict; manual review required';
  END IF;
  INSERT INTO public.certification_required_courses(certification_id,course_id,display_order)
  SELECT v_id,c.id,(substring(c.course_code from 9)::int - 100)
  FROM public.courses c
  WHERE c.course_code IN (SELECT 'AFF-CTI-' || n::text FROM generate_series(101,112) n)
  ON CONFLICT (certification_id,course_id) DO NOTHING;
  IF (SELECT count(*) FROM public.certification_required_courses WHERE certification_id=v_id) <> 12 THEN
    RAISE EXCEPTION 'Mapping count must be exactly 12';
  END IF;
END $$;
ROLLBACK; -- Dry-run even after safety guard is intentionally removed.
