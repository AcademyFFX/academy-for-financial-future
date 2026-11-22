# AFF LMS Exam Attempt Permissions — Critical Security Finding
Date: 2026-11-22
Scope: read-only production audit. No production SQL mutations.

## Verified findings
- public.certification_exam_attempts has RLS enabled.
- Policy "AFF students manage own certification attempts" grants authenticated ALL where student_id=auth.uid() OR is_aff_admin(), and same WITH CHECK.
- Both authenticated and anon roles have table-level INSERT/UPDATE/DELETE grants; RLS may still deny anon rows, but grants are overbroad.
- authenticated has column-level INSERT/UPDATE privileges on score, automatic_score, manual_score, result, pass_fail, status, reviewed_by, reviewed_at, instructor_comments and identity fields.
- No user-defined table triggers were returned for certification_exam_attempts.
- A student who can update their own row may be able to tamper with scoring or approval metadata. No exploit was attempted and no end-to-end authorization test has been run.
- Do not treat the current exam_attempts score/review fields as sufficient authority to issue CTI certificates.

## Proposed repair sequence (NOT EXECUTED)
1. Identify every existing client/server write path and dependencies on certification_exam_attempts.
2. Create staging test cases for anonymous, authenticated student, instructor, admin, and trusted server roles.
3. Replace student ALL policy with least-privilege SELECT and controlled submission workflow; restrict UPDATE/DELETE and sensitive columns to trusted server-side grading actions.
4. Revoke unnecessary grants from anon and authenticated roles, considering existing API dependencies; do not rely on RLS alone to protect column values.
5. Validate service-role operations are never exposed to browser clients; authorize instructor/admin operations using verified roles.
6. Add audit trail for scoring/review changes and immutable approved outcomes.
7. Verify no unauthorized issuance, grading changes, cross-student access, or regression to existing student exams.
8. Deploy only after separate approval, staging validation and documented rollback.

## Instructor-only content split
- Module 12 source HTML includes instructor answer key and guidance; student-facing publication of the raw file is blocked.
- Prepare a student-safe lesson derivative and instructor-only file; preserve original authoritative source unchanged.
- Use private storage with server-verified instructor/admin access and short-lived signed URLs.
- Never use public aff-course-assets bucket for answer keys.

## Rollback planning
- Capture prechange schema, grants, policies and dependent code as version-controlled migration snapshots.
- Prepare reverse grants/policies migration in a separate file, but do not blindly restore insecure grants during an incident.
- Restore access only after security review and regression tests; keep student certificates/attempts intact.
- Any production migration or rollback requires explicit separate approval.
