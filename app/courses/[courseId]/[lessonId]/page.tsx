"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, PlayCircle, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress";
import { Section, SectionInner } from "@/components/section";
import {
  courseProgressStorageKey,
  getCourseById,
  getCourseProgressPercent,
  getLessonPath,
  getVideoEmbedUrl,
  isMp4Video,
  lessonNotesStorageKey,
  type CourseProgressMap
} from "@/lib/course-catalog";
import { createClient } from "@/lib/supabase";

type LessonNotesMap = Record<string, string>;
type LessonProgressRow = {
  course_id: string;
  lesson_id: string;
};

export default function LessonPage() {
  const params = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const course = getCourseById(params.courseId);
  const lessonIndex = course?.lessons.findIndex((item) => item.id === params.lessonId) ?? -1;
  const lesson = course && lessonIndex >= 0 ? course.lessons[lessonIndex] : undefined;
  const previousLesson = course && lessonIndex > 0 ? course.lessons[lessonIndex - 1] : undefined;
  const nextLesson = course && lessonIndex >= 0 && lessonIndex < course.lessons.length - 1 ? course.lessons[lessonIndex + 1] : undefined;

  const [progressMap, setProgressMap] = useState<CourseProgressMap>({});
  const [notesMap, setNotesMap] = useState<LessonNotesMap>({});
  const [notes, setNotes] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [message, setMessage] = useState("Add private lesson notes and mark the lesson complete when finished.");

  const noteKey = `${params.courseId}:${params.lessonId}`;

  useEffect(() => {
    async function loadProgress() {
      const savedProgress = window.localStorage.getItem(courseProgressStorageKey);
      const localProgress = savedProgress ? (JSON.parse(savedProgress) as CourseProgressMap) : {};

      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace(`/login?next=${encodeURIComponent(`/courses/${params.courseId}/${params.lessonId}`)}`);
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from("lesson_progress")
          .select("course_id, lesson_id")
          .eq("student_id", user.id);

        if (error) {
          setMessage(`Unable to load lesson progress: ${error.message}`);
          setProgressMap(localProgress);
          return;
        }

        const remoteProgress = (data ?? []).reduce<CourseProgressMap>((accumulator, row: LessonProgressRow) => {
          const existing = accumulator[row.course_id] ?? { enrolled: true, completedLessonIds: [] };
          accumulator[row.course_id] = {
            enrolled: true,
            completedLessonIds: Array.from(new Set([...existing.completedLessonIds, row.lesson_id])),
            resumeLessonId: existing.resumeLessonId
          };
          return accumulator;
        }, {});

        setProgressMap({ ...localProgress, ...remoteProgress });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Supabase error.";
        setMessage(`Unable to load lesson progress: ${message}`);
        setProgressMap(localProgress);
      }
    }

    loadProgress();

    const savedNotes = window.localStorage.getItem(lessonNotesStorageKey);
    if (savedNotes) {
      const parsed = JSON.parse(savedNotes) as LessonNotesMap;
      setNotesMap(parsed);
      setNotes(parsed[noteKey] ?? "");
    }
  }, [noteKey, params.courseId, params.lessonId, router]);

  useEffect(() => {
    if (!course || !lesson) return;
    setProgressMap((current) => {
      const existing = current[course.id] ?? { enrolled: true, completedLessonIds: [] };
      const next = {
        ...current,
        [course.id]: {
          ...existing,
          enrolled: true,
          resumeLessonId: lesson.id
        }
      };
      window.localStorage.setItem(courseProgressStorageKey, JSON.stringify(next));
      return next;
    });
  }, [course, lesson]);

  const progress = course ? progressMap[course.id] : undefined;
  const completed = Boolean(progress?.completedLessonIds.includes(params.lessonId));
  const percent = course ? getCourseProgressPercent(course, progress) : 0;
  const hasVideo = Boolean(lesson?.videoUrl.trim());
  const embedUrl = useMemo(() => (lesson && lesson.videoUrl.trim() ? getVideoEmbedUrl(lesson.videoUrl) : ""), [lesson]);

  function saveNotes() {
    const next = { ...notesMap, [noteKey]: notes };
    setNotesMap(next);
    window.localStorage.setItem(lessonNotesStorageKey, JSON.stringify(next));
    setMessage("Lesson notes saved.");
  }

  async function markComplete() {
    if (!course || !lesson) return;
    setSavingCompletion(true);

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const activeUserId = user?.id ?? userId;

      if (!activeUserId) {
        router.replace(`/login?next=${encodeURIComponent(`/courses/${course.id}/${lesson.id}`)}`);
        return;
      }

      const { error } = await supabase.from("lesson_progress").upsert(
        {
          student_id: activeUserId,
          course_id: course.id,
          lesson_id: lesson.id,
          completed_at: new Date().toISOString()
        },
        { onConflict: "student_id,course_id,lesson_id" }
      );

      if (error) {
        setMessage(`Unable to save lesson completion: ${error.message}`);
        return;
      }

      setProgressMap((current) => {
        const existing = current[course.id] ?? { enrolled: true, completedLessonIds: [] };
        const completedLessonIds = existing.completedLessonIds.includes(lesson.id)
          ? existing.completedLessonIds
          : [...existing.completedLessonIds, lesson.id];
        const next = {
          ...current,
          [course.id]: {
            enrolled: true,
            completedLessonIds,
            resumeLessonId: nextLesson?.id ?? lesson.id
          }
        };
        window.localStorage.setItem(courseProgressStorageKey, JSON.stringify(next));
        return next;
      });
      setMessage("Lesson marked complete. Course progress saved to Supabase.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Supabase error.";
      setMessage(`Unable to save lesson completion: ${message}`);
    } finally {
      setSavingCompletion(false);
    }
  }

  if (!course || !lesson) {
    return (
      <Section>
        <SectionInner>
          <div className="terminal-panel p-6">
            <p className="text-ink/72">Lesson not found.</p>
            <button className="mt-4 border border-gold-500/45 px-5 py-3 text-gold-300" type="button" onClick={() => router.push("/courses")}>
              Back to Courses
            </button>
          </div>
        </SectionInner>
      </Section>
    );
  }

  return (
    <>
      <PageHeader eyebrow={course.title} title={lesson.title} text={lesson.overview} />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <div className="terminal-panel overflow-hidden">
              <div className="aspect-video bg-navy-950">
                {!hasVideo ? (
                  <div className="flex h-full flex-col items-center justify-center border-b border-gold-500/20 px-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center border border-gold-500/45 bg-navy-900 text-gold-300">
                      <PlayCircle size={34} />
                    </div>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[.28em] text-gold-300">Academy Lesson Media</p>
                    <h2 className="mt-3 text-3xl font-semibold text-white">Video Coming Soon</h2>
                    <p className="mt-3 max-w-xl leading-7 text-ink/70">
                      This lesson is prepared for official Academy for Financial Future video content. Review the objectives and resources below while the media is being finalized.
                    </p>
                  </div>
                ) : isMp4Video(lesson.videoUrl) ? (
                  <video className="h-full w-full" controls preload="metadata">
                    <source src={lesson.videoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <iframe
                    className="h-full w-full"
                    src={embedUrl}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[.22em] text-gold-300">Lesson Description</p>
                <p className="mb-5 leading-7 text-ink/76">{lesson.overview}</p>
                <div className="mb-2 flex justify-between text-sm text-ink/72">
                  <span>{progress?.completedLessonIds.length ?? 0} of {course.lessons.length} lessons completed</span>
                  <span className="text-gold-300">{percent}%</span>
                </div>
                <ProgressBar value={percent} />
              </div>
            </div>

            <div className="terminal-panel p-6">
              <h2 className="text-2xl font-semibold text-white">Lesson Summary</h2>
              <p className="mt-4 leading-7 text-ink/76">{lesson.summary}</p>
            </div>

            <div className="terminal-panel p-6">
              <h2 className="text-2xl font-semibold text-white">Lesson Objectives</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-ink/76">
                {lesson.objectives.map((objective) => (
                  <li key={objective} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-gold-300" size={17} />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="terminal-panel p-6">
              <h2 className="text-2xl font-semibold text-white">Lesson Notes</h2>
              <textarea
                className="mt-4 min-h-40 w-full border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="button" onClick={saveNotes}>
                  <Save size={18} /> Save Notes
                </button>
                <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-5 py-3 font-semibold text-gold-300 disabled:opacity-60" type="button" onClick={markComplete} disabled={savingCompletion}>
                  <CheckCircle2 size={18} /> {savingCompletion ? "Saving..." : completed ? "Completed" : "Mark Complete"}
                </button>
              </div>
              <p className="mt-3 text-sm text-ink/70">{message}</p>
            </div>
          </div>

          <aside className="grid h-fit gap-6">
            <div className="terminal-panel p-6">
              <h2 className="text-xl font-semibold text-white">Lesson Resources</h2>
              <div className="mt-4 grid gap-3">
                {lesson.pdfs.map((pdf) => (
                  <a key={pdf.href} href={pdf.href} className="inline-flex items-center gap-3 border border-gold-500/20 px-4 py-3 text-sm text-ink/78 hover:text-gold-300">
                    <Download size={17} /> {pdf.title}
                  </a>
                ))}
              </div>
            </div>

            <div className="terminal-panel p-6">
              <h2 className="text-xl font-semibold text-white">Lesson Navigation</h2>
              <div className="mt-4 grid gap-3">
                {previousLesson ? (
                  <Link href={getLessonPath(course.id, previousLesson.id)} className="inline-flex items-center gap-2 border border-gold-500/35 px-4 py-3 text-sm text-gold-300">
                    <ArrowLeft size={16} /> Previous Lesson
                  </Link>
                ) : (
                  <span className="border border-gold-500/15 px-4 py-3 text-sm text-ink/45">First lesson</span>
                )}
                {nextLesson ? (
                  <Link href={getLessonPath(course.id, nextLesson.id)} className="inline-flex items-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950">
                    Next Lesson <ArrowRight size={16} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 border border-gold-500/25 bg-navy-950 px-4 py-3 text-sm font-semibold text-gold-300/80">
                    Final Lesson
                  </span>
                )}
              </div>
            </div>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}
