"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, BookOpen, Download, FileText, PlayCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/progress";
import { getClientAdminStatus } from "@/lib/admin-client";
import { hasFullCourseAccess } from "@/lib/membership-state";
import { normalizeQuizQuestionRecord, type NormalizedQuizQuestion } from "@/lib/quiz-question";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type QuizQuestion = NormalizedQuizQuestion;

function value(row: DbRow | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return fallback;
}

function idOf(row: DbRow) {
  return value(row, ["id"]);
}

function questionsOf(row: DbRow): QuizQuestion[] {
  const questions = row.questions;
  return Array.isArray(questions) ? questions.map((question) => normalizeQuizQuestionRecord(question)) : [];
}

function safeSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isPublished(row: DbRow, keys: string[]) {
  const status = value(row, keys);
  if (!status) return true;
  return status.trim().toLowerCase() === "published";
}

function parseAssetPayload(row: DbRow) {
  const raw = value(row, ["signed_url"]);
  if (!raw || raw === "#") return null;
  try {
    return JSON.parse(raw) as { quizTitle?: string; quiz_title?: string; question?: unknown; questions?: unknown[]; instructions?: string; dueDays?: number; passingScore?: number };
  } catch {
    return null;
  }
}

function quizRowsFromAssets(assets: DbRow[]) {
  const grouped = new Map<string, DbRow>();
  for (const asset of assets.filter((row) => value(row, ["asset_type"]) === "Quiz" && value(row, ["asset_status"], "Published") === "Published")) {
    const payload = parseAssetPayload(asset);
    const sourceQuestions = Array.isArray(payload?.questions) ? payload.questions : [payload?.question ?? asset];
    const normalizedQuestions = sourceQuestions
      .map((question) => normalizeQuizQuestionRecord(question, value(asset, ["asset_title"])))
      .filter((question) => question.questionText);
    if (!normalizedQuestions.length) continue;
    const quizTitle = payload?.quizTitle || payload?.quiz_title || value(asset, ["asset_title"], "AFF Quiz");
    const key = `${value(asset, ["course_id"])}::${value(asset, ["lesson_id"])}::${quizTitle}`;
    const existing = grouped.get(key);
    const points = normalizedQuestions.reduce((total, question) => total + Number(question.points ?? 1), 0);
    if (existing) {
      existing.questions = [...questionsOf(existing), ...normalizedQuestions];
      existing.file_size = Number(value(existing, ["file_size"], "0")) + points;
    } else {
      grouped.set(key, {
        ...asset,
        id: key,
        quiz_title: quizTitle,
        passing_score: String(payload?.passingScore ?? "80"),
        questions: normalizedQuestions,
        file_size: points
      });
    }
  }
  return Array.from(grouped.values());
}

