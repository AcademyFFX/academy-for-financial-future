# AFF University — Secure Course Media Migration Plan (Draft)

**Status:** planning only. No production or staging database/storage changes authorized by this document. Review before implementation.

## Verified current behavior (2026-11-22)
- Production `aff-course-assets` is a public bucket.
- Its Storage SELECT policy permits any authenticated user, without checking enrollment.
- Upload Center creates a public URL and a signed URL valid for 365 days, persists both in `course_assets`, and writes public URLs into lesson video/PDF fields.
- A private bucket alone is insufficient: already-issued signed URLs may remain valid until expiration, and client code still expects public URLs.
- `students.id` and `enrollments.student_id` are bigint; `students.auth_user_id` is uuid. Ownership checks must join using the correct IDs.

## Proposed architecture (not implemented)
1. Inventory all consumers of `lessons.video_url`, `lessons.pdf_notes_url`, `courses.thumbnail_url`, and `course_assets.public_url/signed_url`. Identify public previews versus restricted lessons.
2. Implement a server-side authenticated media endpoint that verifies the requesting user is an active administrator or has an eligible enrollment for the asset's course, before issuing a short-lived signed URL (e.g. 5 minutes). Recheck course publication/preview rules and deny by default.
3. Restrict Storage SELECT to authorized administrators or course-specific enrollment owners using a carefully reviewed policy, or use a trusted server-side signer with narrowly scoped access. Do not expose service-role keys to the browser.
4. Stop generating public URLs and year-long signed URLs for restricted content; persist `bucket_id` and `storage_path` references. Avoid putting access tokens in long-lived database rows.
5. Migrate lesson references to the media endpoint; preserve permitted public course thumbnails and free previews in a separately designated public bucket.
6. Test in an isolated staging environment with synthetic student/admin identities, synthetic files, and copied schema only (no production secrets or personal data).
7. Only after passing tests, propose a reversible production migration, backup, compatibility rollout, and explicit production approval.

## Required staging test matrix
- Administrator: upload, replace, preview, download, and revoke.
- Enrolled student: can read assigned restricted course asset.
- Authenticated non-enrolled student: denied.
- Anonymous visitor: denied except deliberately public preview.
- Student enrolled in different course: denied.
- Expired signed URL: denied; authorized user can request a fresh URL.
- Course unpublished/enrollment revoked: access denied according to defined policy.
- Existing lesson videos, PDFs, course thumbnails, certificates, and 12 Critical Thinking modules continue to work.
- No URL leakage in database, page HTML, logs, or shared cache.

## Deployment guardrails
- Do not toggle production bucket visibility until every consuming page uses authorized delivery.
- Do not delete or move existing assets during initial rollout.
- Existing long-lived signed URLs require a separate revocation/expiry assessment; switching bucket privacy does not automatically revoke them.
- Run RLS and security advisors and perform a post-change access audit.
- Keep the GitHub PR draft and unmerged until authorized.
