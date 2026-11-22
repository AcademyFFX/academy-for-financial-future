# AFF CTI Secure Certificate Mapping and Storage — Predeployment Review
Date: 2026-11-22
Scope: read-only production policy audit; no DDL or production writes.

## Verified security facts
- RLS is enabled on public.lessons, public.course_assets, public.certification_catalog, public.certification_exam_attempts, and public.digital_certificates.
- Published course_assets SELECT policy grants authenticated users access to asset metadata based on asset_status='Published' or admin status. It does not additionally enforce asset.visibility or enrollment.
- Published lessons SELECT policy similarly checks publication status, not enrollment.
- storage.buckets aff-course-assets has public=true. Public file downloads are not protected by course_assets RLS.
- certification_exam_attempts policy grants authenticated students ALL on their own rows (student_id=auth.uid()), including UPDATE. Column privileges, triggers and backend controls must be audited before trusting student-managed grading fields.
- digital_certificates grants authenticated students SELECT on own rows and anonymous SELECT for status='Valid'.
- certification_catalog grants authenticated SELECT for status='Active' or admin.
- enrollments.student_id is bigint, whereas auth.uid() and lesson_progress.student_id are uuid; mapping must be verified rather than comparing directly.

## Proposed protected design (NOT DEPLOYED)
1. Store instructor-only answer keys, rubrics, grading notes in a new private bucket or an approved existing private bucket, never aff-course-assets.
2. Gate private downloads via server-side verified instructor/admin authorization and short-lived signed URLs. Do not place instructor signed URLs in student-readable tables.
3. Keep student and instructor material in distinct storage paths and metadata records; audit lesson full_content and public assets for embedded answer keys.
4. Add explicit enrollment/visibility checks to student-facing access paths without breaking existing published content; perform compatibility analysis and staging tests first.
5. Design certification_program_courses mapping with program_id, course_id, academic_order, required; RLS for read and admin-only writes.
6. Evaluate eligibility only on trusted server-side records; separate auth user UUID from legacy student bigint using an audited mapping.
7. Restrict exam attempt grading/review columns from student writes; verify grants, triggers, functions, and all API paths.
8. Preserve existing public bucket behavior until an approved migration and rollback plan exists.

## Go/no-go
NO-GO for publishing Module 12 source HTML as-is because instructor answer keys are embedded. NO-GO for production certificate issuance or private asset uploads until access-control and schema tests pass.
