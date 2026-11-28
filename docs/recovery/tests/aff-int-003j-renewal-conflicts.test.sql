-- Disposable laboratory only; run after successful renewal replay.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE m uuid := '00000000-0000-4000-8000-000000000002'; c record;
BEGIN
 FOR c IN SELECT * FROM (VALUES
 ('evt_conflict_a','in_race_renew','pi_conflict_a','renewal receipt conflict'),
 ('evt_conflict_b','in_conflict_b','pi_race_renew','renewal receipt conflict'),
 ('evt_race_renew','in_conflict_c','pi_conflict_c','renewal event binding conflict')
 ) AS v(event_id,invoice_id,payment_id,expected)
 LOOP
 BEGIN
 PERFORM public.aff_record_verified_renewal(c.event_id,c.invoice_id,c.payment_id,m,'sub_test',1000,'usd','2027-02-01','2027-01-01');
 RAISE EXCEPTION 'unexpected success';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM <> c.expected THEN RAISE; END IF;
 END;
 END LOOP;
 IF (SELECT count(*) FROM public.aff_financial_ledger WHERE membership_id=m)<>1 OR (SELECT count(*) FROM public.aff_renewal_receipts WHERE membership_id=m)<>1 OR (SELECT count(*) FROM public.aff_renewal_event_bindings)<>1 OR EXISTS(SELECT 1 FROM public.aff_stripe_events WHERE event_id IN ('evt_conflict_a','evt_conflict_b')) OR (SELECT current_period_end FROM public.student_memberships WHERE id=m) IS DISTINCT FROM '2027-01-01'::timestamptz THEN RAISE EXCEPTION 'conflict rollback invariant failed'; END IF;
END $$;
ROLLBACK;
