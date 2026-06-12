"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, FileUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { courseCatalog } from "@/lib/course-catalog";
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
};

type DbLessonRow = {
  id: number | string;
  title?: string | null;
  lesson_title?: string | null;
  course_id?: number | string | null;
};

export default function AssignmentsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [form, setForm] = useState(initialForm);
  const [dbCourseIdsByTitle, setDbCourseIdsByTitle] = useState<Record<string, number>>({});
  const [dbLessonIdsByCourseAndTitle, setDbLessonIdsByCourseAndTitle] = useState<Record<string, number>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Submit completed coursework for review.");

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

  function getSelectedLesson(courseId: string, lessonId: string) {
    const course = courseCatalog.find((item) => item.id === courseId);
    const lesson = course?.lessons.find((item) => item.id === lessonId);
    return { course, lesson };
  }

  function getDatabaseCourseId(courseSlug: string) {
    const course = courseCatalog.find((item) => item.id === courseSlug);
    if (!course) return null;
    return dbCourseIdsByTitle[course.title] ?? null;
  }

  function getDatabaseLessonId(courseSlug: string, lessonSlug: string) {
    const { course, lesson } = getSelectedLesson(courseSlug, lessonSlug);
    if (!course || !lesson) return null;

    const databaseCourseId = getDatabaseCourseId(courseSlug);
    const lessonKey = databaseCourseId ? `${databaseCourseId}:${lesson.title}` : "";
    return dbLessonIdsByCourseAndTitle[lessonKey] ?? lesson.dbId;
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

        const coursesResult = await supabase.from("courses").select("id, course_name");
        if (!coursesResult.error) {
          const idsByTitle = ((coursesResult.data ?? []) as DbCourseRow[]).reduce<Record<string, number>>((accumulator, course) => {
            const id = Number(course.id);
            if (course.course_name && Number.isFinite(id)) accumulator[course.course_name] = id;
            return accumulator;
          }, {});
          setDbCourseIdsByTitle(idsByTitle);

          const lessonsResult = await supabase.from("lessons").select("id, title, lesson_title, course_id");
          if (!lessonsResult.error) {
            const idsByCourseAndTitle = ((lessonsResult.data ?? []) as DbLessonRow[]).reduce<Record<string, number>>((accumulator, lesson) => {
              const id = Number(lesson.id);
              const courseId = Number(lesson.course_id);
              const title = lesson.title ?? lesson.lesson_title;
              if (title && Number.isFinite(id) && Number.isFinite(courseId)) {
                accumulator[`${courseId}:${title}`] = id;
              }
              return accumulator;
            }, {});
            setDbLessonIdsByCourseAndTitle(idsByCourseAndTitle);
          }
        }

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

    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("courseId") ?? "";
    const lessonId = params.get("lessonId") ?? "";
    const { course, lesson } = getSelectedLesson(courseId, lessonId);

    if (course && lesson) {
      setForm((current) => ({
        ...current,
        title: `${lesson.title} Assignment`,
        course_slug: course.id,
        lesson_slug: lesson.id,
        course_module: `${course.title} / ${lesson.title}`
      }));
    }
  }, [router]);

  function updateField(name: keyof typeof initialForm, value: string) {
    setForm((current) => {
      if (name === "course_slug") {
        return { ...current, course_slug: value, lesson_slug: "", course_module: courseCatalog.find((course) => course.id === value)?.title ?? "" };
      }

      if (name === "lesson_slug") {
        const { course, lesson } = getSelectedLesson(current.course_slug, value);
        return {
          ...current,
          lesson_slug: value,
          title: lesson ? `${lesson.title} Assignment` : current.title,
          course_module: course && lesson ? `${course.title} / ${lesson.title}` : current.course_module
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
      const { course, lesson } = getSelectedLesson(form.course_slug, form.lesson_slug);
      const databaseCourseId = getDatabaseCourseId(form.course_slug);
      const databaseLessonId = getDatabaseLessonId(form.course_slug, form.lesson_slug);

      if (!course || !lesson || !databaseCourseId || !databaseLessonId) {
        setMessage("This course is not seeded in Supabase yet. Run the AFF course seed migration, then try again.");
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
        lesson_title: lesson?.title ?? null,
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
                {courseCatalog.map((course) => (
                  <option key={course.id} value={course.id}>{course.title}</option>
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
                {courseCatalog
                  .find((course) => course.id === form.course_slug)
                  ?.lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
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
