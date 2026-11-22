# Critical Thinking LMS — Live Read-Only Schema Findings
Date: 2026-11-22
Status: verified metadata; no production writes

## Existing courses
- id 19, AFF-CTI-101, Foundations and Anatomy of Critical Thinking, Published.
- id 20, AFF-CTI-102, The Human Mind: Perception, Belief, and Reality, Draft.
- Preserve these records and publication states. Do not create a duplicate umbrella course before reviewing program grouping and curriculum source hierarchy.

## Live types
- courses.id bigint; lessons.id bigint; lessons.course_id bigint; lessons.module_id bigint nullable.
- course_assets.id uuid; course_assets.course_id bigint; module_id bigint nullable; asset_type text; display_order integer; asset_status text.
- lessons.full_content text; publication_status text; canonical_quiz_group_id uuid nullable.
- certificates.id bigint; student_id uuid; course_name text.
- enrollments.id bigint; student_id bigint; course_id bigint.

## Storage risk
- storage.buckets aff-course-assets public=true (verified).
- Upload Center uses getPublicUrl and one-year createSignedUrl; protect instructor keys and restricted assets before any new upload.
- Do not switch existing bucket to private without dependency and impact review. Plan a separate private bucket only with explicit infrastructure/cost approval, or assess existing private storage options.

## Importer requirements
- Dry-run by default, no network/database writes.
- Existing course code lookup before planning creation; preserve ids 19 and 20.
- Match canonical source documents by verified identifiers and checksums.
- Reject missing/ambiguous titles, duplicate modules, and unresolved course-vs-module structure.
- Preserve draft/published statuses.
- Never import answer keys into student-visible fields.
- Require separate approval before migration, upload, deployment, or publishing.

## Open design issue
Earlier plan assumed one course with 12 modules. Live database already contains separate AFF-CTI-101 and AFF-CTI-102 courses. Resolve academic hierarchy using the existing twelve approved modules before implementing importer.
