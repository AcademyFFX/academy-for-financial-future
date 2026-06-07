"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, Save } from "lucide-react";
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
  lessonNotesStorageKey,
  type CourseProgressMap
} from "@/lib/course-catalog";

type LessonNotesMap = Record<string, string>;

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
  const [message, setMessage] = useState("Add private lesson notes and mark the lesson complete when finished.");

  const noteKey = `${params.courseId}:${params.lessonId}`;

  useEffect(() => {
    const savedProgress = window.localStorage.getItem(courseProgressStorageKey);
    if (savedProgress) setProgressMap(JSON.parse(savedProgress) as CourseProgressMap);

    const savedNotes = window.localStorage.getItem(lessonNotesStorageKey);
    if (savedNotes) {
      const parsed = JSON.parse(savedNotes) as LessonNotesMap;
      setNotesMap(parsed);
      setNotes(parsed[noteKey] ?? "");
    }
  }, [noteKey]);

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
  const embedUrl = useMemo(() => (lesson ? getVideoEmbedUrl(lesson.videoUrl) : ""), [lesson]);

  function saveNotes() {
    const next = { ...notesMap, [noteKey]: notes };
    setNotesMap(next);
    window.localStorage.setItem(lessonNotesStorageKey, JSON.stringify(next));
    setMessage("Lesson notes saved.");
  }

  function markComplete() {
    if (!course || !lesson) return;

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
    setMessage("Lesson marked complete. Course progress updated.");
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
              <div className="aspect-video bg-black">
                <iframe
                  className="h-full w-full"
                  src={embedUrl}
                  title={lesson.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="p-6">
                <div className="mb-2 flex justify-between text-sm text-ink/72">
                  <span>{progress?.completedLessonIds.length ?? 0} of {course.lessons.length} lessons completed</span>
                  <span className="text-gold-300">{percent}%</span>
                </div>
                <ProgressBar value={percent} />
              </div>
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
                <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-5 py-3 font-semibold text-gold-300" type="button" onClick={markComplete}>
                  <CheckCircle2 size={18} /> {completed ? "Completed" : "Mark Complete"}
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
                  <Link href="/courses" className="inline-flex items-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950">
                    Finish Course <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}
