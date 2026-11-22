# AFF LMS Exam Scoring and Enrollment Trigger — Verified Findings
Date: 2026-11-22
Scope: read-only source and SQL function inspection; no changes.

## Browser exam workflow
app/exams/page.tsx lines 272–305 calculates correctCount from activeQuestions and answers in the browser, computes score and result, and directly INSERTs student_id, exam_id, question_bank, answers, score, result, passed, passing_score, attempt_number, max_attempts, duration_seconds, submitted_at into public.exams. Question definitions with correct answers are included in the client bundle. The current user-facing exam is not suitable as a trusted certification assessment without server-side scoring.

## Database synchronization
public.aff_exam_enrollment_sync_trigger() is SECURITY DEFINER, fixed search_path pg_catalog/public/auth. For INSERT/UPDATE it calls public.aff_sync_enrollment_progress with student/auth ID and course ID. On DELETE it synchronizes old ID/course. It does not grade answers or validate pass/fail. Preserve its intended enrollment synchronization behavior in any replacement write path.

## Staging-only repair design, NOT IMPLEMENTED
1. Move authoritative question/answer keys into server-only protected storage; never ship correct answers in the client bundle.
2. Browser sends only exam reference, selected answer identifiers and submission token to a server endpoint.
3. Server verifies authenticated student, enrollment, attempt limits, deadline, exam version and ownership; loads canonical answer key; computes score, pass/fail and timing.
4. Server inserts authoritative result into public.exams with trusted identity, using minimal privileges, and triggers existing progress sync; return only safe result fields to browser.
5. Use immutable attempts and unique idempotency key to prevent replay, duplicate submissions and client-side retake bypass.
6. Separately secure public.certification_exam_attempts and issue_aff_certificate, requiring instructor-reviewed results for issuance.
7. Test student A/B isolation, tampering, replay, expiration, grading, progress sync, existing certificates and Civic special rules in separately approved staging.

## Critical caveat
The current exam code has a client-side static question bank. Simply wrapping the existing payload in a server endpoint without moving the answer key is not a security repair.

## Execution boundary
No production SQL, deployment, new staging project, or student data changes approved.
