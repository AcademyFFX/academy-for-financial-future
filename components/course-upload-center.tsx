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
type UploadStage = "idle" | "uploading" | "success" | "failed";
type UploadStatus = {
  stage: UploadStage;
  title: string;
  detail: string;
};

const adminEmail = "acafffx@gmail.com";

const acceptedUploads: Record<AssetType, { extensions: string[]; mimeTypes: string[]; label: string }> = {
  Video: { extensions: [".mp4", ".mov"], mimeTypes: ["video/mp4", "video/quicktime"], label: "MP4 or MOV video" },
  "PDF Notes": { extensions: [".pdf"], mimeTypes: ["application/pdf"], label: "PDF" },
  PowerPoint: {
    extensions: [".pptx"],
    mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    label: "PPTX"
  },
  Assignment: {
    extensions: [".pdf", ".pptx"],
    mimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    label: "PDF or PPTX"
  },
  "Course Thumbnail": { extensions: [".png", ".jpg", ".jpeg", ".webp"], mimeTypes: ["image/png", "image/jpeg", "image/webp"], label: "PNG, JPG, or WebP" }
};

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

function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function fileType(file: File) {
  return file.type || fileExtension(file.name).replace(".", "").toUpperCase() || "Unknown";
}

function isAcceptedFile(file: File, assetType: AssetType) {
  const accepted = acceptedUploads[assetType];
  const extension = fileExtension(file.name);
  return accepted.mimeTypes.includes(file.type) || accepted.extensions.includes(extension);
}

function statusClasses(stage: UploadStage) {
  if (stage === "success") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  if (stage === "failed") return "border-red-400/45 bg-red-500/10 text-red-100";
  if (stage === "uploading") return "border-gold-300/45 bg-gold-500/10 text-gold-100";
  return "border-gold-500/20 bg-navy-950 text-ink/72";
}

