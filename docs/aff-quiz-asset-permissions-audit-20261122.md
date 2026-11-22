# AFF Quiz Asset Permissions and Exam Write Audit
2026-11-22 | audit branch only | production read-only

## Verified course_assets structure
course_assets.id uuid, course_id bigint, lesson_id bigint nullable, quiz_group_id uuid nullable, asset_type text, asset_status text, signed_url text nullable, storage_path text, public_url text, visibility text and other metadata. quiz_group_id offers a potential stable grouping key but is NOT currently proven to be a trustworthy exam attempt reference.

## Verified RLS
course_assets authenticated SELECT allows published assets or admins, without explicit enrollment requirement in the policy. Admins can manage assets.
exams authenticated INSERT permits ownership based on auth_user_id or student_id; no grading integrity condition. SELECT own attempts; admin ALL.

## Verified grants
information_schema.role_table_grants reports table-level INSERT, SELECT, UPDATE, DELETE and other grants for anon and authenticated. RLS limits row visibility and write operations, so table grants alone do not prove anonymous data access; they do increase risk if RLS is later changed. Review effective privileges and column grants in staged security tests.

## Security design implications
1. Do not place correct answers or instructor-only keys in course_assets fields or published storage.
2. The authoritative grade RPC must bind user identity via auth.uid(), validate enrollment, and grade from protected canonical keys.
3. Remove student INSERT into public.exams only at an approved, tested cutover; current student UI depends on it.
4. Review quiz_group_id relationships, nullable lesson_id wildcard and exact asset matching before linking quiz pass to course progress.
5. Ensure certification_exam_attempts separately restricts student writes to grade/reviewer fields.
6. Verify grants/RLS with real authenticated, anonymous, admin and student roles in staging; never infer security solely from policy text.

## Execution boundary
No database write, migration, staging provisioning, deployment or student record changes.
