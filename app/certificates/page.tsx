"use client";

import { useRouter } from "next/navigation";
import { Award, CheckCircle2, Download, LockKeyhole, QrCode, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { ProgressBar } from "@/components/progress";
import { courseCatalog } from "@/lib/course-catalog";
import { createCertificatePdfBlob } from "@/lib/certificate-pdf";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type Certificate = {
  id: string;
  certificate_number: string;
  student_id: string;
  student_name: string;
  course_name: string;
  score: number;
  issue_date: string;
  completion_date: string | null;
  verification_code: string;
  qr_payload: string | null;
};

type CertificateRow = Partial<Certificate>;

type Eligibility = {
  requiredLessons: number;
  completedLessons: number;
  requiredAssignments: number;
  approvedAssignments: number;
  hasPassingExam: boolean;
  score: number;
  eligible: boolean;
};

const certificationCourse = courseCatalog.find((course) => course.id === "forex-anatomy") ?? courseCatalog[0];
const examTitle = "Level 1 Forex Anatomy";

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [studentName, setStudentName] = useState("Student");
  const [affStudentId, setAffStudentId] = useState("Student ID pending");
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState("Certification unlocks after required lessons, quiz, and approved assignments are complete.");

  const eligibilityPercent = useMemo(() => {
    if (!eligibility) return 0;
    const lessonRatio = eligibility.requiredLessons ? eligibility.completedLessons / eligibility.requiredLessons : 0;
    const assignmentRatio = eligibility.requiredAssignments ? eligibility.approvedAssignments / eligibility.requiredAssignments : 0;
    const examRatio = eligibility.hasPassingExam ? 1 : 0;
    return Math.round(((lessonRatio + assignmentRatio + examRatio) / 3) * 100);
  }, [eligibility]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeCertificate(row: CertificateRow): Certificate {
    return {
      id: String(row.id ?? crypto.randomUUID()),
      certificate_number: String(row.certificate_number ?? ""),
      student_id: String(row.student_id ?? ""),
      student_name: String(row.student_name ?? "Student"),
      course_name: String(row.course_name ?? certificationCourse.title),
      score: Number(row.score ?? 0),
      issue_date: row.issue_date ?? new Date().toISOString().slice(0, 10),
      completion_date: row.completion_date ?? row.issue_date ?? null,
      verification_code: String(row.verification_code ?? ""),
      qr_payload: row.qr_payload ?? null
    };
  }

  function createVerificationCode() {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  }

  function createCertificateNumber() {
    const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
    return `AFF-2026-${suffix}`;
  }

  const loadCertification = useCallback(async () => {
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

      const [studentResult, applicationResult] = await Promise.all([
        supabase
          .from("students")
          .select("student_id, auth_user_id, full_name, email")
          .or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("student_applications")
          .select("student_id, auth_user_id, email")
          .or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      const profile = (studentResult.data ?? {}) as DbRow;
      const application = (applicationResult.data ?? {}) as DbRow;
      const resolvedName =
        typeof profile?.full_name === "string" && profile.full_name.trim().length > 0
          ? profile.full_name
          : typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
            ? user.user_metadata.name
            : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
              ? user.user_metadata.full_name
              : user.email ?? "Student";

      setStudentName(resolvedName);
      setAffStudentId(String(application.student_id ?? profile.student_id ?? "Student ID pending"));

      const [certificatesResult, progressResult, examsResult, assignmentsResult] = await Promise.all([
        supabase
          .from("certificates")
          .select("*")
          .eq("student_id", user.id)
          .order("issue_date", { ascending: false }),
        supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("student_id", user.id)
          .eq("course_id", certificationCourse.id),
        supabase
          .from("exams")
          .select("score")
          .eq("student_id", user.id)
          .eq("exam_title", examTitle)
          .gte("score", 80)
          .order("submitted_at", { ascending: false })
          .limit(1),
        supabase
          .from("assignments")
          .select("lesson_id, lesson_title, status")
          .eq("student_id", user.id)
          .eq("status", "Approved")
      ]);

      for (const result of [certificatesResult, progressResult, examsResult, assignmentsResult]) {
        if (result.error) throw result.error;
      }

      const completedLessonIds = new Set((progressResult.data ?? []).map((row) => String(row.lesson_id)));
      const approvedLessonKeys = new Set(
        (assignmentsResult.data ?? []).flatMap((row) => [String(row.lesson_id), String(row.lesson_title ?? "")])
      );
      const completedLessons = certificationCourse.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length;
      const approvedAssignments = certificationCourse.lessons.filter((lesson) => approvedLessonKeys.has(String(lesson.dbId)) || approvedLessonKeys.has(lesson.title)).length;
      const score = Number(examsResult.data?.[0]?.score ?? 0);

      const nextEligibility = {
        requiredLessons: certificationCourse.lessons.length,
        completedLessons,
        requiredAssignments: certificationCourse.lessons.length,
        approvedAssignments,
        hasPassingExam: score >= 80,
        score,
        eligible: completedLessons === certificationCourse.lessons.length && approvedAssignments === certificationCourse.lessons.length && score >= 80
      };

      const normalized = ((certificatesResult.data ?? []) as CertificateRow[]).map(normalizeCertificate);
      setCertificates(normalized);
      setEligibility(nextEligibility);

      const hasCourseCertificate = normalized.some((certificate) => certificate.course_name === certificationCourse.title);
      if (nextEligibility.eligible && !hasCourseCertificate) {
        await issueCertificate(user.id, resolvedName, nextEligibility.score, true);
      } else {
        setMessage(nextEligibility.eligible ? "Certification unlocked. Certificate is ready." : "Complete all certification requirements to unlock your certificate.");
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load certification status."));
    } finally {
      setLoading(false);
    }
  // Automatic issuance intentionally calls the current certificate creator after eligibility is computed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    loadCertification();
  }, [loadCertification]);

  async function issueCertificate(userId?: string, name = studentName, score = eligibility?.score ?? 100, automatic = false) {
    setIssuing(true);
    setMessage(automatic ? "Certification complete. Issuing certificate..." : "Checking eligibility and issuing certificate...");

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const activeUserId = userId ?? user?.id;

      if (!activeUserId) {
        router.replace("/login");
        return;
      }

      if (!automatic && !eligibility?.eligible) {
        setMessage("Certification is locked until all lessons, quiz, and assignments are complete.");
        return;
      }

      const certificateNumber = createCertificateNumber();
      const verificationCode = createVerificationCode();
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
      const qrPayload = `${siteUrl}/verify?certificate=${encodeURIComponent(certificateNumber)}&code=${encodeURIComponent(verificationCode)}`;

      const payload = {
        certificate_number: certificateNumber,
        student_id: activeUserId,
        student_name: name,
        course_name: certificationCourse.title,
        score,
        issue_date: new Date().toISOString().slice(0, 10),
        completion_date: new Date().toISOString().slice(0, 10),
        verification_code: verificationCode,
        qr_payload: qrPayload,
        instructor_name: "Dr. Jean Rene Moricette"
      };

      const { data, error } = await supabase
        .from("certificates")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setCertificates((current) => [normalizeCertificate(data as CertificateRow), ...current]);
      setMessage("Certificate issued successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to issue certificate."));
    } finally {
      setIssuing(false);
    }
  }

  function downloadCertificate(certificate: Certificate) {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
    const verificationUrl = certificate.qr_payload ?? `${siteUrl}/verify?certificate=${encodeURIComponent(certificate.certificate_number)}&code=${encodeURIComponent(certificate.verification_code)}`;
    const blob = createCertificatePdfBlob(certificate, verificationUrl);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificate.certificate_number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        eyebrow="Certificates"
        title="Certification unlocks through verified completion."
        text="Complete all required Forex Anatomy lessons, pass the certification quiz, and receive approval on lesson assignments to generate a verified Academy certificate."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <div className="terminal-panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[.24em] text-gold-300">Certification Readiness</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{certificationCourse.title}</h2>
                <p className="mt-2 text-xs uppercase tracking-[.18em] text-gold-300">{studentName} · {affStudentId}</p>
                <p className="mt-3 text-sm text-ink/70">{message}</p>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-5 py-3 font-semibold text-gold-300 disabled:opacity-50"
                type="button"
                onClick={() => issueCertificate()}
                disabled={issuing || !eligibility?.eligible}
              >
                {eligibility?.eligible ? <Award size={18} /> : <LockKeyhole size={18} />}
                {issuing ? "Issuing..." : eligibility?.eligible ? "Issue Certificate" : "Locked"}
              </button>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm text-ink/72">
                <span>{eligibilityPercent}% complete</span>
                <span className="text-gold-300">{eligibility?.eligible ? "Unlocked" : "In Progress"}</span>
              </div>
              <ProgressBar value={eligibilityPercent} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <RequirementCard label="Required Lessons" value={`${eligibility?.completedLessons ?? 0}/${eligibility?.requiredLessons ?? certificationCourse.lessons.length}`} ready={Boolean(eligibility && eligibility.completedLessons === eligibility.requiredLessons)} />
              <RequirementCard label="Certification Quiz" value={eligibility?.hasPassingExam ? `${eligibility.score}% Pass` : "Pass required"} ready={Boolean(eligibility?.hasPassingExam)} />
              <RequirementCard label="Approved Assignments" value={`${eligibility?.approvedAssignments ?? 0}/${eligibility?.requiredAssignments ?? certificationCourse.lessons.length}`} ready={Boolean(eligibility && eligibility.approvedAssignments === eligibility.requiredAssignments)} />
            </div>
          </div>

          {loading ? (
            <div className="terminal-panel p-6 text-ink/72">Loading certificates...</div>
          ) : certificates.length === 0 ? (
            <div className="terminal-panel p-8 text-center shadow-gold">
              <LockKeyhole className="mx-auto text-gold-300" size={48} />
              <h2 className="mt-5 font-serif text-3xl font-semibold text-white">No certificates issued yet.</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-8 text-ink/74">Your certificate will unlock automatically when every requirement is verified.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {certificates.map((certificate) => (
                <article key={certificate.id} className="terminal-panel p-6 shadow-gold">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[.28em] text-gold-300">Verified Certificate</p>
                      <h2 className="mt-4 font-serif text-3xl font-semibold text-white">{certificate.course_name}</h2>
                    </div>
                    <QrCode className="shrink-0 text-gold-300" size={34} />
                  </div>
                  <div className="gold-rule my-6" />
                  <div className="grid gap-3 text-sm text-ink/76">
                    <p><span className="text-gold-300">Student:</span> {certificate.student_name}</p>
                    <p><span className="text-gold-300">Completion Date:</span> {new Date(certificate.completion_date ?? certificate.issue_date).toLocaleDateString()}</p>
                    <p><span className="text-gold-300">Issued:</span> {new Date(certificate.issue_date).toLocaleDateString()}</p>
                    <p><span className="text-gold-300">Certificate ID:</span> {certificate.certificate_number}</p>
                    <p><span className="text-gold-300">Verification Code:</span> {certificate.verification_code}</p>
                    <p><span className="text-gold-300">Instructor:</span> Dr. Jean Rene Moricette</p>
                  </div>
                  <button
                    className="mt-6 inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950"
                    type="button"
                    onClick={() => downloadCertificate(certificate)}
                  >
                    <Download size={18} /> Download PDF Certificate
                  </button>
                </article>
              ))}
            </div>
          )}
        </SectionInner>
      </Section>
    </>
  );
}

function RequirementCard({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="border border-gold-500/20 bg-navy-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{label}</p>
        <CheckCircle2 className={ready ? "text-gold-300" : "text-ink/30"} size={19} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-gold-300">{value}</p>
    </div>
  );
}
