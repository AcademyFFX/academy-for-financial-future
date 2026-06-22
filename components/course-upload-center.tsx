"use client";

import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileArchive,
  FileText,
  GraduationCap,
  ImageIcon,
  Layers3,
  Plus,
  Presentation,
  Save,
  UploadCloud,
  Users,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent, ReactNode } from "react";
import { ProgressBar } from "@/components/progress";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type QuizQuestion = { prompt: string; options: string[]; correctAnswer: string };
type AssetType = "Video" | "PDF Notes" | "PowerPoint" | "Assignment" | "Course Thumbnail";

const adminEmail = "acafffx@gmail.com";

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return fallback;
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return fallback;
}

export function CourseUploadCenter() {
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState("Loading AFF Course Upload Center...");
  const [uploading, setUploading] = useState<AssetType | null>(null);
  const [courses, setCourses] = useState<DbRow[]>([]);
  const [modules, setModules] = useState<DbRow[]>([]);
  const [lessons, setLessons] = useState<DbRow[]>([]);
  const [assets, setAssets] = useState<DbRow[]>([]);
  const [enrollments, setEnrollments] = useState<DbRow[]>([]);
  const [progressRows, setProgressRows] = useState<DbRow[]>([]);
  const [certificates, setCertificates] = useState<DbRow[]>([]);
  const [students, setStudents] = useState<DbRow[]>([]);
  const [target, setTarget] = useState({ courseId: "", moduleId: "", lessonId: "" });
  const [moduleForm, setModuleForm] = useState({ courseId: "", title: "", description: "", order: "1" });
  const [quizForm, setQuizForm] = useState({ courseId: "", moduleId: "", lessonId: "", title: "", passingScore: "80" });
  const [questionForm, setQuestionForm] = useState({ prompt: "", options: "", correctAnswer: "" });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [certificateForm, setCertificateForm] = useState({ studentId: "", courseId: "", certificationName: "" });

  const loadCenter = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() !== adminEmail) {
        setAuthorized(false);
        setMessage("Administrator access required for the Course Upload Center.");
        return;
      }
      setAuthorized(true);
      const [courseResult, moduleResult, lessonResult, assetResult, enrollmentResult, progressResult, certificateResult, studentResult] = await Promise.all([
        supabase.from("lms_courses").select("*").order("created_at", { ascending: false }),
        supabase.from("lms_modules").select("*").order("module_order"),
        supabase.from("lms_lessons").select("*").order("lesson_order"),
        supabase.from("lms_course_assets").select("*").order("created_at", { ascending: false }),
        supabase.from("lms_enrollments").select("*").order("enrolled_at", { ascending: false }),
        supabase.from("lms_lesson_progress").select("*").order("completed_at", { ascending: false }),
        supabase.from("lms_course_certificates").select("*").order("created_at", { ascending: false }),
        supabase.from("student_profiles").select("auth_user_id,student_id,full_name,email,enrollment_status").order("full_name")
      ]);
      const error = courseResult.error ?? moduleResult.error ?? lessonResult.error ?? assetResult.error ?? enrollmentResult.error ?? progressResult.error ?? certificateResult.error;
      if (error) throw error;
      setCourses((courseResult.data ?? []) as DbRow[]);
      setModules((moduleResult.data ?? []) as DbRow[]);
      setLessons((lessonResult.data ?? []) as DbRow[]);
      setAssets((assetResult.data ?? []) as DbRow[]);
      setEnrollments((enrollmentResult.data ?? []) as DbRow[]);
      setProgressRows((progressResult.data ?? []) as DbRow[]);
      setCertificates((certificateResult.data ?? []) as DbRow[]);
      if (!studentResult.error) setStudents((studentResult.data ?? []) as DbRow[]);
      setMessage("AFF Course Upload Center synchronized.");
    } catch (error) {
      setMessage(errorMessage(error, "Run the Course Upload Center migration to enable Supabase Storage."));
    }
  }, []);

  useEffect(() => { loadCenter(); }, [loadCenter]);

  const selectedModules = useMemo(() => modules.filter((module) => !target.courseId || value(module, ["course_id"]) === target.courseId), [modules, target.courseId]);
  const selectedLessons = useMemo(() => lessons.filter((lesson) => (!target.courseId || value(lesson, ["course_id"]) === target.courseId) && (!target.moduleId || value(lesson, ["module_id"]) === target.moduleId)), [lessons, target.courseId, target.moduleId]);
  const averageProgress = enrollments.length ? Math.round(enrollments.reduce((total, enrollment) => total + Number(value(enrollment, ["progress_percentage"], "0")), 0) / enrollments.length) : 0;

  async function uploadAsset(file: File, assetType: AssetType) {
    if (!target.courseId) { setMessage("Select a course before uploading."); return; }
    if (["Video", "PDF Notes"].includes(assetType) && !target.lessonId) { setMessage(`Select a lesson before uploading ${assetType.toLowerCase()}.`); return; }
    setUploading(assetType);
    setMessage(`Uploading ${file.name}...`);
    try {
      const supabase = createClient();
      const path = `${target.courseId}/${assetType.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}-${safeName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("aff-course-assets").upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("aff-course-assets").getPublicUrl(path);
      const publicUrl = publicData.publicUrl;
      const { error: assetError } = await supabase.from("lms_course_assets").insert({
        course_id: Number(target.courseId),
        module_id: target.moduleId ? Number(target.moduleId) : null,
        lesson_id: target.lessonId ? Number(target.lessonId) : null,
        asset_title: file.name,
        asset_type: assetType,
        file_name: file.name,
        storage_path: path,
        public_url: publicUrl,
        mime_type: file.type || null,
        file_size: file.size,
        uploaded_by: adminEmail,
        asset_status: "Published"
      });
      if (assetError) throw assetError;

      if (assetType === "Video") {
        const { error } = await supabase.from("lms_lessons").update({ video_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", Number(target.lessonId));
        if (error) throw error;
      }
      if (assetType === "PDF Notes") {
        const { error } = await supabase.from("lms_lessons").update({ pdf_notes_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", Number(target.lessonId));
        if (error) throw error;
      }
      if (assetType === "Course Thumbnail") {
        const { error } = await supabase.from("lms_courses").update({ thumbnail_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", Number(target.courseId));
        if (error) throw error;
      }
      if (assetType === "Assignment") {
        const { error } = await supabase.from("lms_homework_assignments").insert({ course_id: Number(target.courseId), module_id: target.moduleId ? Number(target.moduleId) : null, lesson_id: target.lessonId ? Number(target.lessonId) : null, assignment_title: file.name.replace(/\.[^.]+$/, ""), instructions: "Download the assignment file and complete the instructor requirements.", assignment_file_url: publicUrl, due_days: 7, status: "Published" });
        if (error) throw error;
      }

      setMessage(`${assetType} uploaded and connected to the LMS.`);
      await loadCenter();
    } catch (error) {
      setMessage(errorMessage(error, `Unable to upload ${assetType.toLowerCase()}.`));
    } finally {
      setUploading(null);
    }
  }

  async function createModule(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("lms_modules").insert({ course_id: Number(moduleForm.courseId), module_title: moduleForm.title, module_description: moduleForm.description, module_order: Number(moduleForm.order) });
    setMessage(error ? error.message : "Module created.");
    if (!error) { setModuleForm({ courseId: "", title: "", description: "", order: "1" }); await loadCenter(); }
  }

  function addQuestion() {
    const options = questionForm.options.split(",").map((option) => option.trim()).filter(Boolean);
    if (!questionForm.prompt || options.length < 2 || !questionForm.correctAnswer) { setMessage("Add a question, at least two options, and the correct answer."); return; }
    setQuestions((current) => [...current, { prompt: questionForm.prompt, options, correctAnswer: questionForm.correctAnswer }]);
    setQuestionForm({ prompt: "", options: "", correctAnswer: "" });
  }

  async function createQuiz(event: FormEvent) {
    event.preventDefault();
    if (!questions.length) { setMessage("Add at least one quiz question."); return; }
    const supabase = createClient();
    const { error } = await supabase.from("lms_quizzes").insert({ course_id: Number(quizForm.courseId), module_id: quizForm.moduleId ? Number(quizForm.moduleId) : null, lesson_id: quizForm.lessonId ? Number(quizForm.lessonId) : null, quiz_title: quizForm.title, questions, passing_score: Number(quizForm.passingScore), status: "Published" });
    setMessage(error ? error.message : "Quiz published.");
    if (!error) { setQuizForm({ courseId: "", moduleId: "", lessonId: "", title: "", passingScore: "80" }); setQuestions([]); }
  }

  async function assignCertificate(event: FormEvent) {
    event.preventDefault();
    const student = students.find((item) => value(item, ["auth_user_id"]) === certificateForm.studentId);
    const course = courses.find((item) => value(item, ["id"]) === certificateForm.courseId);
    if (!student || !course) return;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
    const supabase = createClient();
    const { error } = await supabase.from("lms_course_certificates").upsert({
      certificate_number: `AFF-LMS-${new Date().getFullYear()}-${token.slice(-8)}`,
      student_id: certificateForm.studentId,
      course_id: Number(certificateForm.courseId),
      course_name: value(course, ["course_name"]),
      certification_name: certificateForm.certificationName || value(course, ["certification_title"], `${value(course, ["course_name"])} Certificate`),
      student_name: value(student, ["full_name"], value(student, ["email"])),
      verification_code: `AFF-${token}`,
      completion_date: new Date().toISOString().slice(0, 10)
    }, { onConflict: "student_id,course_id" });
    setMessage(error ? error.message : "Certificate assigned to student.");
    if (!error) { setCertificateForm({ studentId: "", courseId: "", certificationName: "" }); await loadCenter(); }
  }

  if (!authorized) return <div className="terminal-panel p-6 text-ink/72">{message}</div>;

  return (
    <section className="grid gap-8">
      <section className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs uppercase tracking-[.22em] text-gold-300">Admin · Course Management · Upload Center</p><h2 className="mt-2 text-2xl font-semibold text-white">Supabase Course Asset Pipeline</h2><p className="mt-2 text-sm text-ink/68">{message}</p></div>
        <div className="text-sm text-ink/68">Bucket: <span className="text-gold-300">aff-course-assets</span></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<BookOpen size={20} />} label="Courses" value={String(courses.length)} />
        <Metric icon={<Users size={20} />} label="Enrollments" value={String(enrollments.length)} />
        <Metric icon={<BarChart3 size={20} />} label="Average Progress" value={`${averageProgress}%`} />
        <Metric icon={<Award size={20} />} label="Certificates" value={String(certificates.length)} />
      </section>

      <section className="terminal-panel p-5">
        <div className="flex items-center gap-3"><UploadCloud className="text-gold-300" size={22} /><h2 className="text-xl font-semibold text-white">Upload Target</h2></div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <Select value={target.courseId} onChange={(courseId) => setTarget({ courseId, moduleId: "", lessonId: "" })} label="Select course" rows={courses} rowLabel={["course_code", "course_name"]} />
          <Select value={target.moduleId} onChange={(moduleId) => setTarget((current) => ({ ...current, moduleId, lessonId: "" }))} label="Optional module" rows={selectedModules} rowLabel={["module_title"]} />
          <Select value={target.lessonId} onChange={(lessonId) => setTarget((current) => ({ ...current, lessonId }))} label="Optional lesson" rows={selectedLessons} rowLabel={["lesson_title"]} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UploadDropzone title="Video Upload" text="MP4, WebM, or MOV up to 500 MB" accept="video/mp4,video/webm,video/quicktime" icon={<Video size={26} />} busy={uploading === "Video"} onFile={(file) => uploadAsset(file, "Video")} />
        <UploadDropzone title="PDF Notes" text="Course notes and reading materials" accept="application/pdf" icon={<FileText size={26} />} busy={uploading === "PDF Notes"} onFile={(file) => uploadAsset(file, "PDF Notes")} />
        <UploadDropzone title="PowerPoint Upload" text="PPT and PPTX presentations" accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" icon={<Presentation size={26} />} busy={uploading === "PowerPoint"} onFile={(file) => uploadAsset(file, "PowerPoint")} />
        <UploadDropzone title="Assignment Upload" text="PDF, DOC, DOCX, PPT, or PPTX" accept=".pdf,.doc,.docx,.ppt,.pptx" icon={<FileArchive size={26} />} busy={uploading === "Assignment"} onFile={(file) => uploadAsset(file, "Assignment")} />
        <UploadDropzone title="Course Thumbnail" text="PNG, JPG, or WebP artwork" accept="image/png,image/jpeg,image/webp" icon={<ImageIcon size={26} />} busy={uploading === "Course Thumbnail"} onFile={(file) => uploadAsset(file, "Course Thumbnail")} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <form className="terminal-panel grid gap-3 p-5" onSubmit={createModule}>
          <div className="flex items-center gap-3"><Layers3 className="text-gold-300" size={22} /><h2 className="text-xl font-semibold text-white">Module Builder</h2></div>
          <Select value={moduleForm.courseId} onChange={(courseId) => setModuleForm((current) => ({ ...current, courseId }))} label="Select course" rows={courses} rowLabel={["course_code", "course_name"]} required />
          <input className="field" placeholder="Module title" value={moduleForm.title} onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))} required />
          <textarea className="field min-h-24" placeholder="Module description" value={moduleForm.description} onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))} />
          <input className="field" type="number" min="1" value={moduleForm.order} onChange={(event) => setModuleForm((current) => ({ ...current, order: event.target.value }))} />
          <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit"><Save size={17} /> Create Module</button>
        </form>

        <form className="terminal-panel grid gap-3 p-5" onSubmit={createQuiz}>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-gold-300" size={22} /><h2 className="text-xl font-semibold text-white">Quiz Builder</h2></div>
          <Select value={quizForm.courseId} onChange={(courseId) => setQuizForm((current) => ({ ...current, courseId }))} label="Select course" rows={courses} rowLabel={["course_code", "course_name"]} required />
          <Select value={quizForm.moduleId} onChange={(moduleId) => setQuizForm((current) => ({ ...current, moduleId }))} label="Optional module" rows={modules.filter((module) => !quizForm.courseId || value(module, ["course_id"]) === quizForm.courseId)} rowLabel={["module_title"]} />
          <Select value={quizForm.lessonId} onChange={(lessonId) => setQuizForm((current) => ({ ...current, lessonId }))} label="Optional lesson" rows={lessons.filter((lesson) => !quizForm.courseId || value(lesson, ["course_id"]) === quizForm.courseId)} rowLabel={["lesson_title"]} />
          <input className="field" placeholder="Quiz title" value={quizForm.title} onChange={(event) => setQuizForm((current) => ({ ...current, title: event.target.value }))} required />
          <div className="border border-gold-500/20 bg-navy-950 p-4">
            <input className="field" placeholder="Question" value={questionForm.prompt} onChange={(event) => setQuestionForm((current) => ({ ...current, prompt: event.target.value }))} />
            <input className="field mt-3" placeholder="Options separated by commas" value={questionForm.options} onChange={(event) => setQuestionForm((current) => ({ ...current, options: event.target.value }))} />
            <input className="field mt-3" placeholder="Correct answer" value={questionForm.correctAnswer} onChange={(event) => setQuestionForm((current) => ({ ...current, correctAnswer: event.target.value }))} />
            <button className="mt-3 inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-sm font-semibold text-gold-300" type="button" onClick={addQuestion}><Plus size={15} /> Add Question</button>
          </div>
          <p className="text-sm text-ink/65">{questions.length} questions prepared</p>
          <input className="field" type="number" min="0" max="100" value={quizForm.passingScore} onChange={(event) => setQuizForm((current) => ({ ...current, passingScore: event.target.value }))} />
          <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit"><Save size={17} /> Publish Quiz</button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <form className="terminal-panel grid h-fit gap-3 p-5" onSubmit={assignCertificate}>
          <div className="flex items-center gap-3"><GraduationCap className="text-gold-300" size={22} /><h2 className="text-xl font-semibold text-white">Certificate Assignment</h2></div>
          <Select value={certificateForm.studentId} onChange={(studentId) => setCertificateForm((current) => ({ ...current, studentId }))} label="Select student" rows={students} valueKey="auth_user_id" rowLabel={["student_id", "full_name", "email"]} required />
          <Select value={certificateForm.courseId} onChange={(courseId) => { const course = courses.find((item) => value(item, ["id"]) === courseId); setCertificateForm((current) => ({ ...current, courseId, certificationName: value(course ?? {}, ["certification_title"]) })); }} label="Select course" rows={courses} rowLabel={["course_code", "course_name"]} required />
          <input className="field" placeholder="Certificate title" value={certificateForm.certificationName} onChange={(event) => setCertificateForm((current) => ({ ...current, certificationName: event.target.value }))} />
          <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit"><Award size={17} /> Assign Certificate</button>
        </form>

        <section className="terminal-panel overflow-hidden">
          <div className="border-b border-gold-500/20 p-5"><h2 className="text-xl font-semibold text-white">Instructor Progress Dashboard</h2></div>
          <div className="grid gap-px bg-gold-500/14">
            {enrollments.length === 0 ? <p className="bg-navy-950 p-5 text-sm text-ink/68">No LMS enrollments found.</p> : enrollments.slice(0, 20).map((enrollment) => {
              const student = students.find((item) => value(item, ["auth_user_id"]) === value(enrollment, ["student_id"]));
              const course = courses.find((item) => value(item, ["id"]) === value(enrollment, ["course_id"]));
              const percentage = Number(value(enrollment, ["progress_percentage"], "0"));
              return <article key={value(enrollment, ["id"])} className="bg-navy-950 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-white">{value(student ?? {}, ["full_name"], value(enrollment, ["student_id"]))}</p><p className="mt-1 text-sm text-ink/60">{value(course ?? {}, ["course_name"], "Managed Course")} · {progressRows.filter((row) => value(row, ["student_id"]) === value(enrollment, ["student_id"]) && value(row, ["course_id"]) === value(enrollment, ["course_id"])).length} lessons completed</p></div><span className="text-sm text-gold-300">{percentage}%</span></div><div className="mt-3"><ProgressBar value={percentage} /></div></article>;
            })}
          </div>
        </section>
      </section>

      <section className="terminal-panel overflow-hidden">
        <div className="border-b border-gold-500/20 p-5"><h2 className="text-xl font-semibold text-white">Recent Course Assets</h2></div>
        <div className="grid gap-px bg-gold-500/14 md:grid-cols-2 xl:grid-cols-3">
          {assets.slice(0, 12).map((asset) => <article key={value(asset, ["id"])} className="bg-navy-950 p-5"><p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(asset, ["asset_type"])}</p><h3 className="mt-2 font-semibold text-white">{value(asset, ["asset_title"])}</h3><p className="mt-2 text-sm text-ink/60">{Math.max(1, Math.round(Number(value(asset, ["file_size"], "0")) / 1024))} KB · {value(asset, ["asset_status"])}</p></article>)}
        </div>
      </section>
    </section>
  );
}

function UploadDropzone({ title, text, accept, icon, busy, onFile }: { title: string; text: string; accept: string; icon: ReactNode; busy: boolean; onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  function drop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onFile(file); }
  return <label className={`terminal-panel grid min-h-52 cursor-pointer place-items-center p-6 text-center transition ${dragging ? "border-gold-300 bg-gold-500/10" : "hover:border-gold-400/60"}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}><input className="sr-only" type="file" accept={accept} disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.currentTarget.value = ""; }} /><div><span className="mx-auto grid h-12 w-12 place-items-center border border-gold-500/35 text-gold-300">{icon}</span><h3 className="mt-4 font-semibold text-white">{busy ? "Uploading..." : title}</h3><p className="mt-2 text-sm leading-6 text-ink/62">{text}</p><p className="mt-3 text-xs uppercase tracking-[.18em] text-gold-300">Drag and drop or choose file</p></div></label>;
}

function Select({ value: selected, onChange, label, rows, rowLabel, valueKey = "id", required = false }: { value: string; onChange: (value: string) => void; label: string; rows: DbRow[]; rowLabel: string[]; valueKey?: string; required?: boolean }) {
  return <select className="field" value={selected} onChange={(event) => onChange(event.target.value)} required={required}><option value="">{label}</option>{rows.map((row) => <option key={value(row, [valueKey])} value={value(row, [valueKey])}>{rowLabel.map((key) => value(row, [key])).filter(Boolean).join(" · ")}</option>)}</select>;
}

function Metric({ icon, label, value: metricValue }: { icon: ReactNode; label: string; value: string }) {
  return <article className="terminal-panel p-5"><div className="text-gold-300">{icon}</div><p className="mt-4 text-3xl font-semibold text-white">{metricValue}</p><p className="mt-1 text-sm text-ink/66">{label}</p></article>;
}
