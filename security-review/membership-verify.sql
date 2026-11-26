-- Read-only catalog checks; no student data.
SELECT r.role_name,
 has_table_privilege(r.role_name,'public.student_memberships','SELECT') AS can_read,
 has_table_privilege(r.role_name,'public.student_memberships','INSERT,UPDATE,DELETE,TRUNCATE') AS any_table_write,
 has_any_column_privilege(r.role_name,'public.student_memberships','INSERT,UPDATE') AS any_column_write
FROM (VALUES ('anon'),('authenticated'),('service_role')) r(role_name);
SELECT relrowsecurity FROM pg_class WHERE oid='public.student_memberships'::regclass;
SELECT policyname,roles,cmd FROM pg_policies WHERE schemaname='public' AND tablename='student_memberships';
-- Expected after approved containment: both client write flags false;
-- service_role INSERT and UPDATE true; RLS enabled. Role behavior and RPC tests separate.
