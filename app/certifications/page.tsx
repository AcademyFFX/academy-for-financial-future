"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, BadgeCheck, BookOpenCheck, CheckCircle2, Clock, FileQuestion, GraduationCap, Loader2, PenLine, QrCode, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type CatalogItem = {
  id: string;
  slug: string;
  certificateName: string;
  description: string;
  passingScore: number;
  status: string;
};

type ExamItem = {
  id: string;
  certificationId: string;
  examTitle: string;
  scheduledAt: string;
  timeLimitMinutes: number;
  maxAttempts: number;
  status: string;
};

type QuestionItem = {
  id: string;
  examId: string;
  questionType: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
  sortOrder: number;
  requiresManualReview: boolean;
};

type AttemptItem = {
  id: string;
  examId: string;
  certificationId: string;
  studentName: string;
  score: number;
  automaticScore: number;
  manualScore: number;
  attemptNumber: number;
  result: string;
  status: string;
  submittedAt: string;
  instructorComments: string;
};

type DigitalCertificate = {
  id: string;
  studentName: string;
  affStudentId: string;
  certificateName: string;
  issueDate: string;
  certificateNumber: string;
  qrVerificationCode: string;
  status: string;
};

type ReviewQueueItem = {
  id: string;
  attemptId: string;
  responseId: string;
  studentId: string;
  studentName: string;
  certificationName: string;
  examTitle: string;
  questionType: string;
  prompt: string;
  response: string;
  reviewStatus: string;
  manualScore: number | null;
  instructorComments: string;
};

