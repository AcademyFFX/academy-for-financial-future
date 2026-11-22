# AFF LMS secure-media staging readiness — 2026-11-22

## Status: BLOCKED — environment incomplete

Read-only audit of isolated project `tcfftjisaxeengaibrmk` (`academy-aff-civic-staging`):
- Present: `public.courses`, `public.lessons`, `public.course_assets`, `public.aff_admin_users`.
- Missing: `public.students`, `public.enrollments`.
- Storage: zero buckets, including no `aff-course-assets`.
- No data, policies, users, or storage were created or changed by this audit.

## Before authenticated end-to-end tests
1. Prefer a dedicated AFF LMS media staging project, or separately approve extending the civic staging project after checking its existing schema and policies.
2. Prepare only synthetic course, asset, student, enrollment, and admin records; create isolated Auth users and a **private** `aff-course-assets` bucket with a disposable object.
3. Validate RLS visibility for `aff_admin_users`, `course_assets`, `students`, and `enrollments`; ensure storage SELECT is limited to the intended authorized path. The current endpoint uses the user's JWT and does not bypass RLS.
4. Deploy the isolated repair branch to a nonproduction preview configured **only** for staging. Never reuse production credentials.
5. Exercise POST `/api/course-media/sign` with: missing/invalid JWT (401), malformed asset ID (400), admin (200), active enrolled student (200), non-enrolled student (403), revoked enrollment (403), draft asset (403), missing object (503), and expired URL (denied after TTL).
6. Confirm the private bucket rejects direct anonymous and unrelated authenticated reads. Verify signed URL expiry and absence of legacy public URLs before calling the system secure.
7. Document evidence, rollback, and results. Production migration, storage privacy changes, lesson-player integration, and PR merge require separate approval.

## Security caveat
The route's authorization policy is unit-tested and CI-built, but **not** authenticated integration-tested. The existing production bucket is public and long-lived URLs exist; the new route does not remediate those exposures by itself.
