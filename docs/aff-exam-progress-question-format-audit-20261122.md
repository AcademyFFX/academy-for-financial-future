# AFF Exam Progress and Question Format Audit — 2026-11-22
Audit branch only. Production database inspected read-only. No student rows inspected.

## Verified progress behavior
public.aff_sync_enrollment_progress(auth_user_id uuid, course_id text) uses students.auth_user_id to resolve students.id and matches courses.id::text. It counts published required lessons and lesson_progress. For AFF-CIV-% and AFF-CTI-% courses it additionally counts published course_assets quizzes and required assignments. A quiz is counted passed when public.exams has matching student and course, matching lesson OR a null exam.lesson_id, ex.passed=true, and coalesce(ex.percentage, ex.score::numeric, 0) >= the quiz asset passingScore (default 80). It updates enrollments.progress_percentage, enrollment_status, completed_at, updated_at.

## Security consequence
A student-writable public.exams passed/percentage can affect Civic/Critical Thinking enrollment progress. The NULL lesson_id allowance can let a passing record match multiple quizzes in the same course. Review this matching logic in the security repair; do not assume simply protecting score fields fully addresses quiz attribution.

## Verified client question format
app/exams/page.tsx defines a browser-bundled static questionBank with id, category, question, options (strings), answer (correct option string). examConfig uses examId 'level-1-forex-anatomy', passingScore 80, 30 minutes, 3 attempts, 10 questions. It computes score in browser and writes a subset of questions (id/category/question), answers, score/result/passed and other attempt metadata directly to public.exams. It queries exam history by student_id and exam_title. The page's timer and retake locks are client-side, not trusted server enforcement.

## Migration design implications
- Version canonical questions and map options to opaque option IDs, with correct option IDs protected server-side.
- Provide public question text/options without answer. Do not break legacy exam history.
- Server-generated attempt IDs and limits; DB locks prevent concurrent replay.
- A passing quiz must be tied to the correct asset/lesson/exam version. Avoid null lesson wildcard for new secure exam records; preserve legacy behavior until compatibility reviewed.
- Protect both public.exams and certification_exam_attempts against student-forged grade writes before treating records as certificate evidence.
- For secure exam RPC insert, populate auth_user_id, student_id, course_id, lesson_id, quiz_id and all grading fields authoritatively.
- Check whether the standalone Forex Anatomy page should be treated as an independent quiz versus the Civic/CTI course-assets quiz system; do not conflate.

## Next implementation gate
Review course_assets quiz representation and existing exam triggers/RLS, then prepare a migration with versioned keys, atomic RPC, safe privileges and rollback. Test only in an explicitly approved isolated staging project.
