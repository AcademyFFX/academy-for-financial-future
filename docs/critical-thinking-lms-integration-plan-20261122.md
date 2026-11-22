# AFF University Critical Thinking Certificate — Non-Destructive LMS Integration Plan
Date: 2026-11-22
Status: Planning only; no database migrations, course creation, or deployment authorized.
Repository branch: audit/aff-lms-repair-20261122

## Verified production baseline (read-only)
Supabase project: svkjksboughiebbrapay. Query of public.courses and public.lessons:
- AFF-CTI-101: course ID 19, "Foundations and Anatomy of Critical Thinking", Published; lesson ID 35, "Module 1: Foundations and Anatomy of Critical Thinking", Published.
- AFF-CTI-102: course ID 20, "The Human Mind: Perception, Belief, and Reality", Draft; lesson ID 36, "Module 2: The Human Mind: Perception, Belief, and Reality", Draft.
- No course codes AFF-CTI-103 through AFF-CTI-112 were found in the queried course catalog.
- The approved academic working title for Module 2 was "The Human Mind: Perception, Emotion, Memory, and Judgment"; its mismatch with the existing database title needs source-document review, not an automatic rename.
- LMS source files support courses, lessons, modules, workbook/doc resources, quizzes, enrollment and progress; functional verification remains pending.

## Guardrails
1. Preserve course IDs 19 and 20 and lesson IDs 35 and 36; never insert duplicates for these codes.
2. Treat all existing course and student records as authoritative until reconciled; do not overwrite lesson bodies or quiz answers.
3. Do not assume the ten remaining module titles, texts, case studies, exam questions, or resources; obtain the approved curriculum files first.
4. Keep all proposed new course/lesson records in Draft, and do not publish or enroll students without separate approval.
5. No changes to production Supabase, civic staging, Vercel, or main branch; no new infrastructure.
6. This plan is documentation only and not executable SQL.

## Proposed reconciliation procedure
A. Inventory approved 12-module curriculum files and record for each: module number, exact title, version, document location, workbook, case studies, quiz/exam, instructor guide, academic references.
B. Compare Module 1 and Module 2 content against existing course/lesson records, using read-only queries and source documents. Resolve Module 2 naming discrepancy with explicit academic approval.
C. Establish mapping of module numbers to existing course codes AFF-CTI-101..112, treating this numbering as a proposed convention pending review. Avoid creating records if an equivalent course exists under another code.
D. For missing modules, prepare idempotent insert/upsert design keyed on stable course_code, with duplicate detection and transaction dry-run checks; do not execute.
E. Plan attachment of DOCX/HTML/PDF workbook and assessment resources only after verifying exact approved files and storage security policy.
F. Define QA: admin create/edit permission, student enrollment and lesson visibility, Draft exclusion, quiz answer integrity, progress persistence, certificate gating, access to private media, duplicate-prevention and rollback.
G. Obtain separate approval before any production write, publication, or deployment.

## Pending evidence
- Exact authoritative source files for all 12 modules.
- Read-only content/resource reconciliation for CTI-101/102.
- Existing database constraints and RLS policy inspection.
- Verification of module-to-course design (12 courses vs one certificate course containing 12 modules).
- Test environment without extra paid infrastructure, if possible.

## Acceptance criteria for planning phase
- Complete 12-row source-to-LMS mapping with no inferred titles.
- Explicit duplicate and title-conflict report.
- Draft-only migration proposal and test plan, not applied.
- Clear go/no-go decision requiring user authorization.
