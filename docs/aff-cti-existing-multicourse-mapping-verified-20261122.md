# AFF CTI Existing Multi-Course Mapping — Verified Design
Date: 2026-11-22
Scope: production read-only inspection; no DDL/DML.

## Existing public.certification_required_courses
- certification_id bigint NOT NULL, FK certification_catalog(id) ON DELETE CASCADE
- course_id bigint NOT NULL, FK courses(id) ON DELETE CASCADE
- display_order integer NOT NULL
- created_at timestamptz NOT NULL
- PRIMARY KEY(certification_id, course_id)
- RLS enabled, not FORCE.
- Authenticated admin ALL policy uses is_aff_admin().
- Authenticated SELECT policy permits records for Active certifications or admins.
- Six existing mappings for one certification; preserve existing mapping and any special Civic issuance behavior.

## Proposed CTI mapping, NOT DEPLOYED
- Create a distinct draft certification catalog record only after separate production authorization and verified certificate title/slug.
- Preserve existing courses 19/20, prepare missing AFF-CTI-103 through 112 after canonical source verification.
- Associate twelve verified course IDs with the new certification using display_order 1..12; do not assume future database IDs.
- Use idempotent insertion guarded by the actual certification ID and course code, verify expected 12 rows and unique display order.
- Do not activate certification or permit issuance until grading permissions, capstone scoring, instructor approval, content segregation and complete regression tests pass.

## Security blockers
- Existing issue_aff_certificate RPC checks required mapped course enrollments and published required lessons, but general certificate path trusts student-writable attempt scores/status.
- For CTI, require explicit approved rubric, verified program average, capstone >=80, final exam/oral defense, integrity and instructor signoff. The existing RPC does not enforce all these CTI requirements.
- Existing public storage bucket is unsuitable for instructor answer keys.

## Rollback requirements
- Isolated staging only with separate approval; never use Civic staging without authorization.
- A production rollback must be targeted to the new CTI catalog/mappings and never delete or change preexisting six mapping rows.
- Never automatically restore insecure exam attempt grants after security remediation.
