# AFF Exam Grading Security — Restricted Write Patch Specification
Date: 2026-11-22
Status: design and test preparation only. No database changes.

## Threat boundary confirmed
Authenticated users have broad grants and self-row ALL RLS on public.certification_exam_attempts. Student-controlled score, pass_fail, result, status, reviewed_by and reviewed_at cannot be treated as authoritative. The SECURITY DEFINER issue_aff_certificate RPC currently reads some of these fields and may issue a certificate after other checks.

## Minimal compatible repair proposal (not executable SQL)
1. Inventory every API, RPC, Edge Function, and server action that writes certification_exam_attempts. Do not revoke grants until callers are known.
2. Move grading to a trusted server-side function with explicit role checks, a fixed search_path, audit trail, and immutable reviewed outcome. Reject user-supplied grading or reviewer fields.
3. Limit student access to reading their own attempt and submitting answers via an allowlisted submission endpoint. No direct UPDATE/DELETE of grade, status, or identity columns.
4. Revoke excessive anonymous and authenticated grants only after verifying alternate submission paths. Ensure RLS policies match the new role separation.
5. Modify issue_aff_certificate to require trusted finalized review for all certificate types, and CTI-specific completion, weighted program score, capstone rubric, and instructor signoff. Preserve Civic-specific requirements and existing certificates.
6. Add concurrency/idempotency and denial tests for forged scores, forged reviewer identity, cross-student attempts, repeat issuance and instructor-key downloads.
7. Test in a separately approved isolated staging database with synthetic identities and data. Do not use Civic staging without explicit approval.

## Compatibility matrix
- Existing published courses, students, lessons and issued certificates: read behavior preserved.
- Student exam submission: replace direct row mutation with controlled submission path before revocation.
- Instructor grading: only server-authorized writes, auditable.
- Existing Civic certificate issuance: regression test existing special capstone and integrity gates.
- CTI issuance: disabled until 12 courses, approved institutional policy and secure review provenance are verified.
- Instructor files: private bucket and server authorization; never public aff-course-assets.

## Rollback
Snapshot policy/grant definitions and relevant application code before staging. Roll back new endpoints and database policies in a single controlled change. Do not automatically re-enable insecure student grading writes; provide a safe maintenance-mode alternative if the new flow fails.

## Execution boundary
No production migration, staging provisioning, data writes, or certificate issuance is approved by this specification.
