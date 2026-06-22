"use client";

import { BookOpen, ClipboardCheck, FilePlus2, Layers3, Save, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
const adminEmail = "acafffx@gmail.com";

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return fallback;
}

export function AdminLmsManager() {
  const [message, setMessage] = useState("Loading AFF LMS administration...");
  const [authorized, setAuthorized] = useState(false);
  const [courses, setCourses] = useState<DbRow[]>([]);
  const [modules, setModules] = useState<DbRow[]>([]);
  const [lessons, setLessons] = useState<DbRow[]>([]);
  const [courseForm, setCourseForm] = useState({ code: "", name: "", description: "", thumbnailUrl: "", credits: "3", status: "Published" });
  const [moduleForm, setModuleForm] = useState({ courseId: "", title: "", description: "", order: "1" });
  const [lessonForm, setLessonForm] = useState({ courseId: "", moduleId: "", title: "", description: "", videoUrl: "", pdfUrl: "", order: "1", minutes: "20" });
  const [homeworkForm, setHomeworkForm] = useState({ courseId: "", moduleId: "", lessonId: "", title: "", instructions: "", fileUrl: "", dueDays: "7" });
  const [quizForm, setQuizForm] = useState({ courseId: "", moduleId: "", lessonId: "", title: "", prompt: "", options: "", correctAnswer: "", passingScore: "80" });

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() !== adminEmail) { setAuthorized(false); setMessage("Administrator access required."); return; }
      setAuthorized(true);
      const [courseResult, moduleResult, lessonResult] = await Promise.all([
        supabase.from("lms_courses").select("*").order("created_at", { ascending: false }),
        supabase.from("lms_modules").select("*").order("module_order"),
        supabase.from("lms_lessons").select("*").order("lesson_order")
      ]);
      const error = courseResult.error ?? moduleResult.error ?? lessonResult.error;
      if (error) throw error;
      setCourses((courseResult.data ?? []) as DbRow[]);
      setModules((moduleResult.data ?? []) as DbRow[]);
      setLessons((lessonResult.data ?? []) as DbRow[]);
      setMessage("AFF LMS administration ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the AFF LMS migration.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createCourse(event: FormEvent) {
    event.preventDefault(); const supabase = createClient();
    const { error } = await supabase.from("lms_courses").insert({ course_code: courseForm.code, course_name: courseForm.name, description: courseForm.description, thumbnail_url: courseForm.thumbnailUrl || null, credit_hours: Number(courseForm.credits), status: courseForm.status, instructor_name: "Dr. Jean Rene Moricette" });
    setMessage(error ? error.message : "Course created."); if (!error) { setCourseForm({ code: "", name: "", description: "", thumbnailUrl: "", credits: "3", status: "Published" }); await load(); }
  }

  async function createModule(event: FormEvent) {
    event.preventDefault(); const supabase = createClient();
    const { error } = await supabase.from("lms_modules").insert({ course_id: Number(moduleForm.courseId), module_title: moduleForm.title, module_description: moduleForm.description, module_order: Number(moduleForm.order) });
    setMessage(error ? error.message : "Module created."); if (!error) { setModuleForm({ courseId: "", title: "", description: "", order: "1" }); await load(); }
  }

  async function createLesson(event: FormEvent) {
    event.preventDefault(); const supabase = createClient();
    const { error } = await supabase.from("lms_lessons").insert({ course_id: Number(lessonForm.courseId), module_id: Number(lessonForm.moduleId), lesson_title: lessonForm.title, lesson_description: lessonForm.description, video_url: lessonForm.videoUrl || null, pdf_notes_url: lessonForm.pdfUrl || null, lesson_order: Number(lessonForm.order), estimated_minutes: Number(lessonForm.minutes), status: "Published" });
    setMessage(error ? error.message : "Lesson and resources created."); if (!error) { setLessonForm({ courseId: "", moduleId: "", title: "", description: "", videoUrl: "", pdfUrl: "", order: "1", minutes: "20" }); await load(); }
  }

  async function createHomework(event: FormEvent) {
    event.preventDefault(); const supabase = createClient();
    const { error } = await supabase.from("lms_homework_assignments").insert({ course_id: Number(homeworkForm.courseId), module_id: homeworkForm.moduleId ? Number(homeworkForm.moduleId) : null, lesson_id: homeworkForm.lessonId ? Number(homeworkForm.lessonId) : null, assignment_title: homeworkForm.title, instructions: homeworkForm.instructions, assignment_file_url: homeworkForm.fileUrl || null, due_days: Number(homeworkForm.dueDays), status: "Published" });
    setMessage(error ? error.message : "Homework assignment published."); if (!error) setHomeworkForm({ courseId: "", moduleId: "", lessonId: "", title: "", instructions: "", fileUrl: "", dueDays: "7" });
  }

  async function createQuiz(event: FormEvent) {
    event.preventDefault(); const supabase = createClient();
    const options = quizForm.options.split(",").map((item) => item.trim()).filter(Boolean);
    const { error } = await supabase.from("lms_quizzes").insert({ course_id: Number(quizForm.courseId), module_id: quizForm.moduleId ? Number(quizForm.moduleId) : null, lesson_id: quizForm.lessonId ? Number(quizForm.lessonId) : null, quiz_title: quizForm.title, questions: [{ prompt: quizForm.prompt, options, correctAnswer: quizForm.correctAnswer }], passing_score: Number(quizForm.passingScore), status: "Published" });
    setMessage(error ? error.message : "Quiz published."); if (!error) setQuizForm({ courseId: "", moduleId: "", lessonId: "", title: "", prompt: "", options: "", correctAnswer: "", passingScore: "80" });
  }

  if (!authorized) return <div className="terminal-panel p-6 text-ink/72">{message}</div>;
  const courseOptions = courses.map((course) => <option key={value(course, ["id"])} value={value(course, ["id"])}>{value(course, ["course_code"])} · {value(course, ["course_name"])}</option>);
  const moduleOptions = modules.map((module) => <option key={value(module, ["id"])} value={value(module, ["id"])}>{value(module, ["module_title"])}</option>);
  const lessonOptions = lessons.map((lesson) => <option key={value(lesson, ["id"])} value={value(lesson, ["id"])}>{value(lesson, ["lesson_title"])}</option>);
  return <section className="grid gap-6"><p className="text-sm text-ink/72">{message}</p><div className="grid gap-6 xl:grid-cols-2">
    <FormPanel title="Create Course" icon={<BookOpen size={21} />} onSubmit={createCourse}><input className="field" placeholder="Course code" value={courseForm.code} onChange={e => setCourseForm({ ...courseForm, code: e.target.value })} required /><input className="field" placeholder="Course name" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} required /><textarea className="field min-h-24" placeholder="Description" value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} /><input className="field" placeholder="Thumbnail URL" value={courseForm.thumbnailUrl} onChange={e => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><input className="field" type="number" min="0" step="0.5" value={courseForm.credits} onChange={e => setCourseForm({ ...courseForm, credits: e.target.value })} /><select className="field" value={courseForm.status} onChange={e => setCourseForm({ ...courseForm, status: e.target.value })}><option>Draft</option><option>Published</option><option>Archived</option></select></div></FormPanel>
    <FormPanel title="Create Module" icon={<Layers3 size={21} />} onSubmit={createModule}><Select label="Select course" value={moduleForm.courseId} onChange={next => setModuleForm({ ...moduleForm, courseId: next })}>{courseOptions}</Select><input className="field" placeholder="Module title" value={moduleForm.title} onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })} required /><textarea className="field min-h-24" placeholder="Module description" value={moduleForm.description} onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })} /><input className="field" type="number" min="1" value={moduleForm.order} onChange={e => setModuleForm({ ...moduleForm, order: e.target.value })} /></FormPanel>
    <FormPanel title="Create Lesson Resources" icon={<Video size={21} />} onSubmit={createLesson}><Select label="Select course" value={lessonForm.courseId} onChange={next => setLessonForm({ ...lessonForm, courseId: next })}>{courseOptions}</Select><Select label="Select module" value={lessonForm.moduleId} onChange={next => setLessonForm({ ...lessonForm, moduleId: next })}>{moduleOptions}</Select><input className="field" placeholder="Lesson title" value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required /><textarea className="field min-h-20" placeholder="Lesson description" value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} /><input className="field" placeholder="Video URL" value={lessonForm.videoUrl} onChange={e => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} /><input className="field" placeholder="PDF notes URL" value={lessonForm.pdfUrl} onChange={e => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><input className="field" type="number" min="1" value={lessonForm.order} onChange={e => setLessonForm({ ...lessonForm, order: e.target.value })} /><input className="field" type="number" min="1" value={lessonForm.minutes} onChange={e => setLessonForm({ ...lessonForm, minutes: e.target.value })} /></div></FormPanel>
    <FormPanel title="Upload Homework" icon={<FilePlus2 size={21} />} onSubmit={createHomework}><Select label="Select course" value={homeworkForm.courseId} onChange={next => setHomeworkForm({ ...homeworkForm, courseId: next })}>{courseOptions}</Select><Select label="Optional module" value={homeworkForm.moduleId} onChange={next => setHomeworkForm({ ...homeworkForm, moduleId: next })}>{moduleOptions}</Select><Select label="Optional lesson" value={homeworkForm.lessonId} onChange={next => setHomeworkForm({ ...homeworkForm, lessonId: next })}>{lessonOptions}</Select><input className="field" placeholder="Assignment title" value={homeworkForm.title} onChange={e => setHomeworkForm({ ...homeworkForm, title: e.target.value })} required /><textarea className="field min-h-24" placeholder="Instructions" value={homeworkForm.instructions} onChange={e => setHomeworkForm({ ...homeworkForm, instructions: e.target.value })} /><input className="field" placeholder="Assignment file URL" value={homeworkForm.fileUrl} onChange={e => setHomeworkForm({ ...homeworkForm, fileUrl: e.target.value })} /><input className="field" type="number" min="1" value={homeworkForm.dueDays} onChange={e => setHomeworkForm({ ...homeworkForm, dueDays: e.target.value })} /></FormPanel>
    <FormPanel title="Create Quiz" icon={<ClipboardCheck size={21} />} onSubmit={createQuiz}><Select label="Select course" value={quizForm.courseId} onChange={next => setQuizForm({ ...quizForm, courseId: next })}>{courseOptions}</Select><Select label="Optional module" value={quizForm.moduleId} onChange={next => setQuizForm({ ...quizForm, moduleId: next })}>{moduleOptions}</Select><Select label="Optional lesson" value={quizForm.lessonId} onChange={next => setQuizForm({ ...quizForm, lessonId: next })}>{lessonOptions}</Select><input className="field" placeholder="Quiz title" value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} required /><input className="field" placeholder="Question" value={quizForm.prompt} onChange={e => setQuizForm({ ...quizForm, prompt: e.target.value })} required /><input className="field" placeholder="Options separated by commas" value={quizForm.options} onChange={e => setQuizForm({ ...quizForm, options: e.target.value })} required /><input className="field" placeholder="Correct answer" value={quizForm.correctAnswer} onChange={e => setQuizForm({ ...quizForm, correctAnswer: e.target.value })} required /><input className="field" type="number" min="0" max="100" value={quizForm.passingScore} onChange={e => setQuizForm({ ...quizForm, passingScore: e.target.value })} /></FormPanel>
  </div><section className="terminal-panel p-5"><h2 className="text-xl font-semibold text-white">Managed Curriculum</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{courses.map(course => <article key={value(course, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4"><p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(course, ["course_code"])} · {value(course, ["status"])}</p><h3 className="mt-2 font-semibold text-white">{value(course, ["course_name"])}</h3><p className="mt-2 text-sm text-ink/65">{modules.filter(module => value(module, ["course_id"]) === value(course, ["id"])).length} modules · {lessons.filter(lesson => value(lesson, ["course_id"]) === value(course, ["id"])).length} lessons</p></article>)}</div></section></section>;
}

function FormPanel({ title, icon, onSubmit, children }: { title: string; icon: ReactNode; onSubmit: (event: FormEvent) => void; children: ReactNode }) { return <form className="terminal-panel grid gap-3 p-5" onSubmit={onSubmit}><div className="mb-2 flex items-center gap-3 text-gold-300">{icon}<h2 className="text-xl font-semibold text-white">{title}</h2></div>{children}<button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit"><Save size={17} /> Save</button></form>; }
function Select({ label, value: selected, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) { return <select className="field" value={selected} onChange={event => onChange(event.target.value)} required={label.startsWith("Select")}><option value="">{label}</option>{children}</select>; }
