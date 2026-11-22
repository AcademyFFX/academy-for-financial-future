# AFF CTI source discovery and certificate gate — 2026-11-22
Status: read-only research, no production writes.

## Source files located
- Library: AFF_Critical_Thinking_Volume_I_Module_2.docx — existing manuscript, not yet checksum-verified.
- Library: AFF_Critical_Thinking_Volume_I_Module_12.html — existing manuscript, not yet checksum-verified.
- Module 12 HTML explicitly identifies AFF-CTI-112, certificate "Critical Thinking & Independent Judgment", and prerequisite Modules 1–11. It is marked "Academic curriculum manuscript — pending review."
- Search did not establish verified canonical source files for modules 1, 3–11; absence from search results is not proof files do not exist.

## Certificate completion gate (proposal, NOT deployed)
- Link the twelve verified course codes to one certificate track without duplicating existing course records.
- Require authenticated student enrollment and completion of each approved module 1–11 before capstone access.
- Require Module 12 capstone submission, examination result and instructor approval according to verified original rubric.
- Block issuance if any prerequisite, assessment integrity, or manual approval is missing.
- Issue unique, auditable verification only through existing approved certificate issuance flow after authorization testing.
- Store answer keys and instructor rubrics outside public storage and student-readable lesson fields.

## Current live state
AFF-CTI-101 (id 19) Published; AFF-CTI-102 (id 20) Draft; no other AFF-CTI-1xx course records verified.
Existing digital_certificates schema has certification_id, exam_attempt_id, integrity_verified and issuance_source; actual linkage and policy remain unverified.

## Blockers before import
1. Verify all original approved curriculum files and hashes, with canonical module titles.
2. Confirm certificate-to-course relational design and existing certification identifiers.
3. Inspect RLS and private storage design; aff-course-assets is currently public.
4. Test offline reconciliation against an inventory that includes full module and lesson IDs.
5. Obtain explicit authorization before any database changes, uploads or deployment.
