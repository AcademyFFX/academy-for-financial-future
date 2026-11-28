-- AFF-DEV-003-D.1 | REVIEW ONLY | Not deployed or tested
-- Apply only in an authorized isolated test database.
BEGIN;
CREATE TABLE public.aff_stripe_events (
 event_id text PRIMARY KEY CHECK (length(event_id)>0),
 event_type text NOT NULL,
 livemode boolean NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz,
 processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processed','failed','ignored')),
 error_code text
);
CREATE TABLE public.aff_financial_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 membership_id uuid NOT NULL REFERENCES public.student_memberships(id) ON DELETE RESTRICT,
 stripe_event_id text NOT NULL REFERENCES public.aff_stripe_events(event_id) ON DELETE RESTRICT,
 provider_object_id text NOT NULL CHECK (length(provider_object_id)>0),
 livemode boolean NOT NULL,
 entry_type text NOT NULL CHECK (entry_type IN ('payment','refund')),
 amount_minor bigint NOT NULL CHECK (amount_minor>0),
 currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
 occurred_at timestamptz NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(livemode,entry_type,provider_object_id)
);
CREATE INDEX aff_financial_ledger_membership_idx ON public.aff_financial_ledger(membership_id,occurred_at DESC);
ALTER TABLE public.aff_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aff_financial_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aff_stripe_events, public.aff_financial_ledger FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.aff_stripe_events TO service_role;
GRANT SELECT, INSERT ON public.aff_financial_ledger TO service_role;
CREATE VIEW public.aff_billing_history WITH (security_invoker=true) AS
 SELECT id,membership_id,entry_type,amount_minor,currency,occurred_at,livemode FROM public.aff_financial_ledger;
REVOKE ALL ON public.aff_billing_history FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.aff_billing_history TO service_role;
COMMIT;
-- Pending: confirm PK/constraints, canonical provider IDs, refund reconciliation,
-- live/test isolation in membership activation, webhook signature verification,
-- transactional RPC, ownership policies and test suite before deployment.