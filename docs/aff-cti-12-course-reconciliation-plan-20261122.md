# AFF Critical Thinking Certificate — 12-course reconciliation (NO EXECUTION)
Date: 2026-11-22
Branch: audit/aff-lms-repair-20261122

## Production inventory verified read-only
| Academic module | Proposed LMS code | Live course | Status | Action |
|---|---|---|---|---|
| 1 | AFF-CTI-101 | id 19, Foundations and Anatomy of Critical Thinking | Published | PRESERVE |
| 2 | AFF-CTI-102 | id 20, The Human Mind: Perception, Belief, and Reality | Draft | PRESERVE |
| 3 | AFF-CTI-103 | absent | — | PLAN ONLY |
| 4 | AFF-CTI-104 | absent | — | PLAN ONLY |
| 5 | AFF-CTI-105 | absent | — | PLAN ONLY |
| 6 | AFF-CTI-106 | absent | — | PLAN ONLY |
| 7 | AFF-CTI-107 | absent | — | PLAN ONLY |
| 8 | AFF-CTI-108 | absent | — | PLAN ONLY |
| 9 | AFF-CTI-109 | absent | — | PLAN ONLY |
| 10 | AFF-CTI-110 | absent | — | PLAN ONLY |
| 11 | AFF-CTI-111 | absent | — | PLAN ONLY |
| 12 | AFF-CTI-112 | absent | — | PLAN ONLY |

The code sequence 103–112 is proposed, not approved canonical naming. Module 10, 11, and 12 academic titles were previously approved: Scientific Thinking, Technology, and Artificial Intelligence; Debate, Constructive Disagreement, and Problem-Solving; Applied Critical Thinking — Final Capstone Laboratory. Preserve original approved content verbatim. Obtain authoritative titles and SHA-256 hashes for modules 3–9 rather than inventing them.

## Existing database certificate objects
- public.certificates has student_id, course_name, score, verification_code.
- public.digital_certificates has certification_id, exam_attempt_id, integrity_verified, issuance_source, status.
- These tables alone do not establish a verified 12-course certificate completion policy.
- No new certificate schema or issuance logic authorized.

## Mandatory pre-import gates
1. Reconcile all 12 original DOCX/HTML documents and hashes against LMS lessons/assets.
2. Confirm whether each module should be a separate course or a nested module in the final certificate catalog; preserve live 101/102 regardless.
3. Design program-course linkage and student progress criteria, exam/capstone passing threshold and instructor approval.
4. Validate instructor-only answer keys are never exposed via the public aff-course-assets bucket or student-facing lesson fields.
5. Prepare idempotent, offline preview of changes; require explicit production deployment authorization.
6. Do not modify Civic Staging or provision new paid staging resources.

No SQL statements or production mutations are included in this document.
