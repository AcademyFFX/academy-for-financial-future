"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, FileUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type AssignmentSubmission = {
  id: string;
  title: string;
  course_id: number | null;
  lesson_id: number | null;
  lesson_title: string | null;
  course_module: string | null;
  student_notes: string | null;
  file_url: string | null;
  file_path: string | null;
  submission_date: string;
  status: string;
  grade: number | null;
  instructor_feedback: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type AssignmentRow = Partial<AssignmentSubmission> & {
  notes?: string | null;
};

const initialForm = {
  title: "",
  course_slug: "",
  lesson_slug: "",
  course_module: "",
  student_notes: "",
  submission_date: new Date().toISOString().slice(0, 10)
};

type DbCourseRow = {
  id: number | string;
  course_name: string | null;
  title?: string | null;
  status?: string | null;
  publication_status?: string | null;
};

type DbLessonRow = {
  id: number | string;
  title?: string | null;
  lesson_title?: string | null;
  course_id?: number | string | null;
  lesson_order?: number | string | null;
  display_order?: number | string | null;
  sort_order?: number | string | null;
  status?: string | null;
  lesson_status?: string | null;
  publication_status?: string | null;
};

type EnrollmentRow = {
  course_id?: number | string | null;
  enrollment_status?: string | null;
};

function value(row: Record<string, unknown> | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return fallback;
}

function isPublished(row: Record<string, unknown>) {
  const status = value(row, ["publication_status", "status", "lesson_status"]);
  if (!status) return true;
  return ["published", "active", "available"].includes(status.trim().toLowerCase());
}

function isActiveEnrollment(row: EnrollmentRow) {
  const status = String(row.enrollment_status ?? "Active").trim().toLowerCase();
  return ["active", "approved", "enrolled", "in progress"].includes(status);
}

function lessonTitle(lesson: DbLessonRow) {
  return value(lesson as Record<string, unknown>, ["lesson_title", "title"], "Academy Lesson");
}

function courseTitle(course: DbCourseRow) {
  return value(course as Record<string, unknown>, ["course_name", "title"], "Academy Course");
}

