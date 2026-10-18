"use client";

import { useRouter } from "next/navigation";
import { Award, CheckCircle2, Download, LockKeyhole, QrCode, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { ProgressBar } from "@/components/progress";
import { createCertificatePdfBlob } from "@/lib/certificate-pdf";
import { calculateCertificationReadiness, resolveForexFoundationsCourse } from "@/lib/certification-readiness";
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
  exam_attempt_id: string | null;
  integrity_verified: boolean;
  issuance_source: string | null;
  instructor_name: string;
  registry: "legacy" | "digital";
};

type Eligibility = {
  activeEnrollment: boolean;
  requiredLessons: number;
  completedLessons: number;
  requiredAssignments: number;
  approvedAssignments: number;
  hasPassingExam: boolean;
  passingAttemptId: string;
  score: number;
  eligible: boolean;
};

const certificationCourseName = "Forex Foundations";
const certificationSlug = "forex-foundations";

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [studentName, setStudentName] = useState("Student");
  const [affStudentId, setAffStudentId] = useState("Student ID pending");
  const [courseName, setCourseName] = useState(certificationCourseName);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState("Certification unlocks after required lessons, quiz, and approved assignments are complete.");

  const eligibilityPercent = useMemo(() => {
    if (!eligibility) return 0;
    const lessonRatio = eligibility.requiredLessons ? eligibility.completedLessons / eligibility.requiredLessons : 0;
    const assignmentRatio = eligibility.requiredAssignments ? eligibility.approvedAssignments / eligibility.requiredAssignments : 1;
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

  function normalizeCertificate(row: DbRow, registry: Certificate["registry"] = "legacy"): Certificate {
    return {
      id: String(row.id ?? crypto.randomUUID()),
      certificate_number: String(row.certificate_number ?? ""),
      student_id: String(row.student_id ?? ""),
      student_name: String(row.student_name ?? "Student"),
      course_name: String(row.course_name ?? row.certificate_name ?? certificationCourseName),
      score: Number(row.score ?? 0),
      issue_date: String(row.issue_date ?? new Date().toISOString().slice(0, 10)),
      completion_date: row.completion_date ? String(row.completion_date) : row.issue_date ? String(row.issue_date) : null,
      verification_code: String(row.verification_code ?? row.qr_verification_code ?? ""),
      qr_payload: row.qr_payload ? String(row.qr_payload) : null,
      exam_attempt_id: row.exam_attempt_id === null || row.exam_attempt_id === undefined ? null : String(row.exam_attempt_id),
      integrity_verified: row.integrity_verified === true,
      issuance_source: row.issuance_source ? String(row.issuance_source) : null,
      instructor_name: String(row.approved_by ?? row.instructor_name ?? "Dr. Jean Rene Moricette"),
      registry
    };
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
          .select("id, student_id, auth_user_id, full_name, email")
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

      if (studentResult.error) throw studentResult.error;
      if (applicationResult.error) throw applicationResult.error;

      const [courseResult, catalogResult] = await Promise.all([
        supabase.from("courses").select("*").ilike("course_name", certificationCourseName).limit(1).maybeSingle(),
        supabase.from("certification_catalog").select("*").eq("slug", certificationSlug).limit(1).maybeSingle()
      ]);
      if (courseResult.error) throw courseResult.error;
      if (catalogResult.error) throw catalogResult.error;

      const { course, catalogItem } = resolveForexFoundationsCourse(
        courseResult.data ? [courseResult.data as DbRow] : [],
        catalogResult.data ? [catalogResult.data as DbRow] : []
      );
      if (!course) throw new Error("Forex Foundations is not available in the Academy course catalog.");
      if (!catalogItem) throw new Error("Forex Foundations certification is not seeded. Run the certification repair migration in Supabase SQL Editor.");

      const courseId = String(course.id);
      const certificationId = String(catalogItem.id);
      const internalStudentId = String(profile.id ?? "");
      if (!internalStudentId) throw new Error("Your Academy student record could not be matched to certification readiness.");
      setCourseName(String(course.course_name ?? certificationCourseName));

      const [certificatesResult, digitalCertificatesResult, enrollmentsResult, lessonsResult, progressResult, definitionsResult, assignmentsResult, attemptsResult] = await Promise.all([
        supabase
          .from("certificates")
          .select("*")
          .eq("student_id", user.id)
          .order("issue_date", { ascending: false }),
        supabase
          .from("digital_certificates")
          .select("*")
          .eq("student_id", user.id)
          .eq("certification_id", certificationId)
          .eq("status", "Valid")
          .order("issue_date", { ascending: false }),
        supabase.from("enrollments").select("*").eq("student_id", internalStudentId).eq("course_id", courseId),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("lesson_order", { ascending: true }),
        supabase
          .from("lesson_progress")
          .select("*")
          .eq("student_id", user.id)
          .eq("course_id", courseId),
        supabase.from("course_assets").select("*").eq("course_id", courseId).eq("asset_type", "Assignment"),
        supabase
          .from("assignments")
          .select("*")
          .eq("student_id", user.id)
          .eq("course_id", courseId),
        supabase.from("certification_exam_attempts").select("*").eq("student_id", user.id).eq("certification_id", certificationId).order("submitted_at", { ascending: false })
      ]);

      for (const result of [certificatesResult, digitalCertificatesResult, enrollmentsResult, lessonsResult, progressResult, definitionsResult, assignmentsResult, attemptsResult]) {
        if (result.error) throw result.error;
      }

      const nextEligibility = calculateCertificationReadiness({
        courseId,
        certificationId,
        enrollmentRows: (enrollmentsResult.data ?? []) as DbRow[],
        lessons: (lessonsResult.data ?? []) as DbRow[],
        progressRows: (progressResult.data ?? []) as DbRow[],
        assignmentDefinitions: (definitionsResult.data ?? []) as DbRow[],
        assignmentSubmissions: (assignmentsResult.data ?? []) as DbRow[],
        attempts: (attemptsResult.data ?? []) as DbRow[],
        minimumPassingScore: Number(catalogItem.passing_score ?? 80)
      });

      const legacyCertificates = ((certificatesResult.data ?? []) as DbRow[]).map((row) => normalizeCertificate(row));
      const digitalCertificates = ((digitalCertificatesResult.data ?? []) as DbRow[]).map((row) => ({
        ...normalizeCertificate(row, "digital"),
        score: Number(row.score ?? nextEligibility.score)
      }));
      const normalized = [...digitalCertificates, ...legacyCertificates];
      setCertificates(normalized);
      setEligibility(nextEligibility);

      const hasCourseCertificate = digitalCertificates.length > 0 || legacyCertificates.some((certificate) => certificate.course_name.trim().toLowerCase() === String(course.course_name).trim().toLowerCase());
      if (nextEligibility.eligible && !hasCourseCertificate) {
        await issueCertificate(nextEligibility.passingAttemptId, true);
      } else {
        setMessage(nextEligibility.eligible ? "Certification unlocked. Certificate is ready." : "Complete all certification requirements to unlock your certificate.");
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load certification status."));
    } finally {
      setLoading(false);
    }
  // Automatic issuance delegates every integrity check to the guarded database function.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    loadCertification();
  }, [loadCertification]);

  async function issueCertificate(attemptId = eligibility?.passingAttemptId ?? "", automatic = false) {
    setIssuing(true);
    setMessage(automatic ? "Certification complete. Issuing certificate..." : "Checking eligibility and issuing certificate...");

    try {
      const supabase = createClient();
      if (!eligibility?.eligible || !attemptId) {
        setMessage("Certification is locked until all lessons, quiz, and assignments are complete.");
        return;
      }

      const { data, error } = await supabase
        .rpc("issue_aff_certificate", { p_attempt_id: Number(attemptId) })
        .single();

      if (error) throw error;
      if (!data) throw new Error("Certificate issuance did not return a verified certificate.");

      const certificate = { ...normalizeCertificate(data as DbRow, "digital"), score: eligibility.score };
      setCertificates((current) => current.some((item) => item.id === certificate.id) ? current : [certificate, ...current]);
      setMessage("Certificate issued successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to issue certificate."));
    } finally {
      setIssuing(false);
    }
  }

  function downloadCertificate(certificate: Certificate) {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
    const verificationUrl = certificate.qr_payload ?? (certificate.registry === "digital"
      ? `${siteUrl}/verify-certificate?certificate=${encodeURIComponent(certificate.certificate_number)}`
      : `${siteUrl}/verify?certificate=${encodeURIComponent(certificate.certificate_number)}&code=${encodeURIComponent(certificate.verification_code)}`);
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
        text="Complete the published Forex Foundations curriculum, required assignments, and certification examination to generate a verified Academy certificate."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <div className="terminal-panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[.24em] text-gold-300">Certification Readiness</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{courseName}</h2>
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
              <RequirementCard label="Required Lessons" value={`${eligibility?.completedLessons ?? 0}/${eligibility?.requiredLessons ?? 0}`} ready={Boolean(eligibility && eligibility.requiredLessons > 0 && eligibility.completedLessons === eligibility.requiredLessons)} />
              <RequirementCard label="Certification Quiz" value={eligibility?.hasPassingExam ? `${eligibility.score}% Pass` : "Pass required"} ready={Boolean(eligibility?.hasPassingExam)} />
              <RequirementCard label="Approved Assignments" value={`${eligibility?.approvedAssignments ?? 0}/${eligibility?.requiredAssignments ?? 0}`} ready={Boolean(eligibility && eligibility.approvedAssignments === eligibility.requiredAssignments)} />
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
