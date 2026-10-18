import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const middleware = read("middleware.ts");
const studentDashboard = read("app/student-dashboard/page.tsx");
const studentCourses = read("app/student-courses/page.tsx");
const studentLessonViewer = read("app/student-courses/[courseId]/lessons/[lessonId]/page.tsx");
const assignmentsPage = read("app/assignments/page.tsx");
const studentProfile = read("app/student-profile/page.tsx");
const billing = read("app/billing/page.tsx");
const siteShell = read("components/site-shell.tsx");
const directoryRoute = read("app/api/admin/student-directory/route.ts");
const adminProfile = read("app/admin/profile/page.tsx");
const authRole = read("lib/auth-role.ts");
const adminStatus = read("lib/admin-status.ts");
const adminServer = read("lib/admin-server.ts");
const adminClient = read("lib/admin-client.ts");
const adminStatusRoute = read("app/api/auth/admin-status/route.ts");
const adminRouteAudit = read("components/admin-route-audit.tsx");
const executiveCommandCenter = read("app/executive-command-center/page.tsx");
const adminDashboard = read("app/admin/page.tsx");
const adminCommandCenter = read("app/admin/command-center/page.tsx");
const adminCertifications = read("app/admin/certifications/page.tsx");
const adminLiveClassroom = read("app/admin/live-classroom/page.tsx");
const adminEnrollment = read("app/admin/enrollment/page.tsx");
const adminCourseManagement = read("app/admin/course-management/page.tsx");
const adminUploadCenter = read("app/admin/course-management/upload-center/page.tsx");
const certificatesPage = read("app/certificates/page.tsx");
const certificationsPage = read("app/certifications/page.tsx");
const adminLmsManager = read("components/admin-lms-manager.tsx");
const courseUploadCenter = read("components/course-upload-center.tsx");
const lmsCourseCenter = read("components/lms-course-center.tsx");
const studentDirectoryPage = read("app/student-directory/page.tsx");
const lessonVideoPersistenceMigration = read("supabase/migrations/20260806_repair_lesson_video_metadata_persistence.sql");
const assignmentReviewMigration = read("supabase/migrations/20261012_repair_assignment_review_workflow.sql");
const quizAnswerKeyMigration = read("supabase/migrations/20261016_normalize_aff_quiz_answer_keys.sql");
const exchangeRateAnswerKeyMigration = read("supabase/migrations/20261016_correct_understanding_exchange_rates_answer_key.sql");
const quizQuestionSource = read("lib/quiz-question.ts");
const quizAssetSelectionSource = read("lib/quiz-asset-selection.ts");
const canonicalQuizMigration = read("supabase/migrations/20261017_select_canonical_lesson_quiz_group.sql");
const lesson2CanonicalRepairMigration = read("supabase/migrations/20261017_repair_lesson2_canonical_quiz_group.sql");
const certificationRepairMigration = read("supabase/migrations/20261018_repair_forex_foundations_certification_workflow.sql");
const certificationIntegrityMigration = read("supabase/migrations/20261018_secure_forex_foundations_certificate_issuance.sql");
const certificationReadinessSource = read("lib/certification-readiness.ts");
const certificatePdfSource = read("lib/certificate-pdf.ts");
const affBrandSource = read("lib/aff-brand.ts");
const certificateRecordSource = read("lib/certificate-record.ts");
const certificateVerificationSource = read("lib/certificate-verification.ts");
const officialAffLogo = readFileSync(new URL("../public/brand/AFF_LOGO_2_OFFICIAL.png", import.meta.url));
const quizQuestionModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(quizQuestionSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString("base64")}`);
const quizAssetSelectionModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(quizAssetSelectionSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString("base64")}`);
const certificationReadinessModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(certificationReadinessSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString("base64")}`);
const isolatedCertificatePdfSource = certificatePdfSource.replace(
  /import \{ OFFICIAL_AFF_LOGO_PATH \} from "@\/lib\/aff-brand";/,
  'const OFFICIAL_AFF_LOGO_PATH = "/brand/AFF_LOGO_2_OFFICIAL.png";'
);
const certificatePdfModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(isolatedCertificatePdfSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString("base64")}`);
const certificateRecordModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(certificateRecordSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString("base64")}`);
const certificateVerificationModule = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(certificateVerificationSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText).toString("base64")}`);

const certificationCourses = [
  { id: 1, course_name: "Forex Foundations" },
  { id: 2, course_name: "Forex Anatomy" }
];
const certificationCatalogRows = [{ id: 11, slug: "forex-foundations", course_id: 1, certificate_name: "Forex Foundations Certificate" }];
const mappedCertification = certificationReadinessModule.resolveForexFoundationsCourse(certificationCourses, certificationCatalogRows);
assert.equal(mappedCertification.course.id, 1, "certification readiness must map to Forex Foundations rather than Forex Anatomy");
const readiness = certificationReadinessModule.calculateCertificationReadiness({
  courseId: "1",
  certificationId: "11",
  enrollmentRows: [{ student_id: 4, course_id: 1, enrollment_status: "Active" }],
  lessons: Array.from({ length: 7 }, (_, index) => ({ id: index + 1, course_id: 1, publication_status: "Published", required_completion: true })),
  progressRows: Array.from({ length: 7 }, (_, index) => ({ lesson_id: index + 1, course_id: 1, completed: true })),
  assignmentDefinitions: [{ id: "assignment-definition", course_id: 1, lesson_id: 7, asset_type: "Assignment", asset_status: "Published", signed_url: JSON.stringify({ required: true }) }],
  assignmentSubmissions: [{ id: 7, course_id: 1, lesson_id: 7, status: "Approved" }],
  attempts: [{ id: 91, certification_id: 11, result: "Pass", status: "Completed", score: 100 }]
});
assert.equal(readiness.requiredLessons, 7, "Forex Foundations certification must require its seven published required lessons");
assert.equal(readiness.completedLessons, 7, "George's seven completion rows must produce 7/7 certification readiness");
assert.equal(readiness.approvedAssignments, 1, "the approved submission must satisfy its canonical required assignment");
assert.equal(readiness.hasPassingExam, true, "a passing certification attempt must satisfy the exam requirement");
assert.equal(readiness.passingAttemptId, "91", "certificate issuance must retain the exact passing certification attempt id");
assert.equal(readiness.eligible, true, "7/7 lessons, approved required assignments, active enrollment, and a passing exam must unlock certification");
const readinessWithoutAttempt = certificationReadinessModule.calculateCertificationReadiness({
  courseId: "1",
  certificationId: "11",
  enrollmentRows: [{ student_id: 4, course_id: 1, enrollment_status: "Active" }],
  lessons: [{ id: 1, course_id: 1, publication_status: "Published", required_completion: true }],
  progressRows: [{ lesson_id: 1, course_id: 1 }],
  assignmentDefinitions: [],
  assignmentSubmissions: [],
  attempts: []
});
assert.equal(readinessWithoutAttempt.eligible, false, "no passing certification attempt must never unlock a certificate");
const readinessAfterFailedAttempt = certificationReadinessModule.calculateCertificationReadiness({
  courseId: "1",
  certificationId: "11",
  enrollmentRows: [{ student_id: 4, course_id: 1, enrollment_status: "Active" }],
  lessons: [{ id: 1, course_id: 1, publication_status: "Published", required_completion: true }],
  progressRows: [{ lesson_id: 1, course_id: 1 }],
  assignmentDefinitions: [],
  assignmentSubmissions: [],
  attempts: [{ id: 92, certification_id: 11, result: "Fail", status: "Completed", score: 79 }]
});
assert.equal(readinessAfterFailedAttempt.eligible, false, "a failed certification attempt must never unlock a certificate");
const readinessAtThreshold = certificationReadinessModule.calculateCertificationReadiness({
  courseId: "1",
  certificationId: "11",
  enrollmentRows: [{ student_id: 4, course_id: 1, enrollment_status: "Active" }],
  lessons: [{ id: 1, course_id: 1, publication_status: "Published", required_completion: true }],
  progressRows: [{ lesson_id: 1, course_id: 1 }],
  assignmentDefinitions: [],
  assignmentSubmissions: [],
  attempts: [{ id: 93, certification_id: 11, result: "Pass", status: "Completed", score: 80 }]
});
assert.equal(readinessAtThreshold.eligible, true, "an 80% passing attempt plus all requirements must unlock certification");
assert.equal(readinessAtThreshold.passingAttemptId, "93", "the threshold pass must expose its attempt provenance");
assert.match(certificationRepairMigration, /AFF-FX-FOUNDATIONS-CERT/, "the repair migration must seed a stable Forex Foundations certification exam");
assert.equal((certificationRepairMigration.match(/'Multiple Choice'|'True\/False'/g) ?? []).length, 10, "the certification exam bank must contain ten seeded questions");
assert.doesNotMatch(certificationRepairMigration, /delete from|truncate table|update public\.certificates/i, "the certification repair must preserve legacy certificates including AFF Student Orientation");
assert.match(certificationsPage, /exam\.examCode === "AFF-FX-FOUNDATIONS-CERT"/, "students must receive the stable Forex Foundations certification exam");
assert.match(certificationsPage, /rpc\("issue_aff_certificate", \{ p_attempt_id: Number\(attemptId\) \}\)/, "the certification center must delegate certificate issuance to the guarded database function");
assert.doesNotMatch(certificationsPage, /from\("digital_certificates"\)\s*\.insert/, "the certification center must not directly insert digital certificates");
assert.match(certificatesPage, /resolveForexFoundationsCourse/, "certificate readiness must resolve the production Forex Foundations course mapping");
assert.match(certificatesPage, /rpc\("issue_aff_certificate", \{ p_attempt_id: Number\(attemptId\) \}\)/, "the certificate readiness page must delegate issuance to the guarded database function");
assert.doesNotMatch(certificatesPage, /from\("certificates"\)\s*\.insert/, "the Forex Foundations certificate page must not issue an unguarded legacy certificate");
assert.match(lmsCourseCenter, /Forex Foundations certification requires the separate guarded certification examination/, "lesson quiz completion must not bypass the Forex Foundations certification examination");
assert.match(courseUploadCenter, /Forex Foundations certificates are issued only after the guarded certification examination and requirement checks/, "admin course tooling must not bypass guarded Forex Foundations issuance");
assert.match(certificationIntegrityMigration, /add column if not exists exam_attempt_id bigint/, "certificate records must retain certification-attempt provenance");
assert.match(certificationIntegrityMigration, /drop policy if exists "AFF students issue own digital certificates"/, "the insecure student self-issuance policy must be removed");
assert.match(certificationIntegrityMigration, /revoke insert, update, delete on public\.digital_certificates from authenticated/, "authenticated users must not write digital certificates directly");
assert.match(certificationIntegrityMigration, /prevent_legacy_forex_foundations_certificate_insert/, "the legacy certificate table must reject new Forex Foundations credentials while preserving other certificates");
assert.match(certificationIntegrityMigration, /create or replace function public\.issue_aff_certificate\(p_attempt_id bigint\)/, "a guarded certificate issuance function must own the complete integrity transaction");
assert.match(certificationIntegrityMigration, /attempt_row\.score < greatest\(80, catalog_row\.passing_score\)/, "the guarded issuer must enforce the catalog threshold with an 80% floor");
assert.match(certificationIntegrityMigration, /from public\.enrollments as enrollment[\s\S]*enrollment\.student_id = student_row\.id[\s\S]*enrollment\.course_id = catalog_row\.course_id/, "the guarded issuer must require the student's active course enrollment");
assert.match(certificationIntegrityMigration, /completed_lesson_count <> required_lesson_count/, "the guarded issuer must require every published required lesson");
assert.match(certificationIntegrityMigration, /approved_assignment_count <> required_assignment_count/, "the guarded issuer must require every published required assignment to be approved");
assert.match(certificationIntegrityMigration, /pg_advisory_xact_lock/, "concurrent refreshes or submissions must serialize certificate issuance");
assert.match(certificationIntegrityMigration, /digital_certificates_verified_student_certification_unique/, "verified certificates must have database-level duplicate prevention");
assert.match(certificationIntegrityMigration, /where certificate\.student_id = attempt_row\.student_id[\s\S]*certificate\.certification_id = catalog_row\.id[\s\S]*certificate\.status = 'Valid'/, "repeated issuance must return the existing valid certificate rather than create a duplicate");
assert.doesNotMatch(certificationIntegrityMigration, /delete from|truncate table|update public\.digital_certificates/i, "the integrity migration must preserve George's current certificate and every historical credential");

