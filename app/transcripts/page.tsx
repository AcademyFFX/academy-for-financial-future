"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, BookOpenCheck, Download, FileCheck2, GraduationCap, QrCode, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AFFInstitutionalLogo } from "@/components/aff-logo";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type Profile = {
  name: string;
  studentId: string;
  email: string;
  enrollmentDate: string;
};

type TranscriptRecord = {
  transcriptId: string;
  degreeId: string;
  qrCode: string;
  issuedAt: string;
};

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
  if (!raw) return "Not recorded";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function gradePoints(grade: string) {
  const normalized = grade.trim().toUpperCase();
  if (normalized.startsWith("A")) return 4;
  if (normalized.startsWith("B")) return 3;
  if (normalized.startsWith("C")) return 2;
  if (normalized.startsWith("D")) return 1;
  return 0;
}

function normalizedKeyPart(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function isPassedAssessment(row: DbRow) {
  const result = value(row, ["result", "pass_fail", "status"]).toLowerCase();
  const passed = value(row, ["passed"]).toLowerCase();
  return ["pass", "passed"].includes(result) || passed === "true" || numberValue(row, ["percentage", "score"]) >= 80;
}

function assessmentIdentity(row: DbRow, index: number) {
  const explicitId = value(row, ["quiz_id", "exam_id", "assessment_id", "certificate_exam_id"]);
  const title = value(row, ["exam_title", "quiz_title", "assessment_title", "title"], `assessment-${index}`);
  const courseId = value(row, ["course_id"], "course");
  const lessonId = value(row, ["lesson_id"], "lesson");
  return [courseId, lessonId, explicitId || normalizedKeyPart(title)].map(normalizedKeyPart).join("::");
}

function countDistinctPassedAssessments(rows: DbRow[]) {
  return new Set(rows.filter(isPassedAssessment).map(assessmentIdentity)).size;
}

function pdfEscape(text: string) {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function downloadTranscriptPdf(lines: string[], filename: string) {
  const content = lines.map((line, index) => `BT /F1 ${index < 2 ? 18 : 11} Tf 54 ${750 - index * 22} Td (${pdfEscape(line)}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TranscriptsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading academic transcript...");
  const [profile, setProfile] = useState<Profile>({ name: "Student", studentId: "", email: "", enrollmentDate: "" });
  const [credits, setCredits] = useState<DbRow[]>([]);
  const [certificates, setCertificates] = useState<DbRow[]>([]);
  const [exams, setExams] = useState<DbRow[]>([]);
  const [attendance, setAttendance] = useState<DbRow[]>([]);
  const [degrees, setDegrees] = useState<DbRow[]>([]);
  const [transcript, setTranscript] = useState<TranscriptRecord | null>(null);

  const loadTranscript = useCallback(async () => {
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

      const [studentResult, applicationResult, creditResult, certResult, digitalCertResult, examResult, certAttemptResult, attendanceResult, degreeResult, transcriptResult] = await Promise.all([
        supabase.from("students").select("*").or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("student_applications").select("student_id, auth_user_id, email").or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("student_credits").select("*").eq("student_id", user.id).order("completed_at", { ascending: false }),
        supabase.from("certificates").select("*").eq("student_id", user.id),
        supabase.from("digital_certificates").select("*").eq("student_id", user.id),
        supabase.from("exams").select("*").eq("student_id", user.id),
        supabase.from("certification_exam_attempts").select("*").eq("student_id", user.id),
        supabase.from("class_attendance").select("*").eq("student_id", user.id),
        supabase.from("academic_degree_programs").select("*").order("credits_required", { ascending: true }),
        supabase.from("academic_transcript_records").select("*").eq("student_id", user.id).order("issued_at", { ascending: false }).limit(1).maybeSingle()
      ]);

      const student = (studentResult.data ?? {}) as DbRow;
      const application = (applicationResult.data ?? {}) as DbRow;
      setProfile({
        name: value(student, ["full_name", "name"], user.user_metadata?.full_name ?? user.email ?? "Student"),
        studentId: value(application, ["student_id"], value(student, ["student_id"], "Student ID pending")),
        email: value(student, ["email"], user.email ?? ""),
        enrollmentDate: value(student, ["enrollment_date", "created_at"], "")
      });

      setCredits((creditResult.data ?? []) as DbRow[]);
      setCertificates([...(certResult.data ?? []), ...(digitalCertResult.data ?? [])] as DbRow[]);
      setExams([...(examResult.data ?? []), ...(certAttemptResult.data ?? [])] as DbRow[]);
      setAttendance((attendanceResult.data ?? []) as DbRow[]);
      setDegrees((degreeResult.data ?? []) as DbRow[]);
      const record = transcriptResult.data as DbRow | null;
      setTranscript(record ? {
        transcriptId: value(record, ["transcript_id"]),
        degreeId: value(record, ["degree_id"]),
        qrCode: value(record, ["qr_verification_code"]),
        issuedAt: value(record, ["issued_at"])
      } : null);
      setMessage("Academic transcript synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the AFF transcript migration to enable academic records.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTranscript();
  }, [loadTranscript]);

  const analytics = useMemo(() => {
    const completedCredits = credits.filter((row) => value(row, ["completion_status"]) === "Completed");
    const creditsEarned = completedCredits.reduce((total, row) => total + numberValue(row, ["credits_earned", "credits"]), 0);
    const gpaRows = completedCredits.filter((row) => gradePoints(value(row, ["grade"])) > 0);
    const gpa = gpaRows.length ? gpaRows.reduce((total, row) => total + gradePoints(value(row, ["grade"])), 0) / gpaRows.length : 0;
    const present = attendance.filter((row) => value(row, ["attendance_status", "status"]).toLowerCase() === "present").length;
    const attendancePercentage = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
    const passedExams = countDistinctPassedAssessments(exams);
    const bestDegree = degrees.find((degree) => creditsEarned < numberValue(degree, ["credits_required"])) ?? degrees[degrees.length - 1];
    const creditsRequired = numberValue(bestDegree ?? {}, ["credits_required"], 60);
    return {
      coursesCompleted: completedCredits.length,
      certificationsEarned: certificates.length,
      passedExams,
      attendancePercentage,
      gpa: Number(gpa.toFixed(2)),
      creditsEarned,
      degreeId: value(bestDegree ?? {}, ["degree_id"], "AFF-AFM"),
      degreeName: value(bestDegree ?? {}, ["degree_name"], "Associate of Financial Markets"),
      creditsRequired,
      remainingCredits: Math.max(0, creditsRequired - creditsEarned),
      graduationReady: creditsEarned >= creditsRequired && passedExams > 0
    };
  }, [attendance, certificates.length, credits, degrees, exams]);

  async function createTranscriptRecord() {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const transcriptId = `AFF-TR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const { data, error } = await supabase
      .from("academic_transcript_records")
      .insert({
        transcript_id: transcriptId,
        student_id: user.id,
        student_name: profile.name,
        aff_student_id: profile.studentId,
        enrollment_date: profile.enrollmentDate ? new Date(profile.enrollmentDate).toISOString().slice(0, 10) : null,
        degree_id: analytics.degreeId,
        degree_name: analytics.degreeName,
        courses_completed: analytics.coursesCompleted,
        certifications_earned: analytics.certificationsEarned,
        exams_passed: analytics.passedExams,
        attendance_percentage: analytics.attendancePercentage,
        gpa_equivalent: analytics.gpa,
        credits_earned: analytics.creditsEarned
      })
      .select("*")
      .single();
    if (error) throw error;
    const record = data as DbRow;
    const nextTranscript = {
      transcriptId: value(record, ["transcript_id"]),
      degreeId: value(record, ["degree_id"]),
      qrCode: value(record, ["qr_verification_code"]),
      issuedAt: value(record, ["issued_at"])
    };
    setTranscript(nextTranscript);
    return nextTranscript;
  }

  async function downloadTranscript() {
    try {
      setMessage("Preparing academic transcript PDF...");
      const record = transcript ?? await createTranscriptRecord();
      downloadTranscriptPdf([
        "Academy for Financial Future",
        "Official Academic Transcript",
        `Student Name: ${profile.name}`,
        `Student ID: ${profile.studentId}`,
        `Enrollment Date: ${shortDate(profile.enrollmentDate)}`,
        `Transcript Number: ${record.transcriptId}`,
        `Degree ID: ${record.degreeId}`,
        `Courses Completed: ${analytics.coursesCompleted}`,
        `Certifications Earned: ${analytics.certificationsEarned}`,
        `Exam Scores Passed: ${analytics.passedExams}`,
        `Attendance Percentage: ${analytics.attendancePercentage}%`,
        `GPA Equivalent: ${analytics.gpa}`,
        `Credits Earned: ${analytics.creditsEarned}`,
        `QR Verification Code: ${record.qrCode}`,
        "Authorized Academic Office: Dr. Jean Rene Moricette"
      ], `${record.transcriptId}.pdf`);
      setMessage("Transcript PDF downloaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to download transcript.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Academic Transcript System"
        title="Official student transcript and academic record."
        text="View courses completed, certifications earned, exam performance, attendance, GPA equivalent, credits earned, and QR-verifiable transcript records."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <section className="terminal-panel grid gap-6 p-6 lg:grid-cols-[320px_1fr_auto] lg:items-center">
            <AFFInstitutionalLogo className="h-32 w-48" />
            <div>
              <p className="text-sm text-ink/68">{message}</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{profile.name}</h2>
              <p className="mt-2 text-gold-300">{profile.studentId} · {profile.email}</p>
              <p className="mt-1 text-sm text-ink/62">Enrollment Date: {shortDate(profile.enrollmentDate)}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" disabled={loading} type="button" onClick={downloadTranscript}>
              <Download size={18} /> Download Transcript PDF
            </button>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BookOpenCheck size={22} />} label="Courses Completed" value={String(analytics.coursesCompleted)} />
            <Metric icon={<Award size={22} />} label="Certifications Earned" value={String(analytics.certificationsEarned)} />
            <Metric icon={<ShieldCheck size={22} />} label="Exam Scores Passed" value={String(analytics.passedExams)} />
            <Metric icon={<GraduationCap size={22} />} label="Credits Earned" value={String(analytics.creditsEarned)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <h2 className="text-xl font-semibold text-white">Academic Credit Record</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-navy-800 text-left text-gold-300">
                    <tr>
                      <th className="p-4">Course</th>
                      <th className="p-4">Credits</th>
                      <th className="p-4">Grade</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.length === 0 ? (
                      <tr><td className="p-5 text-ink/68" colSpan={5}>No stored academic credit records yet.</td></tr>
                    ) : credits.map((row) => (
                      <tr key={value(row, ["id", "course_title"])} className="border-t border-gold-500/10 bg-navy-950">
                        <td className="p-4 text-white">{value(row, ["course_title"])}</td>
                        <td className="p-4 text-ink/74">{value(row, ["credits_earned"], "0")}</td>
                        <td className="p-4 text-ink/74">{value(row, ["grade"])}</td>
                        <td className="p-4 text-ink/74">{value(row, ["completion_status"])}</td>
                        <td className="p-4 text-ink/74">{shortDate(value(row, ["completed_at"]))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6">
              <Panel title="Transcript Verification" icon={<QrCode size={22} />}>
                <Mini label="Transcript Number" value={transcript?.transcriptId ?? "Generated on PDF download"} />
                <Mini label="Degree ID" value={transcript?.degreeId ?? analytics.degreeId} />
                <Mini label="QR Verification" value={transcript?.qrCode ?? "Pending"} />
                <Link href="/verify-transcript" className="mt-3 inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 text-sm font-semibold text-gold-300">
                  Verify Transcript
                </Link>
              </Panel>
              <Panel title="Graduation Tracking" icon={<FileCheck2 size={22} />}>
                <Mini label="Degree Program" value={analytics.degreeName} />
                <Mini label="Credits Required" value={String(analytics.creditsRequired)} />
                <Mini label="Credits Completed" value={String(analytics.creditsEarned)} />
                <Mini label="Remaining Credits" value={String(analytics.remainingCredits)} />
                <Mini label="Graduation Eligibility" value={analytics.graduationReady ? "Eligible for Academic Office Review" : "In Progress"} />
              </Panel>
            </div>
          </section>
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

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="terminal-panel p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-gold-300">{icon}</span>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value || "Not recorded"}</p>
    </div>
  );
}
