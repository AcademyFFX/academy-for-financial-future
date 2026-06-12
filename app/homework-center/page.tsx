"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FileText, FileUp, Image as ImageIcon, NotebookPen, RotateCcw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { courseCatalog } from "@/lib/course-catalog";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type HomeworkSubmission = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  title: string;
  course_module: string;
  lesson_title: string;
  homework_type: string;
  student_notes: string;
  pdf_url: string;
  docx_url: string;
  screenshot_url: string;
  chart_analysis_url: string;
  status: string;
  score: number | null;
  instructor_comments: string;
  corrections: string;
  graded_by: string;
  graded_at: string;
  completion_date: string;
  grading_history: ReviewHistory[];
  created_at: string;
};

type ReviewHistory = {
  status: string;
  score: number | null;
  comments: string;
  corrections: string;
  gradedBy: string;
  gradedAt: string;
};

const adminEmail = "acafffx@gmail.com";

const initialForm = {
  title: "",
  course_module: "",
  lesson_title: "",
  homework_type: "General Homework",
  student_notes: ""
};

const homeworkTypes = ["General Homework", "Chart Analysis", "Risk Worksheet", "Lesson Reflection", "Trade Plan", "Correction Resubmission"];
const reviewStatuses = ["Submitted", "In Review", "Approved", "Returned", "Needs Corrections"];

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function numberOrNull(input: unknown) {
  if (input === null || input === undefined || input === "") return null;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function normalizeHistory(raw: unknown): ReviewHistory[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item && typeof item === "object" ? (item as DbRow) : {};
    return {
      status: value(row, ["status"], "Reviewed"),
      score: numberOrNull(row.score),
      comments: value(row, ["comments", "instructor_comments"]),
      corrections: value(row, ["corrections"]),
      gradedBy: value(row, ["gradedBy", "graded_by"], adminEmail),
      gradedAt: value(row, ["gradedAt", "graded_at"], new Date().toISOString())
    };
  });
}