const legacyCertificate = {
  certificate_number: "AFF-2026-8834542",
  student_name: "George Moreno",
  course_name: "Forex Foundations Certificate",
  score: 100,
  issue_date: "2026-10-17",
  completion_date: "2026-10-17",
  verification_code: "VERIFY-GEORGE",
  integrity_verified: false,
  exam_attempt_id: null,
  instructor_name: "Dr. Jean Rene Moricette"
};
const officialLogoFixture = { jpegHex: "ffd8ffd9", width: 1600, height: 758, watermarkJpegHex: "ffd8ffd9", watermarkWidth: 660, watermarkHeight: 758 };
const stableLegacyVerificationUrl = certificateVerificationModule.buildAffCertificateVerificationUrl(legacyCertificate.certificate_number);
const legacyCertificatePdf = certificatePdfModule.createCertificatePdfDocument(legacyCertificate, stableLegacyVerificationUrl, officialLogoFixture);
assert.equal(certificatePdfModule.hasVerifiedExamProvenance(legacyCertificate), false, "a preserved certificate without attempt provenance must remain a legacy credential");
assert.match(certificatePdfModule.certificateAwardLanguage(legacyCertificate), /recognized by the Academy for the award of/, "legacy certificates must use neutral award wording");
assert.equal(certificatePdfModule.resolveCredentialClass(legacyCertificate), "Professional Certificate", "Forex Foundations must default to the Professional Certificate classification");
assert.equal(certificatePdfModule.resolveCredentialClass({ ...legacyCertificate, credential_class: "Diploma" }), "Diploma", "explicit supported credential metadata must override the course default");
assert.doesNotMatch(legacyCertificatePdf, /fulfilled all academic requirements|VERIFIED EXAMINATION SCORE/, "legacy PDFs must not claim unverified completion or display an unverified score");
assert.match(legacyCertificatePdf, /PROFESSIONAL CERTIFICATE/, "the master template must render the resolved credential class");
assert.match(legacyCertificatePdf, /AFF-2026-8834542/, "the PDF must preserve George Moreno's exact certificate number");
assert.match(legacyCertificatePdf, /VERIFY-GEORGE/, "the PDF must contain the stored verification code");
assert.match(legacyCertificatePdf, /Dr\. Jean Rene Moricette/, "the PDF must contain the authorized instructor name");
assert.match(legacyCertificatePdf, /Authorized Academic Signatory/, "the PDF must contain the formal academic authorization title");
assert.match(legacyCertificatePdf, /Issued by Academy for Financial Future/, "the PDF must identify the issuing institution");
assert.match(legacyCertificatePdf, /October 17, 2026/, "George's preserved PDF must contain the original stored issue and completion date");
assert.doesNotMatch(legacyCertificatePdf, /October 18, 2026/, "PDF generation must not replace George's stored historical date with the render date");
assert.match(legacyCertificatePdf, /SCAN TO VERIFY CREDENTIAL/, "the PDF must label the QR verification block");
assert.match(legacyCertificatePdf, /academy-for-financial-future\.vercel\.app\/verify-certificate\?certificate=AFF-2026-8834542/, "the printed verification destination must use the canonical AFF endpoint");
const verificationQr = certificatePdfModule.createVerificationQrMatrix(stableLegacyVerificationUrl);
assert.equal(verificationQr.length, 49, "the verification destination must be encoded as a version 8 QR matrix");
assert.ok(verificationQr.every((row) => row.length === 49), "the verification QR matrix must be square and complete");
assert.deepEqual(verificationQr.slice(0, 7).map((row) => row.slice(0, 7)), [
  [true, true, true, true, true, true, true],
  [true, false, false, false, false, false, true],
  [true, false, true, true, true, false, true],
  [true, false, true, true, true, false, true],
  [true, false, true, true, true, false, true],
  [true, false, false, false, false, false, true],
  [true, true, true, true, true, true, true]
], "the verification QR must contain a standards-compliant finder pattern");
assert.match(legacyCertificatePdf, /MediaBox \[0 0 792 612\]/, "the academic certificate must use a landscape page composition");
assert.match(affBrandSource, /AFF_LOGO_2_OFFICIAL\.png/, "all Academy surfaces must share the authoritative official logo asset");
assert.equal(officialAffLogo.subarray(1, 4).toString("ascii"), "PNG", "the authoritative Academy logo must remain an intact PNG asset");
assert.ok(officialAffLogo.length > 100_000, "the authoritative Academy logo must retain its full-resolution artwork");
assert.match(certificatePdfSource, /OFFICIAL_AFF_LOGO_PATH/, "certificate generation must load the shared official Academy logo path");
assert.match(legacyCertificatePdf, /\/AFFLogo Do/, "the certificate PDF must render the official Academy logo image");
assert.match(legacyCertificatePdf, /\/AFFWatermark Do/, "the certificate PDF must derive its watermark from the official Academy logo image");
assert.doesNotMatch(certificatePdfSource, /function buildSeal|\(AFF\) Tj/, "certificate generation must not substitute a generated AFF text seal");
assert.match(certificatePdfSource, /buildVerificationMark\(verificationUrl\)/, "the QR and printed destination must be generated from the same verification URL");

const storedHistoricalDates = certificateRecordModule.resolveStoredCertificateDates({ issue_date: "2026-10-17", completion_date: "2026-10-17" });
assert.deepEqual(storedHistoricalDates, { issueDate: "2026-10-17", completionDate: "2026-10-17" }, "stored historical certificate dates must pass through unchanged");
assert.deepEqual(certificateRecordModule.resolveStoredCertificateDates({ issue_date: "2026-10-17" }), { issueDate: "2026-10-17", completionDate: null }, "a missing completion date must never be synthesized from issuance data");
assert.deepEqual(certificateRecordModule.resolveStoredCertificateDates({}), { issueDate: "", completionDate: null }, "a missing issue date must never be replaced with the render date");
assert.equal(certificateRecordModule.formatStoredCertificateDate("2026-10-17"), "October 17, 2026", "date-only certificate values must render in UTC without timezone drift");
const previewVerificationUrl = certificateVerificationModule.buildAffCertificateVerificationUrl("AFF-2026-8834542", "https://academy-for-financial-future-git-feature-team.vercel.app");
assert.equal(previewVerificationUrl, stableLegacyVerificationUrl, "preview or deployment-specific Vercel hosts must never enter certificate verification data");
assert.doesNotMatch(previewVerificationUrl, /git-feature|team\.vercel/, "canonical certificate URLs must exclude preview deployment hostnames");
assert.match(certificatesPage, /buildAffCertificateVerificationUrl\(certificate\.certificate_number\)/, "PDF downloads and verification buttons must share the canonical verification URL builder");
assert.doesNotMatch(certificatesPage, /window\.location\.origin|certificate\.qr_payload\s*\?\?/, "certificate verification must not depend on the current deployment origin or a stale stored preview payload");

