"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpenCheck,
  CalendarCheck,
  GraduationCap,
  Loader2,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  UserRound
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ProgressBar } from "@/components/progress";
import { Section, SectionInner } from "@/components/section";
import { getClientAdminStatus } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type CourseCard = {
  id: string;
  key: string;
  title: string;
  division: string;
  instructor: string;
  enrollmentStatus: string;
  enrolledAt: string;
  thumbnailUrl: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  nextLessonTitle: string;
  certificationStatus: string;
  continueHref: string;
  hasLessons: boolean;
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

function safeSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function formattedDate(raw: string) {
  if (!raw) return "Enrollment date pending";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isPublishedLesson(row: DbRow) {
  const status = value(row, ["status", "lesson_status", "publication_status", "asset_status"]);
  if (!status) return true;
  return ["published", "active", "available"].includes(status.trim().toLowerCase());
}

function lessonOrder(row: DbRow) {
  const order = Number(value(row, ["lesson_order", "order_index", "sort_order"], "0"));
  return Number.isFinite(order) ? order : 0;
}

function courseTitle(row: DbRow | null | undefined, fallback = "Academy Course") {
  return value(row, ["course_name", "title", "name"], fallback);
}

function courseDivision(row: DbRow | null | undefined) {
  return value(row, ["department_name", "department", "course_category", "category", "certification_level"], "Academy for Financial Future");
}

function courseInstructor(row: DbRow | null | undefined) {
  return value(row, ["instructor_name", "instructor"], "Dr. Jean R. Moricette");
}

function courseLinkKey(row: DbRow | null | undefined, fallbackId: string, fallbackTitle: string) {
  return value(row, ["course_code", "slug"], safeSlug(fallbackTitle) || fallbackId);
}

function courseMatchesEnrollment(course: DbRow, enrollment: DbRow) {
  const enrollmentCourseId = value(enrollment, ["course_id"]);
  if (enrollmentCourseId && idOf(course) === enrollmentCourseId) return true;
  const enrollmentCourseName = value(enrollment, ["course_name", "program_name"]);
  return Boolean(enrollmentCourseName && sameText(courseTitle(course), enrollmentCourseName));
}

function lessonsForCourse(lessons: DbRow[], courseId: string) {
  return lessons
    .filter((lesson) => value(lesson, ["course_id"]) === courseId && isPublishedLesson(lesson))
    .sort((left, right) => lessonOrder(left) - lessonOrder(right) || Number(idOf(left)) - Number(idOf(right)));
}

function certificateForCourse(certificates: DbRow[], course: DbRow | null, title: string, courseId: string) {
  return certificates.find((certificate) => {
    const certificateCourseId = value(certificate, ["course_id"]);
    const certificateCourseName = value(certificate, ["course_name", "certificate_name", "certification_name"]);
    return Boolean((certificateCourseId && certificateCourseId === courseId) || (certificateCourseName && sameText(certificateCourseName, title)) || (course && certificateCourseName && sameText(certificateCourseName, value(course, ["certification_title"]))));
  });
}

function studentDisplayName(userEmail: string, student: DbRow | null) {
  return value(student, ["full_name", "student_name", "name"], userEmail || "AFF Student");
}

function buildCards({
  enrollments,
  courses,
  lessons,
  progressRows,
  certificates
}: {
  enrollments: DbRow[];
  courses: DbRow[];
  lessons: DbRow[];
  progressRows: DbRow[];
  certificates: DbRow[];
}) {
  return enrollments.map((enrollment, index): CourseCard => {
    const course = courses.find((item) => courseMatchesEnrollment(item, enrollment)) ?? null;
    const courseId = course ? idOf(course) : value(enrollment, ["course_id"], `pending-${index}`);
    const title = courseTitle(course, value(enrollment, ["course_name", "program_name"], "Academy Course"));
    const courseLessons = course ? lessonsForCourse(lessons, courseId) : [];
    const lessonIds = new Set(courseLessons.map((lesson) => idOf(lesson)));
    const completedLessonIds = new Set(
      progressRows
        .filter((row) => value(row, ["course_id"]) === courseId && lessonIds.has(value(row, ["lesson_id"])))
        .map((row) => value(row, ["lesson_id"]))
    );
    const completedLessons = completedLessonIds.size;
    const totalLessons = courseLessons.length;
    const progressPercentage = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const nextLesson = totalLessons ? courseLessons.find((lesson) => !completedLessonIds.has(idOf(lesson))) ?? courseLessons[totalLessons - 1] : null;
    const certificate = certificateForCourse(certificates, course, title, courseId);
    const certificationStatus = certificate ? "Certified" : progressPercentage >= 100 && totalLessons > 0 ? "Eligible" : "In Progress";
    const key = courseLinkKey(course, courseId, title);

    return {
      id: value(enrollment, ["id"], `${courseId}-${index}`),
      key,
      title,
      division: courseDivision(course),
      instructor: courseInstructor(course),
      enrollmentStatus: value(enrollment, ["enrollment_status", "status"], "Active"),
      enrolledAt: formattedDate(value(enrollment, ["enrolled_at", "created_at"])),
      thumbnailUrl: value(course, ["thumbnail_url", "image_url", "course_thumbnail"]),
      progressPercentage,
      completedLessons,
      totalLessons,
      nextLessonTitle: nextLesson ? value(nextLesson, ["lesson_title", "title"], "Next lesson") : "Course materials are being prepared.",
      certificationStatus,
      continueHref: `/courses/managed/${encodeURIComponent(key)}`,
      hasLessons: totalLessons > 0
    };
  });
}

export default function StudentCoursesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [membershipLine, setMembershipLine] = useState("");
  const [cards, setCards] = useState<CourseCard[]>([]);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw new Error(`Unable to verify session: ${userError.message}`);
      if (!user) {
        router.replace("/login?next=/student-courses");
        return;
      }

      if (await getClientAdminStatus()) {
        router.replace("/admin");
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("auth_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (studentError) throw new Error(`Unable to load your student record: ${studentError.message}`);

      const studentId = student ? idOf(student) : "";
      setStudentName(studentDisplayName(user.email ?? "", student ?? null));

      if (!studentId) {
        setCards([]);
        setMembershipLine("Student enrollment record pending.");
        setLoading(false);
        return;
      }

      const [enrollmentResult, courseResult, lessonResult, progressResult, certificateResult, membershipResult] = await Promise.all([
        supabase.from("enrollments").select("*").eq("student_id", studentId).order("enrolled_at", { ascending: false }),
        supabase.from("courses").select("*").order("course_name"),
        supabase.from("lessons").select("*").order("lesson_order"),
        supabase.from("lesson_progress").select("*").eq("student_id", user.id),
        supabase.from("certificates").select("*").eq("student_id", user.id),
        supabase
          .from("student_memberships")
          .select("selected_membership_plan, active_membership_plan, membership_plan, account_status, payment_status, membership_status")
          .eq("student_id", user.id)
          .maybeSingle()
      ]);

      const blockingError = enrollmentResult.error ?? courseResult.error ?? lessonResult.error ?? progressResult.error ?? certificateResult.error;
      if (blockingError) throw new Error(`Unable to load My Courses: ${blockingError.message}`);

      const membership = membershipResult.data as DbRow | null;
      const activePlan = value(membership, ["active_membership_plan", "membership_plan"], value(student, ["membership_plan"], "Membership pending"));
      const membershipStatus = value(membership, ["membership_status", "account_status"], value(student, ["status"], "Status pending"));
      setMembershipLine(`${activePlan} · ${membershipStatus}`);

      setCards(
        buildCards({
          enrollments: (enrollmentResult.data ?? []) as DbRow[],
          courses: (courseResult.data ?? []) as DbRow[],
          lessons: (lessonResult.data ?? []) as DbRow[],
          progressRows: (progressResult.data ?? []) as DbRow[],
          certificates: (certificateResult.data ?? []) as DbRow[]
        })
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load your Academy courses.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  if (loading) {
    return (
      <Section>
        <SectionInner>
          <div className="terminal-panel grid min-h-[420px] place-items-center p-8 text-center">
            <div>
              <Loader2 className="mx-auto animate-spin text-gold-300" size={36} />
              <p className="mt-5 text-xs font-semibold uppercase tracking-[.28em] text-gold-300">Student Academic Portal</p>
              <h1 className="mt-3 font-serif text-3xl text-white">Loading My Courses</h1>
              <p className="mt-3 text-sm text-ink/68">Verifying your Academy session and course enrollments.</p>
            </div>
          </div>
        </SectionInner>
      </Section>
    );
  }

  if (error) {
    return (
      <Section>
        <SectionInner>
          <div className="terminal-panel p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <AlertCircle className="shrink-0 text-gold-300" size={30} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.24em] text-gold-300">Student Academic Portal</p>
                <h1 className="mt-3 font-serif text-3xl text-white">Unable to load My Courses</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/72">{error}</p>
                <button
                  type="button"
                  onClick={loadCourses}
                  className="mt-6 inline-flex items-center gap-2 bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 transition hover:bg-gold-300"
                >
                  <RotateCcw size={16} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        </SectionInner>
      </Section>
    );
  }

  return (
    <>
      <section className="market-grid relative z-[1] border-b border-gold-500/20 bg-navy-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="inline-flex items-center gap-3 border border-gold-500/24 bg-navy-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-[.24em] text-gold-300">
            <GraduationCap size={16} />
            STUDENT ACADEMIC PORTAL
          </div>
          <h1 className="mt-5 font-serif text-4xl font-semibold text-white sm:text-5xl">My Courses</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/78">
            Continue your studies, review your progress, and advance toward Academy certification.
          </p>
          <div className="mt-8 grid gap-4 border border-gold-500/18 bg-navy-950/70 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
                <UserRound size={16} />
                Welcome, {studentName}
              </p>
              <p className="mt-2 text-sm text-ink/65">{membershipLine}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink/70">
              <BookOpenCheck className="text-gold-300" size={18} />
              {cards.length} active course{cards.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionInner>
          {cards.length === 0 ? (
            <div className="terminal-panel p-8 text-center">
              <ShieldCheck className="mx-auto text-gold-300" size={42} />
              <h2 className="mt-4 font-serif text-3xl text-white">No active courses yet</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/70">
                Once your enrollment is approved, your Academy courses will appear here.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/courses" className="border border-gold-500/40 px-5 py-3 text-sm font-semibold text-gold-300 transition hover:border-gold-300 hover:text-white">
                  View Course Library
                </Link>
                <Link href="/enrollment" className="bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 transition hover:bg-gold-300">
                  Apply for Enrollment
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((course) => (
                <article key={course.id} className="terminal-panel overflow-hidden">
                  <CourseThumbnail course={course} />
                  <div className="grid gap-5 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-300">{course.division}</p>
                      <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-white">{course.title}</h2>
                    </div>

                    <div className="grid gap-3 text-sm text-ink/70">
                      <InfoLine label="Instructor" value={course.instructor} />
                      <InfoLine label="Enrollment" value={course.enrollmentStatus} />
                      <InfoLine label="Enrolled" value={course.enrolledAt} icon={<CalendarCheck size={15} />} />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-white">Progress</span>
                        <span className="font-bold text-gold-300">{course.progressPercentage}%</span>
                      </div>
                      <ProgressBar value={course.progressPercentage} />
                      <p className="mt-2 text-sm text-ink/68">
                        {course.completedLessons} of {course.totalLessons} lessons completed
                      </p>
                    </div>

                    <div className="border border-gold-500/16 bg-navy-950/55 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[.18em] text-gold-300">{course.completedLessons > 0 ? "Next Lesson" : "Current Lesson"}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{course.nextLessonTitle}</p>
                      {!course.hasLessons ? <p className="mt-2 text-xs text-ink/60">Course materials are being prepared.</p> : null}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
                        <Award size={16} />
                        Certification: {course.certificationStatus}
                      </p>
                      <Link
                        href={course.continueHref}
                        className="inline-flex min-h-11 items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 transition hover:bg-gold-300"
                      >
                        Continue Learning
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionInner>
      </Section>
    </>
  );
}

function InfoLine({ label, value: text, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gold-500/12 pb-2 last:border-0 last:pb-0">
      <span className="inline-flex items-center gap-2 text-ink/56">
        {icon}
        {label}
      </span>
      <span className="text-right font-semibold text-ink/82">{text}</span>
    </div>
  );
}

function CourseThumbnail({ course }: { course: CourseCard }) {
  if (course.thumbnailUrl) {
    return (
      <div
        className="min-h-48 border-b border-gold-500/20 bg-navy-950 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(180deg,rgba(10,24,51,0.08),rgba(10,24,51,0.84)),url(${course.thumbnailUrl})` }}
      />
    );
  }

  return (
    <div className="grid min-h-48 place-items-center border-b border-gold-500/20 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_34%),linear-gradient(135deg,#0A1833,#111F3E)] p-5 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center border border-gold-500/45 bg-navy-950/70 text-xl font-serif font-bold text-gold-300">AFF</div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[.2em] text-gold-300">{course.division}</p>
        <h3 className="mt-2 font-serif text-xl font-semibold leading-tight text-white">{course.title}</h3>
        <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-ink/70">
          <PlayCircle size={14} />
          Academic course portal
        </p>
      </div>
    </div>
  );
}