function normalizeSubmission(row: DbRow): HomeworkSubmission {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    student_id: value(row, ["student_id"]),
    student_name: value(row, ["student_name"], "AFF Student"),
    student_email: value(row, ["student_email"]),
    title: value(row, ["title"], "Homework Submission"),
    course_module: value(row, ["course_module"]),
    lesson_title: value(row, ["lesson_title"]),
    homework_type: value(row, ["homework_type"], "General Homework"),
    student_notes: value(row, ["student_notes"]),
    pdf_url: value(row, ["pdf_url"]),
    docx_url: value(row, ["docx_url"]),
    screenshot_url: value(row, ["screenshot_url"]),
    chart_analysis_url: value(row, ["chart_analysis_url"]),
    status: value(row, ["status"], "Submitted"),
    score: numberOrNull(row.score),
    instructor_comments: value(row, ["instructor_comments"]),
    corrections: value(row, ["corrections"]),
    graded_by: value(row, ["graded_by"]),
    graded_at: value(row, ["graded_at"]),
    completion_date: value(row, ["completion_date"]),
    grading_history: normalizeHistory(row.grading_history),
    created_at: value(row, ["created_at"], new Date().toISOString())
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function getStudentName(userMetadata: Record<string, unknown> | undefined, email: string) {
  const fullName = typeof userMetadata?.full_name === "string" ? userMetadata.full_name.trim() : "";
  const name = typeof userMetadata?.name === "string" ? userMetadata.name.trim() : "";
  return fullName || name || email || "AFF Student";
}

function acceptedFiles(kind: "pdf" | "docx" | "image" | "chart") {
  if (kind === "pdf") return "application/pdf,.pdf";
  if (kind === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx";
  return "image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp,.pdf";
}

export default function HomeworkCenterPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [isAdmin, setIsAdmin] = useState(false);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [form, setForm] = useState(initialForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { status: string; score: string; comments: string; corrections: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Upload homework for instructor review.");

  const completionHistory = useMemo(() => {
    return submissions.filter((submission) => ["Approved", "Returned", "Needs Corrections"].includes(submission.status) || submission.score !== null);
  }, [submissions]);

  const loadHomework = useCallback(async () => {
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

      const email = user.email ?? "";
      const admin = email.toLowerCase() === adminEmail;
      setUserId(user.id);
      setUserEmail(email);
      setStudentName(getStudentName(user.user_metadata, email));
      setIsAdmin(admin);

      const query = supabase.from("homework_submissions").select("*").order("created_at", { ascending: false });
      const { data, error } = admin ? await query.limit(200) : await query.eq("student_id", user.id);
      if (error) throw error;

      const normalized = ((data ?? []) as DbRow[]).map(normalizeSubmission);
      setSubmissions(normalized);
      setReviewDrafts(
        Object.fromEntries(
          normalized.map((submission) => [
            submission.id,
            {
              status: submission.status,
              score: submission.score === null ? "" : String(submission.score),
              comments: submission.instructor_comments,
              corrections: submission.corrections
            }
          ])
        )
      );
      setMessage(admin ? "Instructor Homework Center synchronized." : "Homework Center synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load Homework Center. Run the homework migration in Supabase."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  async function uploadFile(file: File | null, folder: string) {
    if (!file || !userId) return { url: "", path: "" };

    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("homework-center").upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (error) throw error;

    const { data } = supabase.storage.from("homework-center").getPublicUrl(path);
    return { url: data.publicUrl, path };
  }

  async function submitHomework(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    if (!pdfFile && !docxFile && !screenshotFile && !chartFile) {
      setMessage("Upload at least one PDF, DOCX, screenshot, or chart analysis file.");
      return;
    }

    setSaving(true);
    setMessage("Uploading homework files...");

    try {
      const [pdf, docx, screenshot, chart] = await Promise.all([
        uploadFile(pdfFile, "pdf"),
        uploadFile(docxFile, "docx"),
        uploadFile(screenshotFile, "screenshots"),
        uploadFile(chartFile, "chart-analysis")
      ]);

      const payload = {
        student_id: userId,
        student_name: studentName,
        student_email: userEmail,
        title: form.title.trim(),
        course_module: form.course_module.trim() || null,
        lesson_title: form.lesson_title.trim() || null,
        homework_type: form.homework_type,
        student_notes: form.student_notes.trim() || null,
        pdf_url: pdf.url || null,
        pdf_path: pdf.path || null,
        docx_url: docx.url || null,
        docx_path: docx.path || null,
        screenshot_url: screenshot.url || null,
        screenshot_path: screenshot.path || null,
        chart_analysis_url: chart.url || null,
        chart_analysis_path: chart.path || null,
        status: "Submitted"
      };

      const supabase = createClient();
      const { data, error } = await supabase.from("homework_submissions").insert(payload).select("*").single();
      if (error) throw error;

      const saved = normalizeSubmission(data as DbRow);
      setSubmissions((current) => [saved, ...current]);
      setForm(initialForm);
      setPdfFile(null);
      setDocxFile(null);
      setScreenshotFile(null);
      setChartFile(null);
      setMessage("Homework uploaded for instructor review.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to upload homework."));
    } finally {
      setSaving(false);
    }
  }

  async function saveReview(submission: HomeworkSubmission) {
    if (!isAdmin) return;

    const draft = reviewDrafts[submission.id];
    if (!draft) return;

    const score = draft.score.trim().length ? Number(draft.score) : null;
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      setMessage("Score must be between 0 and 100.");
      return;
    }

    const reviewedAt = new Date().toISOString();
    const historyEntry: ReviewHistory = {
      status: draft.status,
      score,
      comments: draft.comments.trim(),
      corrections: draft.corrections.trim(),
      gradedBy: adminEmail,
      gradedAt: reviewedAt
    };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("homework_submissions")
        .update({
          status: draft.status,
          score,
          instructor_comments: draft.comments.trim() || null,
          corrections: draft.corrections.trim() || null,
          graded_by: adminEmail,
          graded_at: reviewedAt,
          completion_date: ["Approved", "Returned", "Needs Corrections"].includes(draft.status) ? reviewedAt.slice(0, 10) : null,
          grading_history: [...submission.grading_history, historyEntry],
          updated_at: reviewedAt
        })
        .eq("id", submission.id)
        .select("*")
        .single();

      if (error) throw error;

      setSubmissions((current) => current.map((item) => (item.id === submission.id ? normalizeSubmission(data as DbRow) : item)));
      setMessage("Homework review saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save homework review."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Homework Center"
        title="Upload coursework, receive corrections, and track completion."
        text="Submit PDFs, DOCX documents, screenshots, and chart analysis files for instructor grading under Academy for Financial Future standards."
      />
      <Section>
        <SectionInner className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form onSubmit={submitHomework} className="terminal-panel grid h-fit gap-4 p-6">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Student Upload</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Submit Homework</h2>
              <p className="mt-2 text-sm leading-6 text-ink/68">{message}</p>
            </div>

            <Input label="Homework title" value={form.title} required onChange={(next) => setForm((current) => ({ ...current, title: next }))} />

            <label className="grid gap-2 text-sm text-ink/74">
              Course/module
              <select
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.course_module}
                onChange={(event) => setForm((current) => ({ ...current, course_module: event.target.value }))}
              >
                <option value="">Select course/module</option>
                {courseCatalog.map((course) => (
                  <option key={course.id} value={course.title}>{course.title}</option>
                ))}
              </select>
            </label>

            <Input label="Lesson title" value={form.lesson_title} onChange={(next) => setForm((current) => ({ ...current, lesson_title: next }))} />

            <label className="grid gap-2 text-sm text-ink/74">
              Homework type
              <select
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.homework_type}
                onChange={(event) => setForm((current) => ({ ...current, homework_type: event.target.value }))}
              >
                {homeworkTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Student notes
              <textarea
                className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.student_notes}
                onChange={(event) => setForm((current) => ({ ...current, student_notes: event.target.value }))}
              />
            </label>

            <FileInput icon={<FileText size={17} />} label="Upload PDF" accept={acceptedFiles("pdf")} onChange={setPdfFile} />
            <FileInput icon={<FileText size={17} />} label="Upload DOCX" accept={acceptedFiles("docx")} onChange={setDocxFile} />
            <FileInput icon={<ImageIcon size={17} />} label="Upload screenshot" accept={acceptedFiles("image")} onChange={setScreenshotFile} />
            <FileInput icon={<NotebookPen size={17} />} label="Upload chart analysis" accept={acceptedFiles("chart")} onChange={setChartFile} />

            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={saving || !form.title.trim()}>
              <FileUp size={18} /> {saving ? "Uploading..." : "Submit Homework"}
            </button>
          </form>

          <div className="grid gap-6">
            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-gold-300" size={23} />
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{isAdmin ? "Instructor Review Dashboard" : "My Homework Submissions"}</h2>
                    <p className="mt-2 text-sm text-ink/68">{isAdmin ? "Grade, comment, score, and return corrections to students." : "Review your submitted files, instructor comments, grades, and correction status."}</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <p className="p-6 text-ink/72">Loading homework records...</p>
              ) : submissions.length === 0 ? (
                <p className="p-6 text-ink/72">No homework submissions found.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/16">
                  {submissions.map((submission) => (
                    <article key={submission.id} className="bg-navy-950 p-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[.22em] text-gold-300">{submission.homework_type} - {submission.status}</p>
                          <h3 className="mt-2 text-xl font-semibold text-white">{submission.title}</h3>
                          <p className="mt-2 text-sm text-ink/68">{submission.course_module || "Course pending"}{submission.lesson_title ? ` / ${submission.lesson_title}` : ""}</p>
                          {isAdmin ? <p className="mt-2 text-sm text-ink/58">{submission.student_name} - {submission.student_email}</p> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <FileLink label="PDF" href={submission.pdf_url} />
                          <FileLink label="DOCX" href={submission.docx_url} />
                          <FileLink label="Screenshot" href={submission.screenshot_url} />
                          <FileLink label="Chart" href={submission.chart_analysis_url} />
                        </div>
                      </div>

                      {submission.student_notes ? <p className="mt-4 leading-7 text-ink/74">{submission.student_notes}</p> : null}

                      <div className="mt-4 grid gap-3 border-t border-gold-500/15 pt-4 md:grid-cols-3">
                        <StatusBox label="Score" value={submission.score === null ? "Pending" : `${submission.score}%`} />
                        <StatusBox label="Completion" value={submission.completion_date ? shortDate(submission.completion_date) : "In progress"} />
                        <StatusBox label="Reviewed" value={submission.graded_at ? shortDate(submission.graded_at) : "Pending"} />
                      </div>

                      {submission.instructor_comments || submission.corrections ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <FeedbackPanel title="Instructor Comments" body={submission.instructor_comments || "No comments recorded."} />
                          <FeedbackPanel title="Corrections Returned" body={submission.corrections || "No corrections returned."} />
                        </div>
                      ) : null}

                      {isAdmin ? (
                        <div className="mt-5 grid gap-3 border-t border-gold-500/15 pt-4">
                          <div className="grid gap-3 md:grid-cols-[1fr_130px]">
                            <label className="grid gap-2 text-sm text-ink/74">
                              Review status
                              <select
                                className="border border-gold-500/24 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400"
                                value={reviewDrafts[submission.id]?.status ?? submission.status}
                                onChange={(event) =>
                                  setReviewDrafts((current) => ({
                                    ...current,
                                    [submission.id]: { ...(current[submission.id] ?? { score: "", comments: "", corrections: "" }), status: event.target.value }
                                  }))
                                }
                              >
                                {reviewStatuses.map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                            </label>
                            <Input
                              label="Score"
                              type="number"
                              min="0"
                              max="100"
                              value={reviewDrafts[submission.id]?.score ?? ""}
                              onChange={(next) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [submission.id]: { ...(current[submission.id] ?? { status: submission.status, comments: "", corrections: "" }), score: next }
                                }))
                              }
                            />
                          </div>
                          <label className="grid gap-2 text-sm text-ink/74">
                            Instructor comments
                            <textarea
                              className="min-h-24 border border-gold-500/24 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400"
                              value={reviewDrafts[submission.id]?.comments ?? ""}
                              onChange={(event) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [submission.id]: { ...(current[submission.id] ?? { status: submission.status, score: "", corrections: "" }), comments: event.target.value }
                                }))
                              }
                            />
                          </label>
                          <label className="grid gap-2 text-sm text-ink/74">
                            Corrections to return
                            <textarea
                              className="min-h-24 border border-gold-500/24 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400"
                              value={reviewDrafts[submission.id]?.corrections ?? ""}
                              onChange={(event) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [submission.id]: { ...(current[submission.id] ?? { status: submission.status, score: "", comments: "" }), corrections: event.target.value }
                                }))
                              }
                            />
                          </label>
                          <button className="inline-flex w-fit items-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="button" onClick={() => saveReview(submission)}>
                            <CheckCircle2 size={18} /> Save Review
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="terminal-panel p-6">
              <div className="flex items-center gap-3">
                <RotateCcw className="text-gold-300" size={22} />
                <h2 className="text-2xl font-semibold text-white">Completion History</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {completionHistory.length === 0 ? (
                  <p className="text-sm text-ink/68">Completed, returned, and graded homework will appear here.</p>
                ) : (
                  completionHistory.map((submission) => (
                    <div key={`${submission.id}-history`} className="border border-gold-500/18 bg-navy-950 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{submission.title}</p>
                          <p className="mt-1 text-sm text-ink/58">{submission.status} - {submission.score === null ? "No score" : `${submission.score}%`}</p>
                        </div>
                        <p className="text-sm text-gold-300">{shortDate(submission.completion_date || submission.graded_at || submission.created_at)}</p>
                      </div>
                      {submission.grading_history.length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {submission.grading_history.slice().reverse().map((entry, index) => (
                            <p key={`${submission.id}-${entry.gradedAt}-${index}`} className="text-xs leading-5 text-ink/62">
                              {shortDate(entry.gradedAt)}: {entry.status}{entry.score === null ? "" : ` - ${entry.score}%`} by {entry.gradedBy}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}

function Input({ label, value, onChange, type = "text", required = false, min, max }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; max?: string }) {
  return (
    <label className="grid gap-2 text-sm text-ink/74">
      {label}
      <input
        className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
        type={type}
        min={min}
        max={max}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function FileInput({ icon, label, accept, onChange }: { icon: ReactNode; label: string; accept: string; onChange: (file: File | null) => void }) {
  return (
    <label className="grid gap-2 text-sm text-ink/74">
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
      <input
        className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white file:mr-4 file:border-0 file:bg-gold-500 file:px-4 file:py-2 file:font-bold file:text-navy-950"
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function FileLink({ label, href }: { label: string; href: string }) {
  if (!href) return null;
  return (
    <a className="inline-flex items-center gap-2 border border-gold-500/30 px-3 py-2 text-xs font-semibold text-gold-300 transition hover:border-gold-300 hover:text-white" href={href} target="_blank" rel="noreferrer">
      {label} <ExternalLink size={13} />
    </a>
  );
}

function StatusBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/16 bg-navy-900 p-3">
      <p className="text-[10px] uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function FeedbackPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-gold-500/16 bg-navy-900 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/70">{body}</p>
    </div>
  );
}
