-- REVIEW ONLY. Rehearse on isolated database; never automatically deploy.
BEGIN;
SET LOCAL lock_timeout = '3s';
LOCK TABLE public.student_memberships IN ACCESS EXCLUSIVE MODE;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.student_memberships FROM PUBLIC, anon, authenticated;
DO $$
DECLARE c record; r text;
BEGIN
 FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.student_memberships'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE INSERT (%1$I), UPDATE (%1$I) ON public.student_memberships FROM PUBLIC, anon, authenticated',c.attname);
 END LOOP;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_table_privilege(r,'public.student_memberships','INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(r,'public.student_memberships','INSERT,UPDATE') THEN
   RAISE EXCEPTION 'Effective client write privileges remain';
  END IF;
 END LOOP;
 IF NOT has_table_privilege('service_role','public.student_memberships','INSERT') OR NOT has_table_privilege('service_role','public.student_memberships','UPDATE') THEN
  RAISE EXCEPTION 'Trusted server write privileges missing';
 END IF;
END $$;
-- Deliberately never persists changes. Separate reviewed deployment required.
ROLLBACK;
