# AFF LMS — Atomic Examination Submission Design (STAGING PROPOSAL ONLY)
2026-11-22 | audit/aff-lms-repair-20261122

## Safety boundary
This is a design, not an applied migration or working endpoint. Do not run on production or Civic staging. No additional paid infrastructure is authorized. The existing browser exam flow must continue to work until separately approved staging tests pass.

## Proposed protected tables (new names, subject to schema review)
- aff_exam_question_keys: exam_version_id, question_id, correct_option_id; RLS enabled, no direct authenticated SELECT/INSERT/UPDATE/DELETE; keys accessible only through privileged server grading path. Avoid exposing this table through any student API, view or RPC.
- aff_exam_attempt_sessions: id UUID PK, auth_user_id UUID NOT NULL, exam_version_id, token_hash CHAR(64) UNIQUE NOT NULL, started_at, expires_at, consumed_at NULL, result_id NULL, attempt_number, created_at. Unique constraint (auth_user_id, exam_version_id, attempt_number). RLS deny direct student writes; optionally grant limited read on safe view excluding token_hash.
- aff_exam_versions: immutable canonical published exam version, pass threshold, duration and attempt limit, course reference, status. A published version must never be silently mutated.

## Begin endpoint — proposed POST /api/exams/attempts
1. Server authenticates with Supabase auth.getUser() from request cookies, never client-provided student_id.
2. Authoritatively verifies enrollment and published exam version, eligibility, prior attempts and retake rules.
3. In a database transaction or locked SECURITY DEFINER function, allocates next attempt number, inserts session with hashed 256-bit token and server-computed expiry; protects against concurrent starts.
4. Returns raw token once, safe question IDs/options without correct answers, and deadline. Rate-limit by user and exam.

## Submit endpoint — proposed POST /api/exams/submit
1. Server authenticates again and validates body shape, payload size and CSRF/origin protections appropriate for cookie-authenticated requests.
2. In ONE database transaction, lock session FOR UPDATE; check token hash, owner, exam version, deadline, unused state, enrollment and attempt eligibility.
3. Load canonical answer keys through privileged database function, grade answers inside the same trusted transaction or pass computed result from a trusted server component while holding lock.
4. Insert authoritative result into public.exams (or replacement grading table with compatibility projection) and mark session consumed with result ID in same transaction; guarantee rollback on any failure.
5. Existing trg_aff_exam_enrollment_sync must fire once for successful result creation. Do not assume client can insert trusted scores.
6. Respond with score/pass/fail and safe metadata. Never return answer key, token hash, privileged errors, or other students' results.

## Critical transactional rule
A Next.js handler making separate Supabase .from() calls cannot guarantee a single database transaction across token consumption and result insertion. Use a carefully audited PostgreSQL RPC function/transaction, or another transactional backend. A naive SELECT followed by UPDATE is replay-vulnerable.

## Transition plan
- Keep current app/exams/page.tsx unchanged initially.
- Introduce new versioned endpoint behind disabled feature flag in audit branch.
- Move answer keys from browser bundle to protected server store before switching student traffic.
- Fix student write permissions on public.exams and public.certification_exam_attempts only after staged compatibility tests; avoid breaking existing active exam UI.
- Preserve certification catalog mappings, Civic-specific certificate rules and current student records.

## Verification gate
Tests: concurrent duplicate submission, replay, expired token, wrong user, forged score, unauthorized enrollment, attempt cap, key leakage, stale exam version, DB rollback, sync trigger, certification issuance boundary, old student UI compatibility. Explicit approval required before staging execution, production migration or release.
