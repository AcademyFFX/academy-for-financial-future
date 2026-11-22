# AFF Secure Scoring Integration — Implementation Contract
Date: 2026-11-22
Branch: audit/aff-lms-repair-20261122
Status: proposal only; no application routes, SQL, deployment or student records changed.

## Offline test checkpoint
The checked-in scripts/aff-server-assessment-scoring.mjs and scripts/aff-server-assessment-scoring-tests.mjs were reconstructed from the audit branch and run locally using Node v22.16.0. Output: PASS: 14 offline scoring assertions; no database writes. This is NOT GitHub CI and does not verify Supabase RLS or production behavior.

## Trusted server boundary
1. Student browser requests a new attempt. Server authenticates user and verifies enrollment, course, assessment version, attempt count, expiration and rate limits. Server generates an unpredictable, single-use attempt token and stores its hash/expiry.
2. Client receives question IDs and choices only, never correctOptionId, answers, grading rubric or service-role credentials.
3. Student submits token, question IDs and selected option IDs. Server ignores client score, pass/fail, reviewer and timestamps; checks token ownership, expiry and single use atomically.
4. Server loads canonical assessment and answer key from server-only trusted storage, validates submitted answers, computes score and inserts a result using restricted privileges.
5. Server returns minimal score/pass data; existing enrollment sync trigger must still fire. Prevent duplicate submissions using a database uniqueness constraint or transaction lock.
6. Separate certification exam review uses a trusted instructor workflow. The existing issue_aff_certificate function must not accept student-writable grades as proof of eligibility.
7. Keep legacy app/exams/page.tsx behavior unchanged until staged compatibility tests pass; do not break currently enrolled students.

## Important remaining gaps in prototype
- actor.enrollmentVerified, submission.tokenVerified and nextAttemptNumber are supplied to a pure function; they are NOT verified by the function itself.
- No durable token storage, replay protection, auth middleware, grading persistence, audit trail or RLS checks exist.
- Canonical answer keys are not yet migrated out of the browser bundle.
- The legacy exams table currently accepts browser-submitted score and result; direct writes remain enabled.
- Do not import the pure scoring module into client components or claim it fixes current production grading.

## Predeployment tests
- forged score, altered answers, expired/reused token, student A/B isolation, over-limit attempts
- tampered exam version, duplicate submission concurrency, authorization and enrollment checks
- correct/incorrect scores, enrollment-progress trigger, existing certificates, Civic special gates
- student cannot read answer keys or update grade/review metadata
- rollback preserving existing data and avoiding restoration of insecure privileges

## Execution authorization
No changes to production, Civic staging, student records, certificates, storage or paid infrastructure without separate explicit approval.