export function LmsCourseCenter({ courseCode }: { courseCode?: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [studentDbId, setStudentDbId] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [message, setMessage] = useState("Loading AFF Course Management System...");
  const [courses, setCourses] = useState<DbRow[]>([]);
  const [modules, setModules] = useState<DbRow[]>([]);
  const [lessons, setLessons] = useState<DbRow[]>([]);
  const [homework, setHomework] = useState<DbRow[]>([]);
  const [quizzes, setQuizzes] = useState<DbRow[]>([]);
  const [enrollments, setEnrollments] = useState<DbRow[]>([]);
  const [progress, setProgress] = useState<DbRow[]>([]);
  const [attempts, setAttempts] = useState<DbRow[]>([]);
  const [certificates, setCertificates] = useState<DbRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({});
  const [hasPaidAccess, setHasPaidAccess] = useState(false);

  const loadLms = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Sign in to enroll and track course progress.");
        return;
      }
      if (await getClientAdminStatus()) {
        router.replace("/admin/course-management");
        return;
      }
      setUserId(user.id);
      setStudentName(user.user_metadata?.full_name ?? user.email ?? "AFF Student");
      const { data: studentRecord } = await supabase
        .from("students")
        .select("id, full_name")
        .or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const internalStudentId = studentRecord?.id ? String(studentRecord.id) : "";
      setStudentDbId(internalStudentId);
      if (studentRecord?.full_name) setStudentName(String(studentRecord.full_name));
      const { data: membership } = await supabase
        .from("student_memberships")
        .select("selected_membership_plan, active_membership_plan, membership_plan, account_status, payment_status, membership_status")
        .eq("student_id", user.id)
        .maybeSingle();
      setHasPaidAccess(hasFullCourseAccess(membership));
      const [courseResult, lessonResult, assetResult, enrollmentResult, progressResult, attemptResult, certificateResult] = await Promise.all([
        supabase.from("courses").select("*").order("created_at"),
        supabase.from("lessons").select("*").order("lesson_order"),
        supabase.from("course_assets").select("*").eq("asset_status", "Published").order("created_at"),
        internalStudentId ? supabase.from("enrollments").select("*").eq("student_id", internalStudentId) : Promise.resolve({ data: [], error: null }),
        supabase.from("lesson_progress").select("*").eq("student_id", user.id),
        supabase.from("exams").select("*").eq("student_id", user.id),
        supabase.from("certificates").select("*").eq("student_id", user.id)
      ]);
      const requiredError = courseResult.error ?? lessonResult.error ?? assetResult.error;
      if (requiredError) throw requiredError;
      const assets = (assetResult.data ?? []) as DbRow[];
      setCourses((courseResult.data ?? []) as DbRow[]);
      setModules(assets.filter((asset) => value(asset, ["asset_type"]) === "Module"));
      setLessons((lessonResult.data ?? []) as DbRow[]);
      setHomework(assets.filter((asset) => value(asset, ["asset_type"]) === "Assignment"));
      setQuizzes(quizRowsFromAssets(assets));
      setEnrollments(enrollmentResult.error ? [] : (enrollmentResult.data ?? []) as DbRow[]);
      setProgress(progressResult.error ? [] : (progressResult.data ?? []) as DbRow[]);
      setAttempts(attemptResult.error ? [] : (attemptResult.data ?? []) as DbRow[]);
      setCertificates(certificateResult.error ? [] : (certificateResult.data ?? []) as DbRow[]);
      setMessage("AFF Course Management System synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the AFF LMS migration to enable managed courses.");
    }
  }, [router]);

  useEffect(() => { loadLms(); }, [loadLms]);

  const enrollmentByCourse = useMemo(() => new Map(enrollments.map((row) => [value(row, ["course_id"]), row])), [enrollments]);
  const enrollmentForCourse = useCallback((course: DbRow) => {
    const courseId = idOf(course);
    return enrollments.find((row) => {
      const enrollmentCourseId = value(row, ["course_id"]);
      const enrollmentCourseName = value(row, ["course_name", "program_name"]);
      return Boolean(
        (enrollmentCourseId && enrollmentCourseId === courseId) ||
          (enrollmentCourseName &&
            [
              value(course, ["course_name", "title"]),
              value(course, ["academic_division"]),
              value(course, ["certification_level"]),
              value(course, ["department_name"]),
              value(course, ["category", "course_category"])
            ]
              .filter(Boolean)
              .some((candidate) => sameText(candidate, enrollmentCourseName)))
      );
    });
  }, [enrollments]);
  const completedLessonIds = useMemo(() => new Set(progress.map(id => value(id, ["lesson_id"]))), [progress]);
  const publishedCourses = useMemo(() => courses.filter((course) => isPublished(course, ["publication_status", "status"])), [courses]);
  const publishedLessons = useMemo(() => lessons.filter((lesson) => isPublished(lesson, ["publication_status", "status", "lesson_status"])), [lessons]);

  function coursePercent(courseId: string) {
    const courseLessons = publishedLessons.filter((lesson) => value(lesson, ["course_id"]) === courseId);
    if (!courseLessons.length) return 0;
    return Math.round((courseLessons.filter((lesson) => completedLessonIds.has(idOf(lesson))).length / courseLessons.length) * 100);
  }

  async function enroll(courseId: string) {
    if (!userId || !studentDbId) return;
    const supabase = createClient();
    const course = courses.find((item) => idOf(item) === courseId);
    const courseName = value(course, ["course_name", "title"], "Selected course");
    const existingEnrollment = enrollmentForCourse(course ?? {});
    if (existingEnrollment) {
      setMessage(`${courseName} is already active in your Academy enrollments.`);
      return;
    }

    const { data, error } = await supabase
      .from("enrollments")
      .insert({
        student_id: Number(studentDbId),
        course_id: Number(courseId),
        course_name: courseName,
        enrollment_status: "Active"
      })
      .select("id, student_id, course_id, course_name, enrollment_status")
      .single();

    if (error) {
      const message = error.message.toLowerCase().includes("duplicate") || error.code === "23505"
        ? `${courseName} is already active in your Academy enrollments.`
        : `Enrollment failed: ${error.message}`;
      setMessage(message);
      return;
    }

    if (!data) {
      setMessage("Enrollment failed: Supabase did not return the created enrollment record.");
      return;
    }

    setMessage(`${courseName} enrollment active.`);
    await loadLms();
  }

  async function issueCertificate(course: DbRow, newlyPassedQuizId = "") {
    const courseId = idOf(course);
    if (certificates.some((certificate) => value(certificate, ["course_name"]) === value(course, ["course_name", "title"]))) return;
    const requiredQuizzes = quizzes.filter((quiz) => value(quiz, ["course_id"]) === courseId);
    const passedQuizIds = new Set(attempts.filter((attempt) => value(attempt, ["result"]) === "Pass").map((attempt) => value(attempt, ["exam_title"])));
    if (newlyPassedQuizId) passedQuizIds.add(newlyPassedQuizId);
    if (requiredQuizzes.some((quiz) => !passedQuizIds.has(value(quiz, ["quiz_title"])))) return;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const supabase = createClient();
    await supabase.from("certificates").insert({
      certificate_number: `AFF-${new Date().getFullYear()}-${token.slice(-8)}`,
      student_id: userId,
      course_name: value(course, ["course_name", "title"]),
      student_name: studentName,
      score: 100,
      issue_date: new Date().toISOString().slice(0, 10),
      verification_code: `AFF-${token}`
    });

    const { data: credit } = await supabase.from("course_credits").select("id,credits").eq("course_code", value(course, ["course_code"])).maybeSingle();
    if (credit) {
      const { data: existingCredit } = await supabase.from("student_credits").select("id").eq("student_id", userId).eq("course_credit_id", credit.id).maybeSingle();
      if (!existingCredit) {
        await supabase.from("student_credits").insert({ student_id: userId, student_name: studentName, course_credit_id: credit.id, course_title: value(course, ["course_name"]), credits_earned: credit.credits, grade: "Pass", completion_status: "Completed", completed_at: new Date().toISOString().slice(0, 10) });
        const degreeName = value(course, ["degree_pathway"]);
        if (degreeName) {
          const { data: degree } = await supabase.from("academic_degree_programs").select("credits_required,degree_level").eq("degree_name", degreeName).maybeSingle();
          const { data: degreeProgress } = await supabase.from("student_degree_progress").select("id,credits_completed").eq("student_id", userId).eq("degree_name", degreeName).order("created_at", { ascending: false }).limit(1).maybeSingle();
          const creditsRequired = Number(degree?.credits_required ?? 0);
          const creditsCompleted = Number(degreeProgress?.credits_completed ?? 0) + Number(credit.credits ?? 0);
          const completionPercentage = creditsRequired ? Math.min(100, Math.round((creditsCompleted / creditsRequired) * 100)) : 0;
          const degreePayload = { student_id: userId, student_name: studentName, degree_name: degreeName, degree_type: degree?.degree_level ?? "Professional Program", college_name: value(course, ["department_name"], "AFF Global University"), credits_completed: creditsCompleted, credits_required: creditsRequired, completion_percentage: completionPercentage, progress_status: completionPercentage >= 100 ? "Completed" : "In Progress", updated_at: new Date().toISOString() };
          if (degreeProgress?.id) await supabase.from("student_degree_progress").update(degreePayload).eq("id", degreeProgress.id);
          else await supabase.from("student_degree_progress").insert(degreePayload);
        }
      }
      const { data: existingTranscript } = await supabase.from("university_transcripts").select("id").eq("student_id", userId).eq("course_title", value(course, ["course_name"])).maybeSingle();
      if (!existingTranscript) await supabase.from("university_transcripts").insert({ student_id: userId, student_name: studentName, program_name: value(course, ["degree_pathway"], "AFF Global University"), course_title: value(course, ["course_name", "title"]), grade: "Pass", credit_hours: credit.credits, transcript_status: "Completed", notes: value(course, ["certification_title"]) });
    }
  }

  async function submitQuiz(course: DbRow, quiz: DbRow) {
    if (!userId) return;
    if (!hasPaidAccess) {
      setMessage("Upgrade to an active paid membership to submit quizzes and unlock certification progress.");
      return;
    }
    const quizQuestions = questionsOf(quiz);
    if (!quizQuestions.length) return;
    const quizAnswers = answers[idOf(quiz)] ?? {};
    const totalPoints = quizQuestions.reduce((total, question) => total + Number(question.points ?? 1), 0);
    const earnedPoints = quizQuestions.reduce((total, question, index) => total + (quizAnswers[index] === question.correctAnswer ? Number(question.points ?? 1) : 0), 0);
    const score = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const result = score >= Number(value(quiz, ["passing_score"], "80")) ? "Pass" : "Fail";
    const supabase = createClient();
    const { error } = await supabase.from("exams").insert({ student_id: userId, exam_title: value(quiz, ["quiz_title"], "AFF Quiz"), answers: quizAnswers, score, result });
    setMessage(error ? error.message : `Quiz submitted: ${score}% (${result}).`);
    if (!error) {
      if (result === "Pass" && coursePercent(idOf(course)) === 100) await issueCertificate(course, value(quiz, ["quiz_title"]));
      await loadLms();
    }
  }

  function courseMatches(course: DbRow) {
    if (!courseCode) return true;
    return [value(course, ["course_code"]), value(course, ["course_name", "title"]), safeSlug(value(course, ["course_name", "title"]))]
      .filter(Boolean)
      .some((candidate) => candidate === courseCode || safeSlug(candidate) === safeSlug(courseCode));
  }

  return (
    <section className="grid gap-6">
      <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs uppercase tracking-[.22em] text-gold-300">AFF CMS / LMS</p><h2 className="mt-2 text-2xl font-semibold text-white">Managed Course Library</h2><p className="mt-2 text-sm text-ink/68">{message}</p></div>
        <div className="text-sm text-ink/70">{enrollments.length} enrolled · {certificates.length} certificates</div>
      </div>

      {publishedCourses.filter(courseMatches).length === 0 ? <p className="terminal-panel p-5 text-ink/68">No published AFF courses found.</p> : null}
      {publishedCourses.filter(courseMatches).map((course) => {
        const courseId = idOf(course);
        const enrolled = enrollmentByCourse.has(courseId) || Boolean(enrollmentForCourse(course));
        const percent = coursePercent(courseId);
        const courseModules = modules.filter((module) => value(module, ["course_id"]) === courseId);
        const courseSections = courseModules.length ? courseModules : [{ id: `lessons-${courseId}`, module_title: "Lessons", course_id: courseId }];
        const certificate = certificates.find((item) => value(item, ["course_name"]) === value(course, ["course_name", "title"]));
        const courseName = value(course, ["course_name", "title"]);
        const courseLinkKey = value(course, ["course_code"], safeSlug(courseName));
        return (
          <article key={courseId} className="terminal-panel overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
              <Link href={`/courses/managed/${encodeURIComponent(courseLinkKey)}`} className="min-h-48 border-b border-gold-500/20 bg-navy-950 bg-cover bg-center lg:border-b-0 lg:border-r" style={value(course, ["thumbnail_url"]) ? { backgroundImage: `url(${value(course, ["thumbnail_url"])})` } : undefined}>
                {!value(course, ["thumbnail_url"]) ? <div className="grid h-full min-h-48 place-items-center"><BookOpen className="text-gold-300" size={54} /></div> : null}
              </Link>
              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-xs uppercase tracking-[.2em] text-gold-300">{value(course, ["department_name"], "AFF Global University")} · {value(course, ["duration"], "Managed Course")}</p><Link href={`/courses/managed/${encodeURIComponent(courseLinkKey)}`}><h3 className="mt-2 text-2xl font-semibold text-white hover:text-gold-300">{courseName}</h3></Link><p className="mt-3 leading-7 text-ink/70">{value(course, ["description"])}</p>{value(course, ["certification_title"]) ? <p className="mt-3 text-sm font-semibold text-gold-300">Certification: {value(course, ["certification_title"])}</p> : null}</div>
                  <button className="shrink-0 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-60" disabled={enrolled} onClick={() => enroll(courseId)}>{enrolled ? "Enrolled" : "Enroll"}</button>
                </div>
                <div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>{percent}% complete</span><span className="text-gold-300">{value(course, ["instructor", "instructor_name"])}</span></div><ProgressBar value={percent} /></div>
                {certificate ? <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300"><Award size={17} /> Certificate · {value(certificate, ["certificate_number"])}</p> : null}
              </div>
            </div>

            {enrolled ? <div className="grid gap-px bg-gold-500/14">
              {courseSections.map((module) => {
                const moduleId = idOf(module);
                const moduleLessons = publishedLessons.filter((lesson) => value(lesson, ["course_id"]) === courseId);
                return <section key={moduleId} className="bg-navy-950 p-5"><h4 className="text-lg font-semibold text-white">{value(module, ["module_title", "asset_title"])}</h4><p className="mt-2 text-sm text-ink/65">{value(module, ["module_description"])}</p><div className="mt-4 grid gap-3">{moduleLessons.map((lesson) => {
                  const lessonId = idOf(lesson); const done = completedLessonIds.has(lessonId);
                  const lessonHref = `/student-courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`;
                  return <article key={lessonId} className="border border-gold-500/18 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Link href={lessonHref} className="font-semibold text-white transition hover:text-gold-300">{value(lesson, ["lesson_title", "title"])}</Link><p className="mt-1 text-sm text-ink/65">{value(lesson, ["description"])}</p></div><Link className="inline-flex items-center justify-center gap-2 border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300 transition hover:border-gold-300 hover:text-white" href={lessonHref}><PlayCircle size={15} /> {done ? "Review Lesson" : "Open Lesson"}</Link></div><div className="mt-3 flex flex-wrap gap-2">{done ? <span className="inline-flex items-center gap-2 text-sm text-gold-300">Complete</span> : null}{value(lesson, ["video_url"]) ? <a className="inline-flex items-center gap-2 text-sm text-gold-300" href={value(lesson, ["video_url"])} target="_blank" rel="noreferrer"><PlayCircle size={15} /> Video</a> : null}{value(lesson, ["pdf_notes_url"]) ? <a className="inline-flex items-center gap-2 text-sm text-gold-300" href={value(lesson, ["pdf_notes_url"])} target="_blank" rel="noreferrer"><Download size={15} /> PDF Notes</a> : null}</div></article>;
                })}</div></section>;
              })}
              {homework.filter((item) => value(item, ["course_id"]) === courseId).map((item) => { const payload = parseAssetPayload(item); return <article key={idOf(item)} className="bg-navy-950 p-5"><p className="text-xs uppercase tracking-[.2em] text-gold-300">Homework · Due in {String(payload?.dueDays ?? "7")} days</p><h4 className="mt-2 font-semibold text-white">{value(item, ["asset_title"])}</h4><p className="mt-2 text-sm text-ink/68">{payload?.instructions ?? ""}</p>{value(item, ["url", "public_url"]) && value(item, ["url", "public_url"]) !== "#" ? <a className="mt-3 inline-flex items-center gap-2 text-sm text-gold-300" href={value(item, ["url", "public_url"])}><FileText size={15} /> Assignment File</a> : null}</article>; })}
              {quizzes.filter((quiz) => value(quiz, ["course_id"]) === courseId).map((quiz) => <article key={idOf(quiz)} className="bg-navy-950 p-5"><p className="text-xs uppercase tracking-[.2em] text-gold-300">Quiz · Passing {value(quiz, ["passing_score"], "80")}% · {value(quiz, ["file_size"], "1")} points</p><h4 className="mt-2 font-semibold text-white">{value(quiz, ["quiz_title"])}</h4><div className="mt-4 grid gap-4">{questionsOf(quiz).map((questionRecord, index) => {
                console.log(questionRecord);
                return (
                  <label key={`${idOf(quiz)}-${index}`} className="grid gap-2 text-sm text-ink/72">
                    <span>{questionRecord.questionText || questionRecord.prompt} <span className="text-gold-300">({questionRecord.points ?? 1} point{Number(questionRecord.points ?? 1) === 1 ? "" : "s"})</span></span>
                    <div className="grid gap-1 text-xs text-ink/60">
                      {questionRecord.options.map((option, optionIndex) => <span key={`${idOf(quiz)}-${index}-display-${optionIndex}`}>Option {String.fromCharCode(65 + optionIndex)}: {option}</span>)}
                    </div>
                    <select className="field" value={answers[idOf(quiz)]?.[index] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [idOf(quiz)]: { ...(current[idOf(quiz)] ?? {}), [index]: event.target.value } }))}><option value="">Select answer</option>{questionRecord.options.map((option) => <option key={option}>{option}</option>)}</select>
                  </label>
                );
              })}</div><button className="mt-4 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" onClick={() => submitQuiz(course, quiz)}>Submit Quiz</button></article>)}
            </div> : null}
          </article>
        );
      })}
      <div className="terminal-panel flex items-center gap-3 p-5 text-sm text-ink/70"><ShieldCheck className="text-gold-300" size={20} /> Course certificates unlock when all lessons are complete and all required quizzes are passed.</div>
    </section>
  );
}
