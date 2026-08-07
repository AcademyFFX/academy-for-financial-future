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
  PlayCircle,
  Plus,
  Presentation,
  RefreshCw,
  Save,
  Trash2,
  UploadCloud,
  Users,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent, ReactNode } from "react";
import { ProgressBar } from "@/components/progress";
import { getClientAdminStatus } from "@/lib/admin-client";
import { serializeQuizQuestion } from "@/lib/quiz-question";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type QuizQuestion = { prompt: string; options: string[]; correctAnswer: string };
type AssetType = "Video" | "PDF Notes" | "PowerPoint" | "Assignment" | "Course Thumbnail" | "Module" | "Quiz";
type UploadStage = "idle" | "uploading" | "success" | "failed";
type VideoProvider = "none" | "youtube" | "vimeo" | "mp4" | "uploaded_video";
type UploadStatus = {
  stage: UploadStage;
  title: string;
  detail: string;
};
type VideoSaveDiagnostic = {
  authUserId: string;
  authEmail: string;
  isAffAdmin: string;
  selectedCourseId: string;
  selectedLessonId: string;
  updateErrorCode: string;
  updateErrorMessage: string;
};

const adminEmail = "acafffx@gmail.com";
const lessonVideoColumns = "id, course_id, video_provider, video_url, video_title, video_duration_seconds, video_thumbnail_url, updated_at";

const acceptedUploads: Record<AssetType, { extensions: string[]; mimeTypes: string[]; label: string }> = {
  Video: { extensions: [".mp4", ".webm", ".mov"], mimeTypes: ["video/mp4", "video/webm", "video/quicktime"], label: "MP4, WebM, or MOV video" },
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
  "Course Thumbnail": { extensions: [".png", ".jpg", ".jpeg", ".webp"], mimeTypes: ["image/png", "image/jpeg", "image/webp"], label: "PNG, JPG, or WebP" },
  Module: { extensions: [], mimeTypes: [], label: "Module metadata" },
  Quiz: { extensions: [], mimeTypes: [], label: "Quiz metadata" }
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

function supabaseErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? String(error.code ?? "") : "";
}

