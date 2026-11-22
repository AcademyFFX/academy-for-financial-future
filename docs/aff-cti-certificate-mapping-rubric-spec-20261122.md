# AFF CTI Certificate Mapping and Rubric — Implementation Specification
Date: 2026-11-22
Status: design only; NOT DEPLOYED.

## Verified source: AFF_Critical_Thinking_Volume_I_Module_12.html
The source explicitly marks program completion standards as proposed, requiring formal institutional adoption. Do not call them active policy.

Suggested Module 12 assessment weights:
- Workbook and participation: 15%
- Four case studies: 20%
- Final written exam: 25%
- Capstone and oral defense: 40%
- Total: 100%

Capstone rubric: problem/scope 10; evidence verification 15; logic/bias/uncertainty 15; quantitative/scientific reasoning 10; ethics/stakeholders 15; alternatives 10; recommendation/implementation 10; writing/citation 10; oral defense 5. Total 100.

Proposed completion: Modules 1–12, workbooks and assessments, overall program average >=80%, capstone >=80%, final exam and oral defense completed, academic integrity verified.

## Database architecture, read-only verified
- public.certification_catalog(id bigint, slug, certificate_name, passing_score, status, course_id bigint)
- public.certification_exam_attempts(id bigint, student_id uuid, certification_id bigint, exam_id bigint, score, manual_score, result, status, reviewed_at, reviewed_by)
- public.digital_certificates(certification_id bigint FK to certification_catalog.id, exam_attempt_id bigint FK to certification_exam_attempts.id, integrity_verified, issuance_source, status)
- public.lesson_progress(course_id text, lesson_id text, student_id uuid, completed_at)
- No matching Critical Thinking certification catalog row found.
- Course IDs 19 (AFF-CTI-101, Published) and 20 (AFF-CTI-102, Draft); 103–112 absent.
- Current catalog supports one course_id per certification. A separate 12-course mapping is needed, subject to schema/authorization review.

## Proposed mapping (not executable)
- certification_program: stable slug aff-critical-thinking-independent-judgment, display title, policy version, draft/approved status.
- certification_program_courses: program_id, course_id, academic_order, required, unique(program_id,course_id), unique(program_id,academic_order).
- eligibility: authenticated student, verified course completions 101–112, approved overall program average >=80, capstone >=80, final exam completed and reviewed, oral defense completed, no unresolved integrity flags, instructor signoff.
- Never use a client-supplied score, completion status, or student identity to authorize issuance. Compute server-side from trusted, RLS-protected records and enforce uniqueness/idempotency.
- Do not issue digital_certificates until institutional approval, security review and separate production authorization.

## Safety / design corrections
The existing report-only evaluator script uses an illustrative approvedPassingScore and exam.score. It does not yet calculate weighted overall program average or capstone rubric. It must not be used as a production certificate gate.
The Module 12 HTML includes instructor answer keys in the same source document. Split instructor-only content into private storage before any student publication. Existing aff-course-assets bucket is public.
