"use client";

import { useRouter } from "next/navigation";
import { Award, ClipboardCheck, ExternalLink, FileCheck, FileX, Megaphone, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { AdminAICoachKnowledge } from "@/components/admin-ai-coach-knowledge";
import { AdminMessageCenter } from "@/components/admin-message-center";
import { AdminSimulatorReview } from "@/components/admin-simulator-review";
import { AdminSocialModeration } from "@/components/admin-social-moderation";
import { AdminTVStudio } from "@/components/admin-tv-studio";
import { AdminZoomSessionManager } from "@/components/admin-zoom-session-manager";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type Student = {
  id: string;
  name: string;
  email: string;
  enrollmentDate: string;
  certificationLevel: string;
};

type Assignment = {
  id: string;
  studentId: string;
  title: string;
  courseModule: string;
  lessonTitle: string;
  fileUrl: string;
  submissionDate: string;
  status: string;
  grade: number | null;
  instructorFeedback: string;
  reviewedBy: string;
  reviewedAt: string;
  gradingHistory: GradingHistoryEntry[];
};

type GradingHistoryEntry = {
  status: string;
  grade: number | null;
  feedback: string;
  reviewedBy: string;
  reviewedAt: string;
};

type Exam = {
  id: string;
  studentId: string;
  studentName: string;
  examTitle: string;
  score: number;
  result: string;
  submittedAt: string;
  attemptNumber: number;
  durationSeconds: number;
  passingScore: number;
};

type Certificate = {
  id: string;
  certificateNumber: string;
  studentId: string;
  studentName: string;
  verificationCode: string;
  issueDate: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  published_at: string;
};

const adminEmail = "acafffx@gmail.com";
const initialAnnouncement = { id: "", title: "", body: "" };

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) {
      return String(current);
    }
  }
  return fallback;
}