function supabaseErrorDetail(error: unknown, fallback: string) {
  const code = supabaseErrorCode(error);
  const message = errorMessage(error, fallback);
  return code ? `${code}: ${message}` : message;
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

function videoUrlValidationMessage(provider: VideoProvider, rawUrl: string) {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) return "";
  if (provider === "none") return "Choose YouTube, Vimeo, Direct MP4/WebM, or Uploaded Academy Video before entering a video URL.";
  if (/^(javascript|data):/i.test(trimmedUrl)) return "Video URLs must use a safe http or https address.";
  if (/^(file:|\/|\.\/|\.\.\/|[a-z]:\\)/i.test(trimmedUrl)) return "Local computer paths cannot be saved as lesson video URLs.";

  try {
    const url = new URL(trimmedUrl);
    if (url.protocol !== "https:") return "Use a secure HTTPS video URL.";
    const host = url.hostname.toLowerCase();
    if (provider === "youtube") {
      const isYoutube = host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
      const hasId = host === "youtu.be" ? Boolean(url.pathname.split("/").filter(Boolean)[0]) : Boolean(url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop());
      return isYoutube && hasId ? "" : "Enter a valid YouTube watch, short, or embed URL.";
    }
    if (provider === "vimeo") {
      const isVimeo = host === "vimeo.com" || host.endsWith(".vimeo.com");
      const hasId = url.pathname.split("/").filter(Boolean).some((part) => /^\d+$/.test(part));
      return isVimeo && hasId ? "" : "Enter a valid Vimeo video or player URL.";
    }
    if (provider === "mp4" || provider === "uploaded_video") {
      return /\.(mp4|webm|mov)(\?|#|$)/i.test(url.pathname) || host.includes("supabase") || host.includes("storage")
        ? ""
        : "Direct videos must be HTTPS .mp4, .webm, .mov, or a valid Academy Storage URL.";
    }
    return "Choose a supported video provider.";
  } catch {
    return "Enter a complete video URL beginning with https://.";
  }
}

function videoPreviewUrl(provider: VideoProvider, rawUrl: string) {
  if (videoUrlValidationMessage(provider, rawUrl)) return "";
  try {
    const url = new URL(rawUrl.trim());
    if (provider === "youtube") {
      const id = url.hostname.includes("youtu.be")
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (provider === "vimeo") {
      const id = url.pathname.split("/").filter(Boolean).reverse().find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
    return rawUrl.trim();
  } catch {
    return "";
  }
}

function parseDurationSeconds(rawDuration: string) {
  const trimmed = rawDuration.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return Number.NaN;
  return parts.reduce((total, part) => total * 60 + part, 0);
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
  const [savingVideo, setSavingVideo] = useState(false);
  const [lastVideoSavedAt, setLastVideoSavedAt] = useState("");
  const [videoSaveDiagnostic, setVideoSaveDiagnostic] = useState<VideoSaveDiagnostic | null>(null);
  const [externalVideo, setExternalVideo] = useState({
    provider: "none" as VideoProvider,
    url: "",
    title: "",
    duration: "",
    thumbnailUrl: ""
  });
  const [previewRequested, setPreviewRequested] = useState(false);

  const loadCenter = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !(await getClientAdminStatus())) {
        setAuthorized(false);
        setMessage("Administrator access required for the Course Upload Center.");
        setUploadStatus({ stage: "failed", title: "Admin access required", detail: "Your account must be active in aff_admin_users to upload course assets." });
        return;
      }
      setAuthorized(true);
      const [courseResult, lessonResult, assetResult, enrollmentResult, certificateResult, studentResult] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
        supabase.from("lessons").select("*").order("lesson_order", { ascending: true }),
        supabase.from("course_assets").select("*").order("created_at", { ascending: false }),
        supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
        supabase.from("certificates").select("*").order("created_at", { ascending: false }),
        supabase.from("student_profiles").select("auth_user_id,student_id,full_name,email,enrollment_status").order("full_name")
      ]);
      const error = courseResult.error ?? lessonResult.error ?? assetResult.error;
      if (error) throw error;
      setCourses((courseResult.data ?? []) as DbRow[]);
      setModules(((assetResult.data ?? []) as DbRow[]).filter((asset) => value(asset, ["asset_type"]) === "Module"));
      setLessons((lessonResult.data ?? []) as DbRow[]);
      setAssets((assetResult.data ?? []) as DbRow[]);
      setEnrollments(enrollmentResult.error ? [] : (enrollmentResult.data ?? []) as DbRow[]);
      setProgressRows([]);
      setCertificates(certificateResult.error ? [] : (certificateResult.data ?? []) as DbRow[]);
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

  const selectedModules = useMemo(() => modules.filter((courseModule) => !target.courseId || value(courseModule, ["course_id"]) === target.courseId), [modules, target.courseId]);
  const selectedLessons = useMemo(() => lessons.filter((lesson) => !target.courseId || value(lesson, ["course_id"]) === target.courseId), [lessons, target.courseId]);
  const selectedLesson = useMemo(() => lessons.find((lesson) => value(lesson, ["id"]) === target.lessonId) ?? null, [lessons, target.lessonId]);
  const externalVideoValidation = videoUrlValidationMessage(externalVideo.provider, externalVideo.url);
  const externalPreviewUrl = videoPreviewUrl(externalVideo.provider, externalVideo.url);
  const averageProgress = enrollments.length ? Math.round(enrollments.reduce((total, enrollment) => total + Number(value(enrollment, ["progress", "progress_percentage"], "0")), 0) / enrollments.length) : 0;

  useEffect(() => {
    if (!selectedLesson) {
      setExternalVideo({ provider: "none", url: "", title: "", duration: "", thumbnailUrl: "" });
      setPreviewRequested(false);
      return;
    }
    setExternalVideo({
      provider: (value(selectedLesson, ["video_provider"], "none") as VideoProvider) || "none",
      url: value(selectedLesson, ["video_url"]),
      title: value(selectedLesson, ["video_title"]),
      duration: value(selectedLesson, ["video_duration_seconds"]),
      thumbnailUrl: value(selectedLesson, ["video_thumbnail_url"])
    });
    setPreviewRequested(false);
    setLastVideoSavedAt("");
    setVideoSaveDiagnostic(null);
  }, [selectedLesson]);

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
      if (!user || !(await getClientAdminStatus())) throw new Error("Administrator access required for uploads.");
      const path = `${target.courseId}/${assetType.toLowerCase().replace(/\s+/g, "-")}/${Date.now()}-${safeName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("aff-course-assets").upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("aff-course-assets").getPublicUrl(path);
      const publicUrl = publicData.publicUrl;
      const { data: signedData, error: signedError } = await supabase.storage.from("aff-course-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signedError) throw signedError;
      setUploadStatus({ stage: "uploading", title: `Saving ${file.name}`, detail: "Writing file metadata to course_assets." });
      const { data: insertedAsset, error: assetError } = await supabase.from("course_assets").insert({
        course_id: Number(target.courseId),
        module_id: target.moduleId ? Number(target.moduleId) : null,
        module_title: value(selectedModules.find((courseModule) => value(courseModule, ["module_id"]) === target.moduleId) ?? {}, ["module_title", "asset_title"]),
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
        const { data: savedLesson, error } = await supabase.from("lessons").update({
          video_provider: "uploaded_video",
          video_type: "Supabase Storage video",
          video_url: publicUrl,
          video_title: file.name,
          updated_at: new Date().toISOString()
        }).eq("id", Number(target.lessonId)).select("id, video_provider, video_url, video_title").single();
        if (error) throw error;
        if (value(savedLesson as DbRow, ["video_url"]) !== publicUrl) throw new Error("Video uploaded, but the selected lesson did not confirm the saved Storage URL.");
      }
      if (assetType === "PDF Notes") {
        const { error } = await supabase.from("lessons").update({ pdf_notes_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", Number(target.lessonId));
        if (error) throw error;
      }
      if (assetType === "Course Thumbnail") {
        const { error } = await supabase.from("courses").update({ thumbnail_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", Number(target.courseId));
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

  async function saveExternalLessonVideo() {
    const selectedCourseId = Number(target.courseId);
    const selectedLessonId = Number(target.lessonId);
    const baseDiagnostic: VideoSaveDiagnostic = {
      authUserId: "Not checked",
      authEmail: "Not checked",
      isAffAdmin: "Not checked",
      selectedCourseId: target.courseId || "Missing",
      selectedLessonId: target.lessonId || "Missing",
      updateErrorCode: "",
      updateErrorMessage: ""
    };
    setVideoSaveDiagnostic(baseDiagnostic);
    if (!selectedLesson || !Number.isFinite(selectedCourseId) || !Number.isFinite(selectedLessonId) || value(selectedLesson, ["course_id"]) !== target.courseId) {
      const detail = "Unable to identify the selected lesson. Please reselect the course and lesson.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Selected lesson not found", detail });
      setVideoSaveDiagnostic({ ...baseDiagnostic, updateErrorMessage: detail });
      return;
    }
    const validation = videoUrlValidationMessage(externalVideo.provider, externalVideo.url);
    if (validation) {
      setMessage(validation);
      setUploadStatus({ stage: "failed", title: "Invalid video URL", detail: validation });
      return;
    }
    if (externalVideo.provider !== "none" && !externalVideo.url.trim()) {
      const detail = "Enter a video URL before saving this provider.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Video URL required", detail });
      return;
    }
    if (externalVideo.provider === "none" && externalVideo.url.trim()) {
      const detail = "Choose a video provider before saving a video URL.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Video provider required", detail });
      return;
    }
    const parsedDuration = parseDurationSeconds(externalVideo.duration);
    if (Number.isNaN(parsedDuration)) {
      const detail = "Enter duration as seconds, MM:SS, or HH:MM:SS.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Invalid duration", detail });
      return;
    }

    const supabase = createClient();
    setSavingVideo(true);
    setMessage("Saving lesson video...");
    setUploadStatus({ stage: "uploading", title: "Saving lesson video", detail: "Updating the selected lesson row and verifying saved video metadata." });
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    const adminResult = userError ? { data: null, error: userError } : await supabase.rpc("is_aff_admin");
    const nextDiagnostic: VideoSaveDiagnostic = {
      authUserId: user?.id ?? "No authenticated user",
      authEmail: (user?.email ?? "No authenticated email").toLowerCase(),
      isAffAdmin: adminResult.error ? `Error: ${supabaseErrorDetail(adminResult.error, "Unable to call is_aff_admin.")}` : String(Boolean(adminResult.data)),
      selectedCourseId: String(selectedCourseId),
      selectedLessonId: String(selectedLessonId),
      updateErrorCode: "",
      updateErrorMessage: ""
    };
    setVideoSaveDiagnostic(nextDiagnostic);
    if (userError) {
      const detail = supabaseErrorDetail(userError, "Unable to read authenticated Supabase user.");
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Authentication diagnostic failed", detail });
      setVideoSaveDiagnostic({ ...nextDiagnostic, updateErrorCode: supabaseErrorCode(userError), updateErrorMessage: detail });
      setSavingVideo(false);
      return;
    }
    if (adminResult.error) {
      const detail = supabaseErrorDetail(adminResult.error, "Unable to call is_aff_admin.");
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Admin diagnostic failed", detail });
      setVideoSaveDiagnostic({ ...nextDiagnostic, updateErrorCode: supabaseErrorCode(adminResult.error), updateErrorMessage: detail });
      setSavingVideo(false);
      return;
    }
    const payload = {
      video_provider: externalVideo.provider,
      video_type: externalVideo.provider === "none" ? "Text-only lesson" : "External Lesson Video",
      video_url: externalVideo.url.trim() || null,
      video_title: externalVideo.title.trim() || null,
      video_duration_seconds: parsedDuration,
      video_thumbnail_url: externalVideo.thumbnailUrl.trim() || null,
      updated_at: new Date().toISOString()
    };
    if (process.env.NODE_ENV !== "production") {
      console.info("AFF lesson video save request", {
        selectedCourseId,
        selectedLessonId,
        provider: payload.video_provider,
        hasUrl: Boolean(payload.video_url),
        hasTitle: Boolean(payload.video_title),
        durationSeconds: payload.video_duration_seconds
      });
    }
    const { data: updatedLesson, error } = await supabase
      .from("lessons")
      .update(payload)
      .eq("id", selectedLessonId)
      .eq("course_id", selectedCourseId)
      .select(lessonVideoColumns)
      .single();
    if (error) {
      const rawDetail = supabaseErrorDetail(error, "Unable to save lesson video.");
      const detail = /permission|rls|policy|denied|authorized/i.test(rawDetail)
        ? `Permission denied while updating the lesson. ${rawDetail}`
        : /0 rows|no rows|multiple/i.test(rawDetail)
          ? "The selected lesson could not be found."
          : rawDetail;
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Lesson video save failed", detail });
      setVideoSaveDiagnostic({ ...nextDiagnostic, updateErrorCode: supabaseErrorCode(error), updateErrorMessage: detail });
      setSavingVideo(false);
      return;
    }
    if (!updatedLesson) {
      const detail = "Database update returned no lesson row.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Lesson video save failed", detail });
      setVideoSaveDiagnostic({ ...nextDiagnostic, updateErrorMessage: detail });
      setSavingVideo(false);
      return;
    }
    const { data: confirmedLesson, error: readBackError } = await supabase
      .from("lessons")
      .select(lessonVideoColumns)
      .eq("id", selectedLessonId)
      .eq("course_id", selectedCourseId)
      .single();
    if (readBackError) {
      const detail = supabaseErrorDetail(readBackError, "Unable to read back saved lesson video metadata.");
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Lesson video verification failed", detail });
      setVideoSaveDiagnostic({ ...nextDiagnostic, updateErrorCode: supabaseErrorCode(readBackError), updateErrorMessage: detail });
      setSavingVideo(false);
      return;
    }
    const confirmedUrl = value(confirmedLesson as DbRow, ["video_url"]);
    const confirmedProvider = value(confirmedLesson as DbRow, ["video_provider"], "none");
    const confirmedTitle = value(confirmedLesson as DbRow, ["video_title"]);
    const confirmedDuration = value(confirmedLesson as DbRow, ["video_duration_seconds"]);
    const confirmedThumbnail = value(confirmedLesson as DbRow, ["video_thumbnail_url"]);
    const expectedUrl = externalVideo.url.trim();
    const expectedTitle = externalVideo.title.trim();
    const expectedDuration = parsedDuration === null ? "" : String(parsedDuration);
    const expectedThumbnail = externalVideo.thumbnailUrl.trim();
    if (
      confirmedUrl !== expectedUrl ||
      confirmedProvider !== externalVideo.provider ||
      confirmedTitle !== expectedTitle ||
      confirmedDuration !== expectedDuration ||
      confirmedThumbnail !== expectedThumbnail
    ) {
      const detail = "The lesson row was updated, but read-back verification did not match the submitted video metadata.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Lesson video verification failed", detail });
      setVideoSaveDiagnostic({ ...nextDiagnostic, updateErrorMessage: detail });
      setSavingVideo(false);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      console.info("AFF lesson video save confirmed", confirmedLesson);
    }
    const savedAt = value(confirmedLesson as DbRow, ["updated_at"], new Date().toISOString());
    setLessons((current) => current.map((lesson) => value(lesson, ["id"]) === target.lessonId ? { ...lesson, ...(confirmedLesson as DbRow) } : lesson));
    setExternalVideo({
      provider: (confirmedProvider as VideoProvider) || "none",
      url: confirmedUrl,
      title: confirmedTitle,
      duration: confirmedDuration,
      thumbnailUrl: confirmedThumbnail
    });
    setLastVideoSavedAt(savedAt);
    setVideoSaveDiagnostic({ ...nextDiagnostic, updateErrorMessage: "No update error. Lesson video metadata verified." });
    setMessage("Lesson video saved successfully.");
    setUploadStatus({ stage: "success", title: "Lesson video saved successfully.", detail: `Saved and verified at ${new Date(savedAt).toLocaleString()}.` });
    setSavingVideo(false);
  }

  async function removeExternalLessonVideo() {
    const selectedCourseId = Number(target.courseId);
    const selectedLessonId = Number(target.lessonId);
    if (!selectedLesson || !Number.isFinite(selectedCourseId) || !Number.isFinite(selectedLessonId) || value(selectedLesson, ["course_id"]) !== target.courseId) {
      const detail = "Select a lesson before removing video metadata.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Lesson target required", detail });
      return;
    }
    const supabase = createClient();
    setUploadStatus({ stage: "uploading", title: "Removing lesson video", detail: "Restoring the Academy classroom placeholder for the selected lesson." });
    const { data: savedLesson, error } = await supabase
      .from("lessons")
      .update({
        video_provider: "none",
        video_type: "Text-only lesson",
        video_url: null,
        video_title: null,
        video_duration_seconds: null,
        video_thumbnail_url: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedLessonId)
      .eq("course_id", selectedCourseId)
      .select(lessonVideoColumns)
      .single();
    if (error) {
      const detail = errorMessage(error, "Unable to remove lesson video.");
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Remove video failed", detail });
      return;
    }
    if (value(savedLesson as DbRow, ["video_url"])) {
      const detail = "The lesson still has a video URL after removal. Reload and verify the selected lesson.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Remove video verification failed", detail });
      return;
    }
    setLessons((current) => current.map((lesson) => value(lesson, ["id"]) === target.lessonId ? { ...lesson, ...(savedLesson as DbRow) } : lesson));
    setExternalVideo({ provider: "none", url: "", title: "", duration: "", thumbnailUrl: "" });
    setLastVideoSavedAt(value(savedLesson as DbRow, ["updated_at"], new Date().toISOString()));
    setPreviewRequested(false);
    setMessage("Lesson video removed. The Academy placeholder will display for this lesson.");
    setUploadStatus({ stage: "success", title: "Lesson video removed", detail: "The selected lesson no longer has video metadata. Notes, resources, completion, and course progress were not changed." });
  }

  async function resetSelectedLessonPlaybackProgress() {
    if (!selectedLesson || !target.lessonId) {
      const detail = "Select a lesson before resetting playback progress.";
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Lesson target required", detail });
      return;
    }
    const lessonName = value(selectedLesson, ["lesson_title", "title"], "this lesson");
    if (!window.confirm(`Reset playback progress for "${lessonName}"? This does not change lesson completion, notes, resources, or course progress.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("video_progress").delete().eq("lesson_id", Number(target.lessonId));
    if (error) {
      const detail = errorMessage(error, "Unable to reset playback progress.");
      setMessage(detail);
      setUploadStatus({ stage: "failed", title: "Reset playback failed", detail });
      return;
    }
    setMessage("Playback progress reset for the selected lesson.");
    setUploadStatus({ stage: "success", title: "Playback progress reset", detail: "Only video_progress rows for the selected lesson were removed." });
  }

  async function createModule(event: FormEvent) {
    event.preventDefault();
    const supabase = createClient();
    const storagePath = `modules/${moduleForm.courseId}/${moduleForm.order}-${safeName(moduleForm.title)}`;
    const { error } = await supabase.from("course_assets").upsert({
      course_id: Number(moduleForm.courseId),
      module_id: Number(moduleForm.order),
      module_title: moduleForm.title,
      asset_title: moduleForm.title,
      asset_type: "Module",
      file_name: moduleForm.title,
      file_type: "Module",
      storage_path: storagePath,
      public_url: "#",
      mime_type: "application/json",
      file_size: 0,
      asset_status: "Published",
      uploaded_by: adminEmail,
      uploaded_by_email: adminEmail
    }, { onConflict: "storage_path" });
    setMessage(error ? error.message : "Module created.");
    if (!error) { setModuleForm({ courseId: "", title: "", description: "", order: "1" }); await loadCenter(); }
  }

  function addQuestion() {
    const options = questionForm.options.split(",").map((option) => option.trim()).filter(Boolean);
    if (!questionForm.prompt || options.length < 2 || !questionForm.correctAnswer) { setMessage("Add a question, at least two options, and the correct answer."); return; }
    setQuestions((current) => [...current, serializeQuizQuestion({
      questionText: questionForm.prompt,
      options,
      correctAnswer: questionForm.correctAnswer,
      points: 1
    })]);
    setQuestionForm({ prompt: "", options: "", correctAnswer: "" });
  }

  async function createQuiz(event: FormEvent) {
    event.preventDefault();
    if (!questions.length) { setMessage("Add at least one quiz question."); return; }
    const supabase = createClient();
    const storagePath = `quizzes/${quizForm.courseId}/${Date.now()}-${safeName(quizForm.title)}`;
    const { error } = await supabase.from("course_assets").insert({
      course_id: Number(quizForm.courseId),
      module_id: quizForm.moduleId ? Number(quizForm.moduleId) : null,
      lesson_id: quizForm.lessonId ? Number(quizForm.lessonId) : null,
      asset_title: quizForm.title,
      asset_type: "Quiz",
      file_name: `${quizForm.title}.json`,
      file_type: "Quiz",
      storage_path: storagePath,
      public_url: "#",
      signed_url: JSON.stringify({ quizTitle: quizForm.title, quiz_title: quizForm.title, questions, passingScore: Number(quizForm.passingScore) }),
      mime_type: "application/json",
      file_size: JSON.stringify(questions).length,
      asset_status: "Published",
      uploaded_by: adminEmail,
      uploaded_by_email: adminEmail
    });
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
    const { error } = await supabase.from("certificates").insert({
      certificate_number: `AFF-${new Date().getFullYear()}-${token.slice(-8)}`,
      student_id: certificateForm.studentId,
      course_name: value(course, ["course_name", "title"]),
      student_name: value(student, ["full_name"], value(student, ["email"])),
      score: 100,
      verification_code: `AFF-${token}`,
      issue_date: new Date().toISOString().slice(0, 10)
    });
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
          <Select value={target.courseId} onChange={(courseId) => setTarget({ courseId, moduleId: "", lessonId: "" })} label="Select course" rows={courses} rowLabel={["course_name", "title"]} />
          <Select value={target.moduleId} onChange={(moduleId) => setTarget((current) => ({ ...current, moduleId, lessonId: "" }))} label="Optional module" rows={selectedModules} valueKey="module_id" rowLabel={["module_title", "asset_title"]} />
          <Select value={target.lessonId} onChange={(lessonId) => setTarget((current) => ({ ...current, lessonId }))} label="Optional lesson" rows={selectedLessons} rowLabel={["lesson_title"]} />
        </div>
        {selectedLesson ? (
          <div className="mt-5 border border-gold-500/20 bg-navy-950/70 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-300">External Lesson Video</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{value(selectedLesson, ["lesson_title", "title"])}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/68">Attach a YouTube, Vimeo, or direct browser-playable video URL to the selected lesson.</p>
              </div>
              <span className="inline-flex w-fit border border-gold-500/25 px-3 py-2 text-xs font-semibold uppercase tracking-[.16em] text-gold-300">Existing lesson row only</span>
            </div>
            <div className="mt-4 border border-gold-500/16 bg-gold-500/10 p-4 text-sm leading-6 text-ink/76">
              Use a temporary public video URL for technical verification. Replace it with the official AFF lesson video before publication.
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select className="field" value={externalVideo.provider} onChange={(event) => setExternalVideo((current) => ({ ...current, provider: event.target.value as VideoProvider }))}>
                <option value="none">None</option>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="mp4">Direct MP4/WebM</option>
                <option value="uploaded_video">Uploaded Academy Video</option>
              </select>
              <input className="field" placeholder="Video URL" value={externalVideo.url} onChange={(event) => setExternalVideo((current) => ({ ...current, url: event.target.value }))} />
              <input className="field" placeholder="Video Title" value={externalVideo.title} onChange={(event) => setExternalVideo((current) => ({ ...current, title: event.target.value }))} />
              <input className="field" placeholder="Duration in seconds, MM:SS, or HH:MM:SS" value={externalVideo.duration} onChange={(event) => setExternalVideo((current) => ({ ...current, duration: event.target.value }))} />
              <input className="field md:col-span-2" placeholder="Thumbnail URL — optional" value={externalVideo.thumbnailUrl} onChange={(event) => setExternalVideo((current) => ({ ...current, thumbnailUrl: event.target.value }))} />
            </div>
            {externalVideoValidation ? <p className="mt-3 text-sm font-semibold text-red-200">{externalVideoValidation}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="inline-flex items-center justify-center gap-2 border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300 disabled:opacity-45" type="button" onClick={() => setPreviewRequested(true)} disabled={!externalVideo.url.trim() || Boolean(externalVideoValidation)}>
                <PlayCircle size={16} /> Preview Video
              </button>
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-60" type="button" onClick={saveExternalLessonVideo} disabled={savingVideo || Boolean(externalVideoValidation)}>
                <Save size={16} /> {savingVideo ? "Saving lesson video..." : "Save Lesson Video"}
              </button>
              <button className="inline-flex items-center justify-center gap-2 border border-gold-500/30 px-4 py-3 text-sm font-semibold text-ink/80" type="button" onClick={removeExternalLessonVideo}>
                <Trash2 size={16} /> Remove Video
              </button>
              <button className="inline-flex items-center justify-center gap-2 border border-gold-500/30 px-4 py-3 text-sm font-semibold text-ink/80" type="button" onClick={resetSelectedLessonPlaybackProgress}>
                <RefreshCw size={16} /> Reset Playback Progress
              </button>
            </div>
            {previewRequested && externalPreviewUrl ? (
              <div className="mt-5 overflow-hidden border border-gold-500/20 bg-black">
                <div className="aspect-video">
                  {externalVideo.provider === "youtube" || externalVideo.provider === "vimeo" ? (
                    <iframe className="h-full w-full" src={externalPreviewUrl} title="AFF external lesson video preview" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
                  ) : (
                    <video className="h-full w-full" controls preload="metadata" src={externalPreviewUrl} />
                  )}
                </div>
              </div>
            ) : null}
            {lastVideoSavedAt ? <p className="mt-4 text-sm font-semibold text-gold-300">Saved: {new Date(lastVideoSavedAt).toLocaleString()}</p> : null}
            {videoSaveDiagnostic ? (
              <div className="mt-5 border border-gold-500/18 bg-navy-900/70 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-300">Safe Save Diagnostic</p>
                <dl className="mt-3 grid gap-2 text-ink/72 md:grid-cols-2">
                  <div><dt className="text-ink/48">Authenticated Supabase user ID</dt><dd className="break-all text-white">{videoSaveDiagnostic.authUserId}</dd></div>
                  <div><dt className="text-ink/48">Authenticated email</dt><dd className="break-all text-white">{videoSaveDiagnostic.authEmail}</dd></div>
                  <div><dt className="text-ink/48">public.is_aff_admin()</dt><dd className="break-all text-white">{videoSaveDiagnostic.isAffAdmin}</dd></div>
                  <div><dt className="text-ink/48">Selected course ID</dt><dd className="break-all text-white">{videoSaveDiagnostic.selectedCourseId}</dd></div>
                  <div><dt className="text-ink/48">Selected lesson ID</dt><dd className="break-all text-white">{videoSaveDiagnostic.selectedLessonId}</dd></div>
                  <div><dt className="text-ink/48">Supabase update error code</dt><dd className="break-all text-white">{videoSaveDiagnostic.updateErrorCode || "None"}</dd></div>
                  <div className="md:col-span-2"><dt className="text-ink/48">Supabase update error message</dt><dd className="break-all text-white">{videoSaveDiagnostic.updateErrorMessage || "None"}</dd></div>
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UploadDropzone title="Video Upload" text="MP4, WebM, or MOV up to 500 MB" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" icon={<Video size={26} />} busy={uploading === "Video"} onFile={(file) => uploadAsset(file, "Video")} />
        <UploadDropzone title="PDF Notes" text="Course notes and reading materials" accept="application/pdf" icon={<FileText size={26} />} busy={uploading === "PDF Notes"} onFile={(file) => uploadAsset(file, "PDF Notes")} />
        <UploadDropzone title="PowerPoint Upload" text="PPTX instructor presentations" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" icon={<Presentation size={26} />} busy={uploading === "PowerPoint"} onFile={(file) => uploadAsset(file, "PowerPoint")} />
        <UploadDropzone title="Assignment Upload" text="PDF or PPTX homework files" accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" icon={<FileArchive size={26} />} busy={uploading === "Assignment"} onFile={(file) => uploadAsset(file, "Assignment")} />
        <UploadDropzone title="Course Thumbnail" text="PNG, JPG, or WebP artwork" accept="image/png,image/jpeg,image/webp" icon={<ImageIcon size={26} />} busy={uploading === "Course Thumbnail"} onFile={(file) => uploadAsset(file, "Course Thumbnail")} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <form className="terminal-panel grid gap-3 p-5" onSubmit={createModule}>
          <div className="flex items-center gap-3"><Layers3 className="text-gold-300" size={22} /><h2 className="text-xl font-semibold text-white">Module Builder</h2></div>
          <Select value={moduleForm.courseId} onChange={(courseId) => setModuleForm((current) => ({ ...current, courseId }))} label="Select course" rows={courses} rowLabel={["course_name", "title"]} required />
          <input className="field" placeholder="Module title" value={moduleForm.title} onChange={(event) => setModuleForm((current) => ({ ...current, title: event.target.value }))} required />
          <textarea className="field min-h-24" placeholder="Module description" value={moduleForm.description} onChange={(event) => setModuleForm((current) => ({ ...current, description: event.target.value }))} />
          <input className="field" type="number" min="1" value={moduleForm.order} onChange={(event) => setModuleForm((current) => ({ ...current, order: event.target.value }))} />
          <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit"><Save size={17} /> Create Module</button>
        </form>

        <form className="terminal-panel grid gap-3 p-5" onSubmit={createQuiz}>
          <div className="flex items-center gap-3"><CheckCircle2 className="text-gold-300" size={22} /><h2 className="text-xl font-semibold text-white">Quiz Builder</h2></div>
          <Select value={quizForm.courseId} onChange={(courseId) => setQuizForm((current) => ({ ...current, courseId }))} label="Select course" rows={courses} rowLabel={["course_name", "title"]} required />
          <Select value={quizForm.moduleId} onChange={(moduleId) => setQuizForm((current) => ({ ...current, moduleId }))} label="Optional module" rows={modules.filter((courseModule) => !quizForm.courseId || value(courseModule, ["course_id"]) === quizForm.courseId)} valueKey="module_id" rowLabel={["module_title", "asset_title"]} />
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
          <Select value={certificateForm.courseId} onChange={(courseId) => { const course = courses.find((item) => value(item, ["id"]) === courseId); setCertificateForm((current) => ({ ...current, courseId, certificationName: `${value(course ?? {}, ["course_name", "title"])} Certificate` })); }} label="Select course" rows={courses} rowLabel={["course_name", "title"]} required />
          <input className="field" placeholder="Certificate title" value={certificateForm.certificationName} onChange={(event) => setCertificateForm((current) => ({ ...current, certificationName: event.target.value }))} />
          <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit"><Award size={17} /> Assign Certificate</button>
        </form>

        <section className="terminal-panel overflow-hidden">
          <div className="border-b border-gold-500/20 p-5"><h2 className="text-xl font-semibold text-white">Instructor Progress Dashboard</h2></div>
          <div className="grid gap-px bg-gold-500/14">
            {enrollments.length === 0 ? <p className="bg-navy-950 p-5 text-sm text-ink/68">No course enrollments found.</p> : enrollments.slice(0, 20).map((enrollment) => {
              const student = students.find((item) => value(item, ["auth_user_id"]) === value(enrollment, ["student_id"]));
              const course = courses.find((item) => value(item, ["id"]) === value(enrollment, ["course_id"]));
              const percentage = Number(value(enrollment, ["progress", "progress_percentage"], "0"));
              return <article key={value(enrollment, ["id"])} className="bg-navy-950 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-white">{value(student ?? {}, ["full_name"], value(enrollment, ["student_id"]))}</p><p className="mt-1 text-sm text-ink/60">{value(course ?? {}, ["course_name", "title"], "Managed Course")} · {progressRows.filter((row) => value(row, ["student_id"]) === value(enrollment, ["student_id"]) && value(row, ["course_id"]) === value(enrollment, ["course_id"])).length} lessons completed</p></div><span className="text-sm text-gold-300">{percentage}%</span></div><div className="mt-3"><ProgressBar value={percentage} /></div></article>;
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
                <p className="mt-2 text-sm leading-6 text-ink/62">{value(course ?? {}, ["course_name", "title"], "Course")} {courseModule ? `· ${value(courseModule, ["module_title"])}` : ""} {lesson ? `· ${value(lesson, ["lesson_title", "title"])}` : ""}</p>
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
