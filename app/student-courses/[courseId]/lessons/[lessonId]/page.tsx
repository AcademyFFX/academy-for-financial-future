"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  NotebookPen,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/progress";
import { Section, SectionInner } from "@/components/section";
import { getClientAdminStatus } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type LessonState = {
  course: DbRow;
  lesson: DbRow;
  lessons: DbRow[];
  enrollment: DbRow | null;
  assets: DbRow[];
  progressRows: DbRow[];
  studentName: string;
  isAdmin: boolean;
};

function value(row: DbRow | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return fallback;
}

function idOf(row: DbRow | null | undefined) {
  return value(row, ["id"]);
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isPublished(row: DbRow, keys: string[]) {
  const status = value(row, keys);
  if (!status) return true;
  return ["published", "active", "available"].includes(status.trim().toLowerCase());
}

function safeSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function lessonTitle(row: DbRow) {
  return value(row, ["lesson_title", "title", "name"], "Academy Lesson");
}

function courseTitle(row: DbRow) {
  return value(row, ["course_name", "title", "name"], "Academy Course");
}

function lessonOrder(row: DbRow) {
  const parsed = Number(value(row, ["lesson_order", "display_order", "sort_order"], "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAssetPayload(row: DbRow) {
  const raw = value(row, ["signed_url"]);
  if (!raw || raw === "#") return {};
  try {
    return JSON.parse(raw) as DbRow;
  } catch {
    return {};
  }
}

function resourceUrl(row: DbRow) {
  return value(row, ["url", "public_url", "signed_url"], "#");
}

function resourceType(row: DbRow) {
  return value(row, ["asset_type", "file_type", "resource_type"], "Resource");
}

function mediaUrlForLesson(lesson: DbRow, assets: DbRow[]) {
  const direct = value(lesson, ["video_url", "media_url", "video"]);
  if (direct) return direct;
  const asset = assets.find((item) => ["video", "mp4", "hosted video"].includes(resourceType(item).toLowerCase()) && resourceUrl(item) !== "#");
  return asset ? resourceUrl(asset) : "";
}

function posterForLesson(lesson: DbRow, assets: DbRow[]) {
  const direct = value(lesson, ["thumbnail_url", "poster_url", "image_url"]);
  if (direct) return direct;
  const asset = assets.find((item) => ["image", "course thumbnail"].includes(resourceType(item).toLowerCase()) && resourceUrl(item) !== "#");
  return asset ? resourceUrl(asset) : "";
}

function videoEmbedUrl(rawUrl: string) {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : rawUrl;
    }
    if (url.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${url.pathname.replace("/", "")}`;
    }
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : rawUrl;
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function isMp4(rawUrl: string) {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(rawUrl);
}

function courseMatchesParam(course: DbRow, param: string) {
  return [idOf(course), value(course, ["course_code"]), value(course, ["slug"]), safeSlug(courseTitle(course))]
    .filter(Boolean)
    .some((candidate) => candidate === param || safeSlug(candidate) === safeSlug(param));
}

function lessonMatchesParam(lesson: DbRow, param: string) {
  return [idOf(lesson), value(lesson, ["slug"]), safeSlug(lessonTitle(lesson))]
    .filter(Boolean)
    .some((candidate) => candidate === param || safeSlug(candidate) === safeSlug(param));
}

function enrollmentMatchesCourse(enrollment: DbRow, course: DbRow) {
  const enrollmentCourseId = value(enrollment, ["course_id"]);
  const enrollmentCourseName = value(enrollment, ["course_name", "program_name"]);
  return Boolean(
    (enrollmentCourseId && enrollmentCourseId === idOf(course)) ||
      (enrollmentCourseName &&
        [
          courseTitle(course),
          value(course, ["academic_division"]),
          value(course, ["certification_level"]),
          value(course, ["department_name"]),
          value(course, ["category", "course_category"])
        ]
          .filter(Boolean)
          .some((candidate) => sameText(candidate, enrollmentCourseName)))
  );
}

export default function StudentLessonViewerPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string; lessonId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<LessonState | null>(null);
  const [notes, setNotes] = useState("");
  const notesKey = state ? `aff:lesson-notes:${idOf(state.course)}:${idOf(state.lesson)}` : "";

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw new Error(`Unable to verify session: ${userError.message}`);
      if (!user) {
        router.replace(`/login?next=/student-courses/${params.courseId}/lessons/${params.lessonId}`);
        return;
      }

      const isAdmin = await getClientAdminStatus();
      const [courseResult, lessonResult, assetResult, progressResult] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("lessons").select("*").order("lesson_order"),
        supabase.from("course_assets").select("*").eq("asset_status", "Published").order("created_at", { ascending: false }),
        supabase.from("lesson_progress").select("*").eq("student_id", user.id)
      ]);

      const blockingError = courseResult.error ?? lessonResult.error ?? assetResult.error ?? progressResult.error;
      if (blockingError) throw new Error(`Unable to load lesson: ${blockingError.message}`);

      const courses = (courseResult.data ?? []) as DbRow[];
      const allLessons = (lessonResult.data ?? []) as DbRow[];
      const course = courses.find((item) => courseMatchesParam(item, params.courseId));
      if (!course) throw new Error("Course not found.");

      const courseLessons = allLessons
        .filter((item) => value(item, ["course_id"]) === idOf(course))
        .filter((item) => isAdmin || isPublished(item, ["publication_status", "status", "lesson_status"]))
        .sort((left, right) => lessonOrder(left) - lessonOrder(right) || Number(idOf(left)) - Number(idOf(right)));
      const lesson = courseLessons.find((item) => lessonMatchesParam(item, params.lessonId));
      if (!lesson) throw new Error("Lesson not found or not available.");

      if (!isAdmin && !isPublished(course, ["publication_status", "status"])) {
        router.replace("/student-courses");
        return;
      }

      let enrollment: DbRow | null = null;
      let studentName = user.email ?? "AFF Student";
      if (!isAdmin) {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("auth_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (studentError) throw new Error(`Unable to load student record: ${studentError.message}`);
        const studentId = student ? idOf(student) : "";
        studentName = value(student as DbRow | null, ["full_name", "student_name", "name"], studentName);
        if (!studentId) {
          router.replace("/student-courses");
          return;
        }

        const { data: enrollments, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("*")
          .eq("student_id", studentId);
        if (enrollmentError) throw new Error(`Unable to verify enrollment: ${enrollmentError.message}`);
        enrollment = ((enrollments ?? []) as DbRow[]).find((row) => enrollmentMatchesCourse(row, course)) ?? null;
        if (!enrollment) {
          router.replace("/student-courses");
          return;
        }
      }

      const assets = ((assetResult.data ?? []) as DbRow[]).filter((asset) => {
        const assetCourseId = value(asset, ["course_id"]);
        const assetLessonId = value(asset, ["lesson_id"]);
        return assetCourseId === idOf(course) && (!assetLessonId || assetLessonId === idOf(lesson));
      });

      setState({
        course,
        lesson,
        lessons: courseLessons,
        enrollment,
        assets,
        progressRows: (progressResult.data ?? []) as DbRow[],
        studentName,
        isAdmin
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load this lesson.");
    } finally {
      setLoading(false);
    }
  }, [params.courseId, params.lessonId, router]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  useEffect(() => {
    if (!notesKey) return;
    setNotes(window.localStorage.getItem(notesKey) ?? "");
  }, [notesKey]);

  const completedLessonIds = useMemo(() => new Set((state?.progressRows ?? []).map((row) => value(row, ["lesson_id"]))), [state?.progressRows]);
  const completed = state ? completedLessonIds.has(idOf(state.lesson)) : false;
  const totalLessons = state?.lessons.length ?? 0;
  const completedCount = state ? state.lessons.filter((lesson) => completedLessonIds.has(idOf(lesson))).length : 0;
  const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
  const lessonIndex = state ? state.lessons.findIndex((lesson) => idOf(lesson) === idOf(state.lesson)) : -1;
  const previousLesson = state && lessonIndex > 0 ? state.lessons[lessonIndex - 1] : null;
  const nextLesson = state && lessonIndex >= 0 && lessonIndex < state.lessons.length - 1 ? state.lessons[lessonIndex + 1] : null;

  async function toggleComplete() {
    if (!state || state.isAdmin) {
      setMessage("Administrators can preview lessons but do not create student progress records.");
      return;
    }

    const supabase = createClient();
    const courseId = idOf(state.course);
    const lessonId = idOf(state.lesson);
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(`Unable to verify student session: ${userError?.message ?? "No authenticated user found."}`);
      return;
    }

    if (!completed) {
      const { error: upsertError } = await supabase.from("lesson_progress").upsert(
        {
          student_id: user.id,
          course_id: courseId,
          lesson_id: lessonId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: "student_id,course_id,lesson_id" }
      );
      if (upsertError) {
        setMessage(`Unable to save completion: ${upsertError.message}`);
        return;
      }
      setMessage("Lesson marked complete. Progress saved to Supabase.");
      await loadLesson();
      return;
    }

    const { error: deleteError } = await supabase
      .from("lesson_progress")
      .delete()
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .eq("lesson_id", lessonId);

    if (deleteError) {
      setMessage(`Completion removal is not currently supported by database policy: ${deleteError.message}`);
      return;
    }
    setMessage("Lesson marked incomplete.");
    await loadLesson();
  }

  function saveNotes() {
    if (!notesKey) return;
    window.localStorage.setItem(notesKey, notes);
    setMessage("Lesson notes saved on this device only.");
  }

  if (loading) {
    return (
      <Section>
        <SectionInner>
          <div className="terminal-panel grid min-h-[420px] place-items-center p-8 text-center">
            <div>
              <Loader2 className="mx-auto animate-spin text-gold-300" size={36} />
              <p className="mt-5 text-xs font-semibold uppercase tracking-[.28em] text-gold-300">AFF Cinematic Lesson Viewer</p>
              <h1 className="mt-3 font-serif text-3xl text-white">Loading lesson experience</h1>
            </div>
          </div>
        </SectionInner>
      </Section>
    );
  }

  if (error || !state) {
    return (
      <Section>
        <SectionInner>
          <div className="terminal-panel p-8">
            <AlertCircle className="text-gold-300" size={30} />
            <h1 className="mt-4 font-serif text-3xl text-white">Lesson unavailable</h1>
            <p className="mt-3 text-sm leading-7 text-ink/72">{error || "Unable to load this lesson."}</p>
            <button type="button" onClick={loadLesson} className="mt-6 inline-flex items-center gap-2 bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950">
              <RotateCcw size={16} /> Retry
            </button>
          </div>
        </SectionInner>
      </Section>
    );
  }

  const mediaUrl = mediaUrlForLesson(state.lesson, state.assets);
  const posterUrl = posterForLesson(state.lesson, state.assets);
  const embedUrl = videoEmbedUrl(mediaUrl);
  const pdfUrl = value(state.lesson, ["pdf_notes_url"]);
  const resources = state.assets.filter((asset) => resourceType(asset) !== "Quiz" && resourceUrl(asset) !== "#");
  const overview = value(state.lesson, ["lesson_summary", "overview", "description"]);
  const fullText = value(state.lesson, ["full_content", "content", "lesson_content"]);
  const objectives = value(state.lesson, ["learning_objectives", "objectives"]);
  const keyConcepts = value(state.lesson, ["key_concepts", "concepts"]);
  const takeaways = value(state.lesson, ["key_takeaways", "takeaways"]);
  const vocabulary = value(state.lesson, ["vocabulary"]);
  const instructorNotes = value(state.lesson, ["instructor_notes"]);
  const exercise = value(state.lesson, ["practical_exercise", "exercise"]);
  const homework = state.assets.find((asset) => resourceType(asset) === "Assignment");
  const returnHref = `/courses/managed/${encodeURIComponent(value(state.course, ["course_code"], safeSlug(courseTitle(state.course))))}`;

  return (
    <>
      <section className="market-grid relative z-[1] border-b border-gold-500/20 bg-navy-900 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 border border-gold-500/24 bg-navy-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-[.24em] text-gold-300">
                <GraduationCap size={16} /> Academy for Financial Future
              </p>
              <h1 className="mt-5 font-serif text-4xl font-semibold text-white sm:text-5xl">{lessonTitle(state.lesson)}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/76">{courseTitle(state.course)}</p>
            </div>
            <Link href="/student-courses" className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300">
              <ArrowLeft size={16} /> Back to My Courses
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <HeroMetric label="Instructor" value="Dr. Jean R. Moricette" />
            <HeroMetric label="Lesson Sequence" value={`${lessonIndex + 1} of ${totalLessons}`} />
            <HeroMetric label="Enrollment" value={state.isAdmin ? "Administrator Preview" : value(state.enrollment, ["enrollment_status", "status"], "Active")} />
            <HeroMetric label="Course Progress" value={`${progressPercent}%`} />
          </div>
          <div className="mt-5">
            <ProgressBar value={progressPercent} />
          </div>
        </div>
      </section>

      <Section>
        <SectionInner className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <main className="grid gap-6">
            <section className="terminal-panel overflow-hidden">
              <div className="aspect-video bg-navy-950">
                {mediaUrl ? (
                  isMp4(mediaUrl) ? (
                    <video className="h-full w-full" controls poster={posterUrl || undefined}>
                      <source src={mediaUrl} />
                    </video>
                  ) : (
                    <iframe className="h-full w-full" src={embedUrl} title={lessonTitle(state.lesson)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  )
                ) : (
                  <div className="grid h-full place-items-center p-8 text-center">
                    <div>
                      <PlayCircle className="mx-auto text-gold-300" size={52} />
                      <h2 className="mt-5 font-serif text-3xl text-white">Lesson media is being prepared by the Academy.</h2>
                      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/68">The lesson content and resources remain available while the media team prepares the video experience.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="terminal-panel p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Lesson Completion</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{completed ? "Completed" : "Ready for study"}</h2>
                </div>
                <button type="button" onClick={toggleComplete} className="inline-flex min-h-12 items-center justify-center gap-2 bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 disabled:opacity-60" disabled={state.isAdmin}>
                  {completed ? <XCircle size={17} /> : <CheckCircle2 size={17} />}
                  {completed ? "Mark Incomplete" : "Mark Lesson Complete"}
                </button>
              </div>
              {message ? <p className="mt-4 text-sm text-gold-300">{message}</p> : null}
            </section>

            <ContentSection title="Overview" body={overview} />
            <ContentSection title="Learning Objectives" body={objectives} />
            <ContentSection title="Full Lesson Text" body={fullText} />
            <ContentSection title="Key Concepts" body={keyConcepts} />
            <ContentSection title="Key Takeaways" body={takeaways} />
            <ContentSection title="Vocabulary" body={vocabulary} />
            <ContentSection title="Instructor Notes" body={instructorNotes} />
            <ContentSection title="Practical Exercise" body={exercise} />
            {homework ? <ContentSection title="Homework Assignment" body={value(parseAssetPayload(homework), ["instructions"], value(homework, ["description", "asset_title"]))} /> : null}
          </main>

          <aside className="grid h-fit gap-6">
            <section className="terminal-panel p-5">
              <p className="text-xs uppercase tracking-[.2em] text-gold-300">Lesson Navigation</p>
              <div className="mt-4 grid gap-3">
                <LessonNavLink lesson={previousLesson} course={state.course} label="Previous Lesson" icon="previous" />
                <LessonNavLink lesson={nextLesson} course={state.course} label="Next Lesson" icon="next" />
                <Link href={returnHref} className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300">
                  <BookOpenCheck size={16} /> Return to Course
                </Link>
              </div>
            </section>

            <section className="terminal-panel p-5">
              <p className="text-xs uppercase tracking-[.2em] text-gold-300">Learning Resources</p>
              <div className="mt-4 grid gap-3">
                {pdfUrl ? <ResourceLink title="PDF Lesson Material" type="PDF Notes" href={pdfUrl} /> : null}
                {resources.length === 0 && !pdfUrl ? <p className="text-sm text-ink/65">No downloadable resources are attached to this lesson yet.</p> : null}
                {resources.map((asset) => (
                  <ResourceLink key={idOf(asset)} title={value(asset, ["asset_title", "file_name"], "Academy Resource")} type={resourceType(asset)} href={resourceUrl(asset)} />
                ))}
              </div>
            </section>

            <section className="terminal-panel p-5">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[.2em] text-gold-300">
                <NotebookPen size={16} /> Student Notes
              </p>
              <p className="mt-3 text-xs leading-6 text-ink/62">Saved on this device only.</p>
              <textarea className="field mt-4 min-h-44" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Capture private lesson notes, questions, and study reminders." />
              <button type="button" onClick={saveNotes} className="mt-3 w-full bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950">Save Notes</button>
            </section>

            <section className="terminal-panel flex items-start gap-3 p-5 text-sm text-ink/70">
              <ShieldCheck className="mt-1 shrink-0 text-gold-300" size={18} />
              <p>Completion records are scoped to the authenticated student and stored in Supabase lesson_progress.</p>
            </section>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}

function HeroMetric({ label, value: metricValue }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950/70 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-ink/50">{label}</p>
      <p className="mt-2 font-semibold text-white">{metricValue}</p>
    </div>
  );
}

function ContentSection({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <section className="terminal-panel p-6">
      <p className="text-xs uppercase tracking-[.2em] text-gold-300">{title}</p>
      <div className="mt-4 whitespace-pre-line text-sm leading-7 text-ink/76">{body}</div>
    </section>
  );
}

function LessonNavLink({ lesson, course, label, icon }: { lesson: DbRow | null; course: DbRow; label: string; icon: "previous" | "next" }) {
  if (!lesson) {
    return <span className="inline-flex min-h-11 items-center justify-center border border-gold-500/14 px-4 py-3 text-sm text-ink/40">{label}</span>;
  }
  const href = `/student-courses/${encodeURIComponent(idOf(course))}/lessons/${encodeURIComponent(idOf(lesson))}`;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300">
      {icon === "previous" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
      {label}
    </Link>
  );
}

function ResourceLink({ title, type, href }: { title: string; type: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-start gap-3 border border-gold-500/16 bg-navy-950 p-3 text-sm transition hover:border-gold-300">
      <FileText className="mt-1 shrink-0 text-gold-300" size={17} />
      <span>
        <span className="block font-semibold text-white">{title}</span>
        <span className="mt-1 inline-flex items-center gap-2 text-xs text-gold-300"><Download size={13} /> {type}</span>
      </span>
    </a>
  );
}
