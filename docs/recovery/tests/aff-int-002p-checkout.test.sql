-- DISPOSABLE DATABASE ONLY. Requires D1 and revised 002O, not original D2.
-- Fixture membership supplied by isolated harness; never use production.
BEGIN;
INSERT INTO public.aff_payment_intents(checkout_session_id,membership_id,plan,amount_minor,currency,livemode,expires_at)
VALUES ('cs_test_aff_a','00000000-0000-4000-8000-000000000001','test',1000,'usd',false,'2030-01-01'),
('cs_test_aff_b','00000000-0000-4000-8000-000000000001','test',1000,'usd',false,'2030-01-01');
SET LOCAL ROLE service_role;
DO $$
DECLARE c record; rejected boolean;
BEGIN
 IF public.aff_record_verified_checkout('evt_aff_a','cs_test_aff_a','pi_aff_a',1000,'usd',false,'2026-11-27') <> 'recorded_only' THEN RAISE EXCEPTION 'valid checkout failed'; END IF;
 PERFORM public.aff_record_verified_checkout('evt_aff_a','cs_test_aff_a','pi_aff_a',1000,'usd',false,'2026-11-27');
 FOR c IN SELECT * FROM (VALUES
 ('evt_aff_b','cs_test_aff_a','pi_aff_b',1000,'usd',false,'2026-11-27','checkout settlement conflict'),
 ('evt_aff_a','cs_test_aff_b','pi_aff_b',1000,'usd',false,'2026-11-27','event binding conflict'),
 ('evt_aff_b','cs_test_aff_b','pi_aff_a',1000,'usd',false,'2026-11-27','checkout settlement conflict'),
 ('evt_aff_b','cs_test_aff_b','pi_aff_b',999,'usd',false,'2026-11-27','checkout mismatch'),
 ('evt_aff_b','cs_test_aff_b','pi_aff_b',1000,'eur',false,'2026-11-27','checkout mismatch'),
 ('evt_aff_b','cs_test_aff_b','pi_aff_b',1000,'usd',true,'2026-11-27','checkout mismatch'),
 ('evt_aff_b','cs_test_aff_b','pi_aff_b',1000,'usd',false,'2031-01-01','checkout mismatch')
 ) AS t(e,s,p,a,cur,live,ts,msg)
 LOOP
 rejected:=false;
 BEGIN
 PERFORM public.aff_record_verified_checkout(c.e,c.s,c.p,c.a::bigint,c.cur,c.live,c.ts::timestamptz);
 EXCEPTION WHEN raise_exception THEN
 IF SQLERRM<>c.msg THEN RAISE; END IF;
 rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'unexpected acceptance: %',c.msg; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.aff_financial_ledger)<>1 OR (SELECT count(*) FROM public.aff_checkout_settlements)<>1 OR (SELECT count(*) FROM public.aff_checkout_event_bindings)<>1 OR (SELECT count(*) FROM public.aff_stripe_events)<>1 THEN RAISE EXCEPTION 'duplicate or partial transaction'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE r text;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
 IF has_function_privilege(r,'public.aff_record_verified_checkout(text,text,text,bigint,text,boolean,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'unauthorized RPC: %',r; END IF;
 END LOOP;
 IF has_table_privilege('service_role','public.aff_financial_ledger','UPDATE') OR has_table_privilege('service_role','public.aff_financial_ledger','DELETE') THEN RAISE EXCEPTION 'ledger mutable'; END IF;
END $$;
ROLLBACK;
