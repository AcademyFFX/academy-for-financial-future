"use client";

import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Download, FileText, PlayCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProgressBar } from "@/components/progress";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type QuizQuestion = { prompt: string; options: string[]; correctAnswer: string };

function value(row: DbRow, keys: string[], fallback = "") {
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
  return Array.isArray(questions) ? questions as QuizQuestion[] : [];
}

export function LmsCourseCenter({ courseCode }: { courseCode?: string }) {
  const [userId, setUserId] = useState("");
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

  const loadLms = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Sign in to enroll and track course progress.");
        return;
      }
      setUserId(user.id);
      setStudentName(user.user_metadata?.full_name ?? user.email ?? "AFF Student");
      const [courseResult, moduleResult, lessonResult, homeworkResult, quizResult, enrollmentResult, progressResult, attemptResult, certificateResult] = await Promise.all([
        supabase.from("lms_courses").select("*").eq("status", "Published").order("created_at"),
        supabase.from("lms_modules").select("*").order("module_order"),
        supabase.from("lms_lessons").select("*").eq("status", "Published").order("lesson_order"),
        supabase.from("lms_homework_assignments").select("*").eq("status", "Published").order("created_at"),
        supabase.from("lms_quizzes").select("*").eq("status", "Published").order("created_at"),
        supabase.from("lms_enrollments").select("*").eq("student_id", user.id),
        supabase.from("lms_lesson_progress").select("*").eq("student_id", user.id),
        supabase.from("lms_quiz_attempts").select("*").eq("student_id", user.id),
        supabase.from("lms_course_certificates").select("*").eq("student_id", user.id)
      ]);
      const requiredError = courseResult.error ?? moduleResult.error ?? lessonResult.error ?? enrollmentResult.error ?? progressResult.error;
      if (requiredError) throw requiredError;
      setCourses((courseResult.data ?? []) as DbRow[]);
      setModules((moduleResult.data ?? []) as DbRow[]);
      setLessons((lessonResult.data ?? []) as DbRow[]);
      setHomework((homeworkResult.data ?? []) as DbRow[]);
      setQuizzes((quizResult.data ?? []) as DbRow[]);
      setEnrollments((enrollmentResult.data ?? []) as DbRow[]);
      setProgress((progressResult.data ?? []) as DbRow[]);
      setAttempts((attemptResult.data ?? []) as DbRow[]);
      setCertificates((certificateResult.data ?? []) as DbRow[]);
      setMessage("AFF Course Management System synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the AFF LMS migration to enable managed courses.");
    }
  }, []);

  useEffect(() => { loadLms(); }, [loadLms]);

  const enrollmentByCourse = useMemo(() => new Map(enrollments.map((row) => [value(row, ["course_id"]), row])), [enrollments]);
  const completedLessonIds = useMemo(() => new Set(progress.map(id => value(id, ["lesson_id"]))), [progress]);

  function coursePercent(courseId: string) {
    const courseLessons = lessons.filter((lesson) => value(lesson, ["course_id"]) === courseId);
    if (!courseLessons.length) return 0;
    return Math.round((courseLessons.filter((lesson) => completedLessonIds.has(idOf(lesson))).length / courseLessons.length) * 100);
  }

  async function enroll(courseId: string) {
    if (!userId) return;
    const supabase = createClient();
    const { error } = await supabase.from("lms_enrollments").upsert({ student_id: userId, course_id: Number(courseId), enrollment_status: "Active" }, { onConflict: "student_id,course_id" });
    setMessage(error ? error.message : "Course enrollment active.");
    if (!error) await loadLms();
  }

  async function issueCertificate(course: DbRow, newlyPassedQuizId = "") {
    const courseId = idOf(course);
    if (certificates.some((certificate) => value(certificate, ["course_id"]) === courseId)) return;
    const requiredQuizzes = quizzes.filter((quiz) => value(quiz, ["course_id"]) === courseId);
    const passedQuizIds = new Set(attempts.filter((attempt) => value(attempt, ["result"]) === "Pass").map((attempt) => value(attempt, ["quiz_id"])));
    if (newlyPassedQuizId) passedQuizIds.add(newlyPassedQuizId);
    if (requiredQuizzes.some((quiz) => !passedQuizIds.has(idOf(quiz)))) return;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const supabase = createClient();
    await supabase.from("lms_course_certificates").upsert({
      certificate_number: `AFF-LMS-${new Date().getFullYear()}-${token.slice(-8)}`,
      student_id: userId,
      course_id: Number(courseId),
      course_name: value(course, ["course_name"]),
      certification_name: value(course, ["certification_title"], `${value(course, ["course_name"])} Certificate`),
      student_name: studentName,
      verification_code: `AFF-${token}`
    }, { onConflict: "student_id,course_id" });

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
      if (!existingTranscript) await supabase.from("university_transcripts").insert({ student_id: userId, student_name: studentName, program_name: value(course, ["degree_pathway"], "AFF Global University"), course_title: value(course, ["course_name"]), grade: "Pass", credit_hours: credit.credits, transcript_status: "Completed", notes: value(course, ["certification_title"]) });
    }
  }

  async function completeLesson(course: DbRow, lesson: DbRow) {
    if (!userId) return;
    const courseId = idOf(course);
    const lessonId = idOf(lesson);
    const supabase = createClient();
    const { error } = await supabase.from("lms_lesson_progress").upsert({ student_id: userId, course_id: Number(courseId), lesson_id: Number(lessonId) }, { onConflict: "student_id,lesson_id" });
    if (error) { setMessage(error.message); return; }
    const nextCompleted = new Set([...Array.from(completedLessonIds), lessonId]);
    const courseLessons = lessons.filter((item) => value(item, ["course_id"]) === courseId);
    const percent = courseLessons.length ? Math.round((courseLessons.filter((item) => nextCompleted.has(idOf(item))).length / courseLessons.length) * 100) : 0;
    await supabase.from("lms_enrollments").update({ progress_percentage: percent, completed_at: percent === 100 ? new Date().toISOString() : null }).eq("student_id", userId).eq("course_id", Number(courseId));
    if (percent === 100) await issueCertificate(course);
    setMessage(percent === 100 ? "Course lessons complete. Certificate eligibility checked." : "Lesson marked complete.");
    await loadLms();
  }

  async function submitQuiz(course: DbRow, quiz: DbRow) {
    if (!userId) return;
    const quizQuestions = questionsOf(quiz);
    if (!quizQuestions.length) return;
    const quizAnswers = answers[idOf(quiz)] ?? {};
    const correct = quizQuestions.filter((question, index) => quizAnswers[index] === question.correctAnswer).length;
    const score = Math.round((correct / quizQuestions.length) * 100);
    const result = score >= Number(value(quiz, ["passing_score"], "80")) ? "Pass" : "Fail";
    const supabase = createClient();
    const { error } = await supabase.from("lms_quiz_attempts").insert({ student_id: userId, course_id: Number(idOf(course)), quiz_id: Number(idOf(quiz)), answers: quizAnswers, score, result });
    setMessage(error ? error.message : `Quiz submitted: ${score}% (${result}).`);
    if (!error) {
      if (result === "Pass" && coursePercent(idOf(course)) === 100) await issueCertificate(course, idOf(quiz));
      await loadLms();
    }
  }

  return (
    <section className="grid gap-6">
      <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs uppercase tracking-[.22em] text-gold-300">AFF CMS / LMS</p><h2 className="mt-2 text-2xl font-semibold text-white">Managed Course Library</h2><p className="mt-2 text-sm text-ink/68">{message}</p></div>
        <div className="text-sm text-ink/70">{enrollments.length} enrolled · {certificates.length} certificates</div>
      </div>

      {courses.filter((course) => !courseCode || value(course, ["course_code"]) === courseCode).length === 0 ? <p className="terminal-panel p-5 text-ink/68">No published LMS courses found.</p> : null}
      {courses.filter((course) => !courseCode || value(course, ["course_code"]) === courseCode).map((course) => {
        const courseId = idOf(course);
        const enrolled = enrollmentByCourse.has(courseId);
        const percent = coursePercent(courseId);
        const courseModules = modules.filter((module) => value(module, ["course_id"]) === courseId);
        const certificate = certificates.find((item) => value(item, ["course_id"]) === courseId);
        return (
          <article key={courseId} className="terminal-panel overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
              <Link href={`/courses/managed/${encodeURIComponent(value(course, ["course_code"]))}`} className="min-h-48 border-b border-gold-500/20 bg-navy-950 bg-cover bg-center lg:border-b-0 lg:border-r" style={value(course, ["thumbnail_url"]) ? { backgroundImage: `url(${value(course, ["thumbnail_url"])})` } : undefined}>
                {!value(course, ["thumbnail_url"]) ? <div className="grid h-full min-h-48 place-items-center"><BookOpen className="text-gold-300" size={54} /></div> : null}
              </Link>
              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-xs uppercase tracking-[.2em] text-gold-300">{value(course, ["department_name"], "AFF Global University")} · {value(course, ["course_code"])} · {value(course, ["credit_hours"], "1")} credits</p><Link href={`/courses/managed/${encodeURIComponent(value(course, ["course_code"]))}`}><h3 className="mt-2 text-2xl font-semibold text-white hover:text-gold-300">{value(course, ["course_name"])}</h3></Link><p className="mt-3 leading-7 text-ink/70">{value(course, ["description"])}</p>{value(course, ["certification_title"]) ? <p className="mt-3 text-sm font-semibold text-gold-300">Certification: {value(course, ["certification_title"])}</p> : null}</div>
                  <button className="shrink-0 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-60" disabled={enrolled} onClick={() => enroll(courseId)}>{enrolled ? "Enrolled" : "Enroll"}</button>
                </div>
                <div className="mt-5"><div className="mb-2 flex justify-between text-sm"><span>{percent}% complete</span><span className="text-gold-300">{value(course, ["instructor_name"])}</span></div><ProgressBar value={percent} /></div>
                {certificate ? <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300"><Award size={17} /> {value(certificate, ["certification_name"], "Certificate")} · {value(certificate, ["certificate_number"])}</p> : null}
              </div>
            </div>

            {enrolled ? <div className="grid gap-px bg-gold-500/14">
              {courseModules.map((module) => {
                const moduleId = idOf(module);
                const moduleLessons = lessons.filter((lesson) => value(lesson, ["module_id"]) === moduleId);
                return <section key={moduleId} className="bg-navy-950 p-5"><h4 className="text-lg font-semibold text-white">{value(module, ["module_title"])}</h4><p className="mt-2 text-sm text-ink/65">{value(module, ["module_description"])}</p><div className="mt-4 grid gap-3">{moduleLessons.map((lesson) => {
                  const lessonId = idOf(lesson); const done = completedLessonIds.has(lessonId);
                  return <article key={lessonId} className="border border-gold-500/18 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold text-white">{value(lesson, ["lesson_title"])}</p><p className="mt-1 text-sm text-ink/65">{value(lesson, ["lesson_description"])}</p></div><button className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300 disabled:opacity-60" disabled={done} onClick={() => completeLesson(course, lesson)}><CheckCircle2 size={15} /> {done ? "Complete" : "Mark Complete"}</button></div><div className="mt-3 flex flex-wrap gap-2">{value(lesson, ["video_url"]) ? <a className="inline-flex items-center gap-2 text-sm text-gold-300" href={value(lesson, ["video_url"])} target="_blank" rel="noreferrer"><PlayCircle size={15} /> Video</a> : null}{value(lesson, ["pdf_notes_url"]) ? <a className="inline-flex items-center gap-2 text-sm text-gold-300" href={value(lesson, ["pdf_notes_url"])} target="_blank" rel="noreferrer"><Download size={15} /> PDF Notes</a> : null}</div></article>;
                })}</div></section>;
              })}
              {homework.filter((item) => value(item, ["course_id"]) === courseId).map((item) => <article key={idOf(item)} className="bg-navy-950 p-5"><p className="text-xs uppercase tracking-[.2em] text-gold-300">Homework · Due in {value(item, ["due_days"], "7")} days</p><h4 className="mt-2 font-semibold text-white">{value(item, ["assignment_title"])}</h4><p className="mt-2 text-sm text-ink/68">{value(item, ["instructions"])}</p>{value(item, ["assignment_file_url"]) ? <a className="mt-3 inline-flex items-center gap-2 text-sm text-gold-300" href={value(item, ["assignment_file_url"])}><FileText size={15} /> Assignment File</a> : null}</article>)}
              {quizzes.filter((quiz) => value(quiz, ["course_id"]) === courseId).map((quiz) => <article key={idOf(quiz)} className="bg-navy-950 p-5"><p className="text-xs uppercase tracking-[.2em] text-gold-300">Quiz · Passing {value(quiz, ["passing_score"], "80")}%</p><h4 className="mt-2 font-semibold text-white">{value(quiz, ["quiz_title"])}</h4><div className="mt-4 grid gap-4">{questionsOf(quiz).map((question, index) => <label key={`${idOf(quiz)}-${index}`} className="grid gap-2 text-sm text-ink/72"><span>{question.prompt}</span><select className="field" value={answers[idOf(quiz)]?.[index] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [idOf(quiz)]: { ...(current[idOf(quiz)] ?? {}), [index]: event.target.value } }))}><option value="">Select answer</option>{question.options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div><button className="mt-4 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" onClick={() => submitQuiz(course, quiz)}>Submit Quiz</button></article>)}
            </div> : null}
          </article>
        );
      })}
      <div className="terminal-panel flex items-center gap-3 p-5 text-sm text-ink/70"><ShieldCheck className="text-gold-300" size={20} /> Course certificates unlock when all lessons are complete and all required quizzes are passed.</div>
    </section>
  );
}
