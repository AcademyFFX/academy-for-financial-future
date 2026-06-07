"use client";

import { BookOpen, CheckCircle2, FileDown, PlayCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/progress";
import {
  courseCatalog,
  courseProgressStorageKey,
  getCourseProgressPercent,
  getResumeLesson,
  type CourseProgressMap
} from "@/lib/course-catalog";
import { downloads } from "@/lib/data";

export function CourseManagement() {
  const [progressMap, setProgressMap] = useState<CourseProgressMap>({});

  useEffect(() => {
    const saved = window.localStorage.getItem(courseProgressStorageKey);
    if (saved) setProgressMap(JSON.parse(saved) as CourseProgressMap);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(courseProgressStorageKey, JSON.stringify(progressMap));
  }, [progressMap]);

  const enrolledCount = useMemo(() => Object.values(progressMap).filter((progress) => progress.enrolled).length, [progressMap]);

  function enroll(courseId: string) {
    setProgressMap((current) => ({
      ...current,
      [courseId]: current[courseId]?.enrolled
        ? current[courseId]
        : { enrolled: true, completedLessonIds: [], resumeLessonId: undefined }
    }));
  }

  function toggleLesson(courseId: string, lessonId: string) {
    setProgressMap((current) => {
      const existing = current[courseId] ?? { enrolled: true, completedLessonIds: [] };
      const completed = existing.completedLessonIds.includes(lessonId)
        ? existing.completedLessonIds.filter((id) => id !== lessonId)
        : [...existing.completedLessonIds, lessonId];

      return {
        ...current,
        [courseId]: {
          enrolled: true,
          completedLessonIds: completed,
          resumeLessonId: lessonId
        }
      };
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-5">
        {courseCatalog.map((course) => {
          const progress = progressMap[course.id];
          const percent = getCourseProgressPercent(course, progress);
          const resumeLesson = getResumeLesson(course, progress);

          return (
            <article key={course.id} className="terminal-panel p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">{course.level}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{course.title}</h2>
                  <p className="mt-3 leading-7 text-ink/72">{course.summary}</p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center justify-center gap-2 bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 disabled:opacity-70"
                  type="button"
                  onClick={() => enroll(course.id)}
                  disabled={progress?.enrolled}
                >
                  <BookOpen size={17} /> {progress?.enrolled ? "Enrolled" : "Enroll"}
                </button>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span>{progress?.completedLessonIds.length ?? 0} of {course.lessons.length} lessons completed</span>
                  <span className="text-gold-300">{percent}%</span>
                </div>
                <ProgressBar value={percent} />
              </div>

              {progress?.enrolled ? (
                <div className="mt-5 border border-gold-500/20 bg-navy-950 p-4">
                  <p className="inline-flex items-center gap-2 text-sm text-gold-300">
                    <PlayCircle size={16} /> Resume: {resumeLesson?.title}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                {course.lessons.map((lesson) => {
                  const completed = progress?.completedLessonIds.includes(lesson.id) ?? false;
                  return (
                    <button
                      key={lesson.id}
                      className="flex items-center justify-between gap-4 border border-gold-500/20 bg-navy-950 px-4 py-3 text-left text-sm disabled:opacity-45"
                      type="button"
                      onClick={() => toggleLesson(course.id, lesson.id)}
                      disabled={!progress?.enrolled}
                    >
                      <span className="flex items-center gap-3 text-ink/78">
                        <CheckCircle2 className={completed ? "text-gold-300" : "text-ink/35"} size={18} />
                        {lesson.title}
                      </span>
                      <span className="shrink-0 text-ink/52">{lesson.duration}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <aside className="terminal-panel h-fit p-6">
        <h2 className="text-xl font-semibold text-white">Course Center</h2>
        <div className="mt-5 grid gap-4 border-b border-gold-500/20 pb-5 text-sm text-ink/72">
          <p><span className="text-gold-300">Enrolled Courses:</span> {enrolledCount}</p>
          <p><span className="text-gold-300">Available Courses:</span> {courseCatalog.length}</p>
        </div>
        <h3 className="mt-5 text-sm font-semibold uppercase tracking-[.22em] text-gold-300">PDF Downloads</h3>
        <div className="mt-4 grid gap-3">
          {downloads.map((download) => (
            <a key={download.title} href={download.href} className="flex items-center gap-3 border border-gold-500/20 px-4 py-3 text-sm text-ink/78 hover:text-gold-300">
              <FileDown size={17} /> {download.title}
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}