const adminEmail = "acafffx@gmail.com";
const manualQuestionTypes = new Set(["Short Answer", "Chart Analysis", "Essay Response"]);

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function numberValue(row: DbRow, keys: string[], fallback = 0) {
  const parsed = Number(value(row, keys));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function shortDate(raw: string) {
  if (!raw) return "Not scheduled";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function normalizeOptions(raw: unknown) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeCatalog(row: DbRow): CatalogItem {
  return {
    id: value(row, ["id"]),
    slug: value(row, ["slug"]),
    certificateName: value(row, ["certificate_name"], "AFF Certificate"),
    description: value(row, ["description"], "Academy for Financial Future certification pathway."),
    passingScore: numberValue(row, ["passing_score"], 80),
    status: value(row, ["status"], "Active")
  };
}

function normalizeExam(row: DbRow): ExamItem {
  return {
    id: value(row, ["id"]),
    certificationId: value(row, ["certification_id"]),
    examTitle: value(row, ["exam_title"], "Certification Examination"),
    scheduledAt: value(row, ["scheduled_at"]),
    timeLimitMinutes: numberValue(row, ["time_limit_minutes"], 45),
    maxAttempts: numberValue(row, ["max_attempts"], 3),
    status: value(row, ["status"], "Available")
  };
}

function normalizeQuestion(row: DbRow): QuestionItem {
  return {
    id: value(row, ["id"]),
    examId: value(row, ["exam_id"]),
    questionType: value(row, ["question_type"], "Multiple Choice"),
    prompt: value(row, ["prompt"], "Certification question"),
    options: normalizeOptions(row.options),
    correctAnswer: value(row, ["correct_answer"]),
    points: numberValue(row, ["points"], 10),
    sortOrder: numberValue(row, ["sort_order"]),
    requiresManualReview: Boolean(row.requires_manual_review) || manualQuestionTypes.has(value(row, ["question_type"]))
  };
}

function normalizeAttempt(row: DbRow): AttemptItem {
  return {
    id: value(row, ["id"]),
    examId: value(row, ["exam_id"]),
    certificationId: value(row, ["certification_id"]),
    studentName: value(row, ["student_name"], "Student"),
    score: numberValue(row, ["score"]),
    automaticScore: numberValue(row, ["automatic_score"]),
    manualScore: numberValue(row, ["manual_score"]),
    attemptNumber: numberValue(row, ["attempt_number"], 1),
    result: value(row, ["result", "pass_fail"], "Pending Review"),
    status: value(row, ["status"], "Submitted"),
    submittedAt: value(row, ["submitted_at", "created_at"]),
    instructorComments: value(row, ["instructor_comments"])
  };
}

function normalizeCertificate(row: DbRow): DigitalCertificate {
  return {
    id: value(row, ["id"]),
    studentName: value(row, ["student_name"], "Student"),
    affStudentId: value(row, ["aff_student_id"]),
    certificateName: value(row, ["certificate_name"], "AFF Certificate"),
    issueDate: value(row, ["issue_date", "created_at"]),
    certificateNumber: value(row, ["certificate_number"]),
    qrVerificationCode: value(row, ["qr_verification_code"]),
    status: value(row, ["status"], "Valid")
  };
}

function normalizeReview(row: DbRow): ReviewQueueItem {
  return {
    id: value(row, ["id"]),
    attemptId: value(row, ["attempt_id"]),
    responseId: value(row, ["response_id"]),
    studentId: value(row, ["student_id"]),
    studentName: value(row, ["student_name"], "Student"),
    certificationName: value(row, ["certification_name"], "AFF Certification"),
    examTitle: value(row, ["exam_title"], "Certification Examination"),
    questionType: value(row, ["question_type"], "Essay Response"),
    prompt: value(row, ["prompt"]),
    response: value(row, ["response"]),
    reviewStatus: value(row, ["review_status"], "Pending Review"),
    manualScore: row.manual_score === null || row.manual_score === undefined ? null : Number(row.manual_score),
    instructorComments: value(row, ["instructor_comments"])
  };
}

function makeCertificateNumber() {
  const year = new Date().getFullYear();
  return `AFF-${year}-${String(Date.now()).slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
}

function makeVerificationCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

export default function CertificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AFF Certification and Examination Center...");
  const [userEmail, setUserEmail] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [affStudentId, setAffStudentId] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [certificates, setCertificates] = useState<DigitalCertificate[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { score: string; comments: string; status: string }>>({});

  const isAdmin = userEmail.toLowerCase() === adminEmail;

  const loadCenter = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      const profileResult = await supabase
        .from("students")
        .select("student_id, full_name, email")
        .eq("email", user.email ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const profile = (profileResult.data ?? {}) as DbRow;
      const resolvedName = value(profile, ["full_name"], user.user_metadata?.full_name ?? user.email ?? "Student");
      const resolvedStudentId = value(profile, ["student_id"], user.id);
      setStudentName(resolvedName);
      setAffStudentId(resolvedStudentId);

      const [catalogResult, examsResult, questionsResult, attemptsResult, certificatesResult, reviewResult] = await Promise.all([
        supabase.from("certification_catalog").select("*").order("sort_order", { ascending: true }),
        supabase.from("certification_exams").select("*").order("created_at", { ascending: true }),
        supabase.from("certification_exam_questions").select("*").order("sort_order", { ascending: true }),
        supabase.from("certification_exam_attempts").select("*").order("submitted_at", { ascending: false }),
        supabase.from("digital_certificates").select("*").order("issue_date", { ascending: false }),
        supabase.from("certification_review_queue").select("*").order("created_at", { ascending: false })
      ]);

      for (const result of [catalogResult, examsResult, questionsResult, attemptsResult, certificatesResult]) {
        if (result.error) throw result.error;
      }

      const normalizedCatalog = ((catalogResult.data ?? []) as DbRow[]).map(normalizeCatalog);
      const normalizedExams = ((examsResult.data ?? []) as DbRow[]).map(normalizeExam);
      setCatalog(normalizedCatalog);
      setExams(normalizedExams);
      setQuestions(((questionsResult.data ?? []) as DbRow[]).map(normalizeQuestion));
      setAttempts(((attemptsResult.data ?? []) as DbRow[]).map(normalizeAttempt));
      setCertificates(((certificatesResult.data ?? []) as DbRow[]).map(normalizeCertificate));

      if (!reviewResult.error) {
        const normalizedReviews = ((reviewResult.data ?? []) as DbRow[]).map(normalizeReview);
        setReviewQueue(normalizedReviews);
        setReviewDrafts(Object.fromEntries(normalizedReviews.map((item) => [
          item.id,
          {
            score: item.manualScore === null ? "" : String(item.manualScore),
            comments: item.instructorComments,
            status: item.reviewStatus
          }
        ])));
      }

      if (!selectedExamId && normalizedExams.length > 0) setSelectedExamId(normalizedExams[0].id);
      setMessage("Certification center ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load certification center.");
    } finally {
      setLoading(false);
    }
  }, [router, selectedExamId]);

  useEffect(() => {
    loadCenter();
  }, [loadCenter]);

  const selectedExam = exams.find((exam) => exam.id === selectedExamId);
  const selectedCatalog = selectedExam ? catalog.find((item) => item.id === selectedExam.certificationId) : undefined;
  const selectedQuestions = questions.filter((question) => question.examId === selectedExamId).sort((a, b) => a.sortOrder - b.sortOrder);
  const completedAttempts = attempts.filter((attempt) => attempt.result !== "Pending Review");
  const scheduledExams = exams.filter((exam) => exam.status === "Scheduled");
  const availableExams = exams.filter((exam) => exam.status === "Available" || exam.status === "Scheduled");
  const passedAttempts = attempts.filter((attempt) => attempt.result === "Pass");
  const inReviewCount = attempts.filter((attempt) => attempt.result === "Pending Review").length;

  const attemptsByExam = useMemo(() => {
    const map = new Map<string, AttemptItem[]>();
    for (const attempt of attempts) {
      map.set(attempt.examId, [...(map.get(attempt.examId) ?? []), attempt]);
    }
    return map;
  }, [attempts]);

  async function issueCertificate(params: {
    certificationId: string;
    certificateName: string;
    studentId: string;
    studentName: string;
    affStudentId: string;
  }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("digital_certificates")
      .insert({
        student_id: params.studentId,
        student_name: params.studentName,
        aff_student_id: params.affStudentId,
        certification_id: params.certificationId,
        certificate_name: params.certificateName,
        issue_date: new Date().toISOString().slice(0, 10),
        certificate_number: makeCertificateNumber(),
        qr_verification_code: makeVerificationCode(),
        verification_url: "/verify-certificate",
        status: "Valid"
      })
      .select("*")
      .single();

    if (error) throw error;
    setCertificates((current) => [normalizeCertificate(data as DbRow), ...current]);
  }

  async function submitExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam || !selectedCatalog || selectedQuestions.length === 0) {
      setMessage("Select an available exam with questions before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("Submitting certification exam...");

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");

      const priorAttempts = attemptsByExam.get(selectedExam.id)?.length ?? 0;
      if (priorAttempts >= selectedExam.maxAttempts) {
        setMessage(`Maximum attempts reached for ${selectedExam.examTitle}.`);
        return;
      }

      const totalPoints = selectedQuestions.reduce((total, question) => total + question.points, 0);
      let automaticPoints = 0;
      const hasManualReview = selectedQuestions.some((question) => question.requiresManualReview);

      const responsePayloads = selectedQuestions.map((question) => {
        const response = (answers[question.id] ?? "").trim();
        const autoGraded = question.questionType === "Multiple Choice" || question.questionType === "True/False";
        const isCorrect = autoGraded && response.toLowerCase() === question.correctAnswer.toLowerCase();
        const autoPoints = isCorrect ? question.points : 0;
        automaticPoints += autoPoints;
        return {
          question,
          payload: {
            question_id: question.id,
            question_type: question.questionType,
            response,
            auto_correct: autoGraded ? isCorrect : null,
            auto_points: autoPoints,
            manual_points: question.requiresManualReview ? null : 0,
            instructor_comments: null
          }
        };
      });

      const automaticScore = totalPoints ? Math.round((automaticPoints / totalPoints) * 100) : 0;
      const finalResult = hasManualReview ? "Pending Review" : automaticScore >= selectedCatalog.passingScore ? "Pass" : "Fail";

      const { data: attemptData, error: attemptError } = await supabase
        .from("certification_exam_attempts")
        .insert({
          student_id: user.id,
          student_name: studentName,
          student_email: user.email,
          aff_student_id: affStudentId,
          exam_id: selectedExam.id,
          certification_id: selectedCatalog.id,
          score: automaticScore,
          automatic_score: automaticScore,
          manual_score: 0,
          attempt_number: priorAttempts + 1,
          result: finalResult,
          pass_fail: finalResult,
          status: hasManualReview ? "Pending Review" : "Completed",
          submitted_at: new Date().toISOString()
        })
        .select("*")
        .single();

      if (attemptError) throw attemptError;
      const attempt = normalizeAttempt(attemptData as DbRow);

      const { data: responseData, error: responseError } = await supabase
        .from("certification_exam_responses")
        .insert(responsePayloads.map(({ payload }) => ({ ...payload, attempt_id: attempt.id })))
        .select("*");

      if (responseError) throw responseError;

      const manualReviews = responsePayloads
        .map(({ question, payload }, index) => ({
          question,
          payload,
          responseId: value(((responseData ?? []) as DbRow[])[index] ?? {}, ["id"])
        }))
        .filter((item) => item.question.requiresManualReview);

      if (manualReviews.length > 0) {
        const { error: reviewError } = await supabase.from("certification_review_queue").insert(
          manualReviews.map((item) => ({
            attempt_id: attempt.id,
            response_id: item.responseId || null,
            student_id: user.id,
            student_name: studentName,
            certification_name: selectedCatalog.certificateName,
            exam_title: selectedExam.examTitle,
            question_type: item.question.questionType,
            prompt: item.question.prompt,
            response: item.payload.response,
            review_status: "Pending Review"
          }))
        );
        if (reviewError) throw reviewError;
      } else if (finalResult === "Pass") {
        await issueCertificate({
          certificationId: selectedCatalog.id,
          certificateName: selectedCatalog.certificateName,
          studentId: user.id,
          studentName,
          affStudentId
        });
      }

      setAnswers({});
      setAttempts((current) => [attempt, ...current]);
      setMessage(hasManualReview ? "Exam submitted. Essay and chart analysis responses are waiting for instructor review." : `Exam submitted. Result: ${finalResult}.`);
      await loadCenter();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit certification exam.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveManualReview(item: ReviewQueueItem) {
    const draft = reviewDrafts[item.id];
    const manualScore = Number(draft?.score ?? "");
    if (!Number.isFinite(manualScore) || manualScore < 0 || manualScore > 100) {
      setMessage("Manual review score must be between 0 and 100.");
      return;
    }

    setMessage("Saving instructor review...");
    try {
      const supabase = createClient();
      const comments = draft?.comments?.trim() ?? "";
      const status = draft?.status ?? "Reviewed";

      const { error: responseError } = await supabase
        .from("certification_exam_responses")
        .update({ manual_points: manualScore, instructor_comments: comments })
        .eq("id", item.responseId);
      if (responseError) throw responseError;

      const { error: queueError } = await supabase
        .from("certification_review_queue")
        .update({
          manual_score: manualScore,
          instructor_comments: comments,
          review_status: status,
          reviewed_by: adminEmail,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", item.id);
      if (queueError) throw queueError;

      const relatedReviews = reviewQueue.filter((review) => review.attemptId === item.attemptId);
      const allReviewed = relatedReviews.every((review) => review.id === item.id || review.reviewStatus !== "Pending Review");
      if (allReviewed && status !== "Returned") {
        const attempt = attempts.find((entry) => entry.id === item.attemptId);
        const finalScore = Math.round(((attempt?.automaticScore ?? 0) + manualScore) / 2);
        const catalogItem = attempt ? catalog.find((entry) => entry.id === attempt.certificationId) : undefined;
        const passed = finalScore >= (catalogItem?.passingScore ?? 80);

        const { error: attemptError } = await supabase
          .from("certification_exam_attempts")
          .update({
            score: finalScore,
            manual_score: manualScore,
            result: passed ? "Pass" : "Fail",
            pass_fail: passed ? "Pass" : "Fail",
            status: passed ? "Certification Approved" : "Completed",
            reviewed_by: adminEmail,
            reviewed_at: new Date().toISOString(),
            instructor_comments: comments
          })
          .eq("id", item.attemptId);
        if (attemptError) throw attemptError;

        if (passed && attempt && catalogItem) {
          await issueCertificate({
            certificationId: catalogItem.id,
            certificateName: catalogItem.certificateName,
            studentId: item.studentId,
            studentName: attempt.studentName,
            affStudentId
          });
        }
      }

      setMessage("Instructor review saved.");
      await loadCenter();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save instructor review.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Certification and Examination Center"
        title="Certification, exams, and digital credentials."
        text="Students complete timed exams, receive automatic grading for objective questions, submit essay and chart analysis responses for instructor review, and earn verifiable AFF digital certificates."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-xs uppercase tracking-[.18em] text-gold-300">{studentName} · {affStudentId || "Student ID pending"}</p>
            </div>
            <Link href="/verify-certificate" className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 text-sm font-semibold text-gold-300">
              <QrCode size={18} /> Verify Certificate
            </Link>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Award size={22} />} label="Certifications Earned" value={String(certificates.length)} />
            <Metric icon={<ShieldCheck size={22} />} label="Exams Passed" value={String(passedAttempts.length)} />
            <Metric icon={<Clock size={22} />} label="Pending Reviews" value={String(inReviewCount)} />
            <Metric icon={<BookOpenCheck size={22} />} label="Available Exams" value={String(availableExams.length)} />
          </section>

          <section className="terminal-panel p-5">
            <h2 className="text-2xl font-semibold text-white">Certification Catalog</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {catalog.map((item) => {
                const itemExam = exams.find((exam) => exam.certificationId === item.id);
                const earned = certificates.some((certificate) => certificate.certificateName === item.certificateName);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => itemExam && setSelectedExamId(itemExam.id)}
                    className={`border p-5 text-left transition ${selectedExamId === itemExam?.id ? "border-gold-300 bg-gold-500/10" : "border-gold-500/20 bg-navy-950 hover:border-gold-400/60"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <GraduationCap className="text-gold-300" size={24} />
                      <span className="border border-gold-500/25 px-2 py-1 text-[11px] uppercase tracking-[.14em] text-gold-300">{earned ? "Earned" : item.status}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">{item.certificateName}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{item.description}</p>
                    <p className="mt-4 text-xs uppercase tracking-[.18em] text-gold-300">Passing score: {item.passingScore}%</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid gap-8 xl:grid-cols-[.9fr_1.1fr]">
            <div className="terminal-panel p-5">
              <h2 className="text-xl font-semibold text-white">Student Exam Portal</h2>
              <div className="mt-5 grid gap-4">
                <PortalList title="Available Exams" items={availableExams.map((exam) => `${exam.examTitle} · ${exam.timeLimitMinutes} min · ${exam.maxAttempts} attempts`)} />
                <PortalList title="Scheduled Exams" items={scheduledExams.map((exam) => `${exam.examTitle} · ${shortDate(exam.scheduledAt)}`)} />
                <PortalList title="Completed Exams" items={completedAttempts.map((attempt) => `${attempt.result} · ${attempt.score}% · ${shortDate(attempt.submittedAt)}`)} />
                <PortalList title="Certification Status" items={certificates.length ? certificates.map((certificate) => `${certificate.certificateName} · ${certificate.status}`) : ["In progress"]} />
              </div>
            </div>

            <form className="terminal-panel p-5" onSubmit={submitExam}>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="grid gap-2 text-sm text-ink/74">
                  Select examination
                  <select className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)}>
                    {exams.map((exam) => (
                      <option key={exam.id} value={exam.id}>{exam.examTitle}</option>
                    ))}
                  </select>
                </label>
                <div className="border border-gold-500/20 bg-navy-950 px-4 py-3 text-sm text-gold-300">
                  {selectedCatalog ? `${selectedCatalog.passingScore}% required` : "Select exam"}
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {selectedQuestions.length === 0 ? (
                  <p className="text-sm text-ink/68">No questions found. Run the certification migration in Supabase SQL Editor to seed the exam bank.</p>
                ) : (
                  selectedQuestions.map((question, index) => (
                    <QuestionField
                      key={question.id}
                      index={index}
                      question={question}
                      value={answers[question.id] ?? ""}
                      onChange={(nextValue) => setAnswers((current) => ({ ...current, [question.id]: nextValue }))}
                    />
                  ))
                )}
              </div>

              <button className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" disabled={submitting || loading} type="submit">
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <FileQuestion size={18} />} Submit Certification Exam
              </button>
            </form>
          </section>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <h2 className="text-xl font-semibold text-white">Digital Certificates</h2>
            </div>
            {certificates.length === 0 ? (
              <p className="p-5 text-sm text-ink/68">No digital certificates issued yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/15 md:grid-cols-2">
                {certificates.map((certificate) => (
                  <article key={certificate.id} className="bg-navy-950 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[.2em] text-gold-300">Digital Credential</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{certificate.certificateName}</h3>
                        <p className="mt-2 text-sm text-ink/64">{certificate.studentName} · {certificate.affStudentId}</p>
                      </div>
                      <VerificationMark code={certificate.qrVerificationCode} />
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <Mini label="Certificate Number" value={certificate.certificateNumber} />
                      <Mini label="Issue Date" value={shortDate(certificate.issueDate)} />
                      <Mini label="QR Verification Code" value={certificate.qrVerificationCode} />
                      <Mini label="Status" value={certificate.status} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {isAdmin ? (
            <section className="terminal-panel p-5">
              <h2 className="text-xl font-semibold text-white">Admin Certification Center</h2>
              <p className="mt-2 text-sm text-ink/68">Manage exams, questions, certificates, and instructor grading queue.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <Metric icon={<FileQuestion size={20} />} label="Exams" value={String(exams.length)} />
                <Metric icon={<PenLine size={20} />} label="Questions" value={String(questions.length)} />
                <Metric icon={<Award size={20} />} label="Certificates" value={String(certificates.length)} />
                <Metric icon={<Clock size={20} />} label="Review Queue" value={String(reviewQueue.length)} />
              </div>
              <div className="mt-6 grid gap-4">
                {reviewQueue.length === 0 ? (
                  <p className="text-sm text-ink/68">No essay or chart analysis responses waiting for review.</p>
                ) : (
                  reviewQueue.map((item) => (
                    <article key={item.id} className="border border-gold-500/20 bg-navy-950 p-4">
                      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                        <div>
                          <p className="text-xs uppercase tracking-[.2em] text-gold-300">{item.reviewStatus} · {item.questionType}</p>
                          <h3 className="mt-2 font-semibold text-white">{item.studentName} · {item.certificationName}</h3>
                          <p className="mt-3 text-sm leading-6 text-ink/68">{item.prompt}</p>
                          <p className="mt-3 border border-gold-500/14 bg-navy-900 p-3 text-sm leading-6 text-ink/78">{item.response || "No response submitted."}</p>
                        </div>
                        <div className="grid gap-3">
                          <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" placeholder="Manual score 0-100" value={reviewDrafts[item.id]?.score ?? ""} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.id]: { ...(current[item.id] ?? { comments: "", status: "Reviewed" }), score: event.target.value } }))} />
                          <select className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={reviewDrafts[item.id]?.status ?? item.reviewStatus} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.id]: { ...(current[item.id] ?? { score: "", comments: "" }), status: event.target.value } }))}>
                            <option>Reviewed</option>
                            <option>Approved</option>
                            <option>Returned</option>
                          </select>
                          <textarea className="min-h-24 border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" placeholder="Instructor comments" value={reviewDrafts[item.id]?.comments ?? ""} onChange={(event) => setReviewDrafts((current) => ({ ...current, [item.id]: { ...(current[item.id] ?? { score: "", status: "Reviewed" }), comments: event.target.value } }))} />
                          <button className="bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950" type="button" onClick={() => saveManualReview(item)}>
                            Save Manual Grade
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </article>
  );
}

function PortalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.length === 0 ? <p className="text-sm text-ink/54">No records yet.</p> : items.map((item) => <p key={item} className="text-sm text-ink/68">{item}</p>)}
      </div>
    </div>
  );
}

function QuestionField({ index, question, value, onChange }: { index: number; question: QuestionItem; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="border border-gold-500/20 bg-navy-950 p-4">
      <legend className="px-2 text-xs uppercase tracking-[.18em] text-gold-300">{index + 1}. {question.questionType} · {question.points} pts</legend>
      <p className="mt-3 font-semibold leading-7 text-white">{question.prompt}</p>
      {question.options.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {question.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 border border-gold-500/14 bg-navy-900 px-3 py-2 text-sm text-ink/76">
              <input type="radio" name={question.id} value={option} checked={value === option} onChange={() => onChange(option)} />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <textarea className="mt-4 min-h-28 w-full border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter your response..." />
      )}
    </fieldset>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-900 p-3">
      <p className="text-[10px] uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value || "Pending"}</p>
    </div>
  );
}

function VerificationMark({ code }: { code: string }) {
  return (
    <div className="grid h-16 w-16 shrink-0 grid-cols-4 gap-1 border border-gold-500/30 bg-cream p-1" aria-label={`QR verification code ${code}`}>
      {Array.from({ length: 16 }).map((_, index) => (
        <span key={index} className={(code.charCodeAt(index % Math.max(code.length, 1)) + index) % 3 === 0 ? "bg-navy-950" : "bg-gold-500"} />
      ))}
    </div>
  );
}
