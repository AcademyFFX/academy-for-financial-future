-- Disposable fixture only; never run against production.
BEGIN;
ALTER TABLE public.student_memberships ADD COLUMN stripe_subscription_id text, ADD COLUMN active_membership_plan text, ADD COLUMN membership_status text, ADD COLUMN account_status text, ADD COLUMN payment_status text, ADD COLUMN current_period_end timestamptz;
INSERT INTO public.student_memberships VALUES ('00000000-0000-4000-8000-000000000002','sub_test','Monthly Membership','active','active','paid','2026-12-01');
GRANT SELECT,UPDATE ON public.student_memberships TO service_role;
COMMIT;
\ir ../aff-int-003d-renewal.draft.sql
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE m uuid := '00000000-0000-4000-8000-000000000002'; r text;
BEGIN
 r:=public.aff_record_verified_renewal('evt_renew','in_renew','pi_renew',m,'sub_test',1000,'usd','2027-01-01','2026-12-01');
 IF r IS DISTINCT FROM 'extended' THEN RAISE EXCEPTION 'expected extension'; END IF;
 r:=public.aff_record_verified_renewal('evt_renew','in_renew','pi_renew',m,'sub_test',1000,'usd','2027-01-01','2026-12-01');
 IF r IS DISTINCT FROM 'already_recorded' THEN RAISE EXCEPTION 'expected replay'; END IF;
 BEGIN
 PERFORM public.aff_record_verified_renewal('evt_bad','in_bad','pi_bad',m,'sub_test',1000,'usd','2026-12-15','2026-12-01');
 RAISE EXCEPTION 'unexpected success';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'nonadvancing renewal period' THEN RAISE; END IF;
 END;
 IF (SELECT current_period_end FROM public.student_memberships WHERE id=m) IS DISTINCT FROM '2027-01-01'::timestamptz OR (SELECT count(*) FROM public.aff_financial_ledger WHERE membership_id=m)<>1 OR EXISTS(SELECT 1 FROM public.aff_stripe_events WHERE event_id='evt_bad') OR EXISTS(SELECT 1 FROM public.aff_renewal_receipts WHERE invoice_id='in_bad') THEN RAISE EXCEPTION 'renewal atomicity failed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('authenticated','public.aff_record_verified_renewal(text,text,text,uuid,text,bigint,text,timestamptz,timestamptz)','EXECUTE') OR has_function_privilege('anon','public.aff_record_verified_renewal(text,text,text,uuid,text,bigint,text,timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'unexpected RPC grant'; END IF;
END $$;
ROLLBACK;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.aff_renewal_receipts) OR EXISTS(SELECT 1 FROM public.aff_financial_ledger WHERE membership_id='00000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'rollback failed'; END IF; END $$;
