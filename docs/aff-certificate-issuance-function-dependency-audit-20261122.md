# AFF Certificate Issuance Function — Read-Only Dependency Finding
Date: 2026-11-22
Status: no production changes.

## Confirmed function
public.issue_aff_certificate(p_attempt_id bigint), SECURITY DEFINER, search_path pg_catalog/public/auth.
It looks up certification_exam_attempts and certification_catalog, checks authenticated caller ownership/admin, links auth UUID to students.auth_user_id and legacy bigint student ID, and references existing public.certification_required_courses.

### Multi-course support already exists
When certification_required_courses has rows for a certification, the function checks enrollment in every mapped course and completion of all published required lessons across mapped courses. Earlier planning documents proposing a new mapping table are superseded. Reuse the existing mapping after verifying schema, constraints and policies.

### Issuance integrity concern
The function trusts attempt_row.result/pass_fail, score, submitted_at and status; for most certification slugs it does not require instructor reviewed_by/reviewed_at. Existing certification_exam_attempts RLS permits authenticated student ALL on own rows and grants UPDATE/INSERT on grading fields. This creates a potential forged-passing-attempt-to-certificate path. No exploit or unauthorized certificate was attempted. Do not expose or activate Critical Thinking certificate issuance until grading data provenance is secured.

### Existing safeguards
The function checks enrollment, published lesson progress, required assignments on the catalog's primary course, ownership/admin, and reuses existing valid certificate under advisory transaction lock. There is special additional review/capstone logic for slug true-patriotism-volume-i, which should not be modified without separate Civic approval.

## Next read-only checks
1. Inspect public.certification_required_courses schema, FK constraints, RLS, and grants.
2. Inspect public.issue_aff_certificate EXECUTE privileges using an alternate safe read-only catalog query if permitted.
3. Audit other invocation paths and whether trusted review data can be forged.
4. Draft narrowly scoped staged patch and regression tests preserving existing Civic behavior; no production SQL.
