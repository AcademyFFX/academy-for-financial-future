# AFF CTI Staging-only Migration and Security Test Plan
Date: 2026-11-22
Status: PROPOSAL ONLY; not deployed or executed.

## Staging migration
See `scripts/sql/aff-cti-certificate-mapping-STAGING-PROPOSAL.sql`. The script contains an unconditional exception at the beginning and ends in ROLLBACK. It cannot persist records as committed. Both guards must remain until separate staging approval, full review, and a controlled migration procedure.

Preconditions:
- A separately authorized isolated LMS staging project, not production and not Civic staging.
- Twelve verified AFF-CTI-101 through AFF-CTI-112 course records with canonical source titles, source checksums, publication review.
- Institutional adoption of proposed certificate completion policy and approval of access-control design.
- A validated staging snapshot, verified migration operator, backup and rollback procedure.
- Recheck substring parsing, all schema constraints, and test SQL against staging; this proposal is not a verified runnable migration.

Intended changes: one Draft certification_catalog record with unique slug; twelve ordered certification_required_courses links; no publication, issuance or student data changes.

## Security test matrix (synthetic records)
| Actor | Submit own answers | Edit own score/review | Read another student's attempt | Issue certificate | Read instructor key |
|---|---|---|---|---|---|
| Anonymous | DENY | DENY | DENY | DENY | DENY |
| Student A | permitted only through controlled submission API | DENY | DENY | DENY until verified eligibility and secure issuance | DENY |
| Student B | same as A | DENY | DENY | DENY until verified eligibility and secure issuance | DENY |
| Instructor | approved grading pathway only | role-gated | only assigned records | authorized workflow only | permitted if verified |
| Admin | approved management pathway | auditable | authorized | guarded and auditable | permitted if verified |

Tests:
1. Forged score/status/reviewed_by cannot create a valid certificate.
2. Cross-student read/update/delete denied; anonymous write denied.
3. Certificate issuance verifies all 12 course completions, approved program average, 100-point capstone >=80, oral defense, exam review, academic integrity and instructor signoff.
4. Existing six required-course mappings and existing Civic certificate logic remain unchanged.
5. Instructor answer keys are never in public storage, lesson full_content, or student-visible URLs.
6. Repeat migration produces no duplicates; rollback removes only new CTI artifacts, never preexisting records.
7. Signed URLs expire and cannot be minted by unauthorized students.

## Explicit blockers
Existing certification_exam_attempts grants and student ALL policy are too permissive for trusting score/review fields. The current SECURITY DEFINER issuance RPC does not enforce CTI-specific capstone/program-average checks. Do not enable CTI certificate issuance before security repairs and staged regression tests.

No production or Civic staging changes are authorized.
