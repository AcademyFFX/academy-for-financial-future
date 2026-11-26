-- Run after fixture and rollback-only containment rehearsal in disposable DB.
DO $$ BEGIN
 IF NOT has_table_privilege('authenticated','public.student_memberships','UPDATE') THEN RAISE EXCEPTION 'Rehearsal did not restore original grant'; END IF;
END $$;
BEGIN;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.student_memberships FROM PUBLIC,anon,authenticated;
REVOKE UPDATE(payment_status) ON public.student_memberships FROM authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('aff.test_student','fixture-a',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.student_memberships) <> 1 THEN RAISE EXCEPTION 'Ownership read failed'; END IF;
 BEGIN UPDATE public.student_memberships SET payment_status='Paid' WHERE id=1; RAISE EXCEPTION 'Unexpected write success'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.student_memberships VALUES(3,'fixture-a','Paid'); RAISE EXCEPTION 'Unexpected insert success'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.student_memberships WHERE id=1; RAISE EXCEPTION 'Unexpected delete success'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN IF (SELECT count(*) FROM public.student_memberships) <> 0 THEN RAISE EXCEPTION 'Anonymous read exposed rows'; END IF; END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.student_memberships SET payment_status='Paid' WHERE id=1;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.student_memberships WHERE id=1 AND payment_status='Paid') THEN RAISE EXCEPTION 'Server write failed'; END IF; END $$;
RESET ROLE;
ROLLBACK;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.student_memberships WHERE payment_status='Paid') THEN RAISE EXCEPTION 'Rollback failed'; END IF; END $$;
