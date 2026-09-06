"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers3,
  Loader2,
  NotebookPen,
  PanelRightOpen,
  PlayCircle,
  Presentation,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProgressBar } from "@/components/progress";
import { Section, SectionInner } from "@/components/section";
import { getClientAdminStatus } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type NotesMode = "server" | "offline" | "disabled";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type VideoProvider = "youtube" | "vimeo" | "mp4" | "uploaded_video" | "bunny" | "embed" | "none" | "invalid";

type VideoSource = {
  provider: VideoProvider;
  url: string;
  embedUrl: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  unavailableReason: string;
};

type ChapterMarker = {
  time: number;
  title: string;
};

type LessonState = {
  course: DbRow;
  lesson: DbRow;
  lessons: DbRow[];
  enrollment: DbRow | null;
  assets: DbRow[];
  assignments: DbRow[];
  submissions: DbRow[];
  progressRows: DbRow[];
  videoProgress: DbRow | null;
  studentName: string;
  userId: string;
  isAdmin: boolean;
  notesMode: NotesMode;
  noteUpdatedAt: string;
  notesError: string;
  localNoteMigrated: boolean;
};

type ResourceGroup = {
  label: string;
  assets: DbRow[];
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

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isPublished(row: DbRow, keys: string[]) {
  const status = value(row, keys);
  if (!status) return true;
  return ["published", "active", "available"].includes(status.trim().toLowerCase());
}

function safeSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function lessonTitle(row: DbRow) {
  return value(row, ["lesson_title", "title", "name"], "Academy Lesson");
}

function courseTitle(row: DbRow) {
  return value(row, ["course_name", "title", "name"], "Academy Course");
}

function lessonOrder(row: DbRow) {
  const parsed = Number(value(row, ["lesson_order", "display_order", "sort_order"], "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAssetPayload(row: DbRow) {
  const raw = value(row, ["signed_url"]);
  if (!raw || raw === "#") return {};
  try {
    return JSON.parse(raw) as DbRow;
  } catch {
    return {};
  }
}

function resourceUrl(row: DbRow) {
  return value(row, ["url", "public_url", "signed_url"], "#");
}

function resourceType(row: DbRow) {
  return value(row, ["asset_type", "file_type", "resource_type"], "Resource");
}

function fileName(row: DbRow) {
  return value(row, ["file_name", "asset_title", "title"], "Academy Resource");
}

function fileDescription(row: DbRow) {
  return value(row, ["description"], value(parseAssetPayload(row), ["description", "summary", "instructions"]));
}

function safeUrl(rawUrl: string) {
  if (!rawUrl || rawUrl === "#") return "";
  try {
    const url = new URL(rawUrl);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function mediaUrlForLesson(lesson: DbRow, assets: DbRow[]) {
  const direct = safeUrl(value(lesson, ["video_url", "media_url", "youtube_url", "vimeo_url", "video", "embed_url"]));
  if (direct) return direct;
  const asset = assets.find((item) => {
    const type = resourceType(item).toLowerCase();
    return ["video", "mp4", "hosted video", "bunny stream"].some((candidate) => type.includes(candidate)) && safeUrl(resourceUrl(item));
  });
  return asset ? safeUrl(resourceUrl(asset)) : "";
}

function posterForLesson(lesson: DbRow, assets: DbRow[]) {
  const direct = safeUrl(value(lesson, ["video_thumbnail_url", "thumbnail_url", "poster_url", "image_url"]));
  if (direct) return direct;
  const asset = assets.find((item) => ["image", "course thumbnail"].includes(resourceType(item).toLowerCase()) && safeUrl(resourceUrl(item)));
  return asset ? safeUrl(resourceUrl(asset)) : "";
}

function normalizedProvider(raw: string): VideoProvider {
  const provider = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (provider.includes("youtube")) return "youtube";
  if (provider.includes("vimeo")) return "vimeo";
  if (provider.includes("supabase") || provider.includes("storage") || provider.includes("uploaded")) return "uploaded_video";
  if (provider.includes("bunny")) return "bunny";
  if (provider.includes("mp4")) return "mp4";
  if (provider.includes("embed")) return "embed";
  if (provider.includes("none") || provider.includes("text-only")) return "none";
  return "none";
}

function youtubeEmbedUrl(url: URL) {
  if (url.hostname.includes("youtube.com")) {
    const id = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }
  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return id ? `https://www.youtube.com/embed/${id}` : "";
  }
  return "";
}

function vimeoEmbedUrl(url: URL) {
  const id = url.pathname.split("/").filter(Boolean).reverse().find((part) => /^\d+$/.test(part)) ?? "";
  return id ? `https://player.vimeo.com/video/${id}` : "";
}

function detectVideoSource(lesson: DbRow, assets: DbRow[]): VideoSource {
  const rawUrl = mediaUrlForLesson(lesson, assets);
  const url = safeUrl(rawUrl);
  const declaredProvider = normalizedProvider(value(lesson, ["video_provider", "video_type"]));
  const title = value(lesson, ["video_title"], lessonTitle(lesson));
  const thumbnailUrl = posterForLesson(lesson, assets);
  const durationSeconds = Number(value(lesson, ["video_duration_seconds"], "0")) || 0;

  if (!url) {
    return { provider: "none", url: "", embedUrl: "", title, thumbnailUrl, durationSeconds, unavailableReason: "" };
  }

  try {
    const parsed = new URL(url);
    if (declaredProvider === "youtube" || parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      const embedUrl = youtubeEmbedUrl(parsed);
      return { provider: embedUrl ? "youtube" : "invalid", url, embedUrl, title, thumbnailUrl, durationSeconds, unavailableReason: embedUrl ? "" : "Lesson video is temporarily unavailable." };
    }
    if (declaredProvider === "vimeo" || parsed.hostname.includes("vimeo.com")) {
      const embedUrl = vimeoEmbedUrl(parsed);
      return { provider: embedUrl ? "vimeo" : "invalid", url, embedUrl, title, thumbnailUrl, durationSeconds, unavailableReason: embedUrl ? "" : "Lesson video is temporarily unavailable." };
    }
    if (isDirectVideo(url) || declaredProvider === "mp4" || declaredProvider === "uploaded_video") {
      return { provider: declaredProvider === "uploaded_video" ? "uploaded_video" : "mp4", url, embedUrl: "", title, thumbnailUrl, durationSeconds, unavailableReason: "" };
    }
    if (declaredProvider === "bunny" || parsed.hostname.includes("iframe.mediadelivery.net") || parsed.hostname.includes("bunnycdn.com")) {
      return { provider: "bunny", url, embedUrl: url, title, thumbnailUrl, durationSeconds, unavailableReason: "" };
    }
    return { provider: "embed", url, embedUrl: url, title, thumbnailUrl, durationSeconds, unavailableReason: "" };
  } catch {
    return { provider: "invalid", url: "", embedUrl: "", title, thumbnailUrl, durationSeconds, unavailableReason: "Lesson video is temporarily unavailable." };
  }
}

function isDirectVideo(rawUrl: string) {
  return /\.(mp4|mov|webm)(\?|#|$)/i.test(rawUrl);
}

function isPdf(row: DbRow) {
  const type = `${resourceType(row)} ${fileName(row)} ${value(row, ["mime_type", "file_type"])}`.toLowerCase();
  return type.includes("pdf") || type.includes("application/pdf");
}

function isImage(row: DbRow) {
  const type = `${resourceType(row)} ${fileName(row)} ${value(row, ["mime_type", "file_type"])}`.toLowerCase();
  return ["image", ".png", ".jpg", ".jpeg", ".webp"].some((candidate) => type.includes(candidate));
}

function resourceIcon(row: DbRow) {
  const type = `${resourceType(row)} ${fileName(row)} ${value(row, ["mime_type", "file_type"])}`.toLowerCase();
  if (type.includes("powerpoint") || type.includes("ppt")) return <Presentation size={18} />;
  if (type.includes("xlsx") || type.includes("spreadsheet")) return <FileSpreadsheet size={18} />;
  if (type.includes("zip") || type.includes("archive")) return <FileArchive size={18} />;
  if (type.includes("audio")) return <FileAudio size={18} />;
  if (type.includes("image") || type.includes(".png") || type.includes(".jpg") || type.includes(".webp")) return <FileImage size={18} />;
  return <FileText size={18} />;
}

function courseMatchesParam(course: DbRow, param: string) {
  return [idOf(course), value(course, ["course_code"]), value(course, ["slug"]), safeSlug(courseTitle(course))]
    .filter(Boolean)
    .some((candidate) => candidate === param || safeSlug(candidate) === safeSlug(param));
}

function lessonMatchesParam(lesson: DbRow, param: string) {
  return [idOf(lesson), value(lesson, ["slug"]), safeSlug(lessonTitle(lesson))]
    .filter(Boolean)
    .some((candidate) => candidate === param || safeSlug(candidate) === safeSlug(param));
}

function enrollmentMatchesCourse(enrollment: DbRow, course: DbRow) {
  const enrollmentCourseId = value(enrollment, ["course_id"]);
  const enrollmentCourseName = value(enrollment, ["course_name", "program_name"]);
  return Boolean(
    (enrollmentCourseId && enrollmentCourseId === idOf(course)) ||
      (enrollmentCourseName &&
        [
          courseTitle(course),
          value(course, ["academic_division"]),
          value(course, ["certification_level"]),
          value(course, ["department_name"]),
          value(course, ["category", "course_category"])
        ]
          .filter(Boolean)
          .some((candidate) => sameText(candidate, enrollmentCourseName)))
  );
}

function assignmentMatchesLesson(row: DbRow, course: DbRow, lesson: DbRow) {
  const courseId = idOf(course);
  const lessonId = idOf(lesson);
  const rowCourseId = value(row, ["course_id"]);
  const rowLessonId = value(row, ["lesson_id"]);
  const rowLesson = value(row, ["lesson_title"]);
  return Boolean(
    rowCourseId === courseId &&
      ((rowLessonId && rowLessonId === lessonId) ||
        (rowLesson && sameText(rowLesson, lessonTitle(lesson))))
  );
}

function assetMatchesLesson(asset: DbRow, course: DbRow, lesson: DbRow) {
  const assetCourseId = value(asset, ["course_id"]);
  const assetLessonId = value(asset, ["lesson_id"]);
  const assetLessonTitle = value(asset, ["lesson_title"]);
  return Boolean(
    assetCourseId === idOf(course) &&
      ((assetLessonId && assetLessonId === idOf(lesson)) ||
        (assetLessonTitle && sameText(assetLessonTitle, lessonTitle(lesson))))
  );
}

function assetMatchesLessonOrSharedResource(asset: DbRow, course: DbRow, lesson: DbRow) {
  const type = resourceType(asset);
  if (type === "Quiz" || resourceGroupFor(asset) === "Homework Files") return assetMatchesLesson(asset, course, lesson);
  const assetCourseId = value(asset, ["course_id"]);
  const assetLessonId = value(asset, ["lesson_id"]);
  const assetModuleId = value(asset, ["module_id"]);
  const lessonModuleId = value(lesson, ["module_id"]);
  return assetCourseId === idOf(course) && (!assetLessonId || assetLessonId === idOf(lesson)) && (!assetModuleId || !lessonModuleId || assetModuleId === lessonModuleId);
}

function booleanValue(row: DbRow | null | undefined, keys: string[]) {
  const raw = value(row, keys).trim().toLowerCase();
  return ["true", "1", "yes", "y", "checked"].includes(raw);
}

function assignmentDueLabel(assignment: DbRow, payload: DbRow) {
  if (booleanValue(assignment, ["no_due_date", "noDueDate"]) || booleanValue(payload, ["no_due_date", "noDueDate"])) return "No Due Date";
  const dueDate = value(assignment, ["due_date", "submission_date"], value(payload, ["due_date"]));
  return dueDate || "No Due Date";
}

function resourceGroupFor(asset: DbRow) {
  const type = resourceType(asset).toLowerCase();
  const title = `${fileName(asset)} ${value(asset, ["asset_title"])}`.toLowerCase();
  if (type.includes("assignment") || title.includes("homework")) return "Homework Files";
  if (type.includes("workbook") || title.includes("workbook")) return "Workbook";
  if (type.includes("instructor") || title.includes("instructor")) return "Instructor Resources";
  if (type.includes("pdf") || type.includes("powerpoint") || type.includes("ppt") || type.includes("docx")) return "Lesson Materials";
  return "Supplemental Learning";
}

function formatDateTime(raw: string) {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remaining = safeSeconds % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function isNoRowsError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "PGRST116" || /0 rows|no rows/i.test(error?.message ?? "");
}

function noteDiagnostic(event: string, detail: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.info("[AFF lesson notes]", event, detail);
}

function splitRichText(text: string) {
  return text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
}

function parseObjectiveList(raw: string) {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    // Plain text objectives are common in the existing lesson editor.
  }
  return raw
    .split(/\n|;/)
    .map((line) => line.replace(/^[-*•\d.]+\s*/, "").trim())
    .filter(Boolean);
}

function parseChapterMarkers(raw: unknown): ChapterMarker[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as DbRow;
        return {
          time: Number(value(row, ["time", "seconds", "start"], "0")),
          title: value(row, ["title", "label", "name"], "Chapter")
        };
      })
      .filter((item) => Number.isFinite(item.time) && item.time >= 0 && item.title)
      .sort((left, right) => left.time - right.time);
  } catch {
    return [];
  }
}

export default function StudentLessonViewerPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string; lessonId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<LessonState | null>(null);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesStatus, setNotesStatus] = useState<SaveStatus>("idle");
  const [notesStatusMessage, setNotesStatusMessage] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [videoProgress, setVideoProgress] = useState<DbRow | null>(null);
  const [videoMessage, setVideoMessage] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const lastSavedText = useRef("");
  const notesRef = useRef("");
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const noteLoadReadyRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastVideoSaveRef = useRef(0);
  const notesKey = state ? `aff:lesson-notes:${idOf(state.course)}:${idOf(state.lesson)}` : "";

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const loadLesson = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setNotesStatus("idle");
    setNotesStatusMessage("");
    noteLoadReadyRef.current = false;

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw new Error(`Unable to verify session: ${userError.message}`);
      if (!user) {
        router.replace(`/login?next=/student-courses/${params.courseId}/lessons/${params.lessonId}`);
        return;
      }

      const isAdmin = await getClientAdminStatus();
      const [courseResult, lessonResult, assetResult, progressResult, homeworkResult, assignmentResult] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("lessons").select("*").order("lesson_order"),
        supabase.from("course_assets").select("*").eq("asset_status", "Published").order("display_order", { ascending: true }),
        supabase.from("lesson_progress").select("*").eq("student_id", user.id),
        isAdmin ? Promise.resolve({ data: [], error: null }) : supabase.from("homework_submissions").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("assignments").select("*").order("created_at", { ascending: false })
      ]);

      const blockingError = courseResult.error ?? lessonResult.error ?? assetResult.error ?? progressResult.error;
      if (blockingError) throw new Error(`Unable to load lesson: ${blockingError.message}`);

      const courses = (courseResult.data ?? []) as DbRow[];
      const allLessons = (lessonResult.data ?? []) as DbRow[];
      const course = courses.find((item) => courseMatchesParam(item, params.courseId));
      if (!course) throw new Error("Course not found.");

      const courseLessons = allLessons
        .filter((item) => value(item, ["course_id"]) === idOf(course))
        .filter((item) => isAdmin || isPublished(item, ["publication_status", "status", "lesson_status"]))
        .sort((left, right) => lessonOrder(left) - lessonOrder(right) || Number(idOf(left)) - Number(idOf(right)));
      const lesson = courseLessons.find((item) => lessonMatchesParam(item, params.lessonId));
      if (!lesson) throw new Error("Lesson not found or not available.");

      if (!isAdmin && !isPublished(course, ["publication_status", "status"])) {
        router.replace("/student-courses");
        return;
      }

      let enrollment: DbRow | null = null;
      let studentName = user.email ?? "AFF Student";
      if (!isAdmin) {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("*")
          .eq("auth_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (studentError) throw new Error(`Unable to load student record: ${studentError.message}`);
        const studentId = student ? idOf(student) : "";
        studentName = value(student as DbRow | null, ["full_name", "student_name", "name"], studentName);
        if (!studentId) {
          router.replace("/student-courses");
          return;
        }

        const { data: enrollments, error: enrollmentError } = await supabase
          .from("enrollments")
          .select("*")
          .eq("student_id", studentId);
        if (enrollmentError) throw new Error(`Unable to verify enrollment: ${enrollmentError.message}`);
        enrollment = ((enrollments ?? []) as DbRow[]).find((row) => enrollmentMatchesCourse(row, course)) ?? null;
        if (!enrollment) {
          router.replace("/student-courses");
          return;
        }
      }

      const assets = ((assetResult.data ?? []) as DbRow[]).filter((asset) => assetMatchesLessonOrSharedResource(asset, course, lesson));

      const assignments = assignmentResult.error
        ? assets.filter((asset) => resourceGroupFor(asset) === "Homework Files")
        : ((assignmentResult.data ?? []) as DbRow[]).filter((assignment) => assignmentMatchesLesson(assignment, course, lesson));
      const submissions = homeworkResult.error ? [] : ((homeworkResult.data ?? []) as DbRow[]).filter((submission) => assignmentMatchesLesson(submission, course, lesson));
      let loadedVideoProgress: DbRow | null = null;
      if (!isAdmin) {
        const videoResult = await supabase
          .from("video_progress")
          .select("id,watched_seconds,duration_seconds,percent_watched,completed,last_watched_at,updated_at")
          .eq("auth_user_id", user.id)
          .eq("course_id", Number(idOf(course)))
          .eq("lesson_id", Number(idOf(lesson)))
          .maybeSingle();
        if (videoResult.error && !isNoRowsError(videoResult.error)) {
          setVideoMessage(`Playback resume is unavailable: ${videoResult.error.message}`);
        } else {
          loadedVideoProgress = (videoResult.data ?? null) as DbRow | null;
          setVideoMessage("");
        }
      } else {
        setVideoMessage("Administrator preview does not create playback progress.");
      }

      let notesMode: NotesMode = isAdmin ? "disabled" : "server";
      let noteText = "";
      let noteUpdatedAt = "";
      let notesError = "";
      let localNoteMigrated = false;
      if (!isAdmin) {
        const numericCourseId = Number(idOf(course));
        const numericLessonId = Number(idOf(lesson));
        noteDiagnostic("load", {
          hasAuthenticatedUserId: Boolean(user.id),
          courseId: numericCourseId,
          lessonId: numericLessonId
        });
        const noteResult = await supabase
          .from("lesson_notes")
          .select("id,note_text,created_at,updated_at")
          .eq("auth_user_id", user.id)
          .eq("course_id", numericCourseId)
          .eq("lesson_id", numericLessonId)
          .maybeSingle();

        if (noteResult.error && !isNoRowsError(noteResult.error)) {
          notesMode = "offline";
          notesError = `Unable to connect lesson notes to your AFF account: ${noteResult.error.message}`;
          noteDiagnostic("load-error", {
            hasAuthenticatedUserId: Boolean(user.id),
            courseId: numericCourseId,
            lessonId: numericLessonId,
            code: noteResult.error.code,
            message: noteResult.error.message
          });
        } else {
          noteText = value(noteResult.data as DbRow | null, ["note_text"]);
          noteUpdatedAt = value(noteResult.data as DbRow | null, ["updated_at"]);
          const localKey = `aff:lesson-notes:${idOf(course)}:${idOf(lesson)}`;
          const localNote = window.localStorage.getItem(localKey) ?? "";
          if (!noteText.trim() && localNote.trim()) {
            setNotesStatus("saving");
            setNotesStatusMessage("Moving older device note to your AFF account...");
            const migratedAt = new Date().toISOString();
            const { data: migratedNote, error: migrationError } = await supabase
              .from("lesson_notes")
              .upsert(
                {
                  auth_user_id: user.id,
                  course_id: numericCourseId,
                  lesson_id: numericLessonId,
                  note_text: localNote,
                  updated_at: migratedAt
                },
                { onConflict: "auth_user_id,course_id,lesson_id" }
              )
              .select("id,note_text,created_at,updated_at")
              .single();
            if (migrationError) {
              notesMode = "offline";
              notesError = `Older device note found, but it could not be moved to your AFF account: ${migrationError.message}`;
              noteDiagnostic("local-migration-error", {
                hasAuthenticatedUserId: Boolean(user.id),
                courseId: numericCourseId,
                lessonId: numericLessonId,
                code: migrationError.code,
                message: migrationError.message
              });
              noteText = localNote;
            } else {
              noteText = value(migratedNote as DbRow, ["note_text"]);
              noteUpdatedAt = value(migratedNote as DbRow, ["updated_at"], migratedAt);
              localNoteMigrated = true;
              window.localStorage.removeItem(localKey);
              setNotesStatus("saved");
              setNotesStatusMessage("Older device note moved and saved securely to your AFF account.");
            }
          }
        }
      }

      lastSavedText.current = noteText;
      setNotes(noteText);
      notesRef.current = noteText;
      setNotesDirty(false);
      noteLoadReadyRef.current = true;
      setVideoProgress(loadedVideoProgress);
      setState({
        course,
        lesson,
        lessons: courseLessons,
        enrollment,
        assets,
        assignments,
        submissions,
        progressRows: (progressResult.data ?? []) as DbRow[],
        videoProgress: loadedVideoProgress,
        studentName,
        userId: user.id,
        isAdmin,
        notesMode,
        noteUpdatedAt,
        notesError,
        localNoteMigrated
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load this lesson.");
    } finally {
      setLoading(false);
    }
  }, [params.courseId, params.lessonId, router]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const saveNotes = useCallback(async (nextNotes: string, options: { force?: boolean } = {}) => {
    if (!state || state.isAdmin || !noteLoadReadyRef.current) return;
    if (!options.force && (!notesDirty || nextNotes === lastSavedText.current)) return;
    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    if (state.notesMode !== "server") {
      if (notesKey) window.localStorage.setItem(notesKey, nextNotes);
      setNotesStatus("error");
      setNotesStatusMessage("Offline copy only — reconnect to sync with your AFF account.");
      return;
    }

    savingRef.current = true;
    pendingSaveRef.current = false;
    const textBeingSaved = nextNotes;
    setNotesStatus("saving");
    setNotesStatusMessage("Saving...");
    try {
      const supabase = createClient();
      const numericCourseId = Number(idOf(state.course));
      const numericLessonId = Number(idOf(state.lesson));
      const payload = {
        auth_user_id: state.userId,
        course_id: numericCourseId,
        lesson_id: numericLessonId,
        note_text: textBeingSaved,
        updated_at: new Date().toISOString()
      };
      noteDiagnostic("upsert", {
        hasAuthenticatedUserId: Boolean(state.userId),
        courseId: numericCourseId,
        lessonId: numericLessonId
      });
      const { data, error: saveError } = await supabase
        .from("lesson_notes")
        .upsert(payload, { onConflict: "auth_user_id,course_id,lesson_id" })
        .select("id,note_text,updated_at")
        .single();
      if (saveError) throw saveError;
      const savedText = value(data as DbRow, ["note_text"]);
      if (savedText !== textBeingSaved) throw new Error("Supabase returned a different note value than the text that was saved.");
      lastSavedText.current = savedText;
      setNotesDirty(notesRef.current !== savedText);
      setState((current) => current ? { ...current, noteUpdatedAt: value(data as DbRow, ["updated_at"], new Date().toISOString()) } : current);
      setNotesStatus("saved");
      setNotesStatusMessage("Saved securely to your AFF account.");
      if (notesKey) window.localStorage.removeItem(notesKey);
    } catch (saveError) {
      noteDiagnostic("upsert-error", {
        hasAuthenticatedUserId: Boolean(state.userId),
        courseId: Number(idOf(state.course)),
        lessonId: Number(idOf(state.lesson)),
        code: typeof saveError === "object" && saveError && "code" in saveError ? String(saveError.code) : "",
        message: saveError instanceof Error ? saveError.message : typeof saveError === "object" && saveError && "message" in saveError ? String(saveError.message) : "Unknown note save error"
      });
      setNotesStatus("error");
      setNotesStatusMessage(saveError instanceof Error ? `Save failed — Retry: ${saveError.message}` : "Save failed — Retry.");
    } finally {
      savingRef.current = false;
      if (pendingSaveRef.current && notesRef.current !== lastSavedText.current) {
        pendingSaveRef.current = false;
        void saveNotes(notesRef.current, { force: true });
      }
    }
  }, [notesDirty, notesKey, state]);

  useEffect(() => {
    if (!state || state.isAdmin || !notesDirty) return;
    const timer = window.setTimeout(() => {
      void saveNotes(notes);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [notes, notesDirty, saveNotes, state]);

  const completedLessonIds = useMemo(() => new Set((state?.progressRows ?? []).map((row) => value(row, ["lesson_id"]))), [state?.progressRows]);
  const completed = state ? completedLessonIds.has(idOf(state.lesson)) : false;
  const totalLessons = state?.lessons.length ?? 0;
  const completedCount = state ? state.lessons.filter((lesson) => completedLessonIds.has(idOf(lesson))).length : 0;
  const progressPercent = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
  const lessonIndex = state ? state.lessons.findIndex((lesson) => idOf(lesson) === idOf(state.lesson)) : -1;
  const previousLesson = state && lessonIndex > 0 ? state.lessons[lessonIndex - 1] : null;
  const nextLesson = state && lessonIndex >= 0 && lessonIndex < state.lessons.length - 1 ? state.lessons[lessonIndex + 1] : null;

  async function toggleComplete() {
    if (!state || state.isAdmin) {
      setMessage("Administrators can preview lessons but do not create student progress records.");
      return;
    }

    const supabase = createClient();
    const courseId = idOf(state.course);
    const lessonId = idOf(state.lesson);
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(`Unable to verify student session: ${userError?.message ?? "No authenticated user found."}`);
      return;
    }

    if (!completed) {
      const { error: upsertError } = await supabase.from("lesson_progress").upsert(
        {
          student_id: user.id,
          course_id: courseId,
          lesson_id: lessonId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: "student_id,course_id,lesson_id" }
      );
      if (upsertError) {
        setMessage(`Unable to save completion: ${upsertError.message}`);
        return;
      }
      setMessage("Lesson marked complete. Progress saved to Supabase.");
      await loadLesson();
      return;
    }

    const { error: deleteError } = await supabase
      .from("lesson_progress")
      .delete()
      .eq("student_id", user.id)
      .eq("course_id", courseId)
      .eq("lesson_id", lessonId);

    if (deleteError) {
      setMessage(`Completion removal is not currently supported by database policy: ${deleteError.message}`);
      return;
    }
    setMessage("Lesson marked incomplete.");
    await loadLesson();
  }

  async function clearNotes() {
    if (!state || state.isAdmin) return;
    if (!window.confirm("Clear your private notes for this lesson?")) return;
    if (state.notesMode !== "server") {
      setNotesStatus("error");
      setNotesStatusMessage("Offline copy only — reconnect to sync with your AFF account.");
      return;
    }
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("lesson_notes")
      .delete()
      .eq("auth_user_id", state.userId)
      .eq("course_id", Number(idOf(state.course)))
      .eq("lesson_id", Number(idOf(state.lesson)));
    if (deleteError) {
      noteDiagnostic("delete-error", {
        hasAuthenticatedUserId: Boolean(state.userId),
        courseId: Number(idOf(state.course)),
        lessonId: Number(idOf(state.lesson)),
        code: deleteError.code,
        message: deleteError.message
      });
      setNotesStatus("error");
      setNotesStatusMessage(`Save failed — Retry: ${deleteError.message}`);
      return;
    }
    if (notesKey) window.localStorage.removeItem(notesKey);
    setNotes("");
    notesRef.current = "";
    lastSavedText.current = "";
    setNotesDirty(false);
    setNotesStatus("saved");
    setNotesStatusMessage("Notes cleared and saved securely to your AFF account.");
  }

  function downloadNotes() {
    if (!state) return;
    const blob = new Blob([notes], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeSlug(courseTitle(state.course))}-${safeSlug(lessonTitle(state.lesson))}-notes.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function saveVideoProgress(currentTime: number, duration: number, completedVideo = false) {
    if (!state || state.isAdmin) return;
    const safeDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : Number(value(videoProgress, ["duration_seconds"], "0")) || 0;
    const watchedSeconds = Math.max(0, Math.round(currentTime || 0));
    const percentWatched = safeDuration ? Math.min(100, Math.round((watchedSeconds / safeDuration) * 100)) : 0;
    const now = new Date().toISOString();
    const supabase = createClient();
    const payload = {
      auth_user_id: state.userId,
      course_id: Number(idOf(state.course)),
      lesson_id: Number(idOf(state.lesson)),
      watched_seconds: watchedSeconds,
      duration_seconds: safeDuration,
      percent_watched: completedVideo ? 100 : percentWatched,
      completed: completedVideo || percentWatched >= 98,
      last_watched_at: now,
      updated_at: now
    };
    const { data, error: progressError } = await supabase
      .from("video_progress")
      .upsert(payload, { onConflict: "auth_user_id,course_id,lesson_id" })
      .select("id,watched_seconds,duration_seconds,percent_watched,completed,last_watched_at,updated_at")
      .single();
    if (progressError) {
      setVideoMessage(`Playback progress could not be saved: ${progressError.message}`);
      return;
    }
    const row = (data ?? payload) as DbRow;
    setVideoProgress(row);
    setState((current) => current ? { ...current, videoProgress: row } : current);
    setVideoMessage(completedVideo ? "Video completed" : "Playback progress saved.");
  }

  function handleVideoMetadata() {
    const video = videoRef.current;
    if (!video || !videoProgress) return;
    const watchedSeconds = Number(value(videoProgress, ["watched_seconds"], "0"));
    if (watchedSeconds > 0 && watchedSeconds < video.duration - 2) {
      video.currentTime = watchedSeconds;
      setVideoMessage(`Resume from ${formatTime(watchedSeconds)}`);
    }
  }

  function handleVideoTimeUpdate() {
    const video = videoRef.current;
    if (!video || state?.isAdmin) return;
    const now = Date.now();
    if (now - lastVideoSaveRef.current < 12000) return;
    lastVideoSaveRef.current = now;
    void saveVideoProgress(video.currentTime, video.duration);
  }

  function seekNativeVideo(seconds: number) {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.focus();
  }

  if (loading) {
    return (
      <Section>
        <SectionInner>
          <div className="terminal-panel grid min-h-[420px] place-items-center p-8 text-center">
            <div>
              <Loader2 className="mx-auto animate-spin text-gold-300" size={36} />
              <p className="mt-5 text-xs font-semibold uppercase tracking-[.28em] text-gold-300">AFF Professional Video Classroom</p>
              <h1 className="mt-3 font-serif text-3xl text-white">Loading classroom</h1>
              <p className="mt-3 text-sm text-ink/68">Verifying access, lesson materials, resources, notes, and progress.</p>
            </div>
          </div>
        </SectionInner>
      </Section>
    );
  }

  if (error || !state) {
    return (
      <Section>
        <SectionInner>
          <div className="terminal-panel p-8">
            <AlertCircle className="text-gold-300" size={30} />
            <h1 className="mt-4 font-serif text-3xl text-white">Lesson unavailable</h1>
            <p className="mt-3 text-sm leading-7 text-ink/72">{error || "Unable to load this lesson."}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={loadLesson} className="inline-flex items-center gap-2 bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950">
                <RotateCcw size={16} /> Retry
              </button>
              <Link href="/student-courses" className="inline-flex items-center gap-2 border border-gold-500/40 px-5 py-3 text-sm font-semibold text-gold-300">
                <ArrowLeft size={16} /> Return to My Courses
              </Link>
            </div>
          </div>
        </SectionInner>
      </Section>
    );
  }

  const videoSource = detectVideoSource(state.lesson, state.assets);
  const hasVideo = videoSource.provider !== "none" && videoSource.provider !== "invalid";
  const canTrackPlayback = videoSource.provider === "mp4" || videoSource.provider === "uploaded_video";
  const canSeekChapters = canTrackPlayback;
  const pdfUrl = safeUrl(value(state.lesson, ["pdf_notes_url"]));
  const resources = state.assets.filter((asset) => resourceType(asset) !== "Quiz" && safeUrl(resourceUrl(asset)));
  const resourceGroups: ResourceGroup[] = ["Lesson Materials", "Workbook", "Instructor Resources", "Homework Files", "Supplemental Learning"]
    .map((label) => ({ label, assets: resources.filter((asset) => resourceGroupFor(asset) === label) }))
    .filter((group) => group.assets.length > 0);
  const overview = value(state.lesson, ["lesson_summary", "overview", "description"]);
  const fullText = value(state.lesson, ["full_content", "content", "lesson_content"]);
  const objectives = value(state.lesson, ["learning_objectives", "objectives"]);
  const objectiveItems = parseObjectiveList(objectives);
  const keyConcepts = value(state.lesson, ["key_concepts", "concepts"]);
  const takeaways = value(state.lesson, ["key_takeaways", "takeaways"]);
  const vocabulary = value(state.lesson, ["vocabulary"]);
  const instructorNotes = value(state.lesson, ["instructor_notes"]);
  const exercise = value(state.lesson, ["practical_exercise", "exercise"]);
  const transcript = value(state.lesson, ["transcript_text", "transcript"]);
  const chapterMarkers = parseChapterMarkers(state.lesson.chapter_markers);
  const watchedSeconds = Number(value(videoProgress ?? state.videoProgress, ["watched_seconds"], "0"));
  const durationSeconds = Number(value(videoProgress ?? state.videoProgress, ["duration_seconds"], String(videoSource.durationSeconds || 0)));
  const watchedPercent = Number(value(videoProgress ?? state.videoProgress, ["percent_watched"], "0"));
  const videoCompleted = value(videoProgress ?? state.videoProgress, ["completed"]) === "true";
  const iframeTrackingNotice = hasVideo && !canTrackPlayback ? "Playback tracking is available for direct Academy video files." : "";
  const transcriptBlocks = transcriptSearch.trim()
    ? splitRichText(transcript).filter((block) => block.toLowerCase().includes(transcriptSearch.trim().toLowerCase()))
    : splitRichText(transcript);
  const returnHref = `/courses/managed/${encodeURIComponent(value(state.course, ["course_code"], safeSlug(courseTitle(state.course))))}`;
  const currentSubmission = state.submissions[0] ?? null;
  const hasAssessment = state.assets.some((asset) => resourceType(asset) === "Quiz");

  return (
    <>
      <section className="market-grid relative z-[1] border-b border-gold-500/20 bg-navy-900 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 border border-gold-500/24 bg-navy-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-[.24em] text-gold-300">
                <GraduationCap size={16} /> Academy for Financial Future
              </p>
              <h1 className="mt-5 font-serif text-4xl font-semibold text-white sm:text-5xl">{lessonTitle(state.lesson)}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/76">{courseTitle(state.course)}</p>
              <p className="mt-3 text-sm text-ink/62">Welcome, {state.studentName}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setToolsOpen((current) => !current)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300 lg:hidden">
                <PanelRightOpen size={16} /> Learning Tools
              </button>
              <Link href="/student-courses" className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300">
                <ArrowLeft size={16} /> Back to My Courses
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <HeroMetric label="Instructor" value={value(state.course, ["instructor_name", "instructor"], "Dr. Jean R. Moricette")} />
            <HeroMetric label="Lesson Sequence" value={`Lesson ${lessonIndex + 1} of ${totalLessons}`} />
            <HeroMetric label="Enrollment" value={state.isAdmin ? "Administrator Preview" : value(state.enrollment, ["enrollment_status", "status"], "Active")} />
            <HeroMetric label="Course Progress" value={`${progressPercent}%`} />
          </div>
          <div className="mt-5">
            <ProgressBar value={progressPercent} />
          </div>
        </div>
      </section>

      <Section>
        <SectionInner className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <main className="grid min-w-0 gap-6">
            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/16 bg-navy-950 px-5 py-4">
                <p className="text-xs uppercase tracking-[.22em] text-gold-300">Professional Video Classroom</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{videoSource.title}</h2>
              </div>
              <div className="aspect-video bg-navy-950">
                {videoSource.provider === "mp4" || videoSource.provider === "uploaded_video" ? (
                  <video
                    ref={videoRef}
                    className="h-full w-full"
                    controls
                    preload="metadata"
                    poster={videoSource.thumbnailUrl || undefined}
                    aria-label={`${lessonTitle(state.lesson)} video classroom`}
                    onLoadedMetadata={handleVideoMetadata}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onPause={(event) => void saveVideoProgress(event.currentTarget.currentTime, event.currentTarget.duration)}
                    onEnded={(event) => void saveVideoProgress(event.currentTarget.duration, event.currentTarget.duration, true)}
                  >
                    <source src={videoSource.url} />
                  </video>
                ) : videoSource.provider === "youtube" || videoSource.provider === "vimeo" || videoSource.provider === "bunny" || videoSource.provider === "embed" ? (
                  <iframe className="h-full w-full" src={videoSource.embedUrl} title={lessonTitle(state.lesson)} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
                ) : videoSource.provider === "invalid" ? (
                  <MediaPlaceholder message="Lesson video is temporarily unavailable." />
                ) : (
                  <MediaPlaceholder message="Lesson media is being prepared by the Academy." />
                )}
              </div>
              <div className="grid gap-4 border-t border-gold-500/16 bg-navy-950/70 p-5 md:grid-cols-4">
                <InfoPill label="Watched" value={canTrackPlayback ? `${Math.round(watchedPercent)}%` : hasVideo ? "Direct video only" : "0%"} />
                <InfoPill label="Last Position" value={canTrackPlayback ? (watchedSeconds ? formatTime(watchedSeconds) : "Not started") : hasVideo ? "Direct video only" : "Not started"} />
                <InfoPill label="Duration" value={durationSeconds || videoSource.durationSeconds ? formatTime(durationSeconds || videoSource.durationSeconds) : "Not available"} />
                <InfoPill label="Resume Status" value={iframeTrackingNotice || (videoCompleted ? "Video completed" : videoMessage || (watchedSeconds ? `Resume from ${formatTime(watchedSeconds)}` : "Ready"))} />
              </div>
              {watchedSeconds > 0 && canTrackPlayback ? (
                <div className="flex flex-wrap gap-3 border-t border-gold-500/12 bg-navy-950/80 p-5">
                  <button type="button" onClick={() => seekNativeVideo(watchedSeconds)} className="inline-flex min-h-10 items-center gap-2 border border-gold-500/35 px-4 py-2 text-sm font-semibold text-gold-300">
                    <PlayCircle size={15} /> Resume from {formatTime(watchedSeconds)}
                  </button>
                  <button type="button" onClick={() => seekNativeVideo(0)} className="inline-flex min-h-10 items-center gap-2 border border-gold-500/20 px-4 py-2 text-sm font-semibold text-ink/75">
                    Start from beginning
                  </button>
                </div>
              ) : null}
              {chapterMarkers.length ? (
                <div className="border-t border-gold-500/12 bg-navy-950/80 p-5">
                  <p className="text-xs uppercase tracking-[.2em] text-gold-300">Chapter Markers</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {chapterMarkers.map((chapter) => canSeekChapters ? (
                      <button key={`${chapter.time}-${chapter.title}`} type="button" onClick={() => seekNativeVideo(chapter.time)} className="inline-flex min-h-10 items-center gap-2 border border-gold-500/35 px-3 py-2 text-xs font-semibold text-gold-300">
                        {formatTime(chapter.time)} · {chapter.title}
                      </button>
                    ) : (
                      <span key={`${chapter.time}-${chapter.title}`} className="inline-flex min-h-10 items-center gap-2 border border-gold-500/16 px-3 py-2 text-xs text-ink/70">
                        {formatTime(chapter.time)} · {chapter.title}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="terminal-panel p-6">
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Completion Controls</p>
              <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{completed ? "Lesson completed" : "Complete when your study is finished"}</h2>
                  <div className="mt-4 grid gap-2 text-sm text-ink/72 sm:grid-cols-3">
                    <ChecklistItem label="Lesson reviewed" checked={completed} />
                    <ChecklistItem label="Resources reviewed" checked={resources.length > 0 ? completed : false} />
                    <ChecklistItem label="Homework status acknowledged" checked={completed || state.assignments.length === 0} />
                  </div>
                </div>
                <button type="button" onClick={toggleComplete} className="inline-flex min-h-12 items-center justify-center gap-2 bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 disabled:opacity-60" disabled={state.isAdmin}>
                  {completed ? <XCircle size={17} /> : <CheckCircle2 size={17} />}
                  {completed ? "Mark Incomplete" : "Mark Lesson Complete"}
                </button>
              </div>
              {message ? <p className="mt-4 text-sm text-gold-300">{message}</p> : null}
            </section>

            <ContentSection title="Lesson Overview" body={overview} />
            <LearningObjectivesPanel objectives={objectiveItems} />
            <ContentSection title="Main Lesson Content" body={fullText} />
            <ContentSection title="Key Concepts" body={keyConcepts} />
            <ContentSection title="Key Takeaways" body={takeaways} />
            <ContentSection title="Vocabulary" body={vocabulary} />
            <ContentSection title="Instructor Notes" body={instructorNotes} />
            <ContentSection title="Practical Exercise" body={exercise} />
            {(hasVideo || transcript) ? (
              <section className="terminal-panel p-6">
                <button type="button" onClick={() => setTranscriptOpen((current) => !current)} className="flex w-full items-center justify-between gap-4 text-left">
                  <span>
                    <span className="block text-xs uppercase tracking-[.2em] text-gold-300">Lesson Transcript</span>
                    <span className="mt-2 block text-sm text-ink/62">{transcript ? "Search and review the spoken lesson text." : "Transcript coming soon"}</span>
                  </span>
                  <span className="text-sm font-semibold text-gold-300">{transcriptOpen ? "Hide" : "Show"}</span>
                </button>
                {transcriptOpen ? (
                  <div className="mt-5">
                    {transcript ? (
                      <>
                        <input className="field" placeholder="Search transcript" value={transcriptSearch} onChange={(event) => setTranscriptSearch(event.target.value)} aria-label="Search lesson transcript" />
                        <div className="mt-4 grid max-h-96 gap-4 overflow-auto pr-2 text-sm leading-7 text-ink/76" tabIndex={0}>
                          {transcriptBlocks.length ? transcriptBlocks.map((block, index) => <TextBlock key={`transcript-${index}`} text={block} />) : <p>No transcript matches your search.</p>}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-ink/70">Transcript coming soon</p>
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="terminal-panel p-6">
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Homework</p>
              <HomeworkPanel assignments={state.assignments} submission={currentSubmission} course={state.course} lesson={state.lesson} />
            </section>
          </main>

          <aside className={`${toolsOpen ? "grid" : "hidden"} h-fit min-w-0 gap-6 xl:grid`}>
            <section className="terminal-panel p-5">
              <p className="text-xs uppercase tracking-[.2em] text-gold-300">Lesson Navigation</p>
              <div className="mt-4 grid gap-3">
                <LessonNavLink lesson={previousLesson} course={state.course} label="Previous Lesson" icon="previous" />
                <LessonNavLink lesson={nextLesson} course={state.course} label={nextLesson ? "Next Lesson" : hasAssessment ? "Return to Course Assessment" : "Continue Learning"} icon="next" fallbackHref={nextLesson ? "" : returnHref} />
                <Link href={returnHref} className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300">
                  <BookOpenCheck size={16} /> Return to Course
                </Link>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-ink/60"><span>Course progress</span><span>{progressPercent}%</span></div>
                <ProgressBar value={progressPercent} />
              </div>
            </section>

            <section className="terminal-panel p-5">
              <p className="text-xs uppercase tracking-[.2em] text-gold-300">Learning Resources</p>
              <div className="mt-4 grid gap-5">
                {pdfUrl ? <PdfPreview title="PDF Lesson Material" href={pdfUrl} /> : null}
                {!resourceGroups.length && !pdfUrl ? <p className="text-sm text-ink/65">No downloadable resources are attached to this lesson yet.</p> : null}
                {resourceGroups.map((group) => (
                  <ResourceGroupPanel key={group.label} group={group} />
                ))}
              </div>
            </section>

            <section className="terminal-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[.2em] text-gold-300">
                  <NotebookPen size={16} /> My Private Lesson Notes
                </p>
                <span className="text-xs text-ink/55">{notes.length} characters</span>
              </div>
              <p className="mt-3 text-xs leading-6 text-ink/62">These notes are private and securely saved to your AFF account.</p>
              {state.notesError ? <p className="mt-3 border border-gold-500/20 bg-navy-950 p-3 text-xs leading-6 text-gold-200">{state.notesError}</p> : null}
              {state.localNoteMigrated ? <p className="mt-3 border border-gold-500/20 bg-gold-500/10 p-3 text-xs leading-6 text-gold-100">An older device note was found and moved to your AFF account.</p> : null}
              {state.isAdmin ? (
                <p className="mt-4 text-sm text-ink/65">Student private notes are unavailable in administrator preview.</p>
              ) : (
                <>
                  <textarea className="field mt-4 min-h-48" value={notes} onChange={(event) => { setNotes(event.target.value); setNotesDirty(true); }} placeholder="Capture private lesson notes, questions, and study reminders." />
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                    <span className={notesStatus === "error" ? "text-red-200" : notesStatus === "saved" ? "text-gold-300" : "text-ink/60"}>{notesStatusMessage || (state.noteUpdatedAt ? `Last saved ${formatDateTime(state.noteUpdatedAt)}` : "Autosave ready")}</span>
                    {notesStatus === "error" && state.notesMode === "server" ? <button type="button" onClick={() => void saveNotes(notes, { force: true })} className="text-gold-300 underline">Retry</button> : null}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => void saveNotes(notes, { force: true })} className="inline-flex min-h-10 items-center justify-center gap-2 bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950"><Save size={14} /> Save Notes</button>
                    <button type="button" onClick={downloadNotes} className="inline-flex min-h-10 items-center justify-center gap-2 border border-gold-500/35 px-3 py-2 text-xs font-semibold text-gold-300"><Download size={14} /> TXT</button>
                    <button type="button" onClick={() => void clearNotes()} className="inline-flex min-h-10 items-center justify-center gap-2 border border-red-300/35 px-3 py-2 text-xs font-semibold text-red-100"><Trash2 size={14} /> Clear</button>
                  </div>
                </>
              )}
            </section>

            <section className="terminal-panel flex items-start gap-3 p-5 text-sm text-ink/70">
              <ShieldCheck className="mt-1 shrink-0 text-gold-300" size={18} />
              <p>Resources are filtered to this course and lesson after authentication and enrollment verification. Completion records remain scoped to your Supabase user.</p>
            </section>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}

function HeroMetric({ label, value: metricValue }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950/70 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-ink/50">{label}</p>
      <p className="mt-2 font-semibold text-white">{metricValue}</p>
    </div>
  );
}

function MediaPlaceholder({ message }: { message: string }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <PlayCircle className="mx-auto text-gold-300" size={52} />
        <h2 className="mt-5 font-serif text-3xl text-white">{message}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/68">The classroom remains open with lesson content, notes, homework, and resources while media is prepared.</p>
      </div>
    </div>
  );
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <CheckCircle2 className={checked ? "text-gold-300" : "text-ink/35"} size={16} />
      {label}
    </span>
  );
}

function ContentSection({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <section className="terminal-panel p-6">
      <p className="text-xs uppercase tracking-[.2em] text-gold-300">{title}</p>
      <div className="mt-4 grid gap-4 text-sm leading-7 text-ink/76">
        {splitRichText(body).map((block, index) => (
          <TextBlock key={`${title}-${index}`} text={block} />
        ))}
      </div>
    </section>
  );
}

function LearningObjectivesPanel({ objectives }: { objectives: string[] }) {
  if (!objectives.length) return null;
  return (
    <section className="terminal-panel p-6">
      <p className="text-xs uppercase tracking-[.2em] text-gold-300">Learning Objectives</p>
      <div className="mt-4 grid gap-3">
        {objectives.map((objective, index) => (
          <div key={`${objective}-${index}`} className="flex items-start gap-3 border border-gold-500/14 bg-navy-950/60 p-3 text-sm leading-6 text-ink/78">
            <CheckCircle2 className="mt-1 shrink-0 text-gold-300" size={16} />
            <span>{objective}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((line) => /^(-|\*|\d+\.)\s+/.test(line))) {
    return (
      <ul className="grid list-disc gap-2 pl-5">
        {lines.map((line, index) => <li key={`${line}-${index}`}>{line.replace(/^(-|\*|\d+\.)\s+/, "")}</li>)}
      </ul>
    );
  }
  if (/^#{1,4}\s+/.test(text)) return <h3 className="text-lg font-semibold text-white">{text.replace(/^#{1,4}\s+/, "")}</h3>;
  if (/^>\s+/.test(text)) return <blockquote className="border-l-2 border-gold-500/55 pl-4 text-gold-100">{text.replace(/^>\s+/, "")}</blockquote>;
  return <p className="whitespace-pre-line">{text}</p>;
}

function LessonNavLink({ lesson, course, label, icon, fallbackHref = "" }: { lesson: DbRow | null; course: DbRow; label: string; icon: "previous" | "next"; fallbackHref?: string }) {
  if (!lesson && !fallbackHref) {
    return <span className="inline-flex min-h-11 items-center justify-center border border-gold-500/14 px-4 py-3 text-sm text-ink/40">{label}</span>;
  }
  const href = lesson ? `/student-courses/${encodeURIComponent(idOf(course))}/lessons/${encodeURIComponent(idOf(lesson))}` : fallbackHref;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300">
      {icon === "previous" ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
      {label}
    </Link>
  );
}

function PdfPreview({ title, href }: { title: string; href: string }) {
  return (
    <div className="border border-gold-500/16 bg-navy-950">
      <div className="flex items-center justify-between gap-3 p-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white"><FileText className="text-gold-300" size={17} /> {title}</span>
        <span className="text-xs text-gold-300">PDF</span>
      </div>
      <iframe src={href} title={title} className="h-64 w-full border-y border-gold-500/12 bg-cream" />
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 border border-gold-500/35 px-3 py-2 text-xs font-semibold text-gold-300"><ExternalLink size={14} /> Open</a>
        <a href={href} download className="inline-flex min-h-10 items-center justify-center gap-2 bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950"><Download size={14} /> Download</a>
      </div>
    </div>
  );
}

function ResourceGroupPanel({ group }: { group: ResourceGroup }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[.18em] text-ink/55"><Layers3 size={14} /> {group.label}</p>
      <div className="grid gap-3">
        {group.assets.map((asset) => <ResourceCard key={idOf(asset)} asset={asset} />)}
      </div>
    </div>
  );
}

function ResourceCard({ asset }: { asset: DbRow }) {
  const href = safeUrl(resourceUrl(asset));
  const type = resourceType(asset);
  if (!href) return null;
  return (
    <div className="border border-gold-500/16 bg-navy-950 p-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-gold-300">{resourceIcon(asset)}</span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-white">{value(asset, ["asset_title", "file_name"], "Academy Resource")}</p>
          <p className="mt-1 text-xs text-gold-300">{type}</p>
          {fileDescription(asset) ? <p className="mt-2 text-xs leading-5 text-ink/62">{fileDescription(asset)}</p> : null}
          {isImage(asset) ? (
            <div
              aria-label={fileName(asset)}
              className="mt-3 h-48 w-full border border-gold-500/12 bg-contain bg-center bg-no-repeat"
              role="img"
              style={{ backgroundImage: `url(${href})` }}
            />
          ) : null}
          {isPdf(asset) ? <PdfPreview title={value(asset, ["asset_title", "file_name"], "PDF Resource")} href={href} /> : null}
          {!isPdf(asset) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 border border-gold-500/35 px-3 py-2 text-xs font-semibold text-gold-300"><ExternalLink size={13} /> Open</a>
              <a href={href} download className="inline-flex min-h-9 items-center gap-2 bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950"><Download size={13} /> Download</a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HomeworkPanel({ assignments, submission, course, lesson }: { assignments: DbRow[]; submission: DbRow | null; course: DbRow; lesson: DbRow }) {
  if (!assignments.length) {
    return (
      <div className="mt-4 border border-gold-500/16 bg-navy-950 p-4">
        <p className="text-sm text-ink/70">No homework is currently attached to this lesson.</p>
        <Link href="/assignments" className="mt-4 inline-flex min-h-10 items-center gap-2 border border-gold-500/35 px-4 py-2 text-sm font-semibold text-gold-300">
          <ClipboardList size={16} /> Open Assignment Center
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4">
      {assignments.map((assignment, index) => {
        const payload = parseAssetPayload(assignment);
        const dueDate = assignmentDueLabel(assignment, payload);
        const instructions = value(assignment, ["instructions", "student_notes", "description"], value(payload, ["instructions"], fileDescription(assignment)));
        const title = value(assignment, ["title", "asset_title", "file_name"], `${lessonTitle(lesson)} Homework`);
        return (
          <article key={idOf(assignment) || `${title}-${index}`} className="border border-gold-500/16 bg-navy-950 p-4">
            <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(assignment, ["homework_type", "asset_type"], "Homework Assignment")}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">{instructions || "Homework submission will open in the Assignment Center."}</p>
            <div className="mt-4 grid gap-2 text-sm text-ink/68 sm:grid-cols-2">
              <InfoPill label="Course" value={courseTitle(course)} />
              <InfoPill label="Lesson" value={lessonTitle(lesson)} />
              <InfoPill label="Due Date" value={dueDate || "No Due Date"} />
              <InfoPill label="Max Score" value={value(assignment, ["maximum_score", "max_score"], "100")} />
              <InfoPill label="Required" value={value(assignment, ["required"], "Required")} />
              <InfoPill label="File Types" value={value(assignment, ["permitted_file_types"], "PDF, DOCX, screenshots, chart analysis")} />
            </div>
            {submission ? (
              <div className="mt-4 border border-gold-500/18 p-3 text-sm text-ink/72">
                <p className="font-semibold text-gold-300">Submission Status: {value(submission, ["status"], "Submitted")}</p>
                {value(submission, ["score"]) ? <p className="mt-1">Score: {value(submission, ["score"])}</p> : null}
                {value(submission, ["instructor_comments"]) ? <p className="mt-1">Feedback: {value(submission, ["instructor_comments"])}</p> : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink/65">Homework submission will open in the Assignment Center.</p>
            )}
            <Link href="/assignments" className="mt-4 inline-flex min-h-10 items-center gap-2 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950">
              <ClipboardList size={16} /> Assignment Center
            </Link>
          </article>
        );
      })}
    </div>
  );
}

function InfoPill({ label, value: text }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/12 p-3">
      <p className="text-xs uppercase tracking-[.16em] text-ink/48">{label}</p>
      <p className="mt-1 font-semibold text-white">{text}</p>
    </div>
  );
}
