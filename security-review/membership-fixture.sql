-- Run only in a fresh disposable PostgreSQL database as its owner.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE public.student_memberships(id integer PRIMARY KEY, student_id text NOT NULL, payment_status text NOT NULL);
ALTER TABLE public.student_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_read ON public.student_memberships FOR SELECT TO authenticated USING(student_id=current_setting('aff.test_student',true));
CREATE POLICY own_write ON public.student_memberships FOR ALL TO authenticated USING(student_id=current_setting('aff.test_student',true)) WITH CHECK(student_id=current_setting('aff.test_student',true));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.student_memberships TO authenticated;
GRANT UPDATE(payment_status) ON public.student_memberships TO authenticated;
GRANT SELECT ON public.student_memberships TO anon;
GRANT SELECT,INSERT,UPDATE ON public.student_memberships TO service_role;
INSERT INTO public.student_memberships VALUES(1,'fixture-a','Pending'),(2,'fixture-b','Pending');
