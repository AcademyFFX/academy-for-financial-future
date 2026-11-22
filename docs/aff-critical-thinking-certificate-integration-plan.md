# AFF Critical Thinking Certificate — LMS Integration Manifest (Draft)

Status: planning only; not deployed or published.
Branch: audit/aff-lms-repair-20261122

## Program
- One certificate course: AFF University Critical Thinking Certificate, Volume I
- Twelve sequential modules; preserve existing approved curriculum verbatim.
- Modules 1–9: titles and source files require verification; do not regenerate.
- Module 10: Scientific Thinking, Technology, and Artificial Intelligence
- Module 11: Debate, Constructive Disagreement, and Problem-Solving
- Module 12: Applied Critical Thinking — Final Capstone Laboratory

## Per-module asset mapping
- Approved academic lesson
- Student workbook
- Case studies
- Practice examination and answer key (instructor-only)
- Instructor guide and grading rubric (instructor-only)
- Academic references
- Media: optional; admin-uploaded only

## Acceptance gates
1. Verify canonical source files and their hashes before import.
2. Inspect existing LMS schema, roles, course and lesson APIs before writing migration or import code.
3. Map one course to 12 ordered modules without duplicating existing courses.
4. Keep instructor-only answer keys inaccessible to students.
5. Confirm progress, quiz, capstone, and certificate eligibility with tests.
6. No production writes, no Civic staging changes, no paid resources, and no deployment without separate approval.

## Implementation state
This file is a non-executable planning manifest. Curriculum source files have not been imported. No LMS database changes are authorized by this manifest.
