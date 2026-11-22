# AFF LMS Critical Thinking — Read-only code audit
Date: 2026-11-22
Branch: audit/aff-lms-repair-20261122
Scope: source inspection only; no database access or deployment.

## Verified source files
- app/admin/course-management/page.tsx renders AdminLmsManager.
- app/admin/course-management/upload-center/page.tsx renders CourseUploadCenter.
- components/admin-lms-manager.tsx reads courses, lessons, course_assets and enrollments; represents modules with course_assets.asset_type = "Module".
- components/course-upload-center.tsx reads courses, lessons, course_assets, enrollments, certificates and students.
- supabase/schema.sql is a starter schema; it is NOT proof of current production structure.

## Course mapping proposal
Use one existing-or-new course (after duplicate lookup), with 12 sequential Module assets and corresponding lesson records. Do not invent IDs or write data before schema verification. Modules 1–9 source titles and all canonical content files remain unverified. Preserve existing text.

## Access-control finding
CourseUploadCenter uploadAsset() calls storage.getPublicUrl() and createSignedUrl(path, 60 * 60 * 24 * 365) for aff-course-assets. Verify bucket privacy, RLS, actual URL consumption and expiration policy before publishing protected student/instructor content. Do not assume getPublicUrl itself grants access if bucket is private. Keep answer keys instructor-only.

## Required next checks
1. Read active migration files and inspect live staging schema only after staging is explicitly approved and available.
2. Confirm courses primary key type, lessons/module relationship, unique course code, publication statuses and storage policies.
3. Verify student authorization, quiz isolation and certificate completion requirements.
4. Build dry-run idempotent import and tests; no production writes.
5. Require separate approval for deployment or any paid resource.

Audit status: preliminary code review; no test run, schema verification, or security remediation completed.
