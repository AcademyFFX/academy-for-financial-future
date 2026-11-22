# AFF Critical Thinking — Verified LMS Inventory and Test Checkpoint
Date: 2026-11-22
Scope: read-only production SQL and isolated offline script tests; no production writes.

## Existing LMS records
| Course ID | Code | Course name | Status | Lessons | Module assets | Other assets |
|---|---|---|---|---:|---:|---:|
| 19 | AFF-CTI-101 | Foundations and Anatomy of Critical Thinking | Published | 1 | 1 | 2 |
| 20 | AFF-CTI-102 | The Human Mind: Perception, Belief, and Reality | Draft | 1 | 1 | 2 |

Course 19 module and lesson title: Module 1: Foundations and Anatomy of Critical Thinking (Published).
Course 20 module and lesson title: Module 2: The Human Mind: Perception, Belief, and Reality (Draft).
Both existing module assets have display_order=1 within their respective courses.

## Architecture correction
The existing implementation uses one LMS course per Critical Thinking academic module. Do not collapse existing records into a single course. A certificate-level grouping can connect course codes AFF-CTI-101 through AFF-CTI-112, subject to verifying the canonical academic curriculum and schema.

## Test checkpoint
Offline reconciliation script logic and its checked-in test assertions were executed in an isolated local Node environment; PASS. This was not a GitHub Actions CI run and does not prove end-to-end LMS functionality.

## Next gates
- Find and checksum canonical approved source documents for all twelve academic modules.
- Inventory the remaining course codes and titles, not just 101/102.
- Confirm certificate grouping and completion eligibility schema, without production writes.
- Resolve public aff-course-assets bucket exposure before uploading instructor-only materials.
- Obtain separate approval before any import, deployment, production change, or paid infrastructure.