const guardedCertificate = {
  ...legacyCertificate,
  certificate_number: "AFF-2026-GUARDED",
  verification_code: "VERIFY-GUARDED",
  exam_attempt_id: 501,
  integrity_verified: true,
  issuance_source: "guarded-certification-rpc",
  completion_date: "2026-10-17",
  score: 80
};
const guardedVerificationUrl = certificateVerificationModule.buildAffCertificateVerificationUrl(guardedCertificate.certificate_number);
const guardedCertificatePdf = certificatePdfModule.createCertificatePdfDocument(guardedCertificate, guardedVerificationUrl, officialLogoFixture);
assert.equal(certificatePdfModule.hasVerifiedExamProvenance(guardedCertificate), true, "a guarded certificate with an exam attempt must have verified provenance");
assert.match(guardedCertificatePdf, /fulfilled all academic requirements and successfully passed/, "guarded certificates may use verified completion language");
assert.match(guardedCertificatePdf, /VERIFIED EXAMINATION SCORE 80%/, "only provenance-verified certificates may display the certification score");
assert.match(guardedCertificatePdf, /COMPLETION DATE[\s\S]*October 17, 2026/, "the shared master template must render a recorded completion date");
const generatedCertificateBlob = await certificatePdfModule.createCertificatePdfBlob(guardedCertificate, guardedVerificationUrl, officialLogoFixture);
assert.equal(generatedCertificateBlob.type, "application/pdf", "certificate generation must return a PDF blob");
assert.ok(generatedCertificateBlob.size > 4000, "the premium academic certificate PDF must contain a complete rendered document");
assert.match(guardedCertificatePdf, /^%PDF-1\.4/, "certificate PDF generation must produce a valid PDF header");
assert.match(guardedCertificatePdf, /%%EOF$/, "certificate PDF generation must produce a complete PDF trailer");

const duplicateLessonQuizAssets = [
  { id: "legacy-1", course_id: 1, lesson_id: 2, asset_type: "Quiz", asset_status: "Published", asset_title: "Currency Pairs and Quote Anatomy", quiz_group_id: null },
  { id: "legacy-2", course_id: 1, lesson_id: 2, asset_type: "Quiz", asset_status: "Published", asset_title: "Currency Pairs and Quote Anatomy", quiz_group_id: null },
  { id: "b1c7fa6a-edb7-4191-a921-080cc66ad6b5", course_id: 1, lesson_id: 2, asset_type: "Quiz", asset_status: "Published", asset_title: "Currency Pairs and Quote Anatomy Multiple Choice", quiz_group_id: "canonical-group", points: 1 },
  { id: "c774d987-f61e-45a4-9777-5e8e64704a99", course_id: 1, lesson_id: 2, asset_type: "Quiz", asset_status: "Published", asset_title: "Currency Pairs and Quote Anatomy Multiple Choice", quiz_group_id: "canonical-group", points: 1 }
];
const canonicalLessonQuiz = [{ id: 2, course_id: 1, canonical_quiz_group_id: "canonical-group" }];
const selectedLesson2QuizAssets = quizAssetSelectionModule.selectCanonicalQuizAssets(duplicateLessonQuizAssets, canonicalLessonQuiz);
assert.deepEqual(selectedLesson2QuizAssets.map((asset) => asset.id), ["b1c7fa6a-edb7-4191-a921-080cc66ad6b5", "c774d987-f61e-45a4-9777-5e8e64704a99"], "Lesson 2 must resolve to the two exact repaired production assets while excluding competing legacy assets");
assert.equal(selectedLesson2QuizAssets.length, 2, "Lesson 2 must always resolve to exactly two canonical questions");
assert.equal(selectedLesson2QuizAssets.reduce((total, asset) => total + Number(asset.points), 0), 2, "Lesson 2 canonical quiz must total exactly two points");
assert.deepEqual(quizAssetSelectionModule.selectCanonicalQuizAssets(duplicateLessonQuizAssets, [{ id: 2, course_id: 1, canonical_quiz_group_id: "missing-explicit-group" }]), [], "an explicit canonical quiz group must fail closed and never fall back to another published quiz");
assert.equal(quizAssetSelectionModule.duplicatePublishedQuizAssetWarnings(duplicateLessonQuizAssets, canonicalLessonQuiz)[0].competingAssetCount, 2, "admin warning must report competing published legacy quiz assets");
assert.match(canonicalQuizMigration, /add column if not exists quiz_group_id uuid/, "canonical quiz migration must add a stable quiz group identifier idempotently");
assert.match(canonicalQuizMigration, /add column if not exists canonical_quiz_group_id uuid/, "canonical quiz migration must attach the stable quiz group to the lesson idempotently");
assert.doesNotMatch(canonicalQuizMigration, /delete from|truncate table|drop table/i, "canonical quiz migration must preserve quiz assets, attempts, and scores");
assert.match(lesson2CanonicalRepairMigration, /in eur\/usd, which currency is the base currency/, "Lesson 2 repair must identify the exact base-currency question");
assert.match(lesson2CanonicalRepairMigration, /the euro strengthened against the dollar/, "Lesson 2 repair must identify the exact EUR-strength answer");
assert.match(lesson2CanonicalRepairMigration, /b1c7fa6a-edb7-4191-a921-080cc66ad6b5/, "Lesson 2 repair must target the diagnosed base-currency asset UUID");
assert.match(lesson2CanonicalRepairMigration, /c774d987-f61e-45a4-9777-5e8e64704a99/, "Lesson 2 repair must target the diagnosed EUR-strength asset UUID");
assert.match(lesson2CanonicalRepairMigration, /a8d540ac-b5da-4547-883a-4aaed2092083/, "Lesson 2 repair must guard the diagnosed previous canonical group");
assert.match(lesson2CanonicalRepairMigration, /gen_random_uuid\(\)/, "PostgreSQL must create and persist the new quiz group UUID");
assert.match(lesson2CanonicalRepairMigration, /old_lesson2_canonical_group/, "Lesson 2 repair must report the previous canonical group id");
assert.match(lesson2CanonicalRepairMigration, /new_lesson2_canonical_group/, "Lesson 2 repair must report the new canonical group id");
assert.match(lesson2CanonicalRepairMigration, /extra_group_asset_count <> 0/, "Lesson 2 repair must reject a group containing any additional asset");
assert.match(lesson2CanonicalRepairMigration, /create temporary table aff_lesson2_canonical_quiz_audit\s+on commit preserve rows\s+as\s+select[\s\S]+with no data;/, "Lesson 2 repair audit table must remain available through the final verification SELECT");
assert.match(lesson2CanonicalRepairMigration, /insert into pg_temp\.aff_lesson2_canonical_quiz_audit/, "Lesson 2 repair must populate the session-local audit table explicitly");
assert.equal((lesson2CanonicalRepairMigration.match(/inner join public\.lessons as lesson/g) ?? []).length, 1, "Lesson 2 repair report must contain exactly one lessons join");
assert.match(lesson2CanonicalRepairMigration, /from pg_temp\.aff_lesson2_canonical_quiz_audit as audit\s+inner join public\.lessons as lesson\s+on lesson\.id = audit\.lesson_id\s+inner join public\.course_assets as base_asset\s+on base_asset\.id = audit\.base_currency_asset_id\s+inner join public\.course_assets as euro_asset\s+on euro_asset\.id = audit\.euro_strength_asset_id\s+;/, "Lesson 2 repair report must read the preserved session-local audit table and terminate only after every reporting join");
assert.equal((lesson2CanonicalRepairMigration.match(/^commit;$/gim) ?? []).length, 1, "Lesson 2 repair must not commit before the final verification SELECT");
assert.doesNotMatch(lesson2CanonicalRepairMigration, /delete from|truncate table|drop table|update public\.exams/i, "Lesson 2 repair must preserve all quiz assets and historical attempts");

