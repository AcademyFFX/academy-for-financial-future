# Membership authorization containment — F.7B.1
Restricted deployment planning only; do not execute in production without separate approval.
## Design
Move membership writes to authenticated server endpoints with explicit ownership and administrator checks. Derive paid entitlement only from verified payment evidence or separately authorized audited administrative grants. Preserve existing rows and normalize only after authorization. Do not trust client plan/status/provider IDs.
## Proposed containment SQL (review only)
BEGIN;
LOCK TABLE public.student_memberships IN ACCESS EXCLUSIVE MODE;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.student_memberships FROM PUBLIC, anon, authenticated;
-- Also revoke any explicit column INSERT/UPDATE grants discovered in catalog.
-- Preserve existing SELECT policies and trusted server privileges.
-- Abort unless effective privilege checks below pass for both client roles.
-- COMMIT only after approved maintenance and compatible server endpoints are ready.
ROLLBACK;
## Verification
Check effective table and every column INSERT/UPDATE privilege for anon/authenticated; check DELETE/TRUNCATE, inherited grants, service role permissions, trigger execution, exposed RPCs and admin role table policies. Test student own read, cross-student denial, plan request via server, forged paid state denial, legitimate admin actions, verified payment activation, no certification side effect. Use isolated disposable fixtures, not production student accounts.
## Recovery
Capture exact ACLs and policy/trigger definitions privately before deployment. If precommit checks fail roll back transaction. After commit prefer forward repair of server endpoints; restoring broad client write grants reopens the vulnerability and requires separate explicit security approval. No blanket grant rollback.
## Gates
Inventory all application writers, existing development migrations and server authorization before final SQL. Do not publish exploit details or production ACL snapshots to public repository. No production deployment or paid provisioning.
