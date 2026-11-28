-- Run only in the disposable PostgreSQL laboratory.
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION public.is_aff_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
\ir ../aff-int-005b-marketplace-schema.draft.sql
BEGIN;
INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000011');
INSERT INTO public.marketplace_products(product_id,title,category,product_type,description,price_label,price_cents,price_env,active)
VALUES ('lab-active','Active','Lab','course','Synthetic','$10',1000,'LAB',true),
('lab-hidden','Hidden','Lab','course','Synthetic','$10',1000,'LAB',false);
INSERT INTO public.marketplace_purchases(student_id,student_email,product_id,product_title,product_category,product_type,instructor_name,stripe_checkout_session_id)
VALUES ('00000000-0000-4000-8000-000000000011','lab@example.invalid','lab-active','Active','Lab','course','Lab','cs_lab');
INSERT INTO public.marketplace_affiliates(code,affiliate_name) VALUES ('LAB','Synthetic');
INSERT INTO public.marketplace_affiliate_commissions(affiliate_id,purchase_id,product_id,student_id)
SELECT a.id,p.id,p.product_id,p.student_id FROM public.marketplace_affiliates a CROSS JOIN public.marketplace_purchases p;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname LIKE 'marketplace_%' AND c.relkind='r' AND NOT c.relrowsecurity) THEN RAISE EXCEPTION 'RLS missing'; END IF;
 IF has_table_privilege('authenticated','public.marketplace_purchases','SELECT') OR has_table_privilege('authenticated','public.marketplace_products','INSERT') OR has_table_privilege('anon','public.marketplace_products','SELECT') OR has_table_privilege('service_role','public.marketplace_purchases','DELETE') OR has_table_privilege('service_role','public.marketplace_affiliate_commissions','DELETE') THEN RAISE EXCEPTION 'Unexpected privilege'; END IF;
 BEGIN
 INSERT INTO public.marketplace_purchases(student_id,student_email,product_id,product_title,product_category,product_type,instructor_name,stripe_checkout_session_id)
 SELECT student_id,student_email,product_id,product_title,product_category,product_type,instructor_name,stripe_checkout_session_id FROM public.marketplace_purchases;
 RAISE EXCEPTION 'Duplicate session accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
 INSERT INTO public.marketplace_affiliate_commissions(affiliate_id,purchase_id,product_id,student_id)
 SELECT affiliate_id,purchase_id,product_id,student_id FROM public.marketplace_affiliate_commissions;
 RAISE EXCEPTION 'Duplicate commission accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
 DELETE FROM auth.users;
 RAISE EXCEPTION 'Financial record owner deletion accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.marketplace_products)<>1 OR EXISTS(SELECT 1 FROM public.marketplace_products WHERE NOT active) THEN RAISE EXCEPTION 'Catalog visibility failed'; END IF;
 IF EXISTS(SELECT 1 FROM public.marketplace_affiliates) OR EXISTS(SELECT 1 FROM public.marketplace_affiliate_commissions) OR EXISTS(SELECT 1 FROM public.marketplace_coupons) THEN RAISE EXCEPTION 'Private data exposed'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
