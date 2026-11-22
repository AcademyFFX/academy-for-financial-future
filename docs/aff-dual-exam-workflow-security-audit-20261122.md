# AFF Dual Exam Workflow Security Audit — 2026-11-22
Scope: read-only source and production policy review. No writes.

## Two distinct workflows
1. app/exams/page.tsx writes directly from browser Supabase client to public.exams via .insert(payload), and displays score/pass and retake controls client-side.
2. public.certification_exam_attempts is a separate table read by SECURITY DEFINER public.issue_aff_certificate(bigint). Its student ALL RLS and grading-column grants present a separate potential certificate-integrity risk.

## public.exams policy
- RLS enabled.
- Student INSERT policy permits own auth_user_id or matching student_id or verified legacy students mapping.
- Student SELECT policy permits own attempts.
- Admin ALL policy uses is_aff_admin().
- No student UPDATE/DELETE policy identified in this read-only check.
- exams contains student-submitted score, result, passed, earned_points, percentage, question_bank, answers and selected_answers. Ownership-focused INSERT RLS does not itself validate the truth of submitted scores.
- There is a trigger trg_aff_exam_enrollment_sync on exams; its behavior needs source review before modifying this workflow.

## Security implications
- Do not blindly revoke student INSERT on exams; current exam page depends on it.
- Client-supplied scores/results must not be used for authoritative certification without trusted server-side recomputation and validation.
- Audit database trigger, scoring algorithm and all issuance dependencies before changing exam write privileges.
- The standalone offline validator added to scripts/aff-exam-write-boundary.mjs is a prototype and not integrated into either workflow.

## Required next steps
1. Inspect app/exams/page.tsx submission payload and grading calculation, plus public.aff_exam_enrollment_sync_trigger() implementation.
2. Identify certification_exam_attempts writer(s) and issuance RPC execute permissions through authorized read-only inspection.
3. Design two compatible trusted endpoints or controlled functions: quiz submission/scoring and certification exam review.
4. Stage synthetic-user authorization tests after separate approval; do not use Civic staging.
5. Preserve production data and current Civic certificate requirements.

No deployment, staging provisioning or production mutation authorized.