function numberValue(row: DbRow, keys: string[], fallback = 0) {
  const raw = value(row, keys);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(raw: string) {
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading admin dashboard...");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncement);
  const [assignmentReviews, setAssignmentReviews] = useState<Record<string, { status: string; grade: string; instructorFeedback: string }>>({});

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const cards = [
    { label: "Total Students", value: students.length, icon: Users },
    { label: "Total Assignments Submitted", value: assignments.length, icon: ClipboardCheck },
    { label: "Total Exam Attempts", value: exams.length, icon: ShieldCheck },
    { label: "Total Certificates Issued", value: certificates.length, icon: Award }
  ];

  const examStats = useMemo(() => {
    const attempts = exams.length;
    const passed = exams.filter((exam) => exam.result === "Pass").length;
    const averageScore = attempts ? Math.round(exams.reduce((total, exam) => total + exam.score, 0) / attempts) : 0;
    const highestScore = attempts ? Math.max(...exams.map((exam) => exam.score)) : 0;
    const passRate = attempts ? Math.round((passed / attempts) * 100) : 0;
    return { attempts, passed, averageScore, highestScore, passRate };
  }, [exams]);

  const gradingStats = useMemo(() => {
    const approved = assignments.filter((assignment) => assignment.status === "Approved").length;
    const rejected = assignments.filter((assignment) => assignment.status === "Rejected").length;
    const pending = assignments.filter((assignment) => !["Approved", "Rejected"].includes(assignment.status)).length;
    const gradedAssignments = assignments.filter((assignment) => assignment.grade !== null);
    const averageGrade = gradedAssignments.length
      ? Math.round(gradedAssignments.reduce((total, assignment) => total + (assignment.grade ?? 0), 0) / gradedAssignments.length)
      : 0;

    return { approved, rejected, pending, averageGrade };
  }, [assignments]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeStudent(row: DbRow): Student {
    return {
      id: value(row, ["id", "student_id"]),
      name: value(row, ["name", "full_name", "student_name"], "Student"),
      email: value(row, ["email", "student_email"], "Not recorded"),
      enrollmentDate: normalizeDate(value(row, ["enrollment_date", "created_at", "date_enrolled"])),
      certificationLevel: value(row, ["certification_level", "level", "course_name"], "Forex Training Division")
    };
  }

  function normalizeAssignment(row: DbRow): Assignment {
    return {
      id: value(row, ["id"], crypto.randomUUID()),
      studentId: value(row, ["student_id"]),
      title: value(row, ["title", "assignment_title"], "Assignment"),
      courseModule: value(row, ["course_module", "module", "course"], "Module"),
      lessonTitle: value(row, ["lesson_title"], "Lesson"),
      fileUrl: value(row, ["file_url", "url", "submission_url"]),
      submissionDate: normalizeDate(value(row, ["submission_date", "submitted_at", "created_at", "date"])),
      status: value(row, ["status"], "Submitted"),
      grade: row.grade === null || row.grade === undefined ? null : Number(row.grade),
      instructorFeedback: value(row, ["instructor_feedback"]),
      reviewedBy: value(row, ["reviewed_by"]),
      reviewedAt: normalizeDate(value(row, ["reviewed_at"])),
      gradingHistory: normalizeGradingHistory(row.grading_history)
    };
  }

  function normalizeGradingHistory(raw: unknown): GradingHistoryEntry[] {
    const parsed = typeof raw === "string" ? safeParseJson(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as DbRow;
        return {
          status: value(row, ["status"], "Submitted"),
          grade: row.grade === null || row.grade === undefined ? null : Number(row.grade),
          feedback: value(row, ["feedback"]),
          reviewedBy: value(row, ["reviewedBy", "reviewed_by"], adminEmail),
          reviewedAt: normalizeDate(value(row, ["reviewedAt", "reviewed_at"]))
        };
      })
      .filter((entry): entry is GradingHistoryEntry => entry !== null);
  }

  function safeParseJson(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function normalizeExam(row: DbRow): Exam {
    return {
      id: value(row, ["id"], crypto.randomUUID()),
      studentId: value(row, ["student_id"]),
      studentName: value(row, ["student_name", "name"], "Student"),
      examTitle: value(row, ["exam_title", "title"], "Certification Exam"),
      score: numberValue(row, ["score"]),
      result: value(row, ["result", "status"], numberValue(row, ["score"]) >= 80 ? "Pass" : "Fail"),
      submittedAt: normalizeDate(value(row, ["submitted_at", "exam_date", "created_at", "date"])),
      attemptNumber: numberValue(row, ["attempt_number"], 1),
      durationSeconds: numberValue(row, ["duration_seconds"], 0),
      passingScore: numberValue(row, ["passing_score"], 80)
    };
  }

  function normalizeCertificate(row: DbRow): Certificate {
    return {
      id: value(row, ["id"], crypto.randomUUID()),
      certificateNumber: value(row, ["certificate_number"]),
      studentId: value(row, ["student_id"]),
      studentName: value(row, ["student_name", "name"], "Student"),
      verificationCode: value(row, ["verification_code"]),
      issueDate: normalizeDate(value(row, ["issue_date", "created_at", "date"]))
    };
  }

  const loadAdminData = useCallback(async () => {
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

      if (user.email?.toLowerCase() !== adminEmail) {
        setAuthorized(false);
        setMessage("Admin access only. Sign in with the academy administrator account.");
        return;
      }

      setAuthorized(true);

      const [studentsResult, assignmentsResult, examsResult, certificatesResult, announcementsResult] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("assignments").select("*"),
        supabase.from("exams").select("*"),
        supabase.from("certificates").select("*"),
        supabase.from("announcements").select("*").order("published_at", { ascending: false })
      ]);

      for (const result of [studentsResult, assignmentsResult, examsResult, certificatesResult, announcementsResult]) {
        if (result.error) throw result.error;
      }

      const normalizedStudents = ((studentsResult.data ?? []) as DbRow[]).map(normalizeStudent);
      const normalizedAssignments = ((assignmentsResult.data ?? []) as DbRow[])
        .map(normalizeAssignment)
        .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
      const normalizedExams = ((examsResult.data ?? []) as DbRow[])
        .map(normalizeExam)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      const normalizedCertificates = ((certificatesResult.data ?? []) as DbRow[])
        .map(normalizeCertificate)
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

      setStudents(normalizedStudents);
      setAssignments(normalizedAssignments);
      setAssignmentReviews(Object.fromEntries(normalizedAssignments.map((assignment) => [
        assignment.id,
        {
          status: assignment.status,
          grade: assignment.grade === null ? "" : String(assignment.grade),
          instructorFeedback: assignment.instructorFeedback
        }
      ])));
      setExams(normalizedExams);
      setCertificates(normalizedCertificates);
      setAnnouncements((announcementsResult.data ?? []) as Announcement[]);
      setMessage("Admin dashboard ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load admin dashboard."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function saveAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving announcement...");

    try {
      const supabase = createClient();
      const payload = {
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        published_at: new Date().toISOString()
      };

      const query = announcementForm.id
        ? supabase.from("announcements").update(payload).eq("id", announcementForm.id).select("*").single()
        : supabase.from("announcements").insert(payload).select("*").single();

      const { data, error } = await query;
      if (error) throw error;

      const saved = data as Announcement;
      setAnnouncements((current) => {
        const withoutCurrent = current.filter((announcement) => announcement.id !== saved.id);
        return [saved, ...withoutCurrent];
      });
      setAnnouncementForm(initialAnnouncement);
      setMessage("Announcement saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save announcement."));
    }
  }

  async function saveAssignmentReview(assignmentId: string) {
    const review = assignmentReviews[assignmentId];
    if (!review) return;

    setMessage("Saving assignment review...");

    try {
      const assignment = assignments.find((item) => item.id === assignmentId);
      const grade = review.grade.trim().length > 0 ? Number(review.grade) : null;

      if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 100)) {
        setMessage("Grade must be a number from 0 to 100.");
        return;
      }

      const supabase = createClient();
      const reviewedAt = new Date().toISOString();
      const historyEntry: GradingHistoryEntry = {
        status: review.status,
        grade,
        feedback: review.instructorFeedback.trim(),
        reviewedBy: adminEmail,
        reviewedAt
      };

      const payload = {
        status: review.status,
        grade,
        instructor_feedback: review.instructorFeedback.trim() || null,
        reviewed_by: adminEmail,
        reviewed_at: reviewedAt,
        grading_history: [...(assignment?.gradingHistory ?? []), historyEntry]
      };

      const { data, error } = await supabase
        .from("assignments")
        .update(payload)
        .eq("id", assignmentId)
        .select("*")
        .single();

      if (error) throw error;

      setAssignments((current) => current.map((assignment) => (assignment.id === assignmentId ? normalizeAssignment(data as DbRow) : assignment)));
      setMessage(review.status === "Approved" ? "Assignment approved. Certification requirements updated." : "Assignment review saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save assignment review."));
    }
  }

  async function deleteAnnouncement(id: string) {
    setMessage("Deleting announcement...");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
      setMessage("Announcement deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete announcement."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Instructor Admin"
        title="Instructor command center."
        text="Monitor students, submissions, exams, certificates, trading activity, and official academy announcements."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <p className="text-sm text-ink/72">{message}</p>

          {!loading && !authorized ? (
            <div className="terminal-panel p-6 text-ink/76">Admin login only.</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {cards.map((card) => (
                  <div key={card.label} className="terminal-panel p-5">
                    <card.icon className="text-gold-300" size={22} />
                    <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
                    <p className="mt-1 text-sm text-ink/66">{card.label}</p>
                  </div>
                ))}
              </div>

              <AdminTable title="Students" headers={["Name", "Email", "Enrollment Date", "Certification Level"]}>
                {students.map((student) => (
                  <TableRow key={student.id} cells={[
                    student.name,
                    student.email,
                    new Date(student.enrollmentDate).toLocaleDateString(),
                    student.certificationLevel
                  ]} />
                ))}
              </AdminTable>

              <section className="terminal-panel p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Instructor Grading Center</h2>
                    <p className="mt-2 text-sm text-ink/68">Approved assignments count toward certification unlock requirements.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 border border-gold-500/30 px-3 py-2 text-xs uppercase tracking-[.18em] text-gold-300">
                    <ShieldCheck size={15} /> Admin Review
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <Metric label="Pending Review" value={String(gradingStats.pending)} />
                  <Metric label="Approved" value={String(gradingStats.approved)} />
                  <Metric label="Rejected" value={String(gradingStats.rejected)} />
                  <Metric label="Average Grade" value={`${gradingStats.averageGrade}%`} />
                </div>
              </section>

              <AdminTable title="Assignments" headers={["Student", "Assignment", "Course/Module", "Lesson", "Date", "File", "Review"]}>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="bg-navy-950">
                    <td className="p-4 text-ink/76">{studentMap.get(assignment.studentId)?.name ?? "Student"}</td>
                    <td className="p-4 text-ink/76">{assignment.title}</td>
                    <td className="p-4 text-ink/76">{assignment.courseModule}</td>
                    <td className="p-4 text-ink/76">{assignment.lessonTitle}</td>
                    <td className="p-4 text-ink/76">{new Date(assignment.submissionDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      {assignment.fileUrl ? (
                        <a className="inline-flex items-center gap-2 text-gold-300" href={assignment.fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink size={15} /> Open File
                        </a>
                      ) : (
                        <span className="text-ink/50">No file</span>
                      )}
                    </td>
                    <td className="min-w-[320px] p-4">
                      <div className="grid gap-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
                          <select
                            className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                            value={assignmentReviews[assignment.id]?.status ?? assignment.status}
                            onChange={(event) => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { grade: "", instructorFeedback: "" }), status: event.target.value }
                            }))}
                          >
                            <option>Submitted</option>
                            <option>In Review</option>
                            <option>Needs Revision</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                          </select>
                          <input
                            className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Grade"
                            value={assignmentReviews[assignment.id]?.grade ?? ""}
                            onChange={(event) => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { status: assignment.status, instructorFeedback: "" }), grade: event.target.value }
                            }))}
                          />
                        </div>
                        <textarea
                          className="min-h-20 border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                          placeholder="Instructor feedback"
                          value={assignmentReviews[assignment.id]?.instructorFeedback ?? ""}
                          onChange={(event) => setAssignmentReviews((current) => ({
                            ...current,
                            [assignment.id]: { ...(current[assignment.id] ?? { status: assignment.status, grade: "" }), instructorFeedback: event.target.value }
                          }))}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            className="inline-flex items-center justify-center gap-2 border border-emerald-300/45 px-3 py-2 text-xs font-semibold text-emerald-200"
                            type="button"
                            onClick={() => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { grade: "", instructorFeedback: "" }), status: "Approved" }
                            }))}
                          >
                            <FileCheck size={15} /> Approve
                          </button>
                          <button
                            className="inline-flex items-center justify-center gap-2 border border-red-300/45 px-3 py-2 text-xs font-semibold text-red-200"
                            type="button"
                            onClick={() => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { grade: "", instructorFeedback: "" }), status: "Rejected" }
                            }))}
                          >
                            <FileX size={15} /> Reject
                          </button>
                        </div>
                        <button className="bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" type="button" onClick={() => saveAssignmentReview(assignment.id)}>
                          Save Review
                        </button>
                        <div className="border-t border-gold-500/15 pt-3">
                          <p className="text-xs uppercase tracking-[.18em] text-gold-300">Grading History</p>
                          {assignment.gradingHistory.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                              {assignment.gradingHistory.slice().reverse().map((entry, index) => (
                                <div key={`${assignment.id}-${entry.reviewedAt}-${index}`} className="border border-gold-500/14 bg-navy-900 p-3">
                                  <p className="text-xs text-white">
                                    {entry.status} {entry.grade !== null ? `- ${entry.grade}%` : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-ink/58">
                                    {new Date(entry.reviewedAt).toLocaleString()} by {entry.reviewedBy}
                                  </p>
                                  {entry.feedback ? <p className="mt-2 text-xs leading-5 text-ink/70">{entry.feedback}</p> : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-ink/52">No review history yet.</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>

              <section className="terminal-panel p-5">
                <h2 className="text-xl font-semibold text-white">Exam Completion Statistics</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-5">
                  <Metric label="Attempts" value={String(examStats.attempts)} />
                  <Metric label="Passed" value={String(examStats.passed)} />
                  <Metric label="Pass Rate" value={`${examStats.passRate}%`} />
                  <Metric label="Average Score" value={`${examStats.averageScore}%`} />
                  <Metric label="Highest Score" value={`${examStats.highestScore}%`} />
                </div>
              </section>

              <AdminTable title="Exams" headers={["Student", "Exam", "Attempt", "Score", "Pass/Fail", "Time", "Date"]}>
                {exams.map((exam) => (
                  <TableRow key={exam.id} cells={[
                    studentMap.get(exam.studentId)?.name ?? exam.studentName,
                    exam.examTitle,
                    String(exam.attemptNumber),
                    `${exam.score}%`,
                    exam.result,
                    `${Math.round(exam.durationSeconds / 60)} min`,
                    new Date(exam.submittedAt).toLocaleDateString()
                  ]} />
                ))}
              </AdminTable>

              <AdminTable title="Certificates" headers={["Certificate Number", "Student Name", "Verification Code", "Issue Date"]}>
                {certificates.map((certificate) => (
                  <TableRow key={certificate.id} cells={[
                    certificate.certificateNumber,
                    certificate.studentName,
                    certificate.verificationCode,
                    new Date(certificate.issueDate).toLocaleDateString()
                  ]} />
                ))}
              </AdminTable>

              <AdminZoomSessionManager />

              <AdminMessageCenter />

              <AdminAICoachKnowledge />

              <AdminSimulatorReview />

              <AdminSocialModeration />

              <AdminTVStudio />

              <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form onSubmit={saveAnnouncement} className="terminal-panel grid h-fit gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <Megaphone className="text-gold-300" size={22} />
                    <h2 className="text-xl font-semibold text-white">{announcementForm.id ? "Edit Announcement" : "Create Announcement"}</h2>
                  </div>
                  <label className="grid gap-2 text-sm text-ink/74">
                    Title
                    <input
                      className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                      value={announcementForm.title}
                      onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-ink/74">
                    Body
                    <textarea
                      className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                      value={announcementForm.body}
                      onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))}
                      required
                    />
                  </label>
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                    <Save size={18} /> Save Announcement
                  </button>
                </form>

                <div className="grid gap-3">
                  {announcements.map((announcement) => (
                    <article key={announcement.id} className="terminal-panel p-5">
                      <p className="text-xs uppercase tracking-[.22em] text-gold-300">{new Date(announcement.published_at).toLocaleDateString()}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{announcement.title}</h3>
                      <p className="mt-3 leading-7 text-ink/72">{announcement.body}</p>
                      <div className="mt-4 flex gap-3">
                        <button className="border border-gold-500/45 px-4 py-2 text-sm text-gold-300" type="button" onClick={() => setAnnouncementForm(announcement)}>
                          Edit
                        </button>
                        <button className="inline-flex items-center gap-2 border border-red-300/45 px-4 py-2 text-sm text-red-200" type="button" onClick={() => deleteAnnouncement(announcement.id)}>
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </SectionInner>
      </Section>
    </>
  );
}

function AdminTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <section className="terminal-panel overflow-x-auto">
      <div className="border-b border-gold-500/20 p-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-navy-800">
            {headers.map((header) => (
              <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

function TableRow({ cells }: { cells: string[] }) {
  return (
    <tr className="bg-navy-950">
      {cells.map((cell, index) => (
        <td key={`${cell}-${index}`} className="p-4 text-ink/76">{cell}</td>
      ))}
    </tr>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/20 bg-navy-950 p-4">
      <p className="text-2xl font-semibold text-gold-300">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[.18em] text-ink/60">{label}</p>
    </div>
  );
}
