"use client";

import Link from "next/link";
import { Award, BookOpenCheck, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/progress";
import { createClient } from "@/lib/supabase";

type Enrollment = { id: string; course_id: number | null; course_name: string | null; progress_percentage: number; enrollment_status: string };
type Course = { id: number; course_name: string; duration: string | null };

export function LmsDashboardSummary() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificateCount, setCertificateCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [enrollmentResult, courseResult, certificateResult] = await Promise.all([
          supabase.from("enrollments").select("id,course_id,course_name,progress_percentage,enrollment_status").eq("student_id", user.id),
          supabase.from("courses").select("id,course_name,duration"),
          supabase.from("certificates").select("id", { count: "exact", head: true }).eq("student_id", user.id)
        ]);
        if (!enrollmentResult.error) setEnrollments((enrollmentResult.data ?? []) as Enrollment[]);
        if (!courseResult.error) setCourses((courseResult.data ?? []) as Course[]);
        if (!certificateResult.error) setCertificateCount(certificateResult.count ?? 0);
      } catch { /* LMS migration may not be applied yet. */ }
    }
    load();
  }, []);

  return <section className="terminal-panel p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-[.22em] text-gold-300">AFF Managed Learning</p><h2 className="mt-2 text-2xl font-semibold text-white">Course Management Progress</h2></div><div className="flex gap-4 text-sm text-ink/68"><span className="inline-flex items-center gap-2"><BookOpenCheck size={16} /> {enrollments.length} enrolled</span><span className="inline-flex items-center gap-2"><Award size={16} /> {certificateCount} certificates</span></div></div><div className="mt-5 grid gap-4">{enrollments.length === 0 ? <p className="text-sm text-ink/68">Enroll in a managed course to begin live progress tracking.</p> : enrollments.map(enrollment => { const course = courses.find(item => item.id === enrollment.course_id); return <article key={enrollment.id} className="border border-gold-500/18 bg-navy-950 p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-semibold text-white">{course?.course_name ?? enrollment.course_name ?? "AFF Managed Course"}</p><p className="mt-1 text-xs text-gold-300">{course?.duration ?? enrollment.enrollment_status}</p></div><span className="text-sm text-gold-300">{enrollment.progress_percentage}%</span></div><div className="mt-3"><ProgressBar value={enrollment.progress_percentage} /></div></article>; })}</div><Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold-300" href="/courses"><PlayCircle size={16} /> Open Learning Center</Link></section>;
}
