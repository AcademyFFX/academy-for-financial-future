"use client";

import { BookOpen, ClipboardCheck, FilePlus2, Layers3, Save, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type CourseAssetInput = {
  course_id: number;
  lesson_id?: number | null;
  module_id?: number | null;
  module_title?: string | null;
  asset_title: string;
  asset_type: "Module" | "Assignment" | "Quiz" | "Video" | "PDF Notes";
  file_name: string;
  file_type: string;
  storage_path: string;
  url: string;
  signed_url?: string | null;
  mime_type: string;
  file_size?: number;
  asset_status?: "Draft" | "Published" | "Archived";
  uploaded_by?: string;
  uploaded_by_email?: string;
};
type SavedQuizQuestion = {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  quizTitle: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
  status: string;
};
type PublishedQuizSummary = {
  key: string;
  courseId: string;
  lessonId: string;
  quizTitle: string;
  questionCount: number;
  points: number;
};

const adminEmail = "acafffx@gmail.com";

function value(row: DbRow | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
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

function isMissingUrlColumn(error: unknown) {
  return errorMessage(error, "").toLowerCase().includes("'url' column");
}

function parseQuizPayload(row: DbRow) {
  const raw = value(row, ["signed_url"]);
  if (!raw || raw === "#") return null;
  try {
    const parsed = JSON.parse(raw) as { quizTitle?: string; prompt?: string; options?: string[]; correctAnswer?: string; points?: number; question?: { prompt?: string; options?: string[]; correctAnswer?: string; points?: number } };
    const question = parsed.question ?? parsed;
    return {
      quizTitle: parsed.quizTitle || value(row, ["asset_title"]),
      prompt: question.prompt ?? "",
      options: Array.isArray(question.options) ? question.options.map(String) : [],
      correctAnswer: question.correctAnswer ?? "",
      points: Number(question.points ?? parsed.points ?? 1)
    };
  } catch {
    return null;
  }
}

async function insertCourseAsset(asset: CourseAssetInput) {
  const supabase = createClient();
  const base = {
    course_id: asset.course_id,
    lesson_id: asset.lesson_id ?? null,
    module_id: asset.module_id ?? null,
    module_title: asset.module_title ?? null,
    asset_title: asset.asset_title,
    asset_type: asset.asset_type,
    file_name: asset.file_name,
    file_type: asset.file_type,
    storage_path: asset.storage_path,
    signed_url: asset.signed_url ?? null,
    mime_type: asset.mime_type,
    file_size: asset.file_size ?? 0,
    asset_status: asset.asset_status ?? "Published",
    uploaded_by: asset.uploaded_by ?? adminEmail,
    uploaded_by_email: asset.uploaded_by_email ?? adminEmail
  };

  const withUrl = { ...base, url: asset.url };
  const first = await supabase.from("course_assets").insert(withUrl);
  if (!first.error) return first;
  if (!isMissingUrlColumn(first.error)) return first;
  return supabase.from("course_assets").insert({ ...base, public_url: asset.url });
}

export function AdminLmsManager() {
  const [message, setMessage] = useState("Loading AFF course administration...");
  const [authorized, setAuthorized] = useState(false);
  const [courses, setCourses] = useState<DbRow[]>([]);
  const [modules, setModules] = useState<DbRow[]>([]);
  const [lessons, setLessons] = useState<DbRow[]>([]);
  const [courseAssets, setCourseAssets] = useState<DbRow[]>([]);
  const [courseForm, setCourseForm] = useState({ name: "", description: "", thumbnailUrl: "", duration: "" });
  const [moduleForm, setModuleForm] = useState({ courseId: "", title: "", description: "", order: "1" });
  const [lessonForm, setLessonForm] = useState({ courseId: "", lessonId: "", title: "", description: "", videoUrl: "", pdfUrl: "", order: "1" });
  const [homeworkForm, setHomeworkForm] = useState({ courseId: "", moduleId: "", lessonId: "", title: "", instructions: "", fileUrl: "", dueDays: "7" });
  const [quizForm, setQuizForm] = useState({ courseId: "", moduleId: "", lessonId: "", title: "", prompt: "", options: "", correctAnswer: "", points: "1" });
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [showQuizPreview, setShowQuizPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() !== adminEmail) {
        setAuthorized(false);
        setMessage("Administrator access required.");
        return;
      }

      setAuthorized(true);
      const [courseResult, lessonResult, assetResult] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
        supabase.from("lessons").select("*").order("lesson_order", { ascending: true }),
        supabase.from("course_assets").select("*").order("created_at", { ascending: false })
      ]);

      const error = courseResult.error ?? lessonResult.error ?? assetResult.error;
      if (error) throw error;

      const courseAssets = (assetResult.data ?? []) as DbRow[];
      setCourses((courseResult.data ?? []) as DbRow[]);
      setLessons((lessonResult.data ?? []) as DbRow[]);
      setCourseAssets(courseAssets);
      setModules(courseAssets.filter((asset) => value(asset, ["asset_type"]) === "Module"));
      setMessage("AFF course administration ready.");
    } catch (error) {
      setMessage(errorMessage(error, "Run the AFF course asset migration."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const courseOptions = useMemo(() => courses.map((course) => (
    <option key={value(course, ["id"])} value={value(course, ["id"])}>
      {value(course, ["course_name", "title"])}
    </option>
  )), [courses]);

  function moduleOptionsFor(courseId: string) {
    return modules
      .filter((moduleRow) => !courseId || value(moduleRow, ["course_id"]) === courseId)
      .map((moduleRow) => (
        <option key={value(moduleRow, ["id"])} value={value(moduleRow, ["module_id", "id"])}>
          {value(moduleRow, ["module_title", "asset_title"])}
        </option>
      ));
  }

  const lessonOptions = useMemo(() => lessons
    .filter((lesson) => !homeworkForm.courseId || value(lesson, ["course_id"]) === homeworkForm.courseId)
    .map((lesson) => (
      <option key={value(lesson, ["id"])} value={value(lesson, ["id"])}>
        {value(lesson, ["lesson_title", "title"])}
      </option>
    )), [homeworkForm.courseId, lessons]);

  const quizLessonOptions = useMemo(() => lessons
    .filter((lesson) => !quizForm.courseId || value(lesson, ["course_id"]) === quizForm.courseId)
    .map((lesson) => (
      <option key={value(lesson, ["id"])} value={value(lesson, ["id"])}>
        {value(lesson, ["lesson_title", "title"])}
      </option>
    )), [quizForm.courseId, lessons]);

  const savedQuestions = useMemo<SavedQuizQuestion[]>(() => courseAssets
    .filter((asset) => value(asset, ["asset_type"]) === "Quiz")
    .map((asset) => {
      const payload = parseQuizPayload(asset);
      if (!payload) return null;
      return {
        id: value(asset, ["id"]),
        courseId: value(asset, ["course_id"]),
        moduleId: value(asset, ["module_id"]),
        lessonId: value(asset, ["lesson_id"]),
        quizTitle: payload.quizTitle,
        prompt: payload.prompt,
        options: payload.options,
        correctAnswer: payload.correctAnswer,
        points: payload.points || 1,
        status: value(asset, ["asset_status"], "Published")
      };
    })
    .filter((question): question is SavedQuizQuestion => Boolean(question))
    .filter((question) => !quizForm.courseId || question.courseId === quizForm.courseId)
    .filter((question) => !quizForm.lessonId || question.lessonId === quizForm.lessonId)
    .filter((question) => !quizForm.title || question.quizTitle.toLowerCase() === quizForm.title.toLowerCase())
    .sort((a, b) => a.id.localeCompare(b.id)), [courseAssets, quizForm.courseId, quizForm.lessonId, quizForm.title]);
  const publishedQuizzes = useMemo<PublishedQuizSummary[]>(() => {
    const summaries = new Map<string, PublishedQuizSummary>();
    for (const question of courseAssets.filter((asset) => value(asset, ["asset_type"]) === "Quiz" && value(asset, ["asset_status"], "Published") === "Published")) {
      const payload = parseQuizPayload(question);
      if (!payload?.prompt) continue;
      const quizTitle = payload.quizTitle;
      const courseId = value(question, ["course_id"]);
      const lessonId = value(question, ["lesson_id"]);
      const key = `${courseId}::${lessonId}::${quizTitle}`;
      const current = summaries.get(key) ?? { key, courseId, lessonId, quizTitle, questionCount: 0, points: 0 };
      current.questionCount += 1;
      current.points += payload.points || 1;
      summaries.set(key, current);
    }
    return Array.from(summaries.values()).sort((a, b) => a.quizTitle.localeCompare(b.quizTitle));
  }, [courseAssets]);
  const matchingQuizQuestions = useMemo(() => savedQuestions.filter((question) => !quizForm.title || question.quizTitle.toLowerCase() === quizForm.title.toLowerCase()), [quizForm.title, savedQuestions]);
  const hasMatchingQuizQuestions = matchingQuizQuestions.length > 0;
  const selectedQuizPublished = hasMatchingQuizQuestions && matchingQuizQuestions.every((question) => question.status === "Published");

  async function createCourse(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.from("courses").insert({
      course_name: courseForm.name,
      instructor: "Dr. Jean Rene Moricette",
      description: courseForm.description,
      duration: courseForm.duration || null,
      thumbnail_url: courseForm.thumbnailUrl || null
    });
    setMessage(error ? error.message : "Course created.");
    if (!error) {
      setCourseForm({ name: "", description: "", thumbnailUrl: "", duration: "" });
      await load();
    }
  }

  async function createModule(event: FormEvent) {
    event.preventDefault();
    const { error } = await insertCourseAsset({
      course_id: Number(moduleForm.courseId),
      module_id: Number(moduleForm.order),
      module_title: moduleForm.title,
      asset_title: moduleForm.title,
      asset_type: "Module",
      file_name: `${moduleForm.title}.json`,
      file_type: "Module",
      storage_path: `modules/${moduleForm.courseId}/${moduleForm.order}-${safeName(moduleForm.title)}`,
      url: "#",
      signed_url: JSON.stringify({ description: moduleForm.description, order: Number(moduleForm.order) }),
      mime_type: "application/json",
      asset_status: "Published"
    });
    setMessage(error ? error.message : "Module saved as course asset.");
    if (!error) {
      setModuleForm({ courseId: "", title: "", description: "", order: "1" });
      await load();
    }
  }

  async function createLesson(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    const payload = {
      course_id: Number(lessonForm.courseId),
      lesson_title: lessonForm.title,
      title: lessonForm.title,
      slug: safeName(lessonForm.title),
      description: lessonForm.description,
      lesson_order: Number(lessonForm.order),
      video_url: lessonForm.videoUrl || null,
      pdf_notes_url: lessonForm.pdfUrl || null,
      updated_at: new Date().toISOString()
    };
    const request = lessonForm.lessonId
      ? supabase.from("lessons").update(payload).eq("id", Number(lessonForm.lessonId))
      : supabase.from("lessons").insert(payload);
    const { error } = await request;
    setMessage(error ? error.message : "Lesson resources saved.");
    if (!error) {
      setLessonForm({ courseId: "", lessonId: "", title: "", description: "", videoUrl: "", pdfUrl: "", order: "1" });
      await load();
    }
  }

  async function createHomework(event: FormEvent) {
    event.preventDefault();
    const moduleTitle = value(modules.find((moduleRow) => value(moduleRow, ["module_id", "id"]) === homeworkForm.moduleId), ["module_title", "asset_title"]);
    const { error } = await insertCourseAsset({
      course_id: Number(homeworkForm.courseId),
      module_id: homeworkForm.moduleId ? Number(homeworkForm.moduleId) : null,
      module_title: moduleTitle || null,
      lesson_id: homeworkForm.lessonId ? Number(homeworkForm.lessonId) : null,
      asset_title: homeworkForm.title,
      asset_type: "Assignment",
      file_name: homeworkForm.fileUrl ? homeworkForm.fileUrl.split("/").pop() ?? homeworkForm.title : `${homeworkForm.title}.json`,
      file_type: "Assignment",
      storage_path: `assignments/${homeworkForm.courseId}/${Date.now()}-${safeName(homeworkForm.title)}`,
      url: homeworkForm.fileUrl || "#",
      signed_url: JSON.stringify({ instructions: homeworkForm.instructions, dueDays: Number(homeworkForm.dueDays) }),
      mime_type: homeworkForm.fileUrl ? "text/uri-list" : "application/json",
      asset_status: "Published"
    });
    setMessage(error ? error.message : "Homework assignment published.");
    if (!error) {
      setHomeworkForm({ courseId: "", moduleId: "", lessonId: "", title: "", instructions: "", fileUrl: "", dueDays: "7" });
      await load();
    }
  }

  function validateQuizQuestion() {
    const options = quizForm.options.split(",").map((item) => item.trim()).filter(Boolean);
    if (!quizForm.courseId) return { error: "Select a course before saving a quiz question.", options };
    if (!quizForm.title.trim()) return { error: "Quiz title is required.", options };
    if (!quizForm.prompt.trim()) return { error: "Question cannot be blank.", options };
    if (options.length < 2) return { error: "Enter at least two answer options separated by commas.", options };
    if (!quizForm.correctAnswer.trim()) return { error: "Correct answer cannot be blank.", options };
    if (!options.includes(quizForm.correctAnswer.trim())) return { error: "Correct answer must exactly match one of the listed options.", options };
    if (Number(quizForm.points) <= 0) return { error: "Point value must be at least 1.", options };
    if (!editingQuestionId && savedQuestions.length >= 20) return { error: "This quiz already has 20 questions.", options };
    return { error: "", options };
  }

  async function saveQuizQuestion(addAnother = false) {
    const validation = validateQuizQuestion();
    if (validation.error) {
      setMessage(validation.error);
      return;
    }
    const moduleTitle = value(modules.find((moduleRow) => value(moduleRow, ["module_id", "id"]) === quizForm.moduleId), ["module_title", "asset_title"]);
    const questionData = {
      quizTitle: quizForm.title.trim(),
      prompt: quizForm.prompt.trim(),
      options: validation.options,
      correctAnswer: quizForm.correctAnswer.trim(),
      points: Number(quizForm.points || 1)
    };
    const payload = {
      course_id: Number(quizForm.courseId),
      module_id: quizForm.moduleId ? Number(quizForm.moduleId) : null,
      module_title: moduleTitle || null,
      lesson_id: quizForm.lessonId ? Number(quizForm.lessonId) : null,
      asset_title: quizForm.title.trim(),
      asset_type: "Quiz",
      file_name: `${quizForm.title.trim()}.json`,
      file_type: "Quiz",
      storage_path: editingQuestionId ? value(courseAssets.find((asset) => value(asset, ["id"]) === editingQuestionId), ["storage_path"]) : `quizzes/${quizForm.courseId}/${quizForm.lessonId || "course"}/${safeName(quizForm.title)}/${Date.now()}-${safeName(quizForm.prompt).slice(0, 52)}`,
      url: "#",
      signed_url: JSON.stringify({ quizTitle: quizForm.title.trim(), question: questionData }),
      mime_type: "application/json",
      file_size: JSON.stringify(questionData).length,
      asset_status: "Draft"
    } satisfies CourseAssetInput;

    const supabase = createClient();
    const result = editingQuestionId
      ? await supabase.from("course_assets").update({
          course_id: payload.course_id,
          module_id: payload.module_id,
          module_title: payload.module_title,
          lesson_id: payload.lesson_id,
          asset_title: payload.asset_title,
          file_name: payload.file_name,
          file_type: payload.file_type,
          signed_url: payload.signed_url,
          mime_type: payload.mime_type,
          file_size: payload.file_size,
          asset_status: "Draft",
          updated_at: new Date().toISOString()
        }).eq("id", editingQuestionId)
      : await insertCourseAsset(payload);

    const error = result.error;
    setMessage(error ? error.message : "Question saved successfully.");
    if (!error) {
      setEditingQuestionId("");
      setQuizForm((current) => ({
        ...current,
        prompt: "",
        options: "",
        correctAnswer: "",
        points: "1",
        ...(addAnother ? {} : { title: current.title })
      }));
      await load();
    }
  }

  async function createQuiz(event: FormEvent) {
    event.preventDefault();
    await saveQuizQuestion(false);
  }

  async function publishQuiz() {
    if (!quizForm.courseId || !quizForm.title.trim()) {
      setMessage("Select a course and enter a quiz title before publishing.");
      return;
    }
    const questionsToPublish = matchingQuizQuestions.filter((question) => question.status !== "Published");
    if (!matchingQuizQuestions.length) {
      setMessage("Save at least one quiz question before publishing.");
      return;
    }
    if (!questionsToPublish.length) {
      setMessage("This quiz is already published.");
      return;
    }
    const supabase = createClient();
    let query = supabase
      .from("course_assets")
      .update({ asset_status: "Published", updated_at: new Date().toISOString() })
      .eq("course_id", Number(quizForm.courseId))
      .eq("asset_type", "Quiz")
      .eq("asset_title", quizForm.title.trim())
      .neq("asset_status", "Published");
    if (quizForm.lessonId) query = query.eq("lesson_id", Number(quizForm.lessonId));
    const { error } = await query;
    setMessage(error ? error.message : "Quiz published.");
    if (!error) await load();
  }

  async function deleteQuestion(questionId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("course_assets").delete().eq("id", questionId);
    setMessage(error ? error.message : "Question deleted.");
    if (!error) await load();
  }

  function editQuestion(question: SavedQuizQuestion) {
    setEditingQuestionId(question.id);
    setQuizForm({
      courseId: question.courseId,
      moduleId: question.moduleId,
      lessonId: question.lessonId,
      title: question.quizTitle,
      prompt: question.prompt,
      options: question.options.join(","),
      correctAnswer: question.correctAnswer,
      points: String(question.points || 1)
    });
    setMessage("Editing saved question.");
  }

  if (!authorized) return <div className="terminal-panel p-6 text-ink/72">{message}</div>;

  return (
    <section className="grid gap-6">
      <p className="text-sm text-ink/72">{message}</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <FormPanel title="Create Course" icon={<BookOpen size={21} />} onSubmit={createCourse}>
          <input className="field" placeholder="Course name" value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} required />
          <textarea className="field min-h-24" placeholder="Description" value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} />
          <input className="field" placeholder="Duration" value={courseForm.duration} onChange={(event) => setCourseForm({ ...courseForm, duration: event.target.value })} />
          <input className="field" placeholder="Thumbnail URL" value={courseForm.thumbnailUrl} onChange={(event) => setCourseForm({ ...courseForm, thumbnailUrl: event.target.value })} />
        </FormPanel>

        <FormPanel title="Create Module" icon={<Layers3 size={21} />} onSubmit={createModule}>
          <Select label="Select course" value={moduleForm.courseId} onChange={(next) => setModuleForm({ ...moduleForm, courseId: next })}>{courseOptions}</Select>
          <input className="field" placeholder="Module title" value={moduleForm.title} onChange={(event) => setModuleForm({ ...moduleForm, title: event.target.value })} required />
          <textarea className="field min-h-24" placeholder="Module description" value={moduleForm.description} onChange={(event) => setModuleForm({ ...moduleForm, description: event.target.value })} />
          <input className="field" type="number" min="1" value={moduleForm.order} onChange={(event) => setModuleForm({ ...moduleForm, order: event.target.value })} />
        </FormPanel>

        <FormPanel title="Create Lesson Resources" icon={<Video size={21} />} onSubmit={createLesson}>
          <Select label="Select course" value={lessonForm.courseId} onChange={(next) => setLessonForm({ ...lessonForm, courseId: next, lessonId: "" })}>{courseOptions}</Select>
          <Select label="Optional existing lesson" value={lessonForm.lessonId} onChange={(next) => {
            const lesson = lessons.find((row) => value(row, ["id"]) === next);
            setLessonForm({
              ...lessonForm,
              lessonId: next,
              title: value(lesson, ["lesson_title", "title"], lessonForm.title),
              description: value(lesson, ["description"], lessonForm.description),
              videoUrl: value(lesson, ["video_url"], lessonForm.videoUrl),
              pdfUrl: value(lesson, ["pdf_notes_url"], lessonForm.pdfUrl),
              order: value(lesson, ["lesson_order"], lessonForm.order)
            });
          }}>{lessons.filter((lesson) => !lessonForm.courseId || value(lesson, ["course_id"]) === lessonForm.courseId).map((lesson) => <option key={value(lesson, ["id"])} value={value(lesson, ["id"])}>{value(lesson, ["lesson_title", "title"])}</option>)}</Select>
          <input className="field" placeholder="Lesson title" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required />
          <textarea className="field min-h-20" placeholder="Lesson description" value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} />
          <input className="field" placeholder="Video URL" value={lessonForm.videoUrl} onChange={(event) => setLessonForm({ ...lessonForm, videoUrl: event.target.value })} />
          <input className="field" placeholder="PDF notes URL" value={lessonForm.pdfUrl} onChange={(event) => setLessonForm({ ...lessonForm, pdfUrl: event.target.value })} />
          <input className="field" type="number" min="1" value={lessonForm.order} onChange={(event) => setLessonForm({ ...lessonForm, order: event.target.value })} />
        </FormPanel>

        <FormPanel title="Upload Homework" icon={<FilePlus2 size={21} />} onSubmit={createHomework}>
          <Select label="Select course" value={homeworkForm.courseId} onChange={(next) => setHomeworkForm({ ...homeworkForm, courseId: next, lessonId: "" })}>{courseOptions}</Select>
          <Select label="Optional module" value={homeworkForm.moduleId} onChange={(next) => setHomeworkForm({ ...homeworkForm, moduleId: next })}>{moduleOptionsFor(homeworkForm.courseId)}</Select>
          <Select label="Optional lesson" value={homeworkForm.lessonId} onChange={(next) => setHomeworkForm({ ...homeworkForm, lessonId: next })}>{lessonOptions}</Select>
          <input className="field" placeholder="Assignment title" value={homeworkForm.title} onChange={(event) => setHomeworkForm({ ...homeworkForm, title: event.target.value })} required />
          <textarea className="field min-h-24" placeholder="Instructions" value={homeworkForm.instructions} onChange={(event) => setHomeworkForm({ ...homeworkForm, instructions: event.target.value })} />
          <input className="field" placeholder="Assignment file URL" value={homeworkForm.fileUrl} onChange={(event) => setHomeworkForm({ ...homeworkForm, fileUrl: event.target.value })} />
          <input className="field" type="number" min="1" value={homeworkForm.dueDays} onChange={(event) => setHomeworkForm({ ...homeworkForm, dueDays: event.target.value })} />
        </FormPanel>

        <FormPanel title="Create Quiz" icon={<ClipboardCheck size={21} />} onSubmit={createQuiz} submitLabel={editingQuestionId ? "Update Question" : "Save Question"}>
          <Select label="Select course" value={quizForm.courseId} onChange={(next) => setQuizForm({ ...quizForm, courseId: next, lessonId: "" })}>{courseOptions}</Select>
          <Select label="Optional module" value={quizForm.moduleId} onChange={(next) => setQuizForm({ ...quizForm, moduleId: next })}>{moduleOptionsFor(quizForm.courseId)}</Select>
          <Select label="Optional lesson" value={quizForm.lessonId} onChange={(next) => setQuizForm({ ...quizForm, lessonId: next })}>{quizLessonOptions}</Select>
          <input className="field" placeholder="Quiz title" value={quizForm.title} onChange={(event) => setQuizForm({ ...quizForm, title: event.target.value })} required />
          <input className="field" placeholder="Question" value={quizForm.prompt} onChange={(event) => setQuizForm({ ...quizForm, prompt: event.target.value })} required />
          <input className="field" placeholder="Options separated by commas" value={quizForm.options} onChange={(event) => setQuizForm({ ...quizForm, options: event.target.value })} required />
          <input className="field" placeholder="Correct answer" value={quizForm.correctAnswer} onChange={(event) => setQuizForm({ ...quizForm, correctAnswer: event.target.value })} required />
          <input className="field" type="number" min="1" placeholder="Point value" value={quizForm.points} onChange={(event) => setQuizForm({ ...quizForm, points: event.target.value })} />
          <p className="text-sm font-semibold text-gold-300">Questions created: {savedQuestions.length} of 20</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <button className="border border-gold-500/45 px-4 py-3 text-sm font-bold text-gold-300" type="button" onClick={() => saveQuizQuestion(true)}>Save and Add Another</button>
            <button className="border border-gold-500/45 px-4 py-3 text-sm font-bold text-gold-300" type="button" onClick={() => setShowQuizPreview((current) => !current)}>Preview Quiz</button>
            <button className="border border-gold-500/45 px-4 py-3 text-sm font-bold text-gold-300 disabled:cursor-not-allowed disabled:opacity-45" type="button" onClick={publishQuiz} disabled={selectedQuizPublished}>{selectedQuizPublished ? "Published" : "Publish Quiz"}</button>
          </div>
          {selectedQuizPublished ? <p className="inline-flex w-fit border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-emerald-200">Published</p> : null}
          {showQuizPreview ? <div className="border border-gold-500/20 bg-navy-950 p-4">
            <p className="text-xs uppercase tracking-[.18em] text-gold-300">Preview Quiz</p>
            <h3 className="mt-2 font-semibold text-white">{quizForm.title || "Untitled Quiz"}</h3>
            <div className="mt-3 grid gap-3">
              {savedQuestions.length ? savedQuestions.map((question, index) => <article key={question.id} className="border border-gold-500/15 p-3 text-sm text-ink/72"><p className="font-semibold text-white">{index + 1}. {question.prompt}</p><p className="mt-2">Options: {question.options.join(", ")}</p><p className="mt-1 text-gold-300">Correct: {question.correctAnswer} · {question.points} point{question.points === 1 ? "" : "s"}</p></article>) : <p className="text-sm text-ink/65">No saved questions match this quiz yet.</p>}
            </div>
          </div> : null}
        </FormPanel>
      </div>

      <section className="terminal-panel p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-gold-300">Quiz Question Bank</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Saved Questions</h2>
          </div>
          <p className="text-sm font-semibold text-gold-300">Questions created: {savedQuestions.length} of 20</p>
        </div>
        <div className="mt-4 grid gap-3">
          {savedQuestions.length === 0 ? <p className="text-sm text-ink/68">No saved questions match the selected course, lesson, and quiz title.</p> : savedQuestions.map((question, index) => (
            <article key={question.id} className="border border-gold-500/18 bg-navy-950 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">Question {index + 1} · {question.points} point{question.points === 1 ? "" : "s"} · {question.status}</p>
                  <h3 className="mt-2 font-semibold text-white">{question.prompt}</h3>
                  <p className="mt-2 text-sm text-ink/68">Options: {question.options.join(", ")}</p>
                  <p className="mt-1 text-sm text-gold-300">Correct answer: {question.correctAnswer}</p>
                  {question.status === "Published" ? <p className="mt-3 inline-flex border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-[.14em] text-emerald-200">Published</p> : <p className="mt-3 inline-flex border border-gold-500/30 bg-gold-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-[.14em] text-gold-200">Draft</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300" type="button" onClick={() => editQuestion(question)}>Edit</button>
                  <button className="border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-200" type="button" onClick={() => deleteQuestion(question.id)}>Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="terminal-panel p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-gold-300">Published Quiz Library</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Published Quizzes</h2>
          </div>
          <p className="text-sm font-semibold text-emerald-200">{publishedQuizzes.length} published</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {publishedQuizzes.length === 0 ? <p className="text-sm text-ink/68 md:col-span-2">No published quizzes yet. Save questions, then publish the quiz.</p> : publishedQuizzes.map((quiz) => {
            const course = courses.find((item) => value(item, ["id"]) === quiz.courseId);
            const lesson = lessons.find((item) => value(item, ["id"]) === quiz.lessonId);
            return (
              <article key={quiz.key} className="border border-emerald-400/20 bg-navy-950 p-4">
                <p className="text-xs uppercase tracking-[.18em] text-emerald-200">Published</p>
                <h3 className="mt-2 font-semibold text-white">{quiz.quizTitle}</h3>
                <p className="mt-2 text-sm text-ink/68">{value(course, ["course_name", "title"], "Course")} {lesson ? `· ${value(lesson, ["lesson_title", "title"])}` : ""}</p>
                <p className="mt-1 text-sm text-gold-300">{quiz.questionCount} question{quiz.questionCount === 1 ? "" : "s"} · {quiz.points} point{quiz.points === 1 ? "" : "s"}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="terminal-panel p-5">
        <h2 className="text-xl font-semibold text-white">Managed Curriculum</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {courses.map((course) => (
            <article key={value(course, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
              <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(course, ["duration"], "AFF Course")}</p>
              <h3 className="mt-2 font-semibold text-white">{value(course, ["course_name", "title"])}</h3>
              <p className="mt-2 text-sm text-ink/65">
                {modules.filter((moduleRow) => value(moduleRow, ["course_id"]) === value(course, ["id"])).length} modules · {lessons.filter((lesson) => value(lesson, ["course_id"]) === value(course, ["id"])).length} lessons
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function FormPanel({ title, icon, onSubmit, children, submitLabel = "Save" }: { title: string; icon: ReactNode; onSubmit: (event: FormEvent) => void; children: ReactNode; submitLabel?: string }) {
  return (
    <form className="terminal-panel grid gap-3 p-5" onSubmit={onSubmit}>
      <div className="mb-2 flex items-center gap-3 text-gold-300">
        {icon}
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {children}
      <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
        <Save size={17} /> {submitLabel}
      </button>
    </form>
  );
}

function Select({ label, value: selected, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select className="field" value={selected} onChange={(event) => onChange(event.target.value)} required={label.startsWith("Select")}>
      <option value="">{label}</option>
      {children}
    </select>
  );
}