assert.equal(quizQuestionModule.quizAnswerIsCorrect("EUR", "A", ["EUR", "USD", "Both", "Neither"]), true, "EUR must score correctly when a legacy key stores option A");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("The Euro strengthened against the Dollar", " option b ", ["The Dollar strengthened against the Euro", "The Euro strengthened against the Dollar", "Both currencies weakened", "The pair stopped trading"]), true, "Euro-strength answer must score correctly when a legacy key stores option B");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("Supply and Demand", "1", ["Supply and Demand", "Weather", "Chart colors", "Broker branding"]), true, "Supply and Demand must score correctly when a legacy key stores one-based index 1");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("Higher interest rates", "B", ["Lower liquidity", "Higher interest rates", "Weekend trading", "Lower exports"]), true, "Higher interest rates must score correctly when a legacy key stores option B");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("False", "Option B", ["True", "False"]), true, "False must score correctly for a legacy True/False option key");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("False", "False", ["True", "False"]), true, "plain False must score correctly");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("▢️ False", "False", ["True", "▢️ False"]), true, "decorated False with a variation selector must score correctly");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("True", "Option B", ["True", "False"]), false, "True must not score correctly when False is the answer");
assert.equal(quizQuestionModule.auditQuizCorrectAnswer({ options: ["EUR", "USD"], correctAnswer: "EUR" }).correctAnswer, "EUR", "admin answer audit must display camel-case EUR keys");
assert.equal(quizQuestionModule.auditQuizCorrectAnswer({ options: ["Supply and Demand", "Weather"], correct_answer: "Supply and Demand" }).correctAnswer, "Supply and Demand", "admin answer audit must display snake-case supply-and-demand keys");
assert.equal(quizQuestionModule.auditQuizCorrectAnswer({ options: ["Lower rates", "Higher interest rates"], answer: "Higher interest rates" }).correctAnswer, "Higher interest rates", "admin answer audit must display legacy answer fields");
assert.equal(quizQuestionModule.auditQuizCorrectAnswer({ options: ["True", "False"] }, { correct_answer: "False" }).correctAnswer, "False", "admin answer audit must resolve a legacy payload-level False key");
assert.equal(quizQuestionModule.auditQuizCorrectAnswer({ options: ["The Dollar strengthened", "The Euro strengthened against the Dollar"], correctOption: "B" }).correctAnswer, "The Euro strengthened against the Dollar", "admin answer audit must resolve legacy option references");
assert.equal(quizQuestionModule.normalizeQuizQuestionRecord({ prompt: "Base currency?", options: ["EUR", "USD"] }, "", { correctAnswer: "EUR" }).correctAnswer, "EUR", "legacy wrapper-level EUR answers must use the canonical resolver");
assert.equal(quizQuestionModule.normalizeQuizQuestionRecord({ prompt: "Exchange-rate influence?", options: ["Supply and Demand", "Weather"] }, "", { grading: { correct_answer: "Supply and Demand" } }).correctAnswer, "Supply and Demand", "nested legacy grading keys must use the canonical resolver");
assert.equal(quizQuestionModule.normalizeQuizQuestionRecord({ prompt: "Capital flows?", options: ["Lower rates", "Higher interest rates"] }, "", { answerKey: { answer: "Higher interest rates" } }).correctAnswer, "Higher interest rates", "nested answer-key wrappers must use the canonical resolver");
assert.equal(quizQuestionModule.normalizeQuizQuestionRecord({ prompt: "Inflation statement", options: ["True", "False"] }, "", { metadata: { correctOption: "B" } }).correctAnswer, "False", "metadata option references must use the canonical resolver");
assert.equal(quizQuestionModule.normalizeQuizQuestionRecord({ prompt: "EUR/USD rises", options: ["The Dollar strengthened", "The Euro strengthened against the Dollar"] }, "", { correct_answer: "The Euro strengthened against the Dollar" }).correctAnswer, "The Euro strengthened against the Dollar", "wrapper-level Euro-strength answers must use the canonical resolver");
assert.equal(quizQuestionModule.auditQuizCorrectAnswer({ options: ["A", "B"] }).issue, "missing", "admin answer audit must identify truly missing keys without inventing an answer");
assert.equal(quizQuestionModule.auditQuizCorrectAnswer({ options: ["A", "B"], correctAnswer: "A", correct_answer: "B" }).issue, "conflict", "admin answer audit must identify conflicting valid keys");
const liveCurrencyPairsQuestions = [
  quizQuestionModule.normalizeQuizQuestionRecord({
    prompt: "In EUR/USD, which currency is the base currency?",
    options: ["USD", "Both", "EUR", "Neither"],
    correctAnswer: "A",
    correct_answer: "EUR",
    points: 1
  }),
  quizQuestionModule.normalizeQuizQuestionRecord({
    prompt: "If EUR/USD rises, this generally means:",
    options: ["The Dollar strengthened against the Euro", "The Euro strengthened against the Dollar", "Both currencies weakened", "The pair stopped trading"],
    correctAnswer: "The Euro strengthened against the Dollar",
    points: 1
  })
];
assert.equal(liveCurrencyPairsQuestions[0].correctAnswer, "EUR", "explicit EUR answer text must outrank a conflicting stale option-letter key");
assert.equal(liveCurrencyPairsQuestions[0].answerKeySource, "question.correct_answer", "the grading trace must identify the explicit EUR key as its source");
const liveCurrencyPairsSelections = ["EUR", "The Euro strengthened against the Dollar"];
const liveCurrencyPairsEarnedPoints = liveCurrencyPairsQuestions.reduce((score, question, index) => score + (quizQuestionModule.quizAnswerIsCorrect(liveCurrencyPairsSelections[index], question.correctAnswer, question.options) ? question.points : 0), 0);
assert.equal(liveCurrencyPairsEarnedPoints, 2, "the exact two-question live Currency Pairs payload must grade 2/2");
const understandingExchangeRatesLivePayload = [
  {
    selected: "☐ Supply and Demand",
    correct: "Supply and Demand",
    options: ["Option A: ☐ Supply and Demand", "Option B: Government websites", "Option C: Weather", "Option D: Fashion"]
  },
  {
    selected: "□ Higher interest rates",
    correct: "Higher interest rates",
    options: ["Option A: Lower growth", "Option B: □ Higher interest rates", "Option C: Lower liquidity", "Option D: Weekend trading"]
  },
  {
    selected: "False",
    correct: "False",
    options: ["True", "False"]
  }
];
const understandingExchangeRatesScore = understandingExchangeRatesLivePayload.filter((question) =>
  quizQuestionModule.quizAnswerIsCorrect(question.selected, question.correct, question.options)
).length;
assert.equal(understandingExchangeRatesScore, 3, "the exact decorated Understanding Exchange Rates payload must grade 3/3");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("☐ EUR", "EUR", ["Option A: ☐ EUR", "Option B: USD", "Option C: Both", "Option D: Neither"]), true, "decorated EUR must remain correct");
assert.equal(quizQuestionModule.quizAnswerIsCorrect("□ The Euro strengthened against the Dollar", "The Euro strengthened against the Dollar", ["Option A: The Dollar strengthened against the Euro", "Option B: □ The Euro strengthened against the Dollar"]), true, "decorated Euro-strength answer must remain correct");
assert.match(quizAnswerKeyMigration, /update public\.course_assets/, "quiz answer-key repair must update only the existing Course Builder quiz records");
assert.match(quizAnswerKeyMigration, /'The Euro strengthened against the Dollar'/, "quiz answer-key repair must normalize the EUR\/USD interpretation answer");
assert.match(quizAnswerKeyMigration, /'Supply and Demand'/, "quiz answer-key repair must normalize the exchange-rate supply and demand answer");
assert.match(quizAnswerKeyMigration, /'Higher interest rates'/, "quiz answer-key repair must normalize the international-capital answer");
assert.match(quizAnswerKeyMigration, /'False'/, "quiz answer-key repair must normalize the inflation True\/False answer");
assert.doesNotMatch(quizAnswerKeyMigration, /update public\.exams|delete from public\.exams/, "quiz answer-key repair must not alter historical student attempts or scores");
assert.match(exchangeRateAnswerKeyMigration, /course_id = 1/, "exchange-rate answer repair must target Forex Foundations only");
assert.match(exchangeRateAnswerKeyMigration, /lesson_id = 2/, "exchange-rate answer repair must target the Currency Pairs lesson only");
assert.match(exchangeRateAnswerKeyMigration, /which factor often attracts international capital\?/, "exchange-rate answer repair must target only the proven incorrect question");
assert.match(exchangeRateAnswerKeyMigration, /Higher interest rates/, "exchange-rate answer repair must write the verified answer key");
assert.doesNotMatch(exchangeRateAnswerKeyMigration, /update public\.exams|delete from public\.exams/, "targeted answer repair must preserve historical attempts and scores");

assert.match(middleware, /\["\/student-dashboard", "\/admin"\]/, "administrator /student-dashboard must redirect to /admin");
assert.match(middleware, /\["\/student-profile", "\/admin\/profile"\]/, "administrator /student-profile must redirect to /admin/profile");
assert.match(middleware, /\["\/billing", "\/admin"\]/, "administrator /billing must redirect to /admin");
assert.match(middleware, /\["\/courses", "\/admin\/course-management"\]/, "administrator /courses must redirect to /admin/course-management");
assert.match(middleware, /\["\/profile", "\/admin\/profile"\]/, "administrator /profile must redirect to /admin/profile");
assert.match(middleware, /\["\/my-courses", "\/admin\/course-management"\]/, "administrator /my-courses must redirect to /admin/course-management");
assert.match(middleware, /\["\/student-courses", "\/admin\/course-management"\]/, "administrator /student-courses must redirect to /admin/course-management");
assert.match(middleware, /isStudentLessonPreview/, "middleware must allow administrators to preview individual student lesson pages");
assert.match(middleware, /getAffAdminStatusFromSupabase\(supabase\)/, "middleware must resolve administrator role through the shared admin status helper");
assert.match(adminStatus, /\.from\("aff_admin_users"\)/, "shared admin status helper must query aff_admin_users");
assert.match(adminStatus, /\.eq\("user_id", userId\)/, "shared admin status helper must match by user_id first");
assert.match(adminStatus, /\.eq\("email", email\)/, "shared admin status helper must optionally match by normalized email");
assert.match(adminStatus, /new Set\(\["administrator", "admin"\]\)/, "shared admin status helper must accept administrator or admin roles");
assert.match(adminStatus, /params\.row\?\.is_active === true/, "shared admin status helper must require active admin row");
assert.match(middleware, /const isLoginRoute = request\.nextUrl\.pathname === "\/login"/, "middleware must make /login role-aware");
assert.match(middleware, /isLoginRoute && isAdmin[\s\S]*url\.pathname = "\/admin"/, "authenticated admins opening /login must redirect to /admin");
assert.match(middleware, /const adminOnlyRoutes = \["\/admin", "\/student-directory", "\/executive-command-center"\]/, "executive command center must be admin-only");
assert.match(adminServer, /export async function getAffAdminStatus\(\)/, "server admin helper must export getAffAdminStatus");
assert.match(adminServer, /getAffAdminStatusFromSupabase\(createSupabaseServerClient\(\)\)/, "server admin helper must use the cookie-aware Supabase server client");
assert.match(authRole, /\["administrator", "admin"\]\.includes/, "legacy role resolver must accept administrator/admin roles");

