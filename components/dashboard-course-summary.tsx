"use client";

import Link from "next/link";
import { Award, BookOpen, PlayCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/progress";
import {
  courseCatalog,
  courseProgressStorageKey,
  getCourseProgressPercent,
  getResumeLesson,
  type CourseProgressMap
} from "@/lib/course-catalog";

export function DashboardCourseSummary() {
  const [progressMap, setProgressMap] = useState<CourseProgressMap>({});

  useEffect(() => {
    const saved = window.localStorage.getItem(courseProgressStorageKey);
    if (saved) setProgressMap(JSON.parse(saved) as CourseProgressMap);
  }, []);

  const enrolledCourses = useMemo(() => {
    return courseCatalog.filter((course) => progressMap[course.id]?.enrolled);
  }, [progressMap]);

  const certificatesEarned = enrolledCourses.filter((course) => getCourseProgressPercent(course, progressMap[course.id]) === 100).length;

  return (
    <section className="terminal-panel p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.24em] text-gold-300">Course Progress</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Enrolled Courses</h2>
        </div>
        <div className="flex gap-4 text-sm text-ink/72">
          <span className="inline-flex items-center gap-2"><BookOpen size={16} /> {enrolledCourses.length} enrolled</span>
          <span className="inline-flex items-center gap-2"><Award size={16} /> {certificatesEarned} earned</span>
        </div>
      </div>

      {enrolledCourses.length === 0 ? (
        <div className="mt-5 border border-gold-500/20 bg-navy-950 p-5">
          <p className="text-ink/72">No enrolled courses yet.</p>
          <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
            <PlayCircle size={16} /> Browse Forex Courses
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {enrolledCourses.map((course) => {
            const progress = progressMap[course.id];
            const percent = getCourseProgressPercent(course, progress);
            const resumeLesson = getResumeLesson(course, progress);
            return (
              <article key={course.id} className="border border-gold-500/20 bg-navy-950 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{course.title}</h3>
                    <p className="mt-1 text-sm text-ink/60">Resume: {resumeLesson?.title}</p>
                  </div>
                  <Link href="/courses" className="inline-flex items-center gap-2 text-sm text-gold-300">
                    <PlayCircle size={16} /> Continue
                  </Link>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-sm text-ink/72">
                    <span>{progress?.completedLessonIds.length ?? 0} of {course.lessons.length} lessons completed</span>
                    <span className="text-gold-300">{percent}%</span>
                  </div>
                  <ProgressBar value={percent} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
