# AFF Exam Attempt Write-Path Compatibility Audit — 2026-11-22
Status: read-only repository inspection; no production changes.

## Confirmed
- Inspected audit branch components/course-upload-center.tsx (1014 lines) and components/admin-lms-manager.tsx (1861 lines).
- No direct string references in either to certification_exam_attempts, exam_attempt, certification_catalog, digital_certificates, manual_score or reviewed_by.
- GitHub code search for certification_exam_attempts, certification_exam, manual_score, reviewed_by returned no results. Search coverage may be limited; this is NOT evidence that other routes do not exist.
- Production grants and RLS audit previously found authenticated student self-row ALL permissions, with unrestricted grading columns at the database privilege layer and no user-defined trigger on certification_exam_attempts.

## Proposed compatibility-safe patch (NOT IMPLEMENTED)
Phase A — dependency inventory:
1. Obtain full repository tree and inspect all app/api, app/admin, lib, server actions, Supabase functions, SQL migrations and RPC calls for attempt submission and review.
2. Audit Postgres functions, views, grants, security-definer routines, and dependent triggers by read-only catalog queries.
3. Identify exact student submit and instructor grade pathways and expected request/response payloads.
4. Define an explicit authenticated UUID -> legacy student bigint mapping, if relevant.

Phase B — isolated staging:
1. Clone non-sensitive schema and synthetic test data to an explicitly approved isolated staging environment.
2. Introduce separate student submission API accepting only permitted answer/submission fields, never scores or review metadata.
3. Move grading/review writes to server-authorized workflow with audit trail; lock down direct student UPDATE/DELETE and column grants.
4. Verify authorization matrix for anon, student A, student B, instructor, admin, service role; test tampering, forged identities, replay, and race conditions.
5. Split Module 12 student/instructor content, store instructor material privately, and test signed URL expiry and unauthorized access.

Phase C — approval:
- Produce diff, dependency report, passing staging tests, rollback plan, and impact analysis.
- Obtain separate production authorization before applying SQL or deployment.
- Do not use Civic staging as exam repair staging without explicit approval.

## Current decision
NO-GO for direct production privilege changes and certificate issuance until dependency discovery and staged tests are complete.