assert.match(studentDashboard, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "student dashboard must redirect admins before student data fallbacks");
assert.match(studentCourses, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "student courses must redirect admins before loading enrollments");
assert.match(studentCourses, /\.from\("students"\)[\s\S]*\.eq\("auth_user_id", user\.id\)/, "student courses must locate the student through students.auth_user_id");
assert.match(studentCourses, /\.from\("enrollments"\)[\s\S]*\.eq\("student_id", studentId\)/, "student courses must load enrollments through the internal students.id");
assert.match(studentCourses, /\.from\("lesson_progress"\)[\s\S]*\.eq\("student_id", user\.id\)/, "student courses must scope lesson progress to the authenticated user");
assert.match(studentCourses, /\.from\("certificates"\)[\s\S]*\.eq\("student_id", user\.id\)/, "student courses must scope certificate records to the authenticated user");
assert.doesNotMatch(studentCourses, /SERVICE_ROLE|service_role|hardcoded/i, "student courses must not expose service-role access or hardcoded student data");
assert.match(lmsCourseCenter, /const \[quizResults, setQuizResults\]/, "student course quiz submissions must store visible saved result state");
assert.match(lmsCourseCenter, /const \[submittingQuizIds, setSubmittingQuizIds\]/, "student course quiz submissions must guard against duplicate clicks");
assert.match(lmsCourseCenter, /const \[quizSubmissionDiagnostics, setQuizSubmissionDiagnostics\]/, "student quiz submission must expose safe production diagnostics");
assert.match(lmsCourseCenter, /function isStudentIdTypeMismatch/, "student quiz submission must detect uuid/bigint student_id mismatches");
assert.match(lmsCourseCenter, /function isMissingColumn/, "student quiz submission must detect missing attempt metadata columns");
assert.match(lmsCourseCenter, /\["published", "active", "available"\]\.includes\(status\.trim\(\)\.toLowerCase\(\)\)/, "managed LMS lesson/course availability must use the same published/active/available canonical status rule as progress");
assert.match(lmsCourseCenter, /const canonicalCourseLessons = publishedLessons\.filter\(\(lesson\) => value\(lesson, \["course_id"\]\) === courseId\)/, "managed LMS course cards must derive displayed lesson count from the canonical lesson set");
assert.match(lmsCourseCenter, /\{canonicalCourseLessons\.length\} lesson/, "managed LMS course cards must not display stale courses.duration as the lesson count");
assert.doesNotMatch(lmsCourseCenter, /department_name"\], "AFF Global University"\)} · \{value\(course, \["duration"\]/, "managed LMS course card header must not use stale course duration for academic lesson count");
assert.match(lmsCourseCenter, /moduleLessons\.map\(\(lesson, index\) =>/, "managed LMS lesson list must derive visible lesson sequence from the canonical sorted array index");
assert.match(lmsCourseCenter, /Lesson \{index \+ 1\}/, "managed LMS lesson list must not display duplicated stored lesson_order values");
assert.match(lmsCourseCenter, /function itemMatchesLesson/, "managed LMS homework and quizzes must support strict lesson matching");
assert.match(lmsCourseCenter, /lessonHomework = homework\.filter\(\(item\) => value\(item, \["course_id"\]\) === courseId && itemMatchesLesson\(item, lesson\)\)/, "managed LMS homework must render under only its linked lesson");
assert.match(lmsCourseCenter, /lessonQuizzes = quizzes\.filter\(\(quiz\) => value\(quiz, \["course_id"\]\) === courseId && itemMatchesLesson\(quiz, lesson\)\)/, "managed LMS quizzes must render under only their linked lesson");
assert.match(lmsCourseCenter, /function homeworkDueLabel/, "managed LMS homework due display must be centralized");
assert.match(lmsCourseCenter, /No Due Date/, "managed LMS homework must honor no due date instead of falling back to seven days");
assert.match(lmsCourseCenter, /function quizPassingScore/, "managed LMS quiz passing score must be normalized separately from quiz point totals");
assert.match(lmsCourseCenter, /score >= 50 && score <= 100/, "managed LMS quiz passing score must not use small point totals as percentages");
assert.match(lmsCourseCenter, /\.from\("exams"\)\.select\("\*"\)\.eq\("auth_user_id", user\.id\)/, "student quiz attempts should load by auth_user_id when available");
assert.match(lmsCourseCenter, /\.from\("exams"\)\.select\("\*"\)\.eq\("student_id", internalStudentId\)/, "student quiz attempts must fall back to internal students.id when production student_id is bigint");
assert.match(lmsCourseCenter, /Answer question \$\{unanswered \+ 1\} before submitting this quiz\./, "student quiz submission must validate unanswered questions visibly");
assert.match(lmsCourseCenter, /Submitting quiz attempt\.\.\./, "student quiz submission must show an in-flight status");
assert.match(lmsCourseCenter, /auth_user_id: userId/, "student quiz submission must persist authenticated user identity when the column exists");
assert.match(lmsCourseCenter, /selected_answers: selectedAnswers/, "student quiz submission must persist selected answer details");
assert.match(lmsCourseCenter, /total_points: totalPoints/, "student quiz submission must persist total points");
assert.match(lmsCourseCenter, /earned_points: earnedPoints/, "student quiz submission must persist earned points");
assert.match(lmsCourseCenter, /quizAnswerIsCorrect\(quizAnswers\[index\], question\.correctAnswer, question\.options\)/, "student quiz grading must use canonical answer resolution instead of raw string equality");
assert.match(lmsCourseCenter, /const gradingBreakdown = quizQuestions\.map/, "student quiz grading must compute one canonical comparison breakdown");
assert.match(lmsCourseCenter, /const selectedAnswers = gradingBreakdown;/, "persisted grading details must reuse the same comparison breakdown used for the score");
assert.match(lmsCourseCenter, /sourceAssetId: question\.sourceAssetId/, "persisted grading details must retain the source quiz asset id");
assert.match(lmsCourseCenter, /questionKey: question\.questionKey/, "persisted grading details must retain a stable source question key");
assert.match(lmsCourseCenter, /renderedOptions: question\.options/, "persisted grading details must retain the exact options shown to the student");
assert.match(lmsCourseCenter, /answerKeySource: question\.answerKeySource/, "persisted grading details must identify the resolved answer-key source");
assert.match(lmsCourseCenter, /percentage/, "student quiz submission must persist and render percentage");
assert.match(lmsCourseCenter, /retrying_internal_student_attempt/, "student quiz submission must retry with internal student id if production expects bigint student_id");
assert.match(lmsCourseCenter, /process\.env\.NODE_ENV !== "production" && diagnostic/, "student quiz diagnostics must be hidden from production students");
assert.match(lmsCourseCenter, /Quiz Submission Diagnostic/, "student quiz UI may keep diagnostics for development-only troubleshooting");
assert.match(lmsCourseCenter, /\.from\("exams"\)\.insert\([\s\S]*\.select\("\*"\)\.single\(\)/, "student quiz submission must read back the saved exam attempt before showing success");
assert.match(lmsCourseCenter, /Quiz submitted successfully:/, "student quiz submission must display score and pass/fail after save");
assert.match(lmsCourseCenter, /Assessment Passed/, "passing quiz results must show a polished assessment passed status");
assert.match(lmsCourseCenter, /Assessment Not Passed — review the lesson and try again\./, "failing quiz results must explain the retry path");
assert.match(lmsCourseCenter, /Course progress updates when the connected lesson is marked complete\./, "quiz pass messaging must preserve lesson-completion progress semantics");
assert.match(lmsCourseCenter, /Saved Attempts/, "student quiz UI must render saved attempt history");
assert.match(studentLessonViewer, /\.from\("students"\)[\s\S]*\.eq\("auth_user_id", user\.id\)/, "student lesson viewer must locate students by auth_user_id");
assert.match(studentLessonViewer, /\.from\("enrollments"\)[\s\S]*\.eq\("student_id", studentId\)/, "student lesson viewer must verify enrollment through internal students.id");
assert.match(studentLessonViewer, /\.from\("lesson_progress"\)[\s\S]*upsert/, "student lesson viewer must persist completion through lesson_progress upsert");
assert.match(studentLessonViewer, /youtubeEmbedUrl/, "student lesson viewer must parse YouTube classroom URLs");
assert.match(studentLessonViewer, /vimeoEmbedUrl/, "student lesson viewer must parse Vimeo classroom URLs");
assert.match(studentLessonViewer, /isDirectVideo\(url\)/, "student lesson viewer must detect MP4/uploaded classroom video URLs");
assert.match(studentLessonViewer, /Lesson media is being prepared by the Academy\./, "student lesson viewer must preserve the no-media placeholder");
assert.match(studentLessonViewer, /function assetMatchesLessonOrSharedResource/, "student lesson viewer must keep quiz and homework assets scoped to the current lesson");
assert.match(studentLessonViewer, /if \(type === "Quiz" \|\| resourceGroupFor\(asset\) === "Homework Files"\) return assetMatchesLesson\(asset, course, lesson\)/, "student lesson viewer must not fall back to course-level quiz or homework assets on lesson pages");
assert.match(studentLessonViewer, /function assignmentDueLabel/, "student lesson viewer must centralize assignment due-date display");
assert.match(studentLessonViewer, /booleanValue\(assignment, \["no_due_date", "noDueDate"\]\)/, "student lesson viewer must honor no_due_date before displaying due-date fallbacks");
assert.match(studentLessonViewer, /function assignmentDisplayTitle/, "student lesson viewer must centralize canonical homework title display");
assert.match(studentLessonViewer, /`\$\{lessonTitle\(lesson\)\} Assignment`/, "canonical homework title fallback must use the lesson assignment naming convention");
assert.match(studentLessonViewer, /function assignmentRequiredLabel/, "student lesson viewer must centralize assignment required metadata");
assert.match(studentLessonViewer, /resourceType\(assignment\)\.toLowerCase\(\)\.includes\("assignment"\) \? "Required" : "Optional"/, "published assignment definitions must default to required when no explicit flag exists");
assert.match(studentLessonViewer, /function assignmentAllowedFileTypes/, "student lesson viewer must centralize assignment allowed file types");
assert.match(studentLessonViewer, /"PDF,DOCX,PNG,JPG"/, "student lesson viewer must use the AFF assignment upload file type standard");
assert.match(studentLessonViewer, /const assignmentAssets = assets\.filter\(\(asset\) => resourceGroupFor\(asset\) === "Homework Files"\)/, "student lesson viewer must include published Course Builder assignment assets in lesson homework");
assert.match(studentLessonViewer, /function canonicalLessonAssignments/, "student lesson viewer must canonicalize duplicate homework sources");
assert.match(studentLessonViewer, /function assignmentDefinitionLink/, "student lesson viewer must prefer stable assignment-definition linkage over title-only dedupe");
assert.match(studentLessonViewer, /function assignmentSubmissionState/, "student lesson viewer must carry student submission state separately from the homework definition");
assert.match(studentLessonViewer, /assignmentAssets\.length === 1 \? latestAssignmentRow\(assignmentRows\) : null/, "one canonical homework asset plus one student submission row must merge into one homework card");
assert.match(studentLessonViewer, /if \(assignmentAssets\.length > 0\) return canonical;/, "student lesson viewer must not append legacy submission rows as duplicate definitions when canonical homework assets exist");
assert.match(studentLessonViewer, /\.\.\.submission,[\s\S]*\.\.\.definition,[\s\S]*__submission_record: submission/, "canonical homework cards must keep instructor definition metadata while preserving submission review state");
assert.match(studentLessonViewer, /const assignments = canonicalLessonAssignments\(assignmentRows, assignmentAssets, course, lesson\)/, "student lesson viewer must merge submission and review state with Course Builder assignment assets into one card");
assert.match(studentLessonViewer, /const dueDate = value\(assignment, \["due_date"\], value\(payload, \["due_date"\]\)\)/, "student lesson viewer must not treat submission_date as homework due date");
assert.match(studentLessonViewer, /const reviewSource = submission \?\? linkedSubmission \?\? assignment/, "student lesson viewer must preserve saved assignment review status on the canonical homework card");
assert.match(studentLessonViewer, /Current Score:/, "student-facing homework card must label saved grade as Current Score");
assert.match(studentLessonViewer, /Reviewed: \{formatDateTime\(reviewedAt\)\}/, "student-facing homework card must display reviewed date when present");
assert.match(studentLessonViewer, /Instructor Feedback:/, "student-facing homework card must display instructor feedback when present");
assert.doesNotMatch(assignmentsPage, /courseCatalog/, "assignment center must not use the stale static course catalog for course or lesson dropdowns");
assert.match(assignmentsPage, /supabase\.from\("enrollments"\)\.select\("course_id,enrollment_status"\)\.eq\("student_id", internalStudentId\)/, "assignment center must query only real enrollment columns for student scoping");
assert.doesNotMatch(assignmentsPage, /select\("course_id,enrollment_status,status"\)/, "assignment center must not query nonexistent enrollments.status");
assert.match(assignmentsPage, /supabase\.from\("lessons"\)\.select\("\*"\)\.order\("lesson_order"/, "assignment center must load current lessons from Supabase");
assert.match(assignmentsPage, /selectedLessons = useMemo\(\(\) => lessons[\s\S]*\.filter\(\(lesson\) => String\(lesson\.course_id\) === form\.course_slug\)[\s\S]*\.sort\(\(left, right\) => lessonOrder\(left\) - lessonOrder\(right\)/, "assignment center lesson dropdown must filter by real course_id and canonical lesson order");
assert.match(assignmentsPage, /<option key=\{lesson\.id\} value=\{lesson\.id\}>Lesson \{index \+ 1\}: \{lessonTitle\(lesson\)\}<\/option>/, "assignment center lesson options must use the real database lesson id as the option value");
assert.match(studentLessonViewer, /Playback tracking is available for direct Academy video files\./, "iframe providers must not claim precise playback tracking without provider APIs");
assert.match(studentLessonViewer, /\.from\("video_progress"\)[\s\S]*\.eq\("auth_user_id", user\.id\)[\s\S]*\.eq\("course_id", Number\(idOf\(course\)\)\)[\s\S]*\.eq\("lesson_id", Number\(idOf\(lesson\)\)\)/, "student lesson viewer must load playback progress for only the authenticated student");
assert.match(studentLessonViewer, /\.from\("video_progress"\)[\s\S]*\.upsert\([\s\S]*onConflict: "auth_user_id,course_id,lesson_id"/, "student lesson viewer must upsert playback progress through the video_progress composite key");
assert.match(studentLessonViewer, /state\.isAdmin[\s\S]*return/, "administrator preview must not write playback progress");
assert.match(studentLessonViewer, /Lesson video is temporarily unavailable\./, "invalid media URLs must not crash the lesson page");
assert.match(studentLessonViewer, /\.from\("lesson_notes"\)[\s\S]*\.eq\("auth_user_id", user\.id\)[\s\S]*\.eq\("course_id", numericCourseId\)[\s\S]*\.eq\("lesson_id", numericLessonId\)[\s\S]*\.maybeSingle\(\)/, "student lesson viewer must load the authenticated student's cloud lesson note");
assert.match(studentLessonViewer, /\.from\("lesson_notes"\)[\s\S]*\.upsert\([\s\S]*onConflict: "auth_user_id,course_id,lesson_id"/, "student lesson viewer must upsert notes through the lesson_notes composite key");
assert.match(studentLessonViewer, /savedText !== textBeingSaved/, "student lesson viewer must verify the returned Supabase note before showing success");
assert.match(studentLessonViewer, /if \(!noteText\.trim\(\) && localNote\.trim\(\)\)/, "local note migration must not overwrite an existing cloud note");
assert.match(studentLessonViewer, /Student private notes are unavailable in administrator preview/, "administrator preview must not create or edit private student notes");
assert.match(studentLessonViewer, /Offline copy only — reconnect to sync with your AFF account/, "offline fallback must not claim cloud persistence");
assert.doesNotMatch(studentLessonViewer, /SERVICE_ROLE|service_role/i, "student lesson viewer must not expose service-role access");
assert.match(studentProfile, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin\/profile"\)/, "student profile must redirect admins before student data fallbacks");
assert.match(billing, /getClientAdminStatus\(\)[\s\S]*router\.replace\("\/admin"\)/, "billing must redirect admins before membership fallback creation");
assert.match(studentProfile, /\.from\("students"\)[\s\S]*profile_photo_url/, "student profile photos must persist to the existing students table");
assert.match(studentProfile, /\.eq\("auth_user_id", authenticatedUserId\)[\s\S]*\.select\("id, student_id, auth_user_id, profile_photo_url"\)[\s\S]*\.single\(\)/, "student profile photo update must match auth_user_id, return the saved students row, and require a single row");
assert.match(studentProfile, /verifiedUrl !== publicUrl/, "student profile photo upload must verify the saved URL equals the generated Storage URL");
assert.doesNotMatch(studentProfile, /\.from\("student_profiles"\)|student_profiles\.profile_photo_url/, "student profile page must not reference the missing student_profiles table for photo persistence");

const transcripts = read("app/transcripts/page.tsx");
assert.match(transcripts, /function countDistinctPassedAssessments/, "transcript analytics must count distinct passed assessments rather than raw passed attempt rows");
assert.match(transcripts, /new Set\(rows\.filter\(isPassedAssessment\)\.map\(assessmentIdentity\)\)\.size/, "transcript passed-exam count must deduplicate repeated attempts by assessment identity");
assert.doesNotMatch(transcripts, /passedExams = exams\.filter[\s\S]*passedExams\.length/, "transcript passed-exam count must not expose passed attempt volume as academic achievement");

assert.match(directoryRoute, /getAffAdminStatus\(\)/, "student directory API must check server-side admin status");
assert.match(directoryRoute, /status: 403/, "student directory API must deny non-admin requests");
assert.match(directoryRoute, /\.from\("students"\)[\s\S]*profile_photo_url/, "student directory API must read profile photos from the existing students table");
assert.doesNotMatch(directoryRoute, /\.from\("student_profiles"\)|student_profiles\.profile_photo_url/, "student directory API must not reference the missing student_profiles table for profile photos");

const adminLinksBlock = siteShell.match(/const adminNavGroups:[\s\S]*?const navGroups/)?.[0] ?? "";
const publicHeaderBlock = siteShell.slice(
  siteShell.indexOf('<div className="mx-auto flex max-w-[1440px]'),
  siteShell.indexOf("{mobileOpen ?")
);
assert.doesNotMatch(adminLinksBlock, /label: "Profile"/, "admin auth links must not use student profile label");
assert.doesNotMatch(adminLinksBlock, /label: "Billing"/, "admin auth links must not expose student billing");
assert.doesNotMatch(adminLinksBlock, /label: "My Courses"/, "admin auth links must not expose student courses");
assert.match(siteShell, /href: "\/student-courses", label: "My Courses"/, "student My Courses navigation must use the protected student courses dashboard");
assert.match(siteShell, /label: "Admin Profile"/, "admin navigation must include Admin Profile");
assert.match(siteShell, /href: "\/admin\/command-center", label: "Command Center"/, "admin navigation must include Admin Command Center");
assert.doesNotMatch(siteShell, /visibleNavGroups/, "public top navigation must not be replaced with administrator links");
assert.match(siteShell, /const authenticatedLinks = isAdmin \? \[\] : studentAuthLinks/, "administrator buttons must not be mixed into the top auth navigation");
assert.match(siteShell, /function AdminNavigationRow/, "administrator navigation must render in a dedicated second row");
assert.match(siteShell, /AFF ADMINISTRATION/, "dedicated administrator row must be clearly labeled");
assert.match(siteShell, /Admin Menu/, "administrator navigation must provide a mobile menu");
assert.match(siteShell, /const adminNavGroups:[\s\S]*Dashboard[\s\S]*Students[\s\S]*Courses[\s\S]*Media Center[\s\S]*Live Academy[\s\S]*Analytics[\s\S]*Administration/, "administrator navigation must be grouped into enterprise toolbar sections");
assert.match(siteShell, /<AdminNavigationRow[\s\S]*groups=\{adminNavGroups\}/, "administrator groups must be passed only to the second row");
assert.match(siteShell, /<AuthNavigation[\s\S]*links=\{authenticatedLinks\}/, "public header auth controls must use the non-admin authenticated links set");
assert.doesNotMatch(publicHeaderBlock, /adminNavGroups|AdminNavigationRow/, "administrator navigation must not render inside the public top header row");
assert.match(adminProfile, /getAffAdminStatus\(\)/, "admin profile must read administrator role through getAffAdminStatus");
assert.match(executiveCommandCenter, /getClientAdminStatus\(\)/, "executive command center must use aff_admin_users admin status");
assert.match(adminRouteAudit, /process\.env\.NODE_ENV === "production"/, "admin route audit must detect production mode");
assert.match(adminRouteAudit, /Admin dashboard ready\./, "production admin route audit must show only simple success status");
assert.match(adminRouteAudit, /Administrator authorization required\./, "production admin route audit must show only simple denial status");
assert.match(adminRouteAudit, /process\.env\.NODE_ENV !== "production"[\s\S]*console\.info/, "verbose admin route diagnostics must be development-only");
assert.doesNotMatch(adminRouteAudit, /Supabase config/, "admin route audit must not render Supabase configuration details");
assert.doesNotMatch(adminStatusRoute, /SUPABASE_SERVICE_ROLE_KEY|hasSupabaseServiceRoleKey|supabaseHost|environment/, "admin status API must not expose Supabase environment configuration");
assert.doesNotMatch(adminClient, /hasSupabaseServiceRoleKey|supabaseHost|environment/, "browser admin client must not carry Supabase environment configuration");
assert.match(adminDashboard, /const \[savingAssignmentReviews, setSavingAssignmentReviews\]/, "admin assignment review must track per-row saving state");
assert.match(adminDashboard, /if \(savingAssignmentReviews\[assignmentId\]\) return;/, "admin assignment review must prevent duplicate save clicks");
assert.match(adminDashboard, /getClientAdminStatus\(\)[\s\S]*Save Review requires an active AFF administrator account/, "admin assignment review must verify the active admin session before update");
assert.match(adminDashboard, /reviewed_by: authenticatedAdminEmail/, "admin assignment review must persist the authenticated reviewer email");
assert.match(adminDashboard, /Grading history updated\./, "admin assignment review must show visible success once history is saved");
assert.match(adminDashboard, /Review save failed:/, "admin assignment review must show row-level Supabase errors");
assert.match(assignmentReviewMigration, /add column if not exists grading_history jsonb not null default '\[\]'::jsonb/, "assignment review migration must ensure grading_history exists");
assert.match(assignmentReviewMigration, /create policy "AFF admins can manage assignments"[\s\S]*using \(public\.is_aff_admin\(\)\)[\s\S]*with check \(public\.is_aff_admin\(\)\)/, "assignment review migration must authorize assignment review updates through aff_admin_users");
assert.match(adminLmsManager, /function videoUrlValidationMessage/, "admin course manager must validate lesson video URLs before saving");
assert.match(adminLmsManager, /youtube\.com[\s\S]*youtu\.be/, "admin course manager must accept YouTube watch, short, and embed URLs");
assert.match(adminLmsManager, /vimeo\.com[\s\S]*endsWith\("\.vimeo\.com"\)/, "admin course manager must accept Vimeo and player URLs");
assert.match(adminLmsManager, /mp4\|webm\|mov/, "admin course manager must accept browser-playable direct media URLs");
assert.match(adminLmsManager, /javascript\|data/, "admin course manager must reject unsafe javascript and data URLs");
assert.match(adminLmsManager, /Local file paths cannot be saved/, "admin course manager must reject accidental local file paths");
assert.match(adminLmsManager, /Use a temporary public test video URL for technical verification/, "admin course manager must explain the temporary test video workflow");
assert.match(adminLmsManager, /\.from\("lessons"\)\.update\(payload\)\.eq\("id", Number\(lessonForm\.lessonId\)\)\.select/, "admin course manager must update the existing lesson row and read it back");
assert.match(adminLmsManager, /selectedCourseLessons = useMemo\(\(\) => lessons[\s\S]*\.sort\(\(left, right\) => numberValue\(left, \["lesson_order", "display_order", "sort_order"\]\)[\s\S]*numberValue\(left, \["id"\]\) - numberValue\(right, \["id"\]\)/, "admin lesson list must use the same canonical lesson ordering as student navigation");
assert.match(adminLmsManager, /selectedCourseLessons\.map\(\(lesson, index\) =>[\s\S]*meta=\{`Lesson \$\{index \+ 1\}/, "admin lesson sequence labels must use canonical display index instead of raw duplicated lesson_order");
assert.match(adminLmsManager, /Lesson media saved successfully\./, "admin course manager must show verified media save confirmation");
assert.match(adminLmsManager, /savedProvider !== lessonForm\.videoProvider \|\| savedUrl !== expectedUrl/, "admin course manager must verify returned database media fields before reporting success");
assert.match(adminLmsManager, /resetLessonPlaybackProgress/, "admin course manager must expose an optional reset playback progress action");
assert.match(adminLmsManager, /\.from\("video_progress"\)\.delete\(\)\.eq\("lesson_id", Number\(lessonId\)\)/, "admin reset must target only the selected lesson playback rows");
assert.match(courseUploadCenter, /External Lesson Video/, "course upload center must expose the external lesson video panel after lesson selection");
assert.match(courseUploadCenter, /selectedLesson \? \(/, "external lesson video panel must render only when a valid lesson is selected");
assert.match(courseUploadCenter, /Attach a YouTube, Vimeo, or direct browser-playable video URL to the selected lesson\./, "external video panel must describe supported external URL workflow");
assert.match(courseUploadCenter, /youtube\.com[\s\S]*youtu\.be/, "upload center must accept YouTube watch, short, and embed URLs");
assert.match(courseUploadCenter, /vimeo\.com[\s\S]*endsWith\("\.vimeo\.com"\)/, "upload center must accept Vimeo video and player URLs");
assert.match(courseUploadCenter, /mp4\|webm\|mov/, "upload center must accept direct MP4, WebM, and MOV URLs");
assert.match(courseUploadCenter, /javascript\|data/, "upload center must reject unsafe javascript and data URLs");
assert.match(courseUploadCenter, /Local computer paths cannot be saved/, "upload center must reject local computer paths");
assert.match(courseUploadCenter, /Preview Video/, "upload center must provide an administrator preview button");
assert.match(courseUploadCenter, /Save Lesson Video/, "upload center must provide a save lesson video button");
assert.match(courseUploadCenter, /type="button" onClick=\{saveExternalLessonVideo\}/, "save lesson video button must fire the explicit click handler without submitting a parent form");
assert.doesNotMatch(courseUploadCenter, /onClick=\{saveExternalLessonVideo\} disabled=\{savingVideo \|\| Boolean\(externalVideoValidation\)\}/, "save button must not be disabled by pre-click validation");
assert.match(courseUploadCenter, /Saving lesson video\.\.\./, "save lesson video workflow must show an immediate saving state");
assert.match(courseUploadCenter, /supabase\.auth\.getUser\(\)/, "save lesson video workflow must inspect the authenticated browser session");
assert.match(courseUploadCenter, /supabase\.rpc\("is_aff_admin"\)/, "save lesson video workflow must call public.is_aff_admin for authorization diagnostics");
assert.match(courseUploadCenter, /Safe Save Diagnostic/, "upload center must show safe administrator save diagnostics");
assert.match(courseUploadCenter, /Save stage/, "save diagnostic must display the current save stage");
assert.match(courseUploadCenter, /Validation error/, "save diagnostic must display the current validation error");
assert.match(courseUploadCenter, /saveStage: "button_clicked"/, "clicking Save Lesson Video must set save_stage to button_clicked");
assert.match(courseUploadCenter, /saveStage: "validating_selection"/, "selection validation must set save_stage");
assert.match(courseUploadCenter, /saveStage: "validating_provider"/, "provider validation must set save_stage");
assert.match(courseUploadCenter, /saveStage: "validating_url"/, "URL validation must set save_stage");
assert.match(courseUploadCenter, /saveStage: "validating_title"/, "title validation must set save_stage");
assert.match(courseUploadCenter, /saveStage: "validating_duration"/, "duration validation must set save_stage");
assert.match(courseUploadCenter, /saveStage: "checking_auth"/, "valid form must reach checking_auth before auth.getUser");
assert.match(courseUploadCenter, /saveStage: "checking_admin"/, "valid form must reach checking_admin after auth.getUser");
assert.match(courseUploadCenter, /saveStage: "updating_lesson"/, "valid form must reach updating_lesson");
assert.match(courseUploadCenter, /saveStage: "verifying_readback"/, "saved lesson must reach read-back verification");
assert.match(courseUploadCenter, /saveStage: "success"/, "successful read-back must set save_stage to success");
assert.match(courseUploadCenter, /validationError: detail/, "every validation failure must populate the visible validation error");
assert.match(courseUploadCenter, /Authenticated Supabase user ID/, "save diagnostic must display the authenticated Supabase user id");
assert.match(courseUploadCenter, /Authenticated email/, "save diagnostic must display the authenticated email");
assert.match(courseUploadCenter, /public\.is_aff_admin\(\)/, "save diagnostic must display public.is_aff_admin result");
assert.match(courseUploadCenter, /Selected course ID/, "save diagnostic must display the selected course id");
assert.match(courseUploadCenter, /Selected lesson ID/, "save diagnostic must display the selected lesson id");
assert.match(courseUploadCenter, /Supabase update error code/, "save diagnostic must display the Supabase update error code");
assert.match(courseUploadCenter, /Supabase update error message/, "save diagnostic must display the Supabase update error message");
assert.match(courseUploadCenter, /Video provider/, "save diagnostic must display provider before saving");
assert.match(courseUploadCenter, /Video URL/, "save diagnostic must display URL before saving");
assert.match(courseUploadCenter, /Video title/, "save diagnostic must display title before saving");
assert.match(courseUploadCenter, /Video duration seconds/, "save diagnostic must display parsed duration before saving");
assert.match(courseUploadCenter, /Video thumbnail URL/, "save diagnostic must display thumbnail before saving");
assert.match(courseUploadCenter, /Remove Video/, "upload center must provide a remove video button");
assert.match(courseUploadCenter, /Reset Playback Progress/, "upload center must provide a confirmed reset playback action");
assert.match(courseUploadCenter, /Unable to identify the selected lesson\. Please reselect the course and lesson\./, "missing or mismatched selected lessons must show a clear error");
assert.match(courseUploadCenter, /parseDurationSeconds[\s\S]*parts\.reduce\(\(total, part\) => total \* 60 \+ part, 0\)/, "duration values such as 10:34 must convert to integer seconds");
assert.match(courseUploadCenter, /confirmedDuration !== expectedDuration/, "save lesson video workflow must verify that formatted duration persisted as integer seconds");
assert.match(courseUploadCenter, /\.from\("lessons"\)[\s\S]*\.update\(payload\)[\s\S]*\.eq\("id", selectedLessonId\)[\s\S]*\.eq\("course_id", selectedCourseId\)[\s\S]*\.select\(lessonVideoColumns\)/, "upload center must update only the selected lesson row for the selected course");
assert.match(courseUploadCenter, /\.from\("lessons"\)[\s\S]*\.select\(lessonVideoColumns\)[\s\S]*\.eq\("id", selectedLessonId\)[\s\S]*\.eq\("course_id", selectedCourseId\)[\s\S]*\.single\(\)/, "upload center must read back the saved lesson row after update");
assert.match(courseUploadCenter, /Database update returned no lesson row\./, "database updates that return no row must be treated as failures");
assert.match(courseUploadCenter, /Permission denied while updating the lesson/, "Supabase RLS or permission failures must be visible to the admin");
assert.match(courseUploadCenter, /confirmedDuration !== expectedDuration/, "read-back verification must include persisted duration");
assert.match(courseUploadCenter, /confirmedThumbnail !== expectedThumbnail/, "read-back verification must include persisted thumbnail URL");
assert.match(courseUploadCenter, /Lesson video saved successfully\./, "upload center must show success only after Supabase verifies the lesson video row");
assert.match(courseUploadCenter, /Saved: \{new Date\(lastVideoSavedAt\)\.toLocaleString\(\)\}/, "successful saves must display the saved timestamp");
assert.match(courseUploadCenter, /Restoring the Academy classroom placeholder[\s\S]*video_provider: "none"[\s\S]*video_url: null/, "upload center must remove video metadata and restore the placeholder");
assert.match(courseUploadCenter, /video_provider: "uploaded_video"[\s\S]*video_url: publicUrl[\s\S]*select\("id, video_provider, video_url, video_title"\)/, "computer video upload must connect the uploaded Storage URL to the selected lesson and verify it");
assert.doesNotMatch(courseUploadCenter, /\.from\("lessons"\)\.insert\(/, "upload center must not create duplicate lessons when saving lesson video metadata");
assert.match(courseUploadCenter, /Video Upload/, "existing computer video upload card must remain available");
assert.match(courseUploadCenter, /PDF Notes/, "existing PDF upload card must remain available");
assert.match(courseUploadCenter, /PowerPoint Upload/, "existing PowerPoint upload card must remain available");
assert.match(courseUploadCenter, /Assignment Upload/, "existing assignment upload card must remain available");
assert.match(courseUploadCenter, /Course Thumbnail/, "existing course thumbnail upload card must remain available");
assert.match(courseUploadCenter, /const maxPreparedQuizQuestions = 20/, "upload center quiz builder must support up to 20 prepared questions");
assert.match(courseUploadCenter, /const requiredQuizOptionCount = 4/, "upload center quiz builder must keep exactly four answer options per question");
assert.match(courseUploadCenter, /function validatePreparedQuizQuestion/, "upload center quiz builder must use a dedicated validation function");
assert.match(courseUploadCenter, /preparedCount >= maxPreparedQuizQuestions/, "upload center quiz builder must prevent only the 20-question cap");
assert.doesNotMatch(courseUploadCenter, /preparedCount >= 4|questions\.length >= 4|current\.length >= 4/, "upload center quiz builder must not contain an accidental four-question cap");
assert.match(courseUploadCenter, /Enter exactly \$\{requiredQuizOptionCount\} answer options separated by commas\./, "malformed option sets must show a visible validation message");
assert.match(courseUploadCenter, /Correct answer must exactly match one of the listed options after prefix cleanup\./, "correct-answer matching must remain exact after normalization");
assert.match(courseUploadCenter, /setQuestions\(\(current\) => \[\.\.\.current, validation\.question\]\)/, "adding questions must append without replacing the prepared question array");
assert.match(courseUploadCenter, /Question \$\{questions\.length \+ 1\} prepared successfully\./, "adding 1, 4, 5, and later questions must surface a success message");
assert.match(courseUploadCenter, /\{questions\.map\(\(question, index\) =>/, "prepared questions must render before publish for preview verification");
assert.match(courseUploadCenter, /signed_url: JSON\.stringify\(\{ quizTitle: quizForm\.title, quiz_title: quizForm\.title, questions, passingScore: Number\(quizForm\.passingScore\) \}\)/, "publishing must save all prepared questions in the quiz payload");
assert.match(adminLmsManager, /const \[quizStatusMessage, setQuizStatusMessage\]/, "course editor quiz builder must show question-save success and error messages inside the quiz panel");
assert.match(adminLmsManager, /const \[savingQuizQuestion, setSavingQuizQuestion\]/, "course editor quiz builder must guard against duplicate question-save clicks");
assert.match(adminLmsManager, /\.insert\(withUrl\)\.select\("\*"\)\.single\(\)/, "course editor question inserts must read back the saved course_assets row");
assert.match(adminLmsManager, /\.eq\("id", editingQuestionId\)\.select\("\*"\)\.single\(\)/, "course editor question updates must read back the saved course_assets row");
assert.match(adminLmsManager, /Supabase did not return the saved question row/, "course editor quiz builder must treat missing insert read-back as a visible failure");
assert.match(adminLmsManager, /setQuizForm\(\(current\) => \(\{ \.\.\.current, prompt: "", options: "", correctAnswer: "", points: "1" \}\)\)/, "Save and Add Another must clear only question fields while preserving course, module, lesson, and title context");
assert.doesNotMatch(adminLmsManager, /prompt: addAnother \? "" : ""/, "Save Question must not use the old unconditional field-clearing expression");
assert.match(adminLmsManager, /disabled=\{savingQuizQuestion\} onClick=\{\(\) => saveQuizQuestion\(true\)\}/, "Save and Add Another must be disabled while a question save is in progress");
assert.match(lessonVideoPersistenceMigration, /alter table public\.lessons add column if not exists video_provider text/, "lesson video persistence migration must add missing provider column idempotently");
assert.match(lessonVideoPersistenceMigration, /grant update \([\s\S]*video_provider[\s\S]*video_url[\s\S]*video_duration_seconds[\s\S]*\) on public\.lessons to authenticated/, "lesson video persistence migration must grant only required update columns");
assert.match(lessonVideoPersistenceMigration, /create policy "AFF admins can update lesson video metadata"[\s\S]*for update[\s\S]*using \(public\.is_aff_admin\(\)\)[\s\S]*with check \(public\.is_aff_admin\(\)\)/, "lesson video persistence migration must restrict lesson metadata updates to active AFF admins");
assert.doesNotMatch(lessonVideoPersistenceMigration, /grant insert|grant delete|for all/i, "lesson video persistence migration must not grant broad student lesson-edit permissions");

for (const [route, source] of [
  ["/admin/certifications", adminCertifications],
  ["/admin/live-classroom", adminLiveClassroom],
  ["/admin/enrollment", adminEnrollment],
  ["/admin/course-management", adminCourseManagement],
  ["/admin/course-management/upload-center", adminUploadCenter],
  ["/admin/command-center", adminCommandCenter],
  ["/student-directory", studentDirectoryPage],
  ["/admin/profile", adminProfile],
  ["/executive-command-center", executiveCommandCenter]
]) {
  assert.match(source, /AdminRouteAudit/, `${route} must display admin route authorization diagnostics`);
}

assert.doesNotMatch(adminCertifications, /redirect\("\/certifications"\)/, "/admin/certifications must not redirect through student-facing route alias");
assert.doesNotMatch(adminLiveClassroom, /redirect\("\/live-classroom"\)/, "/admin/live-classroom must not redirect through student-facing route alias");

console.log("AFF role access tests passed.");