export function CourseUploadCenter() {
  const [authorized, setAuthorized] = useState(false);
  const [message, setMessage] = useState("Loading AFF Course Upload Center...");
  const [uploading, setUploading] = useState<AssetType | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ stage: "idle", title: "Ready", detail: "Select a course, module, and lesson before uploading course assets." });
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
        setUploadStatus({ stage: "failed", title: "Admin access required", detail: "Sign in with acafffx@gmail.com to upload course assets." });
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
      setUploadStatus((current) => current.stage === "idle" ? { stage: "success", title: "Upload Center ready", detail: "Courses, modules, lessons, and recent assets loaded from Supabase." } : current);
    } catch (error) {
      const detail = errorMessage(error, "Run the Course Upload Center migration to enable Supabase Storage.");
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Upload Center failed to load", detail });
    }
  }, []);

  useEffect(() => { loadCenter(); }, [loadCenter]);

  const selectedModules = useMemo(() => modules.filter((module) => !target.courseId || value(module, ["course_id"]) === target.courseId), [modules, target.courseId]);
  const selectedLessons = useMemo(() => lessons.filter((lesson) => (!target.courseId || value(lesson, ["course_id"]) === target.courseId) && (!target.moduleId || value(lesson, ["module_id"]) === target.moduleId)), [lessons, target.courseId, target.moduleId]);
  const averageProgress = enrollments.length ? Math.round(enrollments.reduce((total, enrollment) => total + Number(value(enrollment, ["progress_percentage"], "0")), 0) / enrollments.length) : 0;

  async function uploadAsset(file: File, assetType: AssetType) {
    if (!target.courseId) {
      const detail = "Select a course before uploading.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Upload target missing", detail });
      return;
    }
    if (["Video", "PDF Notes"].includes(assetType) && !target.lessonId) {
      const detail = `Select a lesson before uploading ${assetType.toLowerCase()}.`;
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Lesson target required", detail });
      return;
    }
    if (!isAcceptedFile(file, assetType)) {
      const detail = `${assetType} accepts ${acceptedUploads[assetType].label}. ${file.name} is ${file.type || fileExtension(file.name) || "an unknown file type"}.`;
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Unsupported file type", detail });
      return;
    }
    setUploading(assetType);
    setMessage(`Uploading ${file.name}...`);
    setUploadStatus({ stage: "uploading", title: `Uploading ${file.name}`, detail: "Saving file to Supabase Storage bucket aff-course-assets." });
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (user?.email?.toLowerCase() !== adminEmail) throw new Error("Administrator access required for uploads.");
      const path = `${target.courseId}/${assetType.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}-${safeName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("aff-course-assets").upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("aff-course-assets").getPublicUrl(path);
      const publicUrl = publicData.publicUrl;
      const { data: signedData, error: signedError } = await supabase.storage.from("aff-course-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedError) throw signedError;
      setUploadStatus({ stage: "uploading", title: `Saving ${file.name}`, detail: "Writing file metadata to lms_course_assets." });
      const { data: insertedAsset, error: assetError } = await supabase.from("lms_course_assets").insert({
        course_id: Number(target.courseId),
        module_id: target.moduleId ? Number(target.moduleId) : null,
        lesson_id: target.lessonId ? Number(target.lessonId) : null,
        asset_title: file.name,
        asset_type: assetType,
        file_name: file.name,
        file_type: fileType(file),
        storage_path: path,
        public_url: publicUrl,
        signed_url: signedData.signedUrl,
        mime_type: file.type || null,
        file_size: file.size,
        uploaded_by: user.email ?? adminEmail,
        uploaded_by_email: user.email ?? adminEmail,
        uploaded_by_user_id: user.id,
        asset_status: "Published"
      }).select("*").single();
      if (assetError) throw assetError;
      if (insertedAsset) setAssets((current) => [insertedAsset as DbRow, ...current.filter((asset) => value(asset, ["id"]) !== value(insertedAsset as DbRow, ["id"]))]);

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

      const detail = `${assetType} uploaded to aff-course-assets and connected to the selected ${target.lessonId ? "lesson" : target.moduleId ? "module" : "course"}.`;
      setMessage(detail);
      setUploadStatus({ stage: "success", title: "Upload successful", detail });
      await loadCenter();
    } catch (error) {
      const detail = errorMessage(error, `Unable to upload ${assetType.toLowerCase()}.`);
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Upload failed", detail });
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

      <section className={`border p-4 ${statusClasses(uploadStatus.stage)}`} role="status" aria-live="polite">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em]">{uploadStatus.stage === "uploading" ? "Uploading" : uploadStatus.stage === "success" ? "Success" : uploadStatus.stage === "failed" ? "Failed" : "Status"}</p>
            <h3 className="mt-1 font-semibold text-white">{uploadStatus.title}</h3>
            <p className="mt-1 text-sm leading-6 text-current/78">{uploadStatus.detail}</p>
          </div>
          {uploading ? <span className="shrink-0 text-sm font-semibold text-gold-200">Processing {uploading}</span> : null}
        </div>
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
        <UploadDropzone title="Video Upload" text="MP4 or MOV up to 500 MB" accept="video/mp4,video/quicktime,.mp4,.mov" icon={<Video size={26} />} busy={uploading === "Video"} onFile={(file) => uploadAsset(file, "Video")} />
        <UploadDropzone title="PDF Notes" text="Course notes and reading materials" accept="application/pdf" icon={<FileText size={26} />} busy={uploading === "PDF Notes"} onFile={(file) => uploadAsset(file, "PDF Notes")} />
        <UploadDropzone title="PowerPoint Upload" text="PPTX instructor presentations" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" icon={<Presentation size={26} />} busy={uploading === "PowerPoint"} onFile={(file) => uploadAsset(file, "PowerPoint")} />
        <UploadDropzone title="Assignment Upload" text="PDF or PPTX homework files" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" icon={<FileArchive size={26} />} busy={uploading === "Assignment"} onFile={(file) => uploadAsset(file, "Assignment")} />
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
          {assets.length === 0 ? <p className="bg-navy-950 p-5 text-sm text-ink/68 md:col-span-2 xl:col-span-3">No uploaded course assets found yet.</p> : assets.slice(0, 12).map((asset) => {
            const course = courses.find((item) => value(item, ["id"]) === value(asset, ["course_id"]));
            const courseModule = modules.find((item) => value(item, ["id"]) === value(asset, ["module_id"]));
            const lesson = lessons.find((item) => value(item, ["id"]) === value(asset, ["lesson_id"]));
            return (
              <article key={value(asset, ["id"])} className="bg-navy-950 p-5">
                <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(asset, ["asset_type"])} · {value(asset, ["file_type"], value(asset, ["mime_type"], "File"))}</p>
                <h3 className="mt-2 font-semibold text-white">{value(asset, ["asset_title"])}</h3>
                <p className="mt-2 text-sm leading-6 text-ink/60">{Math.max(1, Math.round(Number(value(asset, ["file_size"], "0")) / 1024))} KB · {value(asset, ["asset_status"])}</p>
                <p className="mt-2 text-sm leading-6 text-ink/62">{value(course ?? {}, ["course_name"], "Course")} {courseModule ? `· ${value(courseModule, ["module_title"])}` : ""} {lesson ? `· ${value(lesson, ["lesson_title"])}` : ""}</p>
                <a className="mt-4 inline-flex text-sm font-semibold text-gold-300 hover:text-cream" href={value(asset, ["public_url", "signed_url"])} target="_blank" rel="noreferrer">Open uploaded file</a>
              </article>
            );
          })}
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
