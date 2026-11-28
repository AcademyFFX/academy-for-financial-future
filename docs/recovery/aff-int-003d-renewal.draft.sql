-- Review-only reconstruction; not original F4B. Requires D1 and revised D2.
BEGIN;
CREATE TABLE public.aff_renewal_receipts (
 invoice_id text PRIMARY KEY,
 payment_id text NOT NULL UNIQUE,
 membership_id uuid NOT NULL REFERENCES public.student_memberships(id) ON DELETE RESTRICT,
 subscription_id text NOT NULL,
 period_end timestamptz NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency text NOT NULL CHECK(currency ~ '^[a-z]{3}$')
);
CREATE TABLE public.aff_renewal_event_bindings (
 event_id text PRIMARY KEY REFERENCES public.aff_stripe_events(event_id) ON DELETE RESTRICT,
 invoice_id text NOT NULL REFERENCES public.aff_renewal_receipts(invoice_id) ON DELETE RESTRICT
);
ALTER TABLE public.aff_renewal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_renewal_event_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aff_renewal_receipts,public.aff_renewal_event_bindings FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.aff_renewal_receipts,public.aff_renewal_event_bindings TO service_role;
CREATE FUNCTION public.aff_record_verified_renewal(p_event text,p_invoice text,p_payment text,p_membership uuid,p_subscription text,p_amount bigint,p_currency text,p_end timestamptz,p_occurred timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE m public.student_memberships%ROWTYPE; inserted integer;
BEGIN
 IF p_event IS NULL OR p_event !~ '^evt_[A-Za-z0-9_]+$' OR p_invoice IS NULL OR p_invoice !~ '^in_[A-Za-z0-9_]+$' OR p_payment IS NULL OR p_payment !~ '^pi_[A-Za-z0-9_]+$' OR p_subscription IS NULL OR p_subscription !~ '^sub_[A-Za-z0-9_]+$' OR p_membership IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_currency IS NULL OR p_currency !~ '^[a-z]{3}$' OR p_end IS NULL OR p_occurred IS NULL OR NOT isfinite(p_end) OR NOT isfinite(p_occurred) OR p_end<=p_occurred THEN RAISE EXCEPTION 'invalid renewal evidence'; END IF;
 SELECT * INTO STRICT m FROM public.student_memberships WHERE id=p_membership FOR UPDATE;
 IF m.stripe_subscription_id IS DISTINCT FROM p_subscription OR m.active_membership_plan IS NULL OR m.active_membership_plan NOT IN ('Monthly Membership','Annual Membership','Premium Mentorship') OR m.membership_status IS DISTINCT FROM 'active' OR m.account_status IS DISTINCT FROM 'active' OR m.payment_status IS DISTINCT FROM 'paid' THEN RAISE EXCEPTION 'membership reconciliation required'; END IF;
 INSERT INTO public.aff_stripe_events(event_id,event_type,livemode) VALUES(p_event,'invoice.paid',true) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.aff_stripe_events WHERE event_id=p_event AND event_type='invoice.paid' AND livemode FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'renewal event conflict'; END IF;
 INSERT INTO public.aff_renewal_receipts VALUES(p_invoice,p_payment,p_membership,p_subscription,p_end,p_amount,p_currency) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF NOT EXISTS(SELECT 1 FROM public.aff_renewal_receipts WHERE invoice_id=p_invoice AND payment_id=p_payment AND membership_id=p_membership AND subscription_id=p_subscription AND period_end=p_end AND amount_minor=p_amount AND currency=p_currency) THEN RAISE EXCEPTION 'renewal receipt conflict'; END IF;
 INSERT INTO public.aff_renewal_event_bindings VALUES(p_event,p_invoice) ON CONFLICT DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.aff_renewal_event_bindings WHERE event_id=p_event AND invoice_id=p_invoice) THEN RAISE EXCEPTION 'renewal event binding conflict'; END IF;
 IF inserted=1 THEN
 IF m.current_period_end IS NULL OR p_end<=m.current_period_end THEN RAISE EXCEPTION 'nonadvancing renewal period'; END IF;
 INSERT INTO public.aff_financial_ledger(membership_id,stripe_event_id,provider_object_id,livemode,entry_type,amount_minor,currency,occurred_at) VALUES(p_membership,p_event,p_payment,true,'payment',p_amount,p_currency,p_occurred);
 UPDATE public.student_memberships SET current_period_end=p_end WHERE id=p_membership;
 ELSE
 IF NOT EXISTS(SELECT 1 FROM public.aff_financial_ledger WHERE membership_id=p_membership AND provider_object_id=p_payment AND livemode AND entry_type='payment' AND amount_minor=p_amount AND currency=p_currency) THEN RAISE EXCEPTION 'missing renewal ledger entry'; END IF;
 END IF;
 UPDATE public.aff_stripe_events SET processing_status='processed',processed_at=now() WHERE event_id=p_event;
 IF inserted=1 THEN RETURN 'extended'; ELSE RETURN 'already_recorded'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.aff_record_verified_renewal(text,text,text,uuid,text,bigint,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.aff_record_verified_renewal(text,text,text,uuid,text,bigint,text,timestamptz,timestamptz) TO service_role;
COMMIT;
-- Requires trusted server evidence; RPC cannot independently authenticate Stripe.
-- Verify status vocabulary, trigger behavior, customer/price binding, period continuity,
-- replay after cancellation, service role grants and concurrent rollback before release.
