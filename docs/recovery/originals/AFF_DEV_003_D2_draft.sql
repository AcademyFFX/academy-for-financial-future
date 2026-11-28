-- REVIEW ONLY. Requires D1, trusted checkout intent creation and webhook validation.
-- Deliberately does not activate production memberships until status vocabulary,
-- entitlement rules and Stripe subscription lifecycle have been verified.
BEGIN;
CREATE TABLE public.aff_payment_intents (
 checkout_session_id text PRIMARY KEY,
 membership_id uuid NOT NULL REFERENCES public.student_memberships(id) ON DELETE RESTRICT,
 plan text NOT NULL CHECK (length(plan)>0),
 amount_minor bigint NOT NULL CHECK (amount_minor>0),
 currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
 livemode boolean NOT NULL,
 expires_at timestamptz NOT NULL
);
ALTER TABLE public.aff_payment_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aff_payment_intents FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.aff_payment_intents TO service_role;
CREATE FUNCTION public.aff_record_verified_checkout(p_event text,p_session text,p_payment text,p_amount bigint,p_currency text,p_live boolean,p_occurred timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.aff_payment_intents%ROWTYPE; e public.aff_stripe_events%ROWTYPE; l public.aff_financial_ledger%ROWTYPE;
BEGIN
 IF p_event IS NULL OR p_payment IS NULL OR p_session IS NULL OR p_live IS NULL OR p_occurred IS NULL OR p_amount IS NULL OR p_currency IS NULL THEN RAISE EXCEPTION 'missing payment data'; END IF;
 SELECT * INTO STRICT i FROM public.aff_payment_intents WHERE checkout_session_id=p_session;
 IF i.amount_minor<>p_amount OR i.currency<>p_currency OR i.livemode<>p_live OR p_occurred>i.expires_at THEN RAISE EXCEPTION 'checkout mismatch'; END IF;
 INSERT INTO public.aff_stripe_events(event_id,event_type,livemode) VALUES(p_event,'checkout.session.completed',p_live) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT e FROM public.aff_stripe_events WHERE event_id=p_event FOR UPDATE;
 IF e.livemode<>p_live OR e.event_type<>'checkout.session.completed' THEN RAISE EXCEPTION 'event mismatch'; END IF;
 INSERT INTO public.aff_financial_ledger(membership_id,stripe_event_id,provider_object_id,livemode,entry_type,amount_minor,currency,occurred_at)
 VALUES(i.membership_id,p_event,p_payment,p_live,'payment',p_amount,p_currency,p_occurred) ON CONFLICT(livemode,entry_type,provider_object_id) DO NOTHING;
 SELECT * INTO STRICT l FROM public.aff_financial_ledger WHERE livemode=p_live AND entry_type='payment' AND provider_object_id=p_payment;
 IF l.membership_id<>i.membership_id OR l.amount_minor<>p_amount OR l.currency<>p_currency THEN RAISE EXCEPTION 'payment identity conflict'; END IF;
 -- Activation intentionally deferred. Never infer paid access from this draft.
 UPDATE public.aff_stripe_events SET processing_status='processed',processed_at=now() WHERE event_id=p_event;
 RETURN 'recorded_only';
END; $$;
REVOKE ALL ON FUNCTION public.aff_record_verified_checkout(text,text,text,bigint,text,boolean,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aff_record_verified_checkout(text,text,text,bigint,text,boolean,timestamptz) TO service_role;
COMMIT;
-- Before deployment: enforce one payment per checkout, bind event to canonical payment,
-- confirm trusted provider data, subscription renewals and status vocabulary,
-- implement atomic entitlement update and test rollback/concurrency/replay.