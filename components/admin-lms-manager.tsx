"use client";

import Link from "next/link";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eye,
  FilePlus2,
  Filter,
  Layers3,
  LibraryBig,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  UploadCloud,
  Video,
  XCircle
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientAdminStatus } from "@/lib/admin-client";
import { normalizeQuizQuestionRecord, serializeQuizQuestion } from "@/lib/quiz-question";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type Status = "Draft" | "Published" | "Archived";
type AssetType =
  | "Module"
  | "Assignment"
  | "Quiz"
  | "Video"
  | "PDF Notes"
  | "Resource"
  | "DOCX"
  | "PPTX"
  | "XLSX"
  | "ZIP"
  | "Image"
  | "Audio"
  | "External Link"
  | "Workbook"
  | "Cheat Sheet"
  | "Assignment Instructions";

type CourseAssetInput = {
  course_id: number;
  lesson_id?: number | null;
  module_id?: number | null;
  module_title?: string | null;
  asset_title: string;
  asset_type: AssetType;
  file_name: string;
  file_type: string;
  storage_path: string;
  url: string;
  signed_url?: string | null;
  mime_type: string;
  file_size?: number;
  asset_status?: Status;
  description?: string;
  downloadable?: boolean;
  visibility?: string;
  display_order?: number;
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
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
  status: string;
  raw: unknown;
};

const emptyCourseForm = {
  courseId: "",
  courseTitle: "",
  courseCode: "",
  shortDescription: "",
  fullDescription: "",
  academicDivision: "Forex Training Division",
  departmentName: "Academy for Financial Future",
  instructorName: "Dr. Jean R. Moricette",
  instructorUserId: "",
  thumbnailUrl: "",
  bannerImageUrl: "",
  difficultyLevel: "Foundations",
  estimatedDuration: "",
  certificationEligibility: "Yes",
  enrollmentType: "Enrollment Required",
  publicationStatus: "Draft" as Status,
  displayOrder: "100"
};

const emptyModuleForm = {
  assetId: "",
  courseId: "",
  title: "",
  description: "",
  objectives: "",
  duration: "",
  order: "1",
  prerequisite: "",
  required: "Required",
  status: "Draft" as Status
};

const emptyLessonForm = {
  lessonId: "",
  courseId: "",
  moduleId: "",
  title: "",
  slug: "",
  summary: "",
  fullContent: "",
  videoType: "Text-only lesson",
  videoUrl: "",
  pdfUrl: "",
  transcript: "",
  instructorNotes: "",
  duration: "",
  order: "1",
  freePreview: false,
  requiredCompletion: true,
  status: "Draft" as Status
};

const emptyResourceForm = {
  assetId: "",
  courseId: "",
  moduleId: "",
  lessonId: "",
  title: "",
  description: "",
  resourceType: "PDF Notes" as AssetType,
  fileUrl: "",
  downloadable: true,
  visibility: "Authenticated Students",
  displayOrder: "100",
  status: "Draft" as Status
};

const emptyAssignmentForm = {
  assetId: "",
  courseId: "",
  moduleId: "",
  lessonId: "",
  title: "",
  instructions: "",
  assignmentType: "File upload",
  dueDate: "",
  noDueDate: true,
  maximumScore: "100",
  fileTypes: "PDF,DOCX,PNG,JPG",
  rubric: "",
  required: true,
  status: "Draft" as Status
};

const emptyQuizForm = {
  courseId: "",
  moduleId: "",
  lessonId: "",
  title: "",
  prompt: "",
  options: "",
  correctAnswer: "",
  points: "1"
};

const suggestedDivisions = [
  "Forex Training Division",
  "College of Trading Psychology",
  "College of Financial Intelligence",
  "College of Global Economics",
  "College of Leadership",
  "Research Institute"
];

function value(row: DbRow | undefined | null, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return fallback;
}

function numberValue(row: DbRow | undefined | null, keys: string[], fallback = 0) {
  const parsed = Number(value(row, keys));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function statusOf(row: DbRow | undefined | null, fallback: Status = "Draft"): Status {
  const status = value(row, ["publication_status", "asset_status", "status"], fallback);
  return status === "Published" || status === "Archived" ? status : "Draft";
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return fallback;
}

function friendlyDatabaseError(error: unknown, fallback: string) {
  const message = errorMessage(error, fallback);
  if (/duplicate|unique/i.test(message)) return "A course with this code already exists.";
  if (/permission|rls|policy|authorized/i.test(message)) return "Administrator permissions are required for this action.";
  if (/schema cache|column/i.test(message)) return `${fallback} Run the AFF Course Builder migration and reload the Supabase schema.`;
  return message;
}

function isMissingUrlColumn(error: unknown) {
  return errorMessage(error, "").toLowerCase().includes("'url' column");
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function displayDate(raw: string) {
  if (!raw) return "Not updated";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function parseJson(row: DbRow | undefined | null) {
  const raw = value(row, ["signed_url"]);
  if (!raw || raw === "#") return {};
  try {
    return JSON.parse(raw) as DbRow;
  } catch {
    return {};
  }
}

function parseQuizPayload(row: DbRow) {
  const parsed = parseJson(row);
  const question = parsed.question ?? parsed;
  const normalized = normalizeQuizQuestionRecord(question, value(row, ["asset_title"]));
  if (!normalized.questionText && !normalized.prompt) return null;
  return {
    quizTitle: value(parsed, ["quizTitle", "quiz_title"], value(row, ["asset_title"])),
    prompt: normalized.prompt,
    questionText: normalized.questionText,
    options: normalized.options,
    correctAnswer: normalized.correctAnswer,
    points: normalized.points || 1,
    raw: question
  };
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
    asset_status: asset.asset_status ?? "Draft",
    description: asset.description ?? "",
    downloadable: asset.downloadable ?? true,
    visibility: asset.visibility ?? "Authenticated Students",
    display_order: asset.display_order ?? 100,
    uploaded_by: asset.uploaded_by ?? "AFF Course Builder",
    uploaded_by_email: asset.uploaded_by_email ?? "course-builder@aff.local"
  };

  const withUrl = { ...base, url: asset.url, public_url: asset.url };
  const first = await supabase.from("course_assets").insert(withUrl);
  if (!first.error) return first;
  if (!isMissingUrlColumn(first.error)) return first;
  return supabase.from("course_assets").insert({ ...base, public_url: asset.url });
}

export function AdminLmsManager({ initialCourseId = "", createMode = false }: { initialCourseId?: string; createMode?: boolean } = {}) {
  const [message, setMessage] = useState("Loading AFF course administration...");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<DbRow[]>([]);
  const [lessons, setLessons] = useState<DbRow[]>([]);
  const [courseAssets, setCourseAssets] = useState<DbRow[]>([]);
  const [enrollments, setEnrollments] = useState<DbRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortMode, setSortMode] = useState("updated");
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [activeSection, setActiveSection] = useState("course");
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [moduleForm, setModuleForm] = useState(emptyModuleForm);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [quizForm, setQuizForm] = useState(emptyQuizForm);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [showQuizPreview, setShowQuizPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user || !(await getClientAdminStatus())) {
        setAuthorized(false);
        setMessage("Administrator access required. Your account must be active in aff_admin_users.");
        return;
      }

      setAuthorized(true);
      const [courseResult, lessonResult, assetResult, enrollmentResult] = await Promise.all([
        supabase.from("courses").select("*").order("updated_at", { ascending: false }),
        supabase.from("lessons").select("*").order("lesson_order", { ascending: true }),
        supabase.from("course_assets").select("*").order("display_order", { ascending: true }),
        supabase.from("enrollments").select("*")
      ]);

      const error = courseResult.error ?? lessonResult.error ?? assetResult.error;
      if (error) throw error;

      const nextCourses = (courseResult.data ?? []) as DbRow[];
      setCourses(nextCourses);
      setLessons((lessonResult.data ?? []) as DbRow[]);
      setCourseAssets((assetResult.data ?? []) as DbRow[]);
      setEnrollments(enrollmentResult.error ? [] : ((enrollmentResult.data ?? []) as DbRow[]));
      setMessage("AFF course administration ready.");
      const preferredCourse = initialCourseId ? nextCourses.find((course) => value(course, ["id"]) === initialCourseId) : null;
      if (preferredCourse && value(preferredCourse, ["id"]) !== selectedCourseId) {
        const preferredCourseId = value(preferredCourse, ["id"]);
        setSelectedCourseId(preferredCourseId);
        syncCourseForm(preferredCourse);
      } else if (!selectedCourseId && !createMode && nextCourses[0]) {
        const firstCourseId = value(nextCourses[0], ["id"]);
        setSelectedCourseId(firstCourseId);
        syncCourseForm(nextCourses[0]);
      } else if (createMode && !selectedCourseId) {
        setCourseForm(emptyCourseForm);
      }
    } catch (error) {
      setMessage(friendlyDatabaseError(error, "Unable to load the AFF Course Builder."));
    } finally {
      setLoading(false);
    }
  }, [createMode, initialCourseId, selectedCourseId]);

  useEffect(() => {
    load();
  }, [load]);

  const modules = useMemo(() => courseAssets.filter((asset) => value(asset, ["asset_type"]) === "Module"), [courseAssets]);
  const resources = useMemo(() => courseAssets.filter((asset) => !["Module", "Assignment", "Quiz"].includes(value(asset, ["asset_type"]))), [courseAssets]);
  const assignments = useMemo(() => courseAssets.filter((asset) => value(asset, ["asset_type"]) === "Assignment"), [courseAssets]);
  const quizAssets = useMemo(() => courseAssets.filter((asset) => value(asset, ["asset_type"]) === "Quiz"), [courseAssets]);
  const selectedCourse = useMemo(() => courses.find((course) => value(course, ["id"]) === selectedCourseId), [courses, selectedCourseId]);

  const divisions = useMemo(() => {
    const discovered = courses.map((course) => value(course, ["academic_division", "department_name", "certification_level"])).filter(Boolean);
    return Array.from(new Set([...suggestedDivisions, ...discovered])).sort();
  }, [courses]);

  const courseOptions = useMemo(() => courses.map((course) => (
    <option key={value(course, ["id"])} value={value(course, ["id"])}>
      {value(course, ["course_name", "title"])}
    </option>
  )), [courses]);

  const selectedCourseModules = useMemo(() => modules.filter((moduleRow) => value(moduleRow, ["course_id"]) === selectedCourseId), [modules, selectedCourseId]);
  const selectedCourseLessons = useMemo(() => lessons.filter((lesson) => value(lesson, ["course_id"]) === selectedCourseId), [lessons, selectedCourseId]);
  const selectedCourseResources = useMemo(() => resources.filter((asset) => value(asset, ["course_id"]) === selectedCourseId), [resources, selectedCourseId]);
  const selectedCourseAssignments = useMemo(() => assignments.filter((asset) => value(asset, ["course_id"]) === selectedCourseId), [assignments, selectedCourseId]);
  const selectedCourseQuizzes = useMemo(() => quizAssets.filter((asset) => value(asset, ["course_id"]) === selectedCourseId), [quizAssets, selectedCourseId]);

  const filteredCourses = useMemo(() => {
    let output = courses.filter((course) => {
      const title = value(course, ["course_name", "title"]).toLowerCase();
      const code = value(course, ["course_code"]).toLowerCase();
      const division = value(course, ["academic_division", "department_name", "certification_level"]);
      const status = statusOf(course);
      const matchesSearch = !searchTerm || title.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
      const matchesDivision = divisionFilter === "All" || division === divisionFilter;
      const matchesStatus = statusFilter === "All" || status === statusFilter;
      return matchesSearch && matchesDivision && matchesStatus;
    });

    output = [...output].sort((left, right) => {
      if (sortMode === "title") return value(left, ["course_name", "title"]).localeCompare(value(right, ["course_name", "title"]));
      if (sortMode === "created") return value(right, ["created_at"]).localeCompare(value(left, ["created_at"]));
      return value(right, ["updated_at", "created_at"]).localeCompare(value(left, ["updated_at", "created_at"]));
    });

    return output;
  }, [courses, divisionFilter, searchTerm, sortMode, statusFilter]);

  const savedQuestions = useMemo<SavedQuizQuestion[]>(() => {
    const questions: SavedQuizQuestion[] = [];
    for (const asset of quizAssets) {
      const payload = parseQuizPayload(asset);
      if (!payload) continue;
      questions.push({
        id: value(asset, ["id"]),
        courseId: value(asset, ["course_id"]),
        moduleId: value(asset, ["module_id"]),
        lessonId: value(asset, ["lesson_id"]),
        quizTitle: payload.quizTitle,
        prompt: payload.prompt,
        questionText: payload.questionText,
        options: payload.options,
        correctAnswer: payload.correctAnswer,
        points: payload.points,
        status: value(asset, ["asset_status"], "Draft"),
        raw: payload.raw
      });
    }
    return questions
      .filter((question) => !quizForm.courseId || question.courseId === quizForm.courseId)
      .filter((question) => !quizForm.lessonId || question.lessonId === quizForm.lessonId)
      .filter((question) => !quizForm.title || sameText(question.quizTitle, quizForm.title));
  }, [quizAssets, quizForm.courseId, quizForm.lessonId, quizForm.title]);

  const matchingQuizQuestions = useMemo(() => savedQuestions.filter((question) => !quizForm.title || sameText(question.quizTitle, quizForm.title)), [quizForm.title, savedQuestions]);
  const selectedQuizPublished = matchingQuizQuestions.length > 0 && matchingQuizQuestions.every((question) => question.status === "Published");

  const summary = useMemo(() => {
    const publishedCourses = courses.filter((course) => statusOf(course) === "Published").length;
    const draftCourses = courses.filter((course) => statusOf(course) === "Draft").length;
    const awaitingContent = courses.filter((course) => lessons.filter((lesson) => value(lesson, ["course_id"]) === value(course, ["id"])).length === 0).length;
    return {
      totalCourses: courses.length,
      publishedCourses,
      draftCourses,
      totalModules: modules.length,
      totalLessons: lessons.length,
      enrolledStudents: enrollments.length,
      awaitingContent,
      recentlyUpdated: courses.filter((course) => Boolean(value(course, ["updated_at"]))).slice(0, 5).length
    };
  }, [courses, enrollments.length, lessons, modules.length]);

  function syncCourseForm(course: DbRow) {
    setCourseForm({
      courseId: value(course, ["id"]),
      courseTitle: value(course, ["course_name", "title"]),
      courseCode: value(course, ["course_code"]),
      shortDescription: value(course, ["short_description", "description"]),
      fullDescription: value(course, ["full_description", "description"]),
      academicDivision: value(course, ["academic_division", "certification_level"], "Forex Training Division"),
      departmentName: value(course, ["department_name"], "Academy for Financial Future"),
      instructorName: value(course, ["instructor_name", "instructor"], "Dr. Jean R. Moricette"),
      instructorUserId: value(course, ["instructor_user_id"]),
      thumbnailUrl: value(course, ["thumbnail_url"]),
      bannerImageUrl: value(course, ["banner_image_url"]),
      difficultyLevel: value(course, ["difficulty_level"], "Foundations"),
      estimatedDuration: value(course, ["duration"], ""),
      certificationEligibility: value(course, ["certification_eligibility"], "false") === "true" ? "Yes" : "No",
      enrollmentType: value(course, ["enrollment_type"], "Enrollment Required"),
      publicationStatus: statusOf(course),
      displayOrder: value(course, ["display_order"], "100")
    });
  }

  function selectCourse(course: DbRow) {
    const courseId = value(course, ["id"]);
    setSelectedCourseId(courseId);
    syncCourseForm(course);
    setModuleForm({ ...emptyModuleForm, courseId });
    setLessonForm({ ...emptyLessonForm, courseId });
    setResourceForm({ ...emptyResourceForm, courseId });
    setAssignmentForm({ ...emptyAssignmentForm, courseId });
    setQuizForm({ ...emptyQuizForm, courseId });
    setActiveSection("course");
  }

  function publicationChecklist(course = selectedCourse) {
    const courseId = value(course, ["id"]);
    const courseModules = modules.filter((moduleRow) => value(moduleRow, ["course_id"]) === courseId);
    const courseLessons = lessons.filter((lesson) => value(lesson, ["course_id"]) === courseId);
    const publishedLessons = courseLessons.filter((lesson) => statusOf(lesson) === "Published");
    return [
      { label: "Course title exists", complete: Boolean(value(course, ["course_name", "title"])) },
      { label: "Course code exists", complete: Boolean(value(course, ["course_code"])) },
      { label: "Instructor exists", complete: Boolean(value(course, ["instructor_name", "instructor"])) },
      { label: "At least one module exists", complete: courseModules.length > 0 },
      { label: "At least one published lesson exists", complete: publishedLessons.length > 0 }
    ];
  }

  async function saveCourse(event?: FormEvent) {
    event?.preventDefault();
    if (!courseForm.courseTitle.trim()) {
      setMessage("Course title is required.");
      return;
    }
    if (!courseForm.courseCode.trim()) {
      setMessage("Course code is required.");
      return;
    }
    if (!courseForm.instructorName.trim()) {
      setMessage("Instructor name is required.");
      return;
    }

    const supabase = createClient();
    const payload = {
      course_name: courseForm.courseTitle.trim(),
      course_code: courseForm.courseCode.trim(),
      instructor: courseForm.instructorName.trim(),
      instructor_name: courseForm.instructorName.trim(),
      instructor_user_id: courseForm.instructorUserId.trim() || null,
      description: courseForm.shortDescription.trim() || null,
      short_description: courseForm.shortDescription.trim() || null,
      full_description: courseForm.fullDescription.trim() || null,
      academic_division: courseForm.academicDivision,
      department_name: courseForm.departmentName,
      thumbnail_url: courseForm.thumbnailUrl.trim() || null,
      banner_image_url: courseForm.bannerImageUrl.trim() || null,
      difficulty_level: courseForm.difficultyLevel,
      duration: courseForm.estimatedDuration.trim() || null,
      certification_eligibility: courseForm.certificationEligibility === "Yes",
      enrollment_type: courseForm.enrollmentType,
      publication_status: courseForm.publicationStatus,
      display_order: Number(courseForm.displayOrder || 100),
      updated_at: new Date().toISOString()
    };

    const request = courseForm.courseId
      ? supabase.from("courses").update(payload).eq("id", Number(courseForm.courseId)).select("*").single()
      : supabase.from("courses").insert(payload).select("*").single();
    const { data, error } = await request;
    if (error) {
      setMessage(friendlyDatabaseError(error, "Unable to save course."));
      return;
    }
    setMessage(courseForm.courseId ? "Course information saved." : "Course created as draft.");
    if (data) selectCourse(data as DbRow);
    await load();
  }

  async function updateCourseStatus(status: Status) {
    if (!selectedCourse) return;
    if (status === "Published") {
      const missing = publicationChecklist(selectedCourse).filter((item) => !item.complete);
      if (missing.length) {
        setMessage(`Course cannot be published yet: ${missing.map((item) => item.label).join(", ")}.`);
        return;
      }
    }
    const supabase = createClient();
    const { error } = await supabase.from("courses").update({ publication_status: status, updated_at: new Date().toISOString() }).eq("id", Number(value(selectedCourse, ["id"])));
    setMessage(error ? friendlyDatabaseError(error, `Unable to change course status to ${status}.`) : `Course status changed to ${status}.`);
    if (!error) await load();
  }

  function validateSelectedCourse() {
    if (selectedCourseId) return true;
    setMessage("Select or create a course first.");
    return false;
  }

  async function saveModule(event?: FormEvent) {
    event?.preventDefault();
    if (!validateSelectedCourse()) return;
    if (!moduleForm.title.trim()) {
      setMessage("Module title is required.");
      return;
    }
    const supabase = createClient();
    const moduleNumber = Number(moduleForm.order || 1);
    const payloadJson = JSON.stringify({
      description: moduleForm.description,
      objectives: moduleForm.objectives,
      duration: moduleForm.duration,
      prerequisite: moduleForm.prerequisite,
      required: moduleForm.required
    });
    if (moduleForm.assetId) {
      const { error } = await supabase.from("course_assets").update({
        course_id: Number(selectedCourseId),
        module_id: moduleNumber,
        module_title: moduleForm.title.trim(),
        asset_title: moduleForm.title.trim(),
        description: moduleForm.description,
        signed_url: payloadJson,
        display_order: moduleNumber,
        asset_status: moduleForm.status,
        updated_at: new Date().toISOString()
      }).eq("id", moduleForm.assetId);
      setMessage(error ? friendlyDatabaseError(error, "Unable to update module.") : "Module saved.");
      if (!error) await load();
      return;
    }
    const { error } = await insertCourseAsset({
      course_id: Number(selectedCourseId),
      module_id: moduleNumber,
      module_title: moduleForm.title.trim(),
      asset_title: moduleForm.title.trim(),
      asset_type: "Module",
      file_name: `${safeName(moduleForm.title)}.json`,
      file_type: "Module",
      storage_path: `modules/${selectedCourseId}/${Date.now()}-${safeName(moduleForm.title)}`,
      url: "#",
      signed_url: payloadJson,
      mime_type: "application/json",
      asset_status: moduleForm.status,
      description: moduleForm.description,
      display_order: moduleNumber
    });
    setMessage(error ? friendlyDatabaseError(error, "Unable to create module.") : "Module created.");
    if (!error) {
      setModuleForm({ ...emptyModuleForm, courseId: selectedCourseId });
      await load();
    }
  }

  function editModule(moduleRow: DbRow) {
    const payload = parseJson(moduleRow);
    setModuleForm({
      assetId: value(moduleRow, ["id"]),
      courseId: value(moduleRow, ["course_id"]),
      title: value(moduleRow, ["module_title", "asset_title"]),
      description: value(moduleRow, ["description"], value(payload, ["description"])),
      objectives: value(payload, ["objectives"]),
      duration: value(payload, ["duration"]),
      order: value(moduleRow, ["display_order", "module_id"], "1"),
      prerequisite: value(payload, ["prerequisite"]),
      required: value(payload, ["required"], "Required"),
      status: statusOf(moduleRow)
    });
    setActiveSection("curriculum");
  }

  async function duplicateModule(moduleRow: DbRow) {
    const nextOrder = selectedCourseModules.length + 1;
    const { error } = await insertCourseAsset({
      course_id: Number(selectedCourseId),
      module_id: nextOrder,
      module_title: `${value(moduleRow, ["module_title", "asset_title"])} Copy`,
      asset_title: `${value(moduleRow, ["asset_title"])} Copy`,
      asset_type: "Module",
      file_name: `${safeName(value(moduleRow, ["asset_title"]))}-copy.json`,
      file_type: "Module",
      storage_path: `modules/${selectedCourseId}/${Date.now()}-${safeName(value(moduleRow, ["asset_title"]))}-copy`,
      url: "#",
      signed_url: value(moduleRow, ["signed_url"], "{}"),
      mime_type: "application/json",
      asset_status: "Draft",
      description: value(moduleRow, ["description"]),
      display_order: nextOrder
    });
    setMessage(error ? friendlyDatabaseError(error, "Unable to duplicate module.") : "Module duplicated as draft.");
    if (!error) await load();
  }

  async function deleteAsset(assetId: string, label: string) {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("course_assets").delete().eq("id", assetId);
    setMessage(error ? friendlyDatabaseError(error, `Unable to delete ${label}.`) : `${label} deleted.`);
    if (!error) await load();
  }

  async function updateAssetStatus(assetId: string, status: Status, label: string) {
    const supabase = createClient();
    const { error } = await supabase.from("course_assets").update({ asset_status: status, updated_at: new Date().toISOString() }).eq("id", assetId);
    setMessage(error ? friendlyDatabaseError(error, `Unable to update ${label}.`) : `${label} set to ${status}.`);
    if (!error) await load();
  }

  async function moveAsset(asset: DbRow, direction: -1 | 1) {
    const current = numberValue(asset, ["display_order", "module_id"], 1);
    const supabase = createClient();
    const { error } = await supabase.from("course_assets").update({ display_order: Math.max(1, current + direction), module_id: Math.max(1, current + direction), updated_at: new Date().toISOString() }).eq("id", value(asset, ["id"]));
    setMessage(error ? friendlyDatabaseError(error, "Unable to reorder item.") : "Order updated.");
    if (!error) await load();
  }

  async function saveLesson(event?: FormEvent) {
    event?.preventDefault();
    if (!validateSelectedCourse()) return;
    if (!lessonForm.title.trim()) {
      setMessage("Lesson title is required.");
      return;
    }
    const supabase = createClient();
    const payload = {
      course_id: Number(selectedCourseId),
      module_id: lessonForm.moduleId ? Number(lessonForm.moduleId) : null,
      lesson_title: lessonForm.title.trim(),
      title: lessonForm.title.trim(),
      slug: lessonForm.slug.trim() || safeName(lessonForm.title),
      description: lessonForm.summary.trim() || null,
      lesson_summary: lessonForm.summary.trim() || null,
      full_content: lessonForm.fullContent.trim() || null,
      video_type: lessonForm.videoType,
      video_url: lessonForm.videoUrl.trim() || null,
      pdf_notes_url: lessonForm.pdfUrl.trim() || null,
      transcript: lessonForm.transcript.trim() || null,
      instructor_notes: lessonForm.instructorNotes.trim() || null,
      estimated_duration: lessonForm.duration.trim() || null,
      lesson_order: Number(lessonForm.order || 1),
      publication_status: lessonForm.status,
      free_preview: lessonForm.freePreview,
      required_completion: lessonForm.requiredCompletion,
      updated_at: new Date().toISOString()
    };
    const request = lessonForm.lessonId
      ? supabase.from("lessons").update(payload).eq("id", Number(lessonForm.lessonId))
      : supabase.from("lessons").insert(payload);
    const { error } = await request;
    setMessage(error ? friendlyDatabaseError(error, "Unable to save lesson.") : "Lesson saved.");
    if (!error) {
      setLessonForm({ ...emptyLessonForm, courseId: selectedCourseId });
      await load();
    }
  }

  function editLesson(lesson: DbRow) {
    setLessonForm({
      lessonId: value(lesson, ["id"]),
      courseId: value(lesson, ["course_id"]),
      moduleId: value(lesson, ["module_id"]),
      title: value(lesson, ["lesson_title", "title"]),
      slug: value(lesson, ["slug"]),
      summary: value(lesson, ["lesson_summary", "description"]),
      fullContent: value(lesson, ["full_content"]),
      videoType: value(lesson, ["video_type"], "Text-only lesson"),
      videoUrl: value(lesson, ["video_url"]),
      pdfUrl: value(lesson, ["pdf_notes_url"]),
      transcript: value(lesson, ["transcript"]),
      instructorNotes: value(lesson, ["instructor_notes"]),
      duration: value(lesson, ["estimated_duration"]),
      order: value(lesson, ["lesson_order"], "1"),
      freePreview: value(lesson, ["free_preview"]) === "true",
      requiredCompletion: value(lesson, ["required_completion"], "true") !== "false",
      status: statusOf(lesson)
    });
    setActiveSection("lessons");
  }

  async function duplicateLesson(lesson: DbRow) {
    const supabase = createClient();
    const title = `${value(lesson, ["lesson_title", "title"])} Copy`;
    const { error } = await supabase.from("lessons").insert({
      course_id: Number(selectedCourseId),
      module_id: value(lesson, ["module_id"]) ? Number(value(lesson, ["module_id"])) : null,
      lesson_title: title,
      title,
      slug: `${safeName(title)}-${Date.now()}`,
      description: value(lesson, ["description"]),
      lesson_summary: value(lesson, ["lesson_summary"]),
      full_content: value(lesson, ["full_content"]),
      video_type: value(lesson, ["video_type"], "Text-only lesson"),
      video_url: value(lesson, ["video_url"]) || null,
      pdf_notes_url: value(lesson, ["pdf_notes_url"]) || null,
      transcript: value(lesson, ["transcript"]),
      instructor_notes: value(lesson, ["instructor_notes"]),
      estimated_duration: value(lesson, ["estimated_duration"]),
      lesson_order: selectedCourseLessons.length + 1,
      publication_status: "Draft",
      free_preview: value(lesson, ["free_preview"]) === "true",
      required_completion: value(lesson, ["required_completion"], "true") !== "false"
    });
    setMessage(error ? friendlyDatabaseError(error, "Unable to duplicate lesson.") : "Lesson duplicated as draft.");
    if (!error) await load();
  }

  async function updateLessonStatus(lessonId: string, status: Status) {
    const supabase = createClient();
    const { error } = await supabase.from("lessons").update({ publication_status: status, updated_at: new Date().toISOString() }).eq("id", Number(lessonId));
    setMessage(error ? friendlyDatabaseError(error, "Unable to update lesson status.") : `Lesson set to ${status}.`);
    if (!error) await load();
  }

  async function deleteLesson(lessonId: string) {
    if (!window.confirm("Delete this lesson? Existing progress and resources may no longer connect to it.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", Number(lessonId));
    setMessage(error ? friendlyDatabaseError(error, "Unable to delete lesson.") : "Lesson deleted.");
    if (!error) await load();
  }

  async function moveLesson(lesson: DbRow, direction: -1 | 1) {
    const current = numberValue(lesson, ["lesson_order"], 1);
    const supabase = createClient();
    const { error } = await supabase.from("lessons").update({ lesson_order: Math.max(1, current + direction), updated_at: new Date().toISOString() }).eq("id", Number(value(lesson, ["id"])));
    setMessage(error ? friendlyDatabaseError(error, "Unable to reorder lesson.") : "Lesson order updated.");
    if (!error) await load();
  }

  async function saveResource(event?: FormEvent) {
    event?.preventDefault();
    if (!validateSelectedCourse()) return;
    if (!resourceForm.title.trim()) {
      setMessage("Resource title is required.");
      return;
    }
    const moduleTitle = value(selectedCourseModules.find((moduleRow) => value(moduleRow, ["module_id", "id"]) === resourceForm.moduleId), ["module_title", "asset_title"]);
    const supabase = createClient();
    const payload = {
      course_id: Number(selectedCourseId),
      module_id: resourceForm.moduleId ? Number(resourceForm.moduleId) : null,
      module_title: moduleTitle || null,
      lesson_id: resourceForm.lessonId ? Number(resourceForm.lessonId) : null,
      asset_title: resourceForm.title.trim(),
      asset_type: resourceForm.resourceType,
      file_name: resourceForm.fileUrl ? resourceForm.fileUrl.split("/").pop() ?? resourceForm.title : `${safeName(resourceForm.title)}.json`,
      file_type: resourceForm.resourceType,
      storage_path: resourceForm.assetId ? value(courseAssets.find((asset) => value(asset, ["id"]) === resourceForm.assetId), ["storage_path"]) : `resources/${selectedCourseId}/${Date.now()}-${safeName(resourceForm.title)}`,
      url: resourceForm.fileUrl.trim() || "#",
      signed_url: JSON.stringify({ description: resourceForm.description }),
      mime_type: resourceForm.fileUrl ? "text/uri-list" : "application/json",
      asset_status: resourceForm.status,
      description: resourceForm.description,
      downloadable: resourceForm.downloadable,
      visibility: resourceForm.visibility,
      display_order: Number(resourceForm.displayOrder || 100)
    } satisfies CourseAssetInput;
    const result = resourceForm.assetId
      ? await supabase.from("course_assets").update({ ...payload, public_url: payload.url, updated_at: new Date().toISOString() }).eq("id", resourceForm.assetId)
      : await insertCourseAsset(payload);
    setMessage(result.error ? friendlyDatabaseError(result.error, "Unable to save resource.") : "Resource saved.");
    if (!result.error) {
      setResourceForm({ ...emptyResourceForm, courseId: selectedCourseId });
      await load();
    }
  }

  function editResource(asset: DbRow) {
    setResourceForm({
      assetId: value(asset, ["id"]),
      courseId: value(asset, ["course_id"]),
      moduleId: value(asset, ["module_id"]),
      lessonId: value(asset, ["lesson_id"]),
      title: value(asset, ["asset_title"]),
      description: value(asset, ["description"], value(parseJson(asset), ["description"])),
      resourceType: value(asset, ["asset_type"], "Resource") as AssetType,
      fileUrl: value(asset, ["url", "public_url"]),
      downloadable: value(asset, ["downloadable"], "true") !== "false",
      visibility: value(asset, ["visibility"], "Authenticated Students"),
      displayOrder: value(asset, ["display_order"], "100"),
      status: statusOf(asset)
    });
    setActiveSection("resources");
  }

  async function saveAssignment(event?: FormEvent) {
    event?.preventDefault();
    if (!validateSelectedCourse()) return;
    if (!assignmentForm.title.trim()) {
      setMessage("Assignment title is required.");
      return;
    }
    const moduleTitle = value(selectedCourseModules.find((moduleRow) => value(moduleRow, ["module_id", "id"]) === assignmentForm.moduleId), ["module_title", "asset_title"]);
    const payloadJson = JSON.stringify({
      instructions: assignmentForm.instructions,
      assignmentType: assignmentForm.assignmentType,
      dueDate: assignmentForm.noDueDate ? "" : assignmentForm.dueDate,
      maximumScore: Number(assignmentForm.maximumScore || 100),
      submissionFileTypes: assignmentForm.fileTypes,
      rubric: assignmentForm.rubric,
      required: assignmentForm.required
    });
    const { error } = await insertCourseAsset({
      course_id: Number(selectedCourseId),
      module_id: assignmentForm.moduleId ? Number(assignmentForm.moduleId) : null,
      module_title: moduleTitle || null,
      lesson_id: assignmentForm.lessonId ? Number(assignmentForm.lessonId) : null,
      asset_title: assignmentForm.title.trim(),
      asset_type: "Assignment",
      file_name: `${safeName(assignmentForm.title)}.json`,
      file_type: assignmentForm.assignmentType,
      storage_path: `assignments/${selectedCourseId}/${Date.now()}-${safeName(assignmentForm.title)}`,
      url: "#",
      signed_url: payloadJson,
      mime_type: "application/json",
      asset_status: assignmentForm.status,
      description: assignmentForm.instructions,
      display_order: 100
    });
    setMessage(error ? friendlyDatabaseError(error, "Unable to save assignment.") : "Assignment saved.");
    if (!error) {
      setAssignmentForm({ ...emptyAssignmentForm, courseId: selectedCourseId });
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
    const moduleTitle = value(selectedCourseModules.find((moduleRow) => value(moduleRow, ["module_id", "id"]) === quizForm.moduleId), ["module_title", "asset_title"]);
    const questionData = serializeQuizQuestion({
      questionText: quizForm.prompt.trim(),
      options: validation.options,
      correctAnswer: quizForm.correctAnswer.trim(),
      points: Number(quizForm.points || 1)
    });
    const payload = {
      course_id: Number(quizForm.courseId),
      module_id: quizForm.moduleId ? Number(quizForm.moduleId) : null,
      module_title: moduleTitle || null,
      lesson_id: quizForm.lessonId ? Number(quizForm.lessonId) : null,
      asset_title: quizForm.title.trim(),
      asset_type: "Quiz" as AssetType,
      file_name: `${safeName(quizForm.title)}.json`,
      file_type: "Quiz",
      storage_path: editingQuestionId ? value(courseAssets.find((asset) => value(asset, ["id"]) === editingQuestionId), ["storage_path"]) : `quizzes/${quizForm.courseId}/${quizForm.lessonId || "course"}/${safeName(quizForm.title)}/${Date.now()}-${safeName(quizForm.prompt).slice(0, 52)}`,
      url: "#",
      signed_url: JSON.stringify({ quizTitle: quizForm.title.trim(), question: questionData }),
      mime_type: "application/json",
      file_size: JSON.stringify(questionData).length,
      asset_status: "Draft" as Status
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

    setMessage(result.error ? friendlyDatabaseError(result.error, "Unable to save quiz question.") : "Question saved successfully.");
    if (!result.error) {
      setEditingQuestionId("");
      setQuizForm((current) => ({ ...current, prompt: addAnother ? "" : "", options: "", correctAnswer: "", points: "1" }));
      await load();
    }
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
    setMessage(error ? friendlyDatabaseError(error, "Unable to publish quiz.") : "Quiz published.");
    if (!error) await load();
  }

  function editQuestion(question: SavedQuizQuestion) {
    setEditingQuestionId(question.id);
    setQuizForm({
      courseId: question.courseId,
      moduleId: question.moduleId,
      lessonId: question.lessonId,
      title: question.quizTitle,
      prompt: question.prompt || question.questionText,
      options: question.options.join(","),
      correctAnswer: question.correctAnswer,
      points: String(question.points || 1)
    });
    setActiveSection("quizzes");
    setMessage("Editing saved question.");
  }

  if (loading) {
    return (
      <div className="terminal-panel grid min-h-80 place-items-center p-8 text-center">
        <div>
          <Loader2 className="mx-auto animate-spin text-gold-300" size={34} />
          <p className="mt-4 text-sm text-ink/70">Loading AFF Course Builder...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="terminal-panel flex items-start gap-3 p-6 text-ink/72">
        <Lock className="shrink-0 text-gold-300" size={22} />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <section className="grid gap-7">
      <div className="terminal-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-gold-300">AFF Course Management System</p>
            <h2 className="mt-2 font-serif text-3xl text-white">Administrative Course Builder</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/70">{message}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => {
              setSelectedCourseId("");
              setCourseForm(emptyCourseForm);
              setActiveSection("course");
            }} className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950">
              <Plus size={17} /> Create New Course
            </button>
            <Link href="/admin/course-management/upload-center" className="inline-flex items-center justify-center gap-2 border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300">
              <UploadCloud size={17} /> Upload Course Media
            </Link>
            <Link href="/student-courses" className="inline-flex items-center justify-center gap-2 border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300">
              <Eye size={17} /> Preview Student Experience
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Courses" value={summary.totalCourses} icon={<BookOpen size={20} />} />
        <SummaryCard label="Published Courses" value={summary.publishedCourses} icon={<CheckCircle2 size={20} />} />
        <SummaryCard label="Draft Courses" value={summary.draftCourses} icon={<Pencil size={20} />} />
        <SummaryCard label="Total Modules" value={summary.totalModules} icon={<Layers3 size={20} />} />
        <SummaryCard label="Total Lessons" value={summary.totalLessons} icon={<Video size={20} />} />
        <SummaryCard label="Enrolled Students" value={summary.enrolledStudents} icon={<LibraryBig size={20} />} />
        <SummaryCard label="Courses Awaiting Content" value={summary.awaitingContent} icon={<XCircle size={20} />} />
        <SummaryCard label="Recently Updated Courses" value={summary.recentlyUpdated} icon={<RefreshCw size={20} />} />
      </div>

      <section className="terminal-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-gold-300">Manage Courses</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Course Library Administration</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-4 xl:min-w-[760px]">
            <label className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-3 text-gold-300" size={16} />
              <input className="field pl-10" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search title or course code" />
            </label>
            <select className="field" value={divisionFilter} onChange={(event) => setDivisionFilter(event.target.value)}>
              <option value="All">All divisions</option>
              {divisions.map((division) => <option key={division} value={division}>{division}</option>)}
            </select>
            <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm text-ink/70">
          <Filter className="text-gold-300" size={16} />
          <span>Sort by</span>
          <select className="field max-w-56" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            <option value="updated">Last updated</option>
            <option value="created">Date created</option>
            <option value="title">Course title</option>
          </select>
        </div>

        <div className="mt-5 grid gap-4">
          {filteredCourses.length === 0 ? <p className="border border-gold-500/18 bg-navy-950 p-5 text-sm text-ink/70">No courses match the current filters.</p> : null}
          {filteredCourses.map((course) => {
            const courseId = value(course, ["id"]);
            const courseModules = modules.filter((moduleRow) => value(moduleRow, ["course_id"]) === courseId);
            const courseLessons = lessons.filter((lesson) => value(lesson, ["course_id"]) === courseId);
            const enrolledCount = enrollments.filter((enrollment) => value(enrollment, ["course_id"]) === courseId || sameText(value(enrollment, ["course_name"]), value(course, ["course_name", "title"]))).length;
            return (
              <article key={courseId} className={`grid gap-0 overflow-hidden border bg-navy-950 lg:grid-cols-[180px_1fr] ${selectedCourseId === courseId ? "border-gold-300" : "border-gold-500/18"}`}>
                <CourseThumb course={course} />
                <div className="grid gap-4 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(course, ["academic_division", "department_name"], "Academy Division")}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{value(course, ["course_name", "title"])}</h3>
                      <p className="mt-2 text-sm text-ink/65">{value(course, ["short_description", "description"], "No description yet.")}</p>
                    </div>
                    <StatusBadge status={statusOf(course)} />
                  </div>
                  <div className="grid gap-3 text-sm text-ink/70 md:grid-cols-2 xl:grid-cols-4">
                    <Info label="Instructor" value={value(course, ["instructor_name", "instructor"], "Not assigned")} />
                    <Info label="Course Code" value={value(course, ["course_code"], "Not assigned")} />
                    <Info label="Modules" value={String(courseModules.length)} />
                    <Info label="Lessons" value={String(courseLessons.length)} />
                    <Info label="Enrolled Students" value={String(enrolledCount)} />
                    <Info label="Last Updated" value={displayDate(value(course, ["updated_at", "created_at"]))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => selectCourse(course)} className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300"><Pencil size={14} /> Edit</button>
                    <Link href={`/courses/managed/${encodeURIComponent(value(course, ["course_code", "slug"], safeName(value(course, ["course_name", "title"]))))}`} className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300"><Eye size={14} /> Preview</Link>
                    {statusOf(course) === "Published" ? (
                      <button type="button" onClick={() => { selectCourse(course); updateCourseStatus("Draft"); }} className="border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300">Unpublish</button>
                    ) : (
                      <button type="button" onClick={() => { selectCourse(course); updateCourseStatus("Published"); }} className="bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950">Publish</button>
                    )}
                    <button type="button" onClick={() => { selectCourse(course); updateCourseStatus("Archived"); }} className="inline-flex items-center gap-2 border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-200"><Archive size={14} /> Archive</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="terminal-panel h-fit p-4">
          <p className="text-xs uppercase tracking-[.2em] text-gold-300">Course Editor</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{selectedCourse ? value(selectedCourse, ["course_name", "title"]) : "New Course"}</h2>
          <div className="mt-4 grid gap-2">
            {[
              ["course", "Course Information"],
              ["curriculum", "Curriculum Structure"],
              ["lessons", "Lesson Builder"],
              ["resources", "Media and Resources"],
              ["assignments", "Assignments"],
              ["quizzes", "Quizzes"],
              ["publication", "Publication Controls"]
            ].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveSection(key)} className={`px-3 py-3 text-left text-sm font-semibold ${activeSection === key ? "bg-gold-500 text-navy-950" : "border border-gold-500/18 text-ink/76 hover:border-gold-300 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="grid gap-6">
          {activeSection === "course" ? (
            <FormPanel title="Course Information" icon={<BookOpen size={21} />} onSubmit={saveCourse} submitLabel={courseForm.courseId ? "Save Course Information" : "Create Draft Course"}>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="field" placeholder="Course Title" value={courseForm.courseTitle} onChange={(event) => setCourseForm({ ...courseForm, courseTitle: event.target.value })} required />
                <input className="field" placeholder="Course Code" value={courseForm.courseCode} onChange={(event) => setCourseForm({ ...courseForm, courseCode: event.target.value.toUpperCase() })} required />
              </div>
              <input className="field" placeholder="Short Description" value={courseForm.shortDescription} onChange={(event) => setCourseForm({ ...courseForm, shortDescription: event.target.value })} />
              <textarea className="field min-h-28" placeholder="Full Course Description" value={courseForm.fullDescription} onChange={(event) => setCourseForm({ ...courseForm, fullDescription: event.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <select className="field" value={courseForm.academicDivision} onChange={(event) => setCourseForm({ ...courseForm, academicDivision: event.target.value })}>
                  {divisions.map((division) => <option key={division} value={division}>{division}</option>)}
                </select>
                <input className="field" placeholder="Department or College" value={courseForm.departmentName} onChange={(event) => setCourseForm({ ...courseForm, departmentName: event.target.value })} />
                <input className="field" placeholder="Instructor Name" value={courseForm.instructorName} onChange={(event) => setCourseForm({ ...courseForm, instructorName: event.target.value })} required />
                <input className="field" placeholder="Instructor User ID if available" value={courseForm.instructorUserId} onChange={(event) => setCourseForm({ ...courseForm, instructorUserId: event.target.value })} />
                <input className="field" placeholder="Course Thumbnail URL" value={courseForm.thumbnailUrl} onChange={(event) => setCourseForm({ ...courseForm, thumbnailUrl: event.target.value })} />
                <input className="field" placeholder="Banner Image URL" value={courseForm.bannerImageUrl} onChange={(event) => setCourseForm({ ...courseForm, bannerImageUrl: event.target.value })} />
                <select className="field" value={courseForm.difficultyLevel} onChange={(event) => setCourseForm({ ...courseForm, difficultyLevel: event.target.value })}>
                  <option>Foundations</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                  <option>Professional</option>
                </select>
                <input className="field" placeholder="Estimated Duration" value={courseForm.estimatedDuration} onChange={(event) => setCourseForm({ ...courseForm, estimatedDuration: event.target.value })} />
                <select className="field" value={courseForm.certificationEligibility} onChange={(event) => setCourseForm({ ...courseForm, certificationEligibility: event.target.value })}>
                  <option>Yes</option>
                  <option>No</option>
                </select>
                <select className="field" value={courseForm.enrollmentType} onChange={(event) => setCourseForm({ ...courseForm, enrollmentType: event.target.value })}>
                  <option>Enrollment Required</option>
                  <option>Open Enrollment</option>
                  <option>Invitation Only</option>
                  <option>Paid Membership Required</option>
                </select>
                <select className="field" value={courseForm.publicationStatus} onChange={(event) => setCourseForm({ ...courseForm, publicationStatus: event.target.value as Status })}>
                  <option>Draft</option>
                  <option>Published</option>
                  <option>Archived</option>
                </select>
                <input className="field" type="number" placeholder="Display Order" value={courseForm.displayOrder} onChange={(event) => setCourseForm({ ...courseForm, displayOrder: event.target.value })} />
              </div>
            </FormPanel>
          ) : null}

          {activeSection === "curriculum" ? (
            <EditorPanel title="Curriculum Structure" icon={<Layers3 size={21} />}>
              <FormPanel title={moduleForm.assetId ? "Edit Module" : "Add Module"} icon={<Layers3 size={21} />} onSubmit={saveModule} submitLabel={moduleForm.assetId ? "Save Module" : "Add Module"}>
                <input className="field" placeholder="Module Title" value={moduleForm.title} onChange={(event) => setModuleForm({ ...moduleForm, title: event.target.value })} required />
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="field" type="number" min="1" placeholder="Module Number" value={moduleForm.order} onChange={(event) => setModuleForm({ ...moduleForm, order: event.target.value })} />
                  <input className="field" placeholder="Estimated Duration" value={moduleForm.duration} onChange={(event) => setModuleForm({ ...moduleForm, duration: event.target.value })} />
                </div>
                <textarea className="field min-h-20" placeholder="Module Description" value={moduleForm.description} onChange={(event) => setModuleForm({ ...moduleForm, description: event.target.value })} />
                <textarea className="field min-h-20" placeholder="Learning Objectives" value={moduleForm.objectives} onChange={(event) => setModuleForm({ ...moduleForm, objectives: event.target.value })} />
                <div className="grid gap-3 md:grid-cols-3">
                  <input className="field" placeholder="Prerequisite Module" value={moduleForm.prerequisite} onChange={(event) => setModuleForm({ ...moduleForm, prerequisite: event.target.value })} />
                  <select className="field" value={moduleForm.required} onChange={(event) => setModuleForm({ ...moduleForm, required: event.target.value })}>
                    <option>Required</option>
                    <option>Optional</option>
                  </select>
                  <select className="field" value={moduleForm.status} onChange={(event) => setModuleForm({ ...moduleForm, status: event.target.value as Status })}>
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Archived</option>
                  </select>
                </div>
              </FormPanel>
              <ItemList empty="No modules created for this course yet.">
                {selectedCourseModules.map((moduleRow) => (
                  <AdminItem key={value(moduleRow, ["id"])} title={value(moduleRow, ["module_title", "asset_title"])} meta={`Module ${value(moduleRow, ["display_order", "module_id"], "1")} · ${statusOf(moduleRow)}`} status={statusOf(moduleRow)}>
                    <button onClick={() => editModule(moduleRow)} className="mini-button" type="button">Edit</button>
                    <button onClick={() => duplicateModule(moduleRow)} className="mini-button" type="button"><Copy size={14} /></button>
                    <button onClick={() => moveAsset(moduleRow, -1)} className="mini-button" type="button"><ArrowUp size={14} /></button>
                    <button onClick={() => moveAsset(moduleRow, 1)} className="mini-button" type="button"><ArrowDown size={14} /></button>
                    <button onClick={() => updateAssetStatus(value(moduleRow, ["id"]), statusOf(moduleRow) === "Published" ? "Draft" : "Published", "Module")} className="mini-button" type="button">{statusOf(moduleRow) === "Published" ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => deleteAsset(value(moduleRow, ["id"]), "module")} className="mini-danger" type="button">Delete</button>
                  </AdminItem>
                ))}
              </ItemList>
            </EditorPanel>
          ) : null}

          {activeSection === "lessons" ? (
            <EditorPanel title="Lesson Builder" icon={<Video size={21} />}>
              <FormPanel title={lessonForm.lessonId ? "Edit Lesson" : "Create Lesson"} icon={<Video size={21} />} onSubmit={saveLesson} submitLabel={lessonForm.lessonId ? "Save Lesson" : "Create Lesson"}>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="field" placeholder="Lesson Title" value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required />
                  <input className="field" placeholder="Lesson Slug" value={lessonForm.slug} onChange={(event) => setLessonForm({ ...lessonForm, slug: event.target.value })} />
                  <Select label="Optional module" value={lessonForm.moduleId} onChange={(next) => setLessonForm({ ...lessonForm, moduleId: next })}>{selectedCourseModules.map((moduleRow) => <option key={value(moduleRow, ["id"])} value={value(moduleRow, ["module_id", "display_order"])}>{value(moduleRow, ["module_title", "asset_title"])}</option>)}</Select>
                  <input className="field" type="number" min="1" placeholder="Lesson Number" value={lessonForm.order} onChange={(event) => setLessonForm({ ...lessonForm, order: event.target.value })} />
                </div>
                <textarea className="field min-h-20" placeholder="Lesson Summary" value={lessonForm.summary} onChange={(event) => setLessonForm({ ...lessonForm, summary: event.target.value })} />
                <textarea className="field min-h-32" placeholder="Full Lesson Content" value={lessonForm.fullContent} onChange={(event) => setLessonForm({ ...lessonForm, fullContent: event.target.value })} />
                <div className="grid gap-3 md:grid-cols-2">
                  <select className="field" value={lessonForm.videoType} onChange={(event) => setLessonForm({ ...lessonForm, videoType: event.target.value })}>
                    <option>Text-only lesson</option>
                    <option>Supabase Storage video</option>
                    <option>MP4 URL</option>
                    <option>Vimeo</option>
                    <option>YouTube</option>
                    <option>Bunny Stream</option>
                  </select>
                  <input className="field" placeholder="Video URL or uploaded video URL" value={lessonForm.videoUrl} onChange={(event) => setLessonForm({ ...lessonForm, videoUrl: event.target.value })} />
                  <input className="field" placeholder="PDF Notes URL" value={lessonForm.pdfUrl} onChange={(event) => setLessonForm({ ...lessonForm, pdfUrl: event.target.value })} />
                  <input className="field" placeholder="Estimated Duration" value={lessonForm.duration} onChange={(event) => setLessonForm({ ...lessonForm, duration: event.target.value })} />
                </div>
                <textarea className="field min-h-24" placeholder="Transcript" value={lessonForm.transcript} onChange={(event) => setLessonForm({ ...lessonForm, transcript: event.target.value })} />
                <textarea className="field min-h-20" placeholder="Instructor Notes" value={lessonForm.instructorNotes} onChange={(event) => setLessonForm({ ...lessonForm, instructorNotes: event.target.value })} />
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm text-ink/75"><input type="checkbox" checked={lessonForm.freePreview} onChange={(event) => setLessonForm({ ...lessonForm, freePreview: event.target.checked })} /> Free Preview</label>
                  <label className="flex items-center gap-2 text-sm text-ink/75"><input type="checkbox" checked={lessonForm.requiredCompletion} onChange={(event) => setLessonForm({ ...lessonForm, requiredCompletion: event.target.checked })} /> Required Completion</label>
                  <select className="field" value={lessonForm.status} onChange={(event) => setLessonForm({ ...lessonForm, status: event.target.value as Status })}>
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Archived</option>
                  </select>
                </div>
              </FormPanel>
              <ItemList empty="No lessons created for this course yet.">
                {selectedCourseLessons.map((lesson) => (
                  <AdminItem key={value(lesson, ["id"])} title={value(lesson, ["lesson_title", "title"])} meta={`Lesson ${value(lesson, ["lesson_order"], "1")} · ${value(lesson, ["video_type"], "Text-only lesson")}`} status={statusOf(lesson)}>
                    <button onClick={() => editLesson(lesson)} className="mini-button" type="button">Edit</button>
                    <button onClick={() => duplicateLesson(lesson)} className="mini-button" type="button"><Copy size={14} /></button>
                    <button onClick={() => moveLesson(lesson, -1)} className="mini-button" type="button"><ArrowUp size={14} /></button>
                    <button onClick={() => moveLesson(lesson, 1)} className="mini-button" type="button"><ArrowDown size={14} /></button>
                    <button onClick={() => updateLessonStatus(value(lesson, ["id"]), statusOf(lesson) === "Published" ? "Draft" : "Published")} className="mini-button" type="button">{statusOf(lesson) === "Published" ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => deleteLesson(value(lesson, ["id"]))} className="mini-danger" type="button">Delete</button>
                  </AdminItem>
                ))}
              </ItemList>
            </EditorPanel>
          ) : null}

          {activeSection === "resources" ? (
            <EditorPanel title="Media and Resources" icon={<FilePlus2 size={21} />}>
              <FormPanel title={resourceForm.assetId ? "Edit Resource" : "Attach Resource"} icon={<FilePlus2 size={21} />} onSubmit={saveResource} submitLabel="Save Resource">
                <input className="field" placeholder="Resource Title" value={resourceForm.title} onChange={(event) => setResourceForm({ ...resourceForm, title: event.target.value })} required />
                <textarea className="field min-h-20" placeholder="Resource Description" value={resourceForm.description} onChange={(event) => setResourceForm({ ...resourceForm, description: event.target.value })} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Select label="Optional module" value={resourceForm.moduleId} onChange={(next) => setResourceForm({ ...resourceForm, moduleId: next })}>{selectedCourseModules.map((moduleRow) => <option key={value(moduleRow, ["id"])} value={value(moduleRow, ["module_id", "display_order"])}>{value(moduleRow, ["module_title", "asset_title"])}</option>)}</Select>
                  <Select label="Optional lesson" value={resourceForm.lessonId} onChange={(next) => setResourceForm({ ...resourceForm, lessonId: next })}>{selectedCourseLessons.map((lesson) => <option key={value(lesson, ["id"])} value={value(lesson, ["id"])}>{value(lesson, ["lesson_title", "title"])}</option>)}</Select>
                  <select className="field" value={resourceForm.resourceType} onChange={(event) => setResourceForm({ ...resourceForm, resourceType: event.target.value as AssetType })}>
                    {["PDF Notes", "DOCX", "PPTX", "XLSX", "ZIP", "Image", "Audio", "External Link", "Workbook", "Cheat Sheet", "Assignment Instructions", "Video", "Resource"].map((type) => <option key={type}>{type}</option>)}
                  </select>
                  <input className="field" placeholder="File or URL" value={resourceForm.fileUrl} onChange={(event) => setResourceForm({ ...resourceForm, fileUrl: event.target.value })} />
                  <select className="field" value={resourceForm.visibility} onChange={(event) => setResourceForm({ ...resourceForm, visibility: event.target.value })}>
                    <option>Authenticated Students</option>
                    <option>Enrolled Students</option>
                    <option>Administrators Only</option>
                  </select>
                  <input className="field" type="number" placeholder="Display Order" value={resourceForm.displayOrder} onChange={(event) => setResourceForm({ ...resourceForm, displayOrder: event.target.value })} />
                  <select className="field" value={resourceForm.status} onChange={(event) => setResourceForm({ ...resourceForm, status: event.target.value as Status })}>
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Archived</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-ink/75"><input type="checkbox" checked={resourceForm.downloadable} onChange={(event) => setResourceForm({ ...resourceForm, downloadable: event.target.checked })} /> Downloadable</label>
                </div>
              </FormPanel>
              <ItemList empty="No resources attached yet.">
                {selectedCourseResources.map((asset) => (
                  <AdminItem key={value(asset, ["id"])} title={value(asset, ["asset_title"])} meta={`${value(asset, ["asset_type"])} · ${value(asset, ["visibility"], "Authenticated Students")}`} status={statusOf(asset)}>
                    <button onClick={() => editResource(asset)} className="mini-button" type="button">Edit</button>
                    <button onClick={() => updateAssetStatus(value(asset, ["id"]), statusOf(asset) === "Published" ? "Draft" : "Published", "Resource")} className="mini-button" type="button">{statusOf(asset) === "Published" ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => deleteAsset(value(asset, ["id"]), "resource")} className="mini-danger" type="button">Delete</button>
                  </AdminItem>
                ))}
              </ItemList>
            </EditorPanel>
          ) : null}

          {activeSection === "assignments" ? (
            <EditorPanel title="Assignment Builder" icon={<ClipboardCheck size={21} />}>
              <FormPanel title="Create Assignment" icon={<ClipboardCheck size={21} />} onSubmit={saveAssignment} submitLabel="Save Assignment">
                <input className="field" placeholder="Assignment Title" value={assignmentForm.title} onChange={(event) => setAssignmentForm({ ...assignmentForm, title: event.target.value })} required />
                <textarea className="field min-h-24" placeholder="Instructions" value={assignmentForm.instructions} onChange={(event) => setAssignmentForm({ ...assignmentForm, instructions: event.target.value })} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Select label="Optional module" value={assignmentForm.moduleId} onChange={(next) => setAssignmentForm({ ...assignmentForm, moduleId: next })}>{selectedCourseModules.map((moduleRow) => <option key={value(moduleRow, ["id"])} value={value(moduleRow, ["module_id", "display_order"])}>{value(moduleRow, ["module_title", "asset_title"])}</option>)}</Select>
                  <Select label="Optional lesson" value={assignmentForm.lessonId} onChange={(next) => setAssignmentForm({ ...assignmentForm, lessonId: next })}>{selectedCourseLessons.map((lesson) => <option key={value(lesson, ["id"])} value={value(lesson, ["id"])}>{value(lesson, ["lesson_title", "title"])}</option>)}</Select>
                  <select className="field" value={assignmentForm.assignmentType} onChange={(event) => setAssignmentForm({ ...assignmentForm, assignmentType: event.target.value })}>
                    <option>Written response</option>
                    <option>File upload</option>
                    <option>Chart analysis</option>
                    <option>Trade plan</option>
                    <option>Weekly reflection</option>
                    <option>Workbook exercise</option>
                  </select>
                  <input className="field" type="number" min="1" placeholder="Maximum Score" value={assignmentForm.maximumScore} onChange={(event) => setAssignmentForm({ ...assignmentForm, maximumScore: event.target.value })} />
                  <input className="field" placeholder="Submission File Types" value={assignmentForm.fileTypes} onChange={(event) => setAssignmentForm({ ...assignmentForm, fileTypes: event.target.value })} />
                  <input className="field" type="date" disabled={assignmentForm.noDueDate} value={assignmentForm.dueDate} onChange={(event) => setAssignmentForm({ ...assignmentForm, dueDate: event.target.value })} />
                  <select className="field" value={assignmentForm.status} onChange={(event) => setAssignmentForm({ ...assignmentForm, status: event.target.value as Status })}>
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Archived</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-ink/75"><input type="checkbox" checked={assignmentForm.noDueDate} onChange={(event) => setAssignmentForm({ ...assignmentForm, noDueDate: event.target.checked })} /> No Due Date</label>
                  <label className="flex items-center gap-2 text-sm text-ink/75"><input type="checkbox" checked={assignmentForm.required} onChange={(event) => setAssignmentForm({ ...assignmentForm, required: event.target.checked })} /> Required</label>
                </div>
                <textarea className="field min-h-24" placeholder="Rubric" value={assignmentForm.rubric} onChange={(event) => setAssignmentForm({ ...assignmentForm, rubric: event.target.value })} />
              </FormPanel>
              <ItemList empty="No assignments created for this course yet.">
                {selectedCourseAssignments.map((asset) => (
                  <AdminItem key={value(asset, ["id"])} title={value(asset, ["asset_title"])} meta={value(parseJson(asset), ["assignmentType"], value(asset, ["file_type"], "Assignment"))} status={statusOf(asset)}>
                    <button onClick={() => updateAssetStatus(value(asset, ["id"]), statusOf(asset) === "Published" ? "Draft" : "Published", "Assignment")} className="mini-button" type="button">{statusOf(asset) === "Published" ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => deleteAsset(value(asset, ["id"]), "assignment")} className="mini-danger" type="button">Delete</button>
                  </AdminItem>
                ))}
              </ItemList>
            </EditorPanel>
          ) : null}

          {activeSection === "quizzes" ? (
            <EditorPanel title="Quiz Placeholder Integration" icon={<ClipboardCheck size={21} />}>
              <FormPanel title="Create Quiz Question" icon={<ClipboardCheck size={21} />} onSubmit={(event) => { event.preventDefault(); saveQuizQuestion(false); }} submitLabel={editingQuestionId ? "Update Question" : "Save Question"}>
                <Select label="Select course" value={quizForm.courseId} onChange={(next) => setQuizForm({ ...quizForm, courseId: next, lessonId: "" })}>{courseOptions}</Select>
                <Select label="Optional module" value={quizForm.moduleId} onChange={(next) => setQuizForm({ ...quizForm, moduleId: next })}>{selectedCourseModules.map((moduleRow) => <option key={value(moduleRow, ["id"])} value={value(moduleRow, ["module_id", "display_order"])}>{value(moduleRow, ["module_title", "asset_title"])}</option>)}</Select>
                <Select label="Optional lesson" value={quizForm.lessonId} onChange={(next) => setQuizForm({ ...quizForm, lessonId: next })}>{selectedCourseLessons.map((lesson) => <option key={value(lesson, ["id"])} value={value(lesson, ["id"])}>{value(lesson, ["lesson_title", "title"])}</option>)}</Select>
                <input className="field" placeholder="Quiz title" value={quizForm.title} onChange={(event) => setQuizForm({ ...quizForm, title: event.target.value })} required />
                <input className="field" placeholder="Question" value={quizForm.prompt} onChange={(event) => setQuizForm({ ...quizForm, prompt: event.target.value })} required />
                <input className="field" placeholder="Options separated by commas" value={quizForm.options} onChange={(event) => setQuizForm({ ...quizForm, options: event.target.value })} required />
                <input className="field" placeholder="Correct answer" value={quizForm.correctAnswer} onChange={(event) => setQuizForm({ ...quizForm, correctAnswer: event.target.value })} required />
                <input className="field" type="number" min="1" placeholder="Point value" value={quizForm.points} onChange={(event) => setQuizForm({ ...quizForm, points: event.target.value })} />
                <p className="text-sm font-semibold text-gold-300">Questions created: {savedQuestions.length} of 20</p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <button className="border border-gold-500/45 px-4 py-3 text-sm font-bold text-gold-300" type="button" onClick={() => saveQuizQuestion(true)}>Save and Add Another</button>
                  <button className="border border-gold-500/45 px-4 py-3 text-sm font-bold text-gold-300" type="button" onClick={() => setShowQuizPreview((current) => !current)}>Preview Quiz</button>
                  <button className="border border-gold-500/45 px-4 py-3 text-sm font-bold text-gold-300 disabled:cursor-not-allowed disabled:opacity-45" type="button" onClick={publishQuiz} disabled={selectedQuizPublished}>{selectedQuizPublished ? "Published" : "Publish Quiz"}</button>
                  <Link href="/admin/course-management?quiz-builder=future" className="border border-gold-500/45 px-4 py-3 text-center text-sm font-bold text-gold-300">Create Quiz</Link>
                </div>
              </FormPanel>
              {showQuizPreview ? <QuizList title="Preview Quiz" questions={matchingQuizQuestions} onEdit={editQuestion} onDelete={(id) => deleteAsset(id, "quiz question")} /> : null}
              <QuizList title="Existing Quizzes" questions={savedQuestions} onEdit={editQuestion} onDelete={(id) => deleteAsset(id, "quiz question")} />
              <ItemList empty="No quiz records for this selected course yet.">
                {selectedCourseQuizzes.map((asset) => (
                  <AdminItem key={value(asset, ["id"])} title={value(asset, ["asset_title"])} meta={`Lesson ${value(asset, ["lesson_id"], "Course level")} · ${statusOf(asset)}`} status={statusOf(asset)}>
                    <button onClick={() => updateAssetStatus(value(asset, ["id"]), statusOf(asset) === "Published" ? "Draft" : "Published", "Quiz")} className="mini-button" type="button">{statusOf(asset) === "Published" ? "Unpublish" : "Publish"}</button>
                  </AdminItem>
                ))}
              </ItemList>
            </EditorPanel>
          ) : null}

          {activeSection === "publication" ? (
            <EditorPanel title="Publication Controls" icon={<CheckCircle2 size={21} />}>
              <div className="terminal-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-gold-300">Publication Checklist</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">{selectedCourse ? value(selectedCourse, ["course_name", "title"]) : "Select a course"}</h3>
                  </div>
                  {selectedCourse ? <StatusBadge status={statusOf(selectedCourse)} /> : null}
                </div>
                <div className="mt-5 grid gap-3">
                  {publicationChecklist().map((item) => (
                    <div key={item.label} className="flex items-center gap-3 border border-gold-500/14 bg-navy-950 p-3 text-sm">
                      {item.complete ? <CheckCircle2 className="text-emerald-300" size={18} /> : <XCircle className="text-red-200" size={18} />}
                      <span className={item.complete ? "text-ink/78" : "text-red-100"}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => updateCourseStatus("Draft")} className="border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300">Save Draft</button>
                  <Link href={`/courses/managed/${encodeURIComponent(courseForm.courseCode || safeName(courseForm.courseTitle))}`} className="border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300">Preview</Link>
                  <button type="button" onClick={() => updateCourseStatus("Published")} className="bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950">Publish</button>
                  <button type="button" onClick={() => updateCourseStatus("Draft")} className="border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300">Unpublish</button>
                  <button type="button" onClick={() => updateCourseStatus("Archived")} className="border border-red-400/40 px-4 py-3 text-sm font-semibold text-red-200">Archive</button>
                </div>
              </div>
            </EditorPanel>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function SummaryCard({ label, value: cardValue, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="terminal-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[.18em] text-ink/55">{label}</p>
        <span className="text-gold-300">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-white">{cardValue}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const className = status === "Published" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : status === "Archived" ? "border-red-400/40 bg-red-500/10 text-red-100" : "border-gold-500/35 bg-gold-500/10 text-gold-200";
  return <span className={`inline-flex w-fit border px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] ${className}`}>{status}</span>;
}

function CourseThumb({ course }: { course: DbRow }) {
  const thumbnail = value(course, ["thumbnail_url"]);
  if (thumbnail) {
    return <div className="min-h-48 bg-cover bg-center lg:min-h-full" style={{ backgroundImage: `linear-gradient(180deg,rgba(10,24,51,0.1),rgba(10,24,51,0.75)),url(${thumbnail})` }} />;
  }
  return (
    <div className="grid min-h-48 place-items-center bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_36%),linear-gradient(135deg,#0A1833,#111F3E)] p-5 text-center lg:min-h-full">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center border border-gold-500/45 text-lg font-serif font-bold text-gold-300">AFF</div>
        <p className="mt-3 text-xs uppercase tracking-[.18em] text-gold-300">{value(course, ["course_code"], "Course")}</p>
      </div>
    </div>
  );
}

function Info({ label, value: infoValue }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[.16em] text-ink/48">{label}</p>
      <p className="mt-1 font-semibold text-ink/82">{infoValue}</p>
    </div>
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
      <button className="inline-flex min-h-11 items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
        <Save size={17} /> {submitLabel}
      </button>
    </form>
  );
}

function EditorPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-5">
      <div className="terminal-panel flex items-center gap-3 p-5 text-gold-300">
        {icon}
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Select({ label, value: selected, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select className="field" value={selected} onChange={(event) => onChange(event.target.value)}>
      <option value="">{label}</option>
      {children}
    </select>
  );
}

function ItemList({ empty, children }: { empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <div className="grid gap-3">{hasItems ? children : <p className="terminal-panel p-5 text-sm text-ink/68">{empty}</p>}</div>;
}

function AdminItem({ title, meta, status, children }: { title: string; meta: string; status: Status; children: ReactNode }) {
  return (
    <article className="border border-gold-500/18 bg-navy-950 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <StatusBadge status={status} />
          <h3 className="mt-3 font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-ink/62">{meta}</p>
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </article>
  );
}

function QuizList({ title, questions, onEdit, onDelete }: { title: string; questions: SavedQuizQuestion[]; onEdit: (question: SavedQuizQuestion) => void; onDelete: (id: string) => void }) {
  return (
    <section className="terminal-panel p-5">
      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{title}</p>
      <div className="mt-4 grid gap-3">
        {questions.length === 0 ? <p className="text-sm text-ink/68">No saved questions match this quiz yet.</p> : questions.map((questionRecord, index) => {
          console.log(questionRecord);
          return (
            <article key={questionRecord.id} className="border border-gold-500/18 bg-navy-950 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">Question {index + 1} · {questionRecord.points} point{questionRecord.points === 1 ? "" : "s"} · {questionRecord.status}</p>
                  <h3 className="mt-2 font-semibold text-white">{questionRecord.questionText || questionRecord.prompt}</h3>
                  <div className="mt-2 grid gap-1 text-sm text-ink/68">
                    {questionRecord.options.map((option, optionIndex) => <p key={`${questionRecord.id}-option-${optionIndex}`}>Option {String.fromCharCode(65 + optionIndex)}: {option}</p>)}
                  </div>
                  <p className="mt-1 text-sm text-gold-300">Correct answer: {questionRecord.correctAnswer}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="mini-button" type="button" onClick={() => onEdit(questionRecord)}>Edit</button>
                  <button className="mini-danger" type="button" onClick={() => onDelete(questionRecord.id)}>Delete</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
