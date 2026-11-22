# AFF Secure Grading RPC — Schema-Compatible Implementation Contract
Date: 2026-11-22 | Audit branch only | NO deployment

## Verified read-only production schema
public.exams.id bigint; course_id bigint nullable; student_id uuid NOT NULL; exam_title text NOT NULL; answers jsonb NOT NULL; score integer NOT NULL; result text NOT NULL; submitted_at timestamptz NOT NULL; exam_id text nullable; question_bank jsonb NOT NULL; passed boolean NOT NULL; attempt_number integer NOT NULL; max_attempts integer NOT NULL; duration_seconds integer NOT NULL; selected_answers jsonb NOT NULL; total_points integer NOT NULL; earned_points integer NOT NULL; percentage numeric NOT NULL; auth_user_id uuid nullable. Also exam_name, passing_score, created_at, lesson_id, quiz_id. All existing constraints, defaults and trigger behavior require verification before actual SQL.

## Important correction to prior design
The existing exams.exam_id is TEXT, whereas proposed aff_exam_versions.id is UUID. Never compare or insert these as interchangeable types. Use aff_exam_versions.id UUID for internal version identity and a separate immutable legacy_exam_id TEXT for compatibility. Validate the legacy ID is unique within appropriate course/version scope, and persist both where appropriate.

## Proposed atomic RPC: public.aff_submit_secure_exam(p_exam_id text, p_token text, p_answers jsonb)
SECURITY DEFINER, fixed search_path pg_catalog/public/auth; explicitly revoke PUBLIC and anon execute, grant authenticated only after review. Auth identity must derive from auth.uid(), not an argument.
- Validate JWT user, published version, enrollment, attempts, token hash, expiry and ownership.
- SELECT attempt session FOR UPDATE to serialize concurrent submissions. No client-supplied score or student_id.
- Grade using protected canonical answer keys and versioned option IDs. Do not expose keys through returned JSON or errors.
- Insert all NOT NULL public.exams fields with authoritative values: student_id, exam_title, answers, score, result, submitted_at, question_bank (questions without keys), passed, attempt_number, max_attempts, duration_seconds, selected_answers, total_points, earned_points, percentage. Supply auth_user_id, course_id and legacy exam_id as appropriate. Preserve other existing triggers.
- Update consumed_at and result_id in same PostgreSQL function transaction. On failure, RAISE so the entire statement rolls back; do not catch errors and return failure after partial writes.
- Return minimal {ok, result_id, score, passed}. Enforce uniqueness on attempt session/result mapping to block duplicate results.
- Decide carefully how current student exams progress sync interprets course_id; never assume nullable means safe.
- Keep direct browser INSERT operational until a separately approved staged cutover; do not declare current exam records trustworthy for certificate issuance.

## Non-negotiable staging checks
1. Full column defaults/constraints and current RLS/grants, indexes and triggers.
2. Type compatibility for all FKs and mapping between text exam_id and UUID exam_version_id.
3. Concurrent duplicate RPC calls: exactly one authoritative result.
4. Error after insert must roll back result AND token consumption.
5. Correct/incorrect scoring, time limits, enrollment, retake caps, version immutability.
6. Existing enrollment progress sync and legacy student UI.
7. Certificate-grade records must not be student-writable; preserve Civic special cases.
8. No answer keys exposed in public tables or student-visible code.

## Authorization
Read-only schema inspection completed. This document is NOT executable SQL. No production, Civic staging, student records or certificate changes approved.
