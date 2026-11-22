# AFF Secure Exam — Verified Constraints and Atomicity Gate
2026-11-22 | audit branch only | production read-only inspection

## Existing public.exams constraints
- PRIMARY KEY(id), bigint sequence default
- student_id and auth_user_id FKs to auth.users; course_id FK to courses; lesson_id FK to lessons
- score between 0 and 100; result in ('Pass','Fail'); percentage 0..100
- earned_points and total_points nonnegative
- No UNIQUE constraint on (student_id, exam_id, attempt_number) or token/session mapping
- Indexes: exams_auth_user_quiz_idx and exams_student_course_quiz_idx are nonunique

## Existing defaults
id nextval(exams_id_seq); passing_score 70; created_at now(); answers {}; submitted_at now(); question_bank []; passed false; attempt_number 1; max_attempts 3; duration_seconds 0; selected_answers []; total_points 0; earned_points 0; percentage 0.

## Implementation implications
- Proposed secure session needs UNIQUE(auth_user_id, exam_version_id, attempt_number) and UNIQUE(token_hash), with result_id UNIQUE after compatibility review.
- To avoid altering legacy attempts, do NOT add blanket uniqueness to public.exams without auditing duplicates and legacy retry semantics.
- The trusted RPC must SELECT the secure attempt row FOR UPDATE, verify unconsumed/ownership/expiry, compute score from protected keys, INSERT authoritative result, UPDATE consumed_at and result_id, and return in a single PostgreSQL transaction.
- The RPC must raise on any failed insert/update so the transaction rolls back. A return-value error after insert would risk partial writes.
- Preserve existing exams constraints, defaults, FK behavior and trg_aff_exam_enrollment_sync.
- Verify whether existing progress sync treats percentage/earned_points/total_points or score as authoritative before implementing the insert.
- Do not expose protected answer keys through public.exams.question_bank.

## Remaining before executable SQL
Verify the existing progress function, enrollment lookup rules, actual student exam question format, and privilege model. Build a complete schema-compatible staging migration and test on a separately approved isolated project. No changes to production or Civic staging.