function lessonOrder(lesson: DbLessonRow) {
  const parsed = Number(value(lesson as Record<string, unknown>, ["lesson_order", "display_order", "sort_order"], "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function AssignmentsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [form, setForm] = useState(initialForm);
  const [courses, setCourses] = useState<DbCourseRow[]>([]);
  const [lessons, setLessons] = useState<DbLessonRow[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Submit completed coursework for review.");
  const selectedCourse = useMemo(() => courses.find((course) => String(course.id) === form.course_slug) ?? null, [courses, form.course_slug]);
  const selectedLessons = useMemo(() => lessons
    .filter((lesson) => String(lesson.course_id) === form.course_slug)
    .sort((left, right) => lessonOrder(left) - lessonOrder(right) || Number(left.id) - Number(right.id)), [lessons, form.course_slug]);
  const selectedLesson = useMemo(() => selectedLessons.find((lesson) => String(lesson.id) === form.lesson_slug) ?? null, [selectedLessons, form.lesson_slug]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeSubmission(row: AssignmentRow): AssignmentSubmission {
    return {
      id: String(row.id ?? crypto.randomUUID()),
      title: String(row.title ?? ""),
      course_id: row.course_id === null || row.course_id === undefined ? null : Number(row.course_id),
      lesson_id: row.lesson_id === null || row.lesson_id === undefined ? null : Number(row.lesson_id),
      lesson_title: row.lesson_title ?? null,
      course_module: row.course_module ?? null,
      student_notes: row.student_notes ?? row.notes ?? null,
      file_url: row.file_url ?? null,
      file_path: row.file_path ?? null,
      submission_date: row.submission_date ?? new Date().toISOString().slice(0, 10),
      status: String(row.status ?? "Submitted"),
      grade: typeof row.grade === "number" ? row.grade : row.grade ? Number(row.grade) : null,
      instructor_feedback: row.instructor_feedback ?? null,
      reviewed_at: row.reviewed_at ?? null,
      created_at: row.created_at ?? new Date().toISOString()
    };
  }

  useEffect(() => {
    async function loadSubmissions() {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        setStudentId(user.id);

        const studentResult = await supabase
          .from("students")
          .select("id")
          .eq("auth_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (studentResult.error) throw studentResult.error;

        const internalStudentId = studentResult.data?.id ? String(studentResult.data.id) : "";
        if (!internalStudentId) {
          setCourses([]);
          setLessons([]);
          setMessage("Your student record is not active yet.");
          return;
        }

        const [enrollmentsResult, coursesResult, lessonsResult] = await Promise.all([
          supabase.from("enrollments").select("course_id,enrollment_status").eq("student_id", internalStudentId),
          supabase.from("courses").select("*"),
          supabase.from("lessons").select("*").order("lesson_order", { ascending: true })
        ]);
        if (enrollmentsResult.error) throw enrollmentsResult.error;
        if (coursesResult.error) throw coursesResult.error;
        if (lessonsResult.error) throw lessonsResult.error;

        const enrolledCourseIds = new Set(((enrollmentsResult.data ?? []) as EnrollmentRow[])
          .filter((enrollment) => enrollment.course_id !== null && enrollment.course_id !== undefined && isActiveEnrollment(enrollment))
          .map((enrollment) => String(enrollment.course_id)));
        const loadedCourses = ((coursesResult.data ?? []) as DbCourseRow[])
          .filter((course) => enrolledCourseIds.has(String(course.id)) && isPublished(course as Record<string, unknown>))
          .sort((left, right) => courseTitle(left).localeCompare(courseTitle(right)));
        const loadedLessons = ((lessonsResult.data ?? []) as DbLessonRow[])
          .filter((lesson) => enrolledCourseIds.has(String(lesson.course_id)) && isPublished(lesson as Record<string, unknown>))
          .sort((left, right) => lessonOrder(left) - lessonOrder(right) || Number(left.id) - Number(right.id));
        setCourses(loadedCourses);
        setLessons(loadedLessons);

        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("student_id", user.id)
          .order("submission_date", { ascending: false });

        if (error) throw error;
        setSubmissions(((data ?? []) as AssignmentRow[]).map(normalizeSubmission));
      } catch (error) {
        setMessage(getErrorMessage(error, "Unable to load assignment submissions."));
      } finally {
        setLoading(false);
      }
    }

    loadSubmissions();

  }, [router]);

  useEffect(() => {
    if (!courses.length || !lessons.length) return;
    const params = new URLSearchParams(window.location.search);
    const courseParam = params.get("courseId") ?? "";
    const lessonParam = params.get("lessonId") ?? "";
    if (!courseParam && !lessonParam) return;

    const course = courses.find((item) => String(item.id) === courseParam || safeSlug(courseTitle(item)) === safeSlug(courseParam));
    const courseLessons = course ? lessons.filter((lesson) => String(lesson.course_id) === String(course.id)) : [];
    const lesson = courseLessons.find((item) => String(item.id) === lessonParam || safeSlug(lessonTitle(item)) === safeSlug(lessonParam));

    if (course && lesson) {
      setForm((current) => ({
        ...current,
        title: `${lessonTitle(lesson)} Assignment`,
        course_slug: String(course.id),
        lesson_slug: String(lesson.id),
        course_module: `${courseTitle(course)} / ${lessonTitle(lesson)}`
      }));
    }
  }, [courses, lessons]);

  function updateField(name: keyof typeof initialForm, value: string) {
    setForm((current) => {
      if (name === "course_slug") {
        const course = courses.find((item) => String(item.id) === value);
        return { ...current, course_slug: value, lesson_slug: "", course_module: course ? courseTitle(course) : "" };
      }

      if (name === "lesson_slug") {
        const course = courses.find((item) => String(item.id) === current.course_slug);
        const lesson = lessons.find((item) => String(item.id) === value && String(item.course_id) === current.course_slug);
        return {
          ...current,
          lesson_slug: value,
          title: lesson ? `${lessonTitle(lesson)} Assignment` : current.title,
          course_module: course && lesson ? `${courseTitle(course)} / ${lessonTitle(lesson)}` : current.course_module
        };
      }

      return { ...current, [name]: value };
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentId) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setMessage("Saving assignment submission...");

    try {
      const supabase = createClient();
      let fileUrl: string | null = null;
      let filePath: string | null = null;
      const databaseCourseId = Number(form.course_slug);
      const databaseLessonId = Number(form.lesson_slug);

      if (!selectedCourse || !selectedLesson || !Number.isFinite(databaseCourseId) || !Number.isFinite(databaseLessonId)) {
        setMessage("Select an enrolled course and a published lesson before submitting your assignment.");
        setSaving(false);
        return;
      }

      if (selectedFile) {
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        filePath = `${studentId}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("assignment-submissions").upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false
        });

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage.from("assignment-submissions").getPublicUrl(filePath);
        fileUrl = publicUrl.publicUrl;
      }

      const payload = {
        student_id: studentId,
        title: form.title.trim(),
        course_id: databaseCourseId,
        lesson_id: databaseLessonId,
        lesson_title: lessonTitle(selectedLesson),
        course_module: form.course_module.trim() || null,
        student_notes: form.student_notes.trim() || null,
        file_url: fileUrl,
        file_path: filePath,
        status: "Submitted",
        submission_date: form.submission_date
      };

      const { data, error } = await supabase
        .from("assignments")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setSubmissions((current) => [normalizeSubmission(data as AssignmentRow), ...current]);
      setForm(initialForm);
      setSelectedFile(null);
      setMessage("Assignment submission saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save assignment submission."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Assignments"
        title="Submit work that proves process, not luck."
        text="Upload assignment links, course modules, notes, and submission dates for review by the Academy for Financial Future."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={submit} className="terminal-panel grid h-fit gap-4 p-6">
            <label className="grid gap-2 text-sm text-ink/74">
              Assignment title
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Course
              <select
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.course_slug}
                onChange={(event) => updateField("course_slug", event.target.value)}
                required
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>{courseTitle(course)}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Lesson
              <select
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.lesson_slug}
                onChange={(event) => updateField("lesson_slug", event.target.value)}
                required
              >
                <option value="">Select lesson</option>
                {selectedLessons.map((lesson, index) => (
                  <option key={lesson.id} value={lesson.id}>Lesson {index + 1}: {lessonTitle(lesson)}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Student notes
              <textarea
                className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.student_notes}
                onChange={(event) => updateField("student_notes", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Assignment file
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white file:mr-4 file:border-0 file:bg-gold-500 file:px-4 file:py-2 file:font-bold file:text-navy-950"
                type="file"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Submission date
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                type="date"
                value={form.submission_date}
                onChange={(event) => updateField("submission_date", event.target.value)}
                required
              />
            </label>

            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={saving}>
              <FileUp size={18} /> {saving ? "Uploading..." : "Upload Assignment"}
            </button>
            <p className="text-sm text-ink/70">{message}</p>
          </form>

          <div className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-6">
              <h2 className="text-2xl font-semibold text-white">Submitted Assignments</h2>
              <p className="mt-2 text-sm text-ink/68">Only submissions for the logged-in student are shown.</p>
            </div>
            {loading ? (
              <p className="p-6 text-ink/72">Loading assignment submissions...</p>
            ) : submissions.length === 0 ? (
              <p className="p-6 text-ink/72">No assignment submissions yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/18">
                {submissions.map((submission) => (
                  <article key={submission.id} className="bg-navy-950 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[.22em] text-gold-300">
                          {new Date(submission.submission_date).toLocaleDateString()}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{submission.title}</h3>
                        <p className="mt-2 text-sm text-ink/70">{submission.course_module}</p>
                        <p className="mt-2 inline-flex border border-gold-500/25 px-3 py-1 text-xs uppercase tracking-[.18em] text-gold-300">{submission.status}</p>
                      </div>
                      {submission.file_url ? (
                        <a className="inline-flex items-center gap-2 text-sm text-gold-300" href={submission.file_url} target="_blank" rel="noreferrer">
                          File <ExternalLink size={15} />
                        </a>
                      ) : null}
                    </div>
                    {submission.student_notes ? <p className="mt-4 leading-7 text-ink/76">{submission.student_notes}</p> : null}
                    <div className="mt-4 border-t border-gold-500/15 pt-4">
                      <p className="text-sm font-semibold text-white">Instructor Feedback</p>
                      {submission.grade !== null ? <p className="mt-2 text-sm text-gold-300">Grade: {submission.grade}%</p> : null}
                      <p className="mt-2 leading-7 text-ink/72">
                        {submission.instructor_feedback ?? "Feedback will appear here after instructor review."}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
