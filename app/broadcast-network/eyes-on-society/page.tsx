"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  BarChart3,
  Bot,
  CalendarDays,
  Camera,
  Edit3,
  FileText,
  Library,
  Mic,
  MonitorPlay,
  PlayCircle,
  Radio,
  Save,
  Search,
  Send,
  Sparkles,
  Tv,
  Upload,
  Users,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const divisionName = "Eyes on Society TV";
const adminEmail = "acafffx@gmail.com";
const categories = [
  "Education & Literacy",
  "Economic Awareness",
  "Leadership & Governance",
  "Community Development",
  "Technology & Society",
  "Media & Culture",
  "Youth Development",
  "Financial Literacy",
  "Public Policy Discussions",
  "Social Responsibility"
];
const episodeFormats = ["Interview", "Expert Panel", "Community Report", "Documentary", "Town Hall", "Student Journalism", "Studio Commentary"];
const productionStages = ["Concept", "Research", "Pre-Production", "Scheduled", "Live", "Post-Production", "Published"];
const aiActions = ["Episode Summary", "Show Notes", "Title Ideas", "Social Media Clips"];
const scriptWriterActions = ["Interview Questions", "Episode Outline", "Documentary Structure", "Research Assistant"];
const mediaAssetTypes = ["Video", "Audio", "Image", "Document"];

const initialEpisodeForm = {
  episodeTitle: "",
  category: "Education & Literacy",
  format: "Interview",
  status: "Scheduled",
  description: "",
  guestName: "",
  scheduledAt: "",
  liveStreamUrl: "",
  replayUrl: "",
  productionStage: "Pre-Production",
  sponsorName: "",
  publishToStudio: true
};

const initialGuestForm = {
  guestName: "",
  title: "",
  organization: "",
  email: "",
  topic: "",
  bookingStatus: "Invited",
  appearanceDate: "",
  notes: ""
};

const initialCalendarForm = {
  eventTitle: "",
  eventType: "Production Meeting",
  eventDate: "",
  ownerName: "Dr. Jean R. Moricette",
  status: "Scheduled",
  notes: ""
};

const initialSponsorForm = {
  sponsorName: "",
  contactName: "",
  sponsorshipLevel: "Community Partner",
  campaignName: "",
  startDate: "",
  endDate: "",
  status: "Prospect",
  benefits: ""
};

const initialScriptForm = {
  episodeTitle: "",
  segmentTitle: "Opening Segment",
  aiPrompt: "",
  scriptText: "",
  scriptStatus: "Draft"
};

const initialTeleprompterForm = {
  episodeTitle: "",
  scriptText: "",
  scrollSpeed: "5",
  fontSize: "42",
  operatorName: "Studio Operator",
  status: "Ready"
};

const initialCameraForm = {
  episodeTitle: "",
  cameraLabel: "Camera 1",
  shotType: "Host Close-Up",
  operatorName: "Studio Operator",
  inputSource: "HDMI 1",
  status: "Ready",
  notes: ""
};

const initialQuestionForm = {
  viewerName: "",
  email: "",
  question: "",
  topic: "Education & Literacy"
};

const initialJournalismForm = {
  studentName: "",
  email: "",
  projectTitle: "",
  category: "Student Journalism",
  mediaUrl: "",
  summary: ""
};

const initialMediaAssetForm = {
  assetTitle: "",
  assetType: "Video",
  episodeTitle: "",
  assetUrl: "",
  description: ""
};

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function numberValue(row: DbRow, keys: string[], fallback = 0) {
  const parsed = Number(value(row, keys));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

async function safeSelect(supabase: ReturnType<typeof createClient>, table: string, query: (tableName: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  try {
    const { data, error } = await query(table);
    if (error) return [];
    return (data ?? []) as DbRow[];
  } catch {
    return [];
  }
}

export default function EyesOnSocietyPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Loading Eyes on Society TV Studio...");
  const [studentId, setStudentId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [programs, setPrograms] = useState<DbRow[]>([]);
  const [library, setLibrary] = useState<DbRow[]>([]);
  const [aiAssets, setAiAssets] = useState<DbRow[]>([]);
  const [analytics, setAnalytics] = useState<DbRow[]>([]);
  const [episodes, setEpisodes] = useState<DbRow[]>([]);
  const [guests, setGuests] = useState<DbRow[]>([]);
  const [calendar, setCalendar] = useState<DbRow[]>([]);
  const [sponsors, setSponsors] = useState<DbRow[]>([]);
  const [scripts, setScripts] = useState<DbRow[]>([]);
  const [teleprompterRuns, setTeleprompterRuns] = useState<DbRow[]>([]);
  const [cameraWorkflows, setCameraWorkflows] = useState<DbRow[]>([]);
  const [viewerQuestions, setViewerQuestions] = useState<DbRow[]>([]);
  const [journalismSubmissions, setJournalismSubmissions] = useState<DbRow[]>([]);
  const [mediaAssets, setMediaAssets] = useState<DbRow[]>([]);
  const [activeCategory, setActiveCategory] = useState("Education & Literacy");
  const [editingEpisodeId, setEditingEpisodeId] = useState("");
  const [episodeForm, setEpisodeForm] = useState(initialEpisodeForm);
  const [guestForm, setGuestForm] = useState(initialGuestForm);
  const [calendarForm, setCalendarForm] = useState(initialCalendarForm);
  const [sponsorForm, setSponsorForm] = useState(initialSponsorForm);
  const [scriptForm, setScriptForm] = useState(initialScriptForm);
  const [teleprompterForm, setTeleprompterForm] = useState(initialTeleprompterForm);
  const [cameraForm, setCameraForm] = useState(initialCameraForm);
  const [questionForm, setQuestionForm] = useState(initialQuestionForm);
  const [journalismForm, setJournalismForm] = useState(initialJournalismForm);
  const [mediaAssetForm, setMediaAssetForm] = useState(initialMediaAssetForm);

  const isAdmin = userEmail.toLowerCase() === adminEmail;

  const loadDivision = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setStudentId(user.id);
      setUserEmail(user.email ?? "");

      const [
        programRows,
        libraryRows,
        aiRows,
        analyticsRows,
        episodeRows,
        guestRows,
        calendarRows,
        sponsorRows,
        scriptRows,
        teleprompterRows,
        cameraRows,
        questionRows,
        journalismRows,
        mediaAssetRows
      ] = await Promise.all([
        safeSelect(supabase, "broadcast_programs", (table) => supabase.from(table).select("*").eq("division_name", divisionName).order("program_name", { ascending: true })),
        safeSelect(supabase, "broadcast_media_library", (table) => supabase.from(table).select("*").eq("division_name", divisionName).order("created_at", { ascending: false })),
        safeSelect(supabase, "broadcast_ai_media_assets", (table) => supabase.from(table).select("*").ilike("title", "%Eyes on Society%").order("created_at", { ascending: false })),
        safeSelect(supabase, "broadcast_analytics", (table) => supabase.from(table).select("*").eq("division_name", divisionName).order("recorded_at", { ascending: false })),
        safeSelect(supabase, "eyes_society_episodes", (table) => supabase.from(table).select("*").order("scheduled_at", { ascending: true })),
        safeSelect(supabase, "eyes_society_guests", (table) => supabase.from(table).select("*").order("appearance_date", { ascending: true })),
        safeSelect(supabase, "eyes_society_production_calendar", (table) => supabase.from(table).select("*").order("event_date", { ascending: true })),
        safeSelect(supabase, "eyes_society_sponsors", (table) => supabase.from(table).select("*").order("created_at", { ascending: false })),
        safeSelect(supabase, "eyes_society_scripts", (table) => supabase.from(table).select("*").order("created_at", { ascending: false })),
        safeSelect(supabase, "eyes_society_teleprompter_runs", (table) => supabase.from(table).select("*").order("created_at", { ascending: false })),
        safeSelect(supabase, "eyes_society_camera_workflows", (table) => supabase.from(table).select("*").order("created_at", { ascending: false })),
        safeSelect(supabase, "eyes_society_viewer_questions", (table) => supabase.from(table).select("*").order("created_at", { ascending: false })),
        safeSelect(supabase, "eyes_society_journalism_submissions", (table) => supabase.from(table).select("*").order("created_at", { ascending: false })),
        safeSelect(supabase, "eyes_society_media_assets", (table) => supabase.from(table).select("*").order("created_at", { ascending: false }))
      ]);

      setPrograms(programRows);
      setLibrary(libraryRows);
      setAiAssets(aiRows);
      setAnalytics(analyticsRows);
      setEpisodes(episodeRows);
      setGuests(guestRows);
      setCalendar(calendarRows);
      setSponsors(sponsorRows);
      setScripts(scriptRows);
      setTeleprompterRuns(teleprompterRows);
      setCameraWorkflows(cameraRows);
      setViewerQuestions(questionRows);
      setJournalismSubmissions(journalismRows);
      setMediaAssets(mediaAssetRows);
      setMessage("Eyes on Society TV Studio synchronized with AFF TV Studio.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Eyes on Society TV Studio migration to enable production controls."));
    }
  }, [router]);

  useEffect(() => {
    loadDivision();
  }, [loadDivision]);

  const metrics = useMemo(() => {
    const views = analytics.reduce((total, row) => total + numberValue(row, ["views"]), 0);
    const watchTime = analytics.reduce((total, row) => total + numberValue(row, ["watch_time_minutes"]), 0);
    const subscribers = analytics.reduce((total, row) => total + numberValue(row, ["subscribers"]), 0);
    const liveEpisodes = episodes.filter((row) => value(row, ["status"]) === "Live").length;
    const engagement = analytics.length ? Math.round(analytics.reduce((total, row) => total + numberValue(row, ["engagement_score"]), 0) / analytics.length) : 0;
    return { views, watchTime, subscribers, liveEpisodes, engagement };
  }, [analytics, episodes]);

  const activePrograms = programs.filter((program) => value(program, ["program_name"]) === activeCategory);
  const activeMedia = library.filter((item) => value(item, ["program_name"]) === activeCategory);
  const activeEpisodes = episodes.filter((episode) => value(episode, ["category"]) === activeCategory);
  const interviewLibrary = episodes.filter((episode) => value(episode, ["episode_format"]) === "Interview" || value(episode, ["episode_format"]) === "Expert Panel");
  const documentaryLibrary = episodes.filter((episode) => value(episode, ["episode_format"]) === "Documentary");
  const townHallEvents = episodes.filter((episode) => value(episode, ["episode_format"]) === "Town Hall");
  const latestScript = scripts[0];

  async function saveEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving Eyes on Society episode...");
    try {
      const supabase = createClient();
      const payload = {
        episode_title: episodeForm.episodeTitle,
        category: episodeForm.category,
        episode_format: episodeForm.format,
        status: episodeForm.status,
        description: episodeForm.description,
        guest_name: episodeForm.guestName || null,
        scheduled_at: episodeForm.scheduledAt ? new Date(episodeForm.scheduledAt).toISOString() : null,
        live_stream_url: episodeForm.liveStreamUrl || null,
        replay_url: episodeForm.replayUrl || null,
        production_stage: episodeForm.productionStage,
        sponsor_name: episodeForm.sponsorName || null,
        created_by: userEmail || adminEmail
      };
      const query = editingEpisodeId
        ? supabase.from("eyes_society_episodes").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingEpisodeId)
        : supabase.from("eyes_society_episodes").insert(payload);
      const { error } = await query;
      if (error) throw error;

      if (episodeForm.publishToStudio && !editingEpisodeId) {
        const { error: broadcastError } = await supabase.from("tv_broadcasts").insert({
          title: episodeForm.episodeTitle,
          show_name: divisionName,
          category: divisionName,
          description: episodeForm.description,
          stream_url: episodeForm.liveStreamUrl || null,
          replay_url: episodeForm.replayUrl || null,
          scheduled_at: episodeForm.scheduledAt ? new Date(episodeForm.scheduledAt).toISOString() : null,
          duration_minutes: 55,
          host_name: "Dr. Jean R. Moricette",
          status: episodeForm.status,
          access_level: "Public",
          created_by: userEmail || adminEmail
        });
        if (broadcastError) throw broadcastError;
      }

      setEpisodeForm(initialEpisodeForm);
      setEditingEpisodeId("");
      setMessage("Eyes on Society episode saved and synchronized.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save Eyes on Society episode."));
    }
  }

  function editEpisode(episode: DbRow) {
    const scheduled = value(episode, ["scheduled_at"]);
    const scheduledDate = scheduled ? new Date(scheduled) : null;
    setEditingEpisodeId(value(episode, ["id"]));
    setEpisodeForm({
      episodeTitle: value(episode, ["episode_title"]),
      category: value(episode, ["category"], "Education & Literacy"),
      format: value(episode, ["episode_format"], "Interview"),
      status: value(episode, ["status"], "Scheduled"),
      description: value(episode, ["description"]),
      guestName: value(episode, ["guest_name"]),
      scheduledAt: scheduledDate && !Number.isNaN(scheduledDate.getTime()) ? new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "",
      liveStreamUrl: value(episode, ["live_stream_url"]),
      replayUrl: value(episode, ["replay_url"]),
      productionStage: value(episode, ["production_stage"], "Pre-Production"),
      sponsorName: value(episode, ["sponsor_name"]),
      publishToStudio: false
    });
    setMessage(`Editing ${value(episode, ["episode_title"], "episode")}.`);
  }

  async function updateEpisodeStatus(episode: DbRow, status: string) {
    if (!isAdmin) return;
    setMessage(`${status === "Archived" ? "Archiving" : "Publishing"} episode...`);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_episodes").update({
        status,
        production_stage: status === "Published" ? "Published" : status,
        updated_at: new Date().toISOString()
      }).eq("id", value(episode, ["id"]));
      if (error) throw error;

      if (status === "Published") {
        const { error: broadcastError } = await supabase.from("tv_broadcasts").insert({
          title: value(episode, ["episode_title"]),
          show_name: divisionName,
          category: divisionName,
          description: value(episode, ["description"]),
          stream_url: value(episode, ["live_stream_url"]) || null,
          replay_url: value(episode, ["replay_url"]) || null,
          scheduled_at: value(episode, ["scheduled_at"]) || null,
          duration_minutes: 55,
          host_name: "Dr. Jean R. Moricette",
          status: "Published",
          access_level: "Public",
          created_by: userEmail || adminEmail
        });
        if (broadcastError) throw broadcastError;
      }

      setMessage(`Episode ${status.toLowerCase()}.`);
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update episode status."));
    }
  }

  async function saveGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving guest profile...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_guests").insert({
        guest_name: guestForm.guestName,
        guest_title: guestForm.title,
        organization: guestForm.organization,
        email: guestForm.email || null,
        topic: guestForm.topic,
        booking_status: guestForm.bookingStatus,
        appearance_date: guestForm.appearanceDate ? new Date(guestForm.appearanceDate).toISOString() : null,
        notes: guestForm.notes
      });
      if (error) throw error;
      setGuestForm(initialGuestForm);
      setMessage("Guest profile saved.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save guest profile."));
    }
  }

  async function saveCalendarEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving production calendar event...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_production_calendar").insert({
        event_title: calendarForm.eventTitle,
        event_type: calendarForm.eventType,
        event_date: calendarForm.eventDate ? new Date(calendarForm.eventDate).toISOString() : null,
        owner_name: calendarForm.ownerName,
        status: calendarForm.status,
        notes: calendarForm.notes
      });
      if (error) throw error;
      setCalendarForm(initialCalendarForm);
      setMessage("Production calendar updated.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save production calendar event."));
    }
  }

  async function saveSponsor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving sponsor record...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_sponsors").insert({
        sponsor_name: sponsorForm.sponsorName,
        contact_name: sponsorForm.contactName,
        sponsorship_level: sponsorForm.sponsorshipLevel,
        campaign_name: sponsorForm.campaignName,
        start_date: sponsorForm.startDate || null,
        end_date: sponsorForm.endDate || null,
        status: sponsorForm.status,
        benefits: sponsorForm.benefits
      });
      if (error) throw error;
      setSponsorForm(initialSponsorForm);
      setMessage("Sponsor record saved.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save sponsor record."));
    }
  }

  async function saveScript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving script assistant draft...");
    try {
      const generatedScript = scriptForm.scriptText || `Welcome to Eyes on Society TV. Today we explore ${scriptForm.episodeTitle || activeCategory}, why it matters to modern society, what leaders must understand, and how communities can respond with wisdom, responsibility, and practical action.`;
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_scripts").insert({
        episode_title: scriptForm.episodeTitle || `Eyes on Society: ${activeCategory}`,
        segment_title: scriptForm.segmentTitle,
        ai_prompt: scriptForm.aiPrompt,
        script_text: generatedScript,
        script_status: scriptForm.scriptStatus,
        created_by: userEmail || adminEmail
      });
      if (error) throw error;
      setTeleprompterForm((current) => ({ ...current, episodeTitle: scriptForm.episodeTitle, scriptText: generatedScript }));
      setScriptForm(initialScriptForm);
      setMessage("AI script assistant draft saved and loaded into teleprompter.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save script."));
    }
  }

  async function saveTeleprompter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving teleprompter run...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_teleprompter_runs").insert({
        episode_title: teleprompterForm.episodeTitle || value(latestScript ?? {}, ["episode_title"], `Eyes on Society: ${activeCategory}`),
        script_text: teleprompterForm.scriptText || value(latestScript ?? {}, ["script_text"], ""),
        scroll_speed: Number(teleprompterForm.scrollSpeed) || 5,
        font_size: Number(teleprompterForm.fontSize) || 42,
        operator_name: teleprompterForm.operatorName,
        status: teleprompterForm.status
      });
      if (error) throw error;
      setMessage("Teleprompter run saved.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save teleprompter run."));
    }
  }

  async function saveCameraWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving camera workflow...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_camera_workflows").insert({
        episode_title: cameraForm.episodeTitle || `Eyes on Society: ${activeCategory}`,
        camera_label: cameraForm.cameraLabel,
        shot_type: cameraForm.shotType,
        operator_name: cameraForm.operatorName,
        input_source: cameraForm.inputSource,
        status: cameraForm.status,
        notes: cameraForm.notes
      });
      if (error) throw error;
      setCameraForm(initialCameraForm);
      setMessage("Multi-camera workflow saved.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save camera workflow."));
    }
  }

  async function submitViewerQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting viewer question...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_viewer_questions").insert({
        student_id: studentId || null,
        viewer_name: questionForm.viewerName,
        email: questionForm.email || userEmail || null,
        topic: questionForm.topic,
        question: questionForm.question,
        review_status: "Submitted"
      });
      if (error) throw error;
      setQuestionForm(initialQuestionForm);
      setMessage("Viewer question submitted to Eyes on Society TV.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit viewer question."));
    }
  }

  async function submitJournalismProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting student journalism project...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_journalism_submissions").insert({
        student_id: studentId || null,
        student_name: journalismForm.studentName,
        email: journalismForm.email || userEmail || null,
        project_title: journalismForm.projectTitle,
        category: journalismForm.category,
        media_url: journalismForm.mediaUrl || null,
        summary: journalismForm.summary,
        review_status: "Submitted"
      });
      if (error) throw error;
      setJournalismForm(initialJournalismForm);
      setMessage("Student journalism project submitted.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit journalism project."));
    }
  }

  async function saveMediaAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Saving media asset...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("eyes_society_media_assets").insert({
        asset_title: mediaAssetForm.assetTitle,
        asset_type: mediaAssetForm.assetType,
        episode_title: mediaAssetForm.episodeTitle || null,
        asset_url: mediaAssetForm.assetUrl || null,
        description: mediaAssetForm.description,
        uploaded_by: userEmail || adminEmail,
        status: "Published"
      });
      if (error) throw error;
      setMediaAssetForm(initialMediaAssetForm);
      setMessage("Media asset saved.");
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save media asset."));
    }
  }

  async function generateAsset(assetType: string) {
    setMessage(`Generating ${assetType.toLowerCase()}...`);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("broadcast_ai_media_assets").insert({
        student_id: studentId,
        asset_type: assetType,
        title: `Eyes on Society ${assetType}: ${activeCategory}`,
        content: `AI-generated ${assetType.toLowerCase()} for ${activeCategory}. Frame the social issue, key ideas, community implications, viewer questions, research references, and responsible action steps.`,
        created_by: "AFF AI Media Assistant"
      });
      if (error) throw error;
      setMessage(`${assetType} generated.`);
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, `Unable to generate ${assetType}.`));
    }
  }

  async function generateScriptWriterAsset(assetType: string) {
    setMessage(`Generating ${assetType.toLowerCase()}...`);
    try {
      const supabase = createClient();
      const content = {
        "Interview Questions": `Prepare 10 thoughtful interview questions for ${activeCategory}. Include issue framing, personal story, community impact, and responsible solutions.`,
        "Episode Outline": `Create a five-part Eyes on Society episode outline for ${activeCategory}: opening, context, expert insight, community implications, and closing action steps.`,
        "Documentary Structure": `Build a documentary structure for ${activeCategory}: thesis, scenes, interviews, evidence, public stakes, and resolution.`,
        "Research Assistant": `Research brief for ${activeCategory}: key terms, public context, stakeholder questions, references to gather, and discussion angles.`
      }[assetType] ?? `Generate an Eyes on Society production asset for ${activeCategory}.`;
      const { error } = await supabase.from("eyes_society_scripts").insert({
        episode_title: `Eyes on Society: ${activeCategory}`,
        segment_title: assetType,
        ai_prompt: assetType,
        script_text: content,
        script_status: "Draft",
        created_by: "AFF AI Script Writer"
      });
      if (error) throw error;
      setMessage(`${assetType} generated by AI Script Writer.`);
      await loadDivision();
    } catch (error) {
      setMessage(getErrorMessage(error, `Unable to generate ${assetType}.`));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Eyes on Society TV Studio"
        title="A complete production studio for issues, ideas, challenges, and opportunities shaping modern society."
        text="Manage episodes, live streams, guests, media assets, production calendar, sponsors, scripts, teleprompter runs, and multi-camera workflows while synchronizing programming with AFF TV Studio."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <section className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-xs uppercase tracking-[.18em] text-gold-300">Host Profile: Dr. Jean R. Moricette · {isAdmin ? "Studio Administrator" : "Viewer Studio Access"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/tv-studio" className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 text-sm font-semibold text-gold-300">
                <Tv size={18} /> AFF TV Studio
              </Link>
              <Link href="/broadcast-network" className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950">
                <Radio size={18} /> Broadcast Network
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Video size={22} />} label="Episodes" value={String(episodes.length)} />
            <Metric icon={<PlayCircle size={22} />} label="Watch Time" value={`${metrics.watchTime} min`} />
            <Metric icon={<Users size={22} />} label="Subscriber Growth" value={String(metrics.subscribers)} />
            <Metric icon={<BarChart3 size={22} />} label="Engagement" value={`${metrics.engagement}%`} />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`terminal-panel p-4 text-left text-sm font-semibold transition ${activeCategory === category ? "border-gold-300 bg-gold-500/10 text-white" : "text-ink/76 hover:border-gold-400/60"}`}>
                {category}
              </button>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
            <Panel title={`${activeCategory} Episode Management`} icon={<MonitorPlay size={22} />}>
              {activeEpisodes.length === 0 ? <p className="text-sm text-ink/68">No episodes have been created for this category yet.</p> : null}
              {activeEpisodes.slice(0, 5).map((episode) => (
                <article key={value(episode, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(episode, ["episode_format"])} · {value(episode, ["status"])} · {value(episode, ["production_stage"])}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{value(episode, ["episode_title"])}</h3>
                  <p className="mt-2 leading-7 text-ink/70">{value(episode, ["description"])}</p>
                  <p className="mt-2 text-xs text-gold-300">Guest: {value(episode, ["guest_name"], "Pending")} · {shortDate(value(episode, ["scheduled_at"]))}</p>
                  {isAdmin ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300" type="button" onClick={() => editEpisode(episode)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <button className="inline-flex items-center gap-2 bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950" type="button" onClick={() => updateEpisodeStatus(episode, "Published")}>
                        <Send size={14} /> Publish
                      </button>
                      <button className="inline-flex items-center gap-2 border border-gold-500/30 px-3 py-2 text-xs font-semibold text-gold-300" type="button" onClick={() => updateEpisodeStatus(episode, "Archived")}>
                        <Archive size={14} /> Archive
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </Panel>

            <Panel title="Live Streaming Control Room" icon={<Radio size={22} />}>
              <div className="aspect-video border border-gold-500/18 bg-navy-950 p-6">
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <PlayCircle className="mx-auto text-gold-300" size={54} />
                    <p className="mt-4 text-2xl font-semibold text-white">Eyes on Society Live Stream</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">Attach RTMP, Vimeo, YouTube, or private stream URLs from the episode form and publish to AFF TV Studio.</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Feature title="Stream Routing" body="Live stream URLs sync into AFF TV Studio broadcast records." />
                <Feature title="Replay Archive" body={`${library.length} media assets available for the division.`} />
                <Feature title="Production Status" body={`${episodes.filter((row) => value(row, ["production_stage"]) === "Scheduled").length} scheduled productions.`} />
              </div>
            </Panel>
          </section>

          {isAdmin ? (
            <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <form className="terminal-panel grid h-fit gap-4 p-5" onSubmit={saveEpisode}>
                <h2 className="text-xl font-semibold text-white">Create Episode</h2>
                <input className="field" placeholder="Episode title" value={episodeForm.episodeTitle} onChange={(event) => setEpisodeForm((current) => ({ ...current, episodeTitle: event.target.value }))} required />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="field" value={episodeForm.category} onChange={(event) => setEpisodeForm((current) => ({ ...current, category: event.target.value }))}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
                  <select className="field" value={episodeForm.format} onChange={(event) => setEpisodeForm((current) => ({ ...current, format: event.target.value }))}>{episodeFormats.map((item) => <option key={item}>{item}</option>)}</select>
                </div>
                <textarea className="field min-h-24" placeholder="Episode description" value={episodeForm.description} onChange={(event) => setEpisodeForm((current) => ({ ...current, description: event.target.value }))} />
                <input className="field" placeholder="Guest name" value={episodeForm.guestName} onChange={(event) => setEpisodeForm((current) => ({ ...current, guestName: event.target.value }))} />
                <input className="field" type="datetime-local" value={episodeForm.scheduledAt} onChange={(event) => setEpisodeForm((current) => ({ ...current, scheduledAt: event.target.value }))} />
                <input className="field" placeholder="Live stream URL" value={episodeForm.liveStreamUrl} onChange={(event) => setEpisodeForm((current) => ({ ...current, liveStreamUrl: event.target.value }))} />
                <input className="field" placeholder="Replay URL" value={episodeForm.replayUrl} onChange={(event) => setEpisodeForm((current) => ({ ...current, replayUrl: event.target.value }))} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="field" value={episodeForm.status} onChange={(event) => setEpisodeForm((current) => ({ ...current, status: event.target.value }))}>{["Scheduled", "Live", "Replay", "Published", "Draft", "Archived"].map((item) => <option key={item}>{item}</option>)}</select>
                  <select className="field" value={episodeForm.productionStage} onChange={(event) => setEpisodeForm((current) => ({ ...current, productionStage: event.target.value }))}>{productionStages.map((item) => <option key={item}>{item}</option>)}</select>
                </div>
                <input className="field" placeholder="Sponsor name" value={episodeForm.sponsorName} onChange={(event) => setEpisodeForm((current) => ({ ...current, sponsorName: event.target.value }))} />
                <label className="flex items-center gap-3 text-sm text-ink/76"><input type="checkbox" checked={episodeForm.publishToStudio} onChange={(event) => setEpisodeForm((current) => ({ ...current, publishToStudio: event.target.checked }))} /> Publish to AFF TV Studio</label>
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit"><Save size={18} /> Save Episode</button>
              </form>

              <div className="grid gap-6">
                <Panel title="Guest Management" icon={<Mic size={22} />}>
                  <form className="grid gap-3 md:grid-cols-2" onSubmit={saveGuest}>
                    <input className="field" placeholder="Guest name" value={guestForm.guestName} onChange={(event) => setGuestForm((current) => ({ ...current, guestName: event.target.value }))} required />
                    <input className="field" placeholder="Title" value={guestForm.title} onChange={(event) => setGuestForm((current) => ({ ...current, title: event.target.value }))} />
                    <input className="field" placeholder="Organization" value={guestForm.organization} onChange={(event) => setGuestForm((current) => ({ ...current, organization: event.target.value }))} />
                    <input className="field" placeholder="Email" value={guestForm.email} onChange={(event) => setGuestForm((current) => ({ ...current, email: event.target.value }))} />
                    <input className="field" placeholder="Topic" value={guestForm.topic} onChange={(event) => setGuestForm((current) => ({ ...current, topic: event.target.value }))} required />
                    <input className="field" type="datetime-local" value={guestForm.appearanceDate} onChange={(event) => setGuestForm((current) => ({ ...current, appearanceDate: event.target.value }))} />
                    <select className="field" value={guestForm.bookingStatus} onChange={(event) => setGuestForm((current) => ({ ...current, bookingStatus: event.target.value }))}>{["Invited", "Confirmed", "Recorded", "Published", "Declined"].map((item) => <option key={item}>{item}</option>)}</select>
                    <input className="field" placeholder="Notes" value={guestForm.notes} onChange={(event) => setGuestForm((current) => ({ ...current, notes: event.target.value }))} />
                    <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 md:col-span-2" type="submit">Save Guest</button>
                  </form>
                </Panel>

                <Panel title="Production Calendar" icon={<CalendarDays size={22} />}>
                  <form className="grid gap-3 md:grid-cols-2" onSubmit={saveCalendarEvent}>
                    <input className="field" placeholder="Event title" value={calendarForm.eventTitle} onChange={(event) => setCalendarForm((current) => ({ ...current, eventTitle: event.target.value }))} required />
                    <select className="field" value={calendarForm.eventType} onChange={(event) => setCalendarForm((current) => ({ ...current, eventType: event.target.value }))}>{["Production Meeting", "Guest Interview", "Live Broadcast", "Recording Session", "Editing Deadline", "Sponsor Review"].map((item) => <option key={item}>{item}</option>)}</select>
                    <input className="field" type="datetime-local" value={calendarForm.eventDate} onChange={(event) => setCalendarForm((current) => ({ ...current, eventDate: event.target.value }))} />
                    <input className="field" placeholder="Owner" value={calendarForm.ownerName} onChange={(event) => setCalendarForm((current) => ({ ...current, ownerName: event.target.value }))} />
                    <input className="field" placeholder="Notes" value={calendarForm.notes} onChange={(event) => setCalendarForm((current) => ({ ...current, notes: event.target.value }))} />
                    <select className="field" value={calendarForm.status} onChange={(event) => setCalendarForm((current) => ({ ...current, status: event.target.value }))}>{["Scheduled", "In Progress", "Complete", "Delayed"].map((item) => <option key={item}>{item}</option>)}</select>
                    <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 md:col-span-2" type="submit">Save Calendar Event</button>
                  </form>
                </Panel>
              </div>
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Interview Library" icon={<Mic size={22} />}>
              <RecordList title="Interviews and Expert Panels" rows={interviewLibrary} primary={["episode_title"]} secondary={["guest_name", "status", "scheduled_at"]} />
            </Panel>

            <Panel title="Documentary Library" icon={<FileText size={22} />}>
              <RecordList title="Documentary Series" rows={documentaryLibrary} primary={["episode_title"]} secondary={["category", "production_stage", "status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Town Hall Event Management" icon={<Users size={22} />}>
              <RecordList title="Town Hall Events" rows={townHallEvents} primary={["episode_title"]} secondary={["guest_name", "scheduled_at", "status"]} />
            </Panel>

            <Panel title="Episode Analytics" icon={<BarChart3 size={22} />}>
              <div className="grid gap-3 md:grid-cols-2">
                <Feature title="Views" body={`${metrics.views} total view events tracked for Eyes on Society TV.`} />
                <Feature title="Watch Time" body={`${metrics.watchTime} minutes watched across seeded and live analytics.`} />
                <Feature title="Engagement" body={`${metrics.engagement}% average audience engagement score.`} />
                <Feature title="Subscriber Growth" body={`${metrics.subscribers} subscribers tracked through broadcast analytics.`} />
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Media Library" icon={<Library size={22} />}>
              <div className="grid gap-3">
                {activeMedia.length === 0 ? <p className="text-sm text-ink/68">No media assets found for this category yet.</p> : null}
                {activeMedia.map((item) => (
                  <article key={value(item, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(item, ["media_type"])} · {value(item, ["access_level"])}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(item, ["media_title"])}</h3>
                    <p className="mt-2 text-sm text-ink/68">{value(item, ["duration_minutes"], "0")} minutes</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Guest, Sponsor, and Calendar Boards" icon={<Users size={22} />}>
              <div className="grid gap-3 md:grid-cols-3">
                <RecordList title="Guests" rows={guests} primary={["guest_name"]} secondary={["booking_status", "topic"]} />
                <RecordList title="Sponsors" rows={sponsors} primary={["sponsor_name"]} secondary={["sponsorship_level", "status"]} />
                <RecordList title="Calendar" rows={calendar} primary={["event_title"]} secondary={["event_type", "event_date"]} />
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Viewer Question Submission Portal" icon={<Send size={22} />}>
              <form className="grid gap-3" onSubmit={submitViewerQuestion}>
                <input className="field" placeholder="Your name" value={questionForm.viewerName} onChange={(event) => setQuestionForm((current) => ({ ...current, viewerName: event.target.value }))} required />
                <input className="field" placeholder="Email" value={questionForm.email} onChange={(event) => setQuestionForm((current) => ({ ...current, email: event.target.value }))} />
                <select className="field" value={questionForm.topic} onChange={(event) => setQuestionForm((current) => ({ ...current, topic: event.target.value }))}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
                <textarea className="field min-h-28" placeholder="Question for Eyes on Society TV" value={questionForm.question} onChange={(event) => setQuestionForm((current) => ({ ...current, question: event.target.value }))} required />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit"><Send size={18} /> Submit Question</button>
              </form>
              <RecordList title="Recent Questions" rows={viewerQuestions} primary={["question"]} secondary={["viewer_name", "topic", "review_status"]} />
            </Panel>

            <Panel title="Student Journalism Submission Center" icon={<Upload size={22} />}>
              <form className="grid gap-3" onSubmit={submitJournalismProject}>
                <input className="field" placeholder="Student name" value={journalismForm.studentName} onChange={(event) => setJournalismForm((current) => ({ ...current, studentName: event.target.value }))} required />
                <input className="field" placeholder="Email" value={journalismForm.email} onChange={(event) => setJournalismForm((current) => ({ ...current, email: event.target.value }))} />
                <input className="field" placeholder="Project title" value={journalismForm.projectTitle} onChange={(event) => setJournalismForm((current) => ({ ...current, projectTitle: event.target.value }))} required />
                <input className="field" placeholder="Media URL" value={journalismForm.mediaUrl} onChange={(event) => setJournalismForm((current) => ({ ...current, mediaUrl: event.target.value }))} />
                <textarea className="field min-h-28" placeholder="Project summary" value={journalismForm.summary} onChange={(event) => setJournalismForm((current) => ({ ...current, summary: event.target.value }))} required />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit"><Upload size={18} /> Submit Journalism Project</button>
              </form>
              <RecordList title="Student Journalism Queue" rows={journalismSubmissions} primary={["project_title"]} secondary={["student_name", "category", "review_status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="AI Script Writer" icon={<Bot size={22} />}>
              {isAdmin ? (
                <form className="grid gap-3" onSubmit={saveScript}>
                  <input className="field" placeholder="Episode title" value={scriptForm.episodeTitle} onChange={(event) => setScriptForm((current) => ({ ...current, episodeTitle: event.target.value }))} />
                  <input className="field" placeholder="Segment title" value={scriptForm.segmentTitle} onChange={(event) => setScriptForm((current) => ({ ...current, segmentTitle: event.target.value }))} />
                  <textarea className="field min-h-20" placeholder="AI prompt or production notes" value={scriptForm.aiPrompt} onChange={(event) => setScriptForm((current) => ({ ...current, aiPrompt: event.target.value }))} />
                  <textarea className="field min-h-32" placeholder="Script text or leave blank to generate starter copy" value={scriptForm.scriptText} onChange={(event) => setScriptForm((current) => ({ ...current, scriptText: event.target.value }))} />
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit"><Sparkles size={18} /> Save Script Draft</button>
                </form>
              ) : null}
              <div className="grid gap-2">
                {scriptWriterActions.map((action) => (
                  <button key={action} className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => generateScriptWriterAsset(action)}>
                    Generate {action}
                  </button>
                ))}
              </div>
              {aiActions.map((action) => (
                <button key={action} className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => generateAsset(action)}>
                  Generate {action}
                </button>
              ))}
            </Panel>

            <Panel title="Teleprompter System" icon={<FileText size={22} />}>
              {isAdmin ? (
                <form className="grid gap-3 md:grid-cols-2" onSubmit={saveTeleprompter}>
                  <input className="field" placeholder="Episode title" value={teleprompterForm.episodeTitle} onChange={(event) => setTeleprompterForm((current) => ({ ...current, episodeTitle: event.target.value }))} />
                  <input className="field" placeholder="Operator" value={teleprompterForm.operatorName} onChange={(event) => setTeleprompterForm((current) => ({ ...current, operatorName: event.target.value }))} />
                  <input className="field" type="number" min="1" max="10" value={teleprompterForm.scrollSpeed} onChange={(event) => setTeleprompterForm((current) => ({ ...current, scrollSpeed: event.target.value }))} />
                  <input className="field" type="number" min="20" max="80" value={teleprompterForm.fontSize} onChange={(event) => setTeleprompterForm((current) => ({ ...current, fontSize: event.target.value }))} />
                  <textarea className="field min-h-32 md:col-span-2" placeholder="Teleprompter script" value={teleprompterForm.scriptText} onChange={(event) => setTeleprompterForm((current) => ({ ...current, scriptText: event.target.value }))} />
                  <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 md:col-span-2" type="submit">Save Teleprompter Run</button>
                </form>
              ) : null}
              <article className="max-h-80 overflow-auto border border-gold-500/18 bg-navy-950 p-6">
                <p className="text-xs uppercase tracking-[.2em] text-gold-300">Teleprompter Preview</p>
                <p className="mt-4 text-3xl leading-relaxed text-white">{teleprompterForm.scriptText || value(latestScript ?? {}, ["script_text"], "Script preview will appear here for studio production.")}</p>
              </article>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="Media Asset Library" icon={<Library size={22} />}>
              {isAdmin ? (
                <form className="grid gap-3" onSubmit={saveMediaAsset}>
                  <input className="field" placeholder="Asset title" value={mediaAssetForm.assetTitle} onChange={(event) => setMediaAssetForm((current) => ({ ...current, assetTitle: event.target.value }))} required />
                  <select className="field" value={mediaAssetForm.assetType} onChange={(event) => setMediaAssetForm((current) => ({ ...current, assetType: event.target.value }))}>{mediaAssetTypes.map((item) => <option key={item}>{item}</option>)}</select>
                  <input className="field" placeholder="Episode title" value={mediaAssetForm.episodeTitle} onChange={(event) => setMediaAssetForm((current) => ({ ...current, episodeTitle: event.target.value }))} />
                  <input className="field" placeholder="Asset URL" value={mediaAssetForm.assetUrl} onChange={(event) => setMediaAssetForm((current) => ({ ...current, assetUrl: event.target.value }))} />
                  <textarea className="field min-h-24" placeholder="Description" value={mediaAssetForm.description} onChange={(event) => setMediaAssetForm((current) => ({ ...current, description: event.target.value }))} />
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit"><Save size={18} /> Save Media Asset</button>
                </form>
              ) : null}
            </Panel>

            <Panel title="Video, Audio, Image, and Document Assets" icon={<FileText size={22} />}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {mediaAssetTypes.map((type) => (
                  <Feature key={type} title={type} body={`${mediaAssets.filter((asset) => value(asset, ["asset_type"]) === type).length} assets`} />
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {mediaAssets.slice(0, 8).map((asset) => (
                  <article key={value(asset, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(asset, ["asset_type"])} · {value(asset, ["status"])}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(asset, ["asset_title"])}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{value(asset, ["description"], value(asset, ["episode_title"]))}</p>
                  </article>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Multi-Camera Production Workflow" icon={<Camera size={22} />}>
              {isAdmin ? (
                <form className="grid gap-3 md:grid-cols-2" onSubmit={saveCameraWorkflow}>
                  <input className="field" placeholder="Episode title" value={cameraForm.episodeTitle} onChange={(event) => setCameraForm((current) => ({ ...current, episodeTitle: event.target.value }))} />
                  <select className="field" value={cameraForm.cameraLabel} onChange={(event) => setCameraForm((current) => ({ ...current, cameraLabel: event.target.value }))}>{["Camera 1", "Camera 2", "Camera 3", "Screen Capture", "Remote Guest"].map((item) => <option key={item}>{item}</option>)}</select>
                  <select className="field" value={cameraForm.shotType} onChange={(event) => setCameraForm((current) => ({ ...current, shotType: event.target.value }))}>{["Host Close-Up", "Guest Close-Up", "Two Shot", "Wide Studio", "Presentation Screen", "Audience View"].map((item) => <option key={item}>{item}</option>)}</select>
                  <input className="field" placeholder="Input source" value={cameraForm.inputSource} onChange={(event) => setCameraForm((current) => ({ ...current, inputSource: event.target.value }))} />
                  <input className="field" placeholder="Operator" value={cameraForm.operatorName} onChange={(event) => setCameraForm((current) => ({ ...current, operatorName: event.target.value }))} />
                  <select className="field" value={cameraForm.status} onChange={(event) => setCameraForm((current) => ({ ...current, status: event.target.value }))}>{["Ready", "Standby", "Live", "Offline"].map((item) => <option key={item}>{item}</option>)}</select>
                  <input className="field md:col-span-2" placeholder="Notes" value={cameraForm.notes} onChange={(event) => setCameraForm((current) => ({ ...current, notes: event.target.value }))} />
                  <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 md:col-span-2" type="submit">Save Camera Workflow</button>
                </form>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                {cameraWorkflows.slice(0, 6).map((workflow) => (
                  <article key={value(workflow, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(workflow, ["camera_label"])} · {value(workflow, ["status"])}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(workflow, ["shot_type"])}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{value(workflow, ["episode_title"])} · {value(workflow, ["input_source"])}</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Sponsor Management" icon={<Sparkles size={22} />}>
              {isAdmin ? (
                <form className="grid gap-3 md:grid-cols-2" onSubmit={saveSponsor}>
                  <input className="field" placeholder="Sponsor name" value={sponsorForm.sponsorName} onChange={(event) => setSponsorForm((current) => ({ ...current, sponsorName: event.target.value }))} required />
                  <input className="field" placeholder="Contact name" value={sponsorForm.contactName} onChange={(event) => setSponsorForm((current) => ({ ...current, contactName: event.target.value }))} />
                  <input className="field" placeholder="Campaign name" value={sponsorForm.campaignName} onChange={(event) => setSponsorForm((current) => ({ ...current, campaignName: event.target.value }))} />
                  <select className="field" value={sponsorForm.sponsorshipLevel} onChange={(event) => setSponsorForm((current) => ({ ...current, sponsorshipLevel: event.target.value }))}>{["Community Partner", "Episode Sponsor", "Series Sponsor", "Institutional Sponsor"].map((item) => <option key={item}>{item}</option>)}</select>
                  <input className="field" type="date" value={sponsorForm.startDate} onChange={(event) => setSponsorForm((current) => ({ ...current, startDate: event.target.value }))} />
                  <input className="field" type="date" value={sponsorForm.endDate} onChange={(event) => setSponsorForm((current) => ({ ...current, endDate: event.target.value }))} />
                  <input className="field md:col-span-2" placeholder="Benefits and deliverables" value={sponsorForm.benefits} onChange={(event) => setSponsorForm((current) => ({ ...current, benefits: event.target.value }))} />
                  <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 md:col-span-2" type="submit">Save Sponsor</button>
                </form>
              ) : null}
              <RecordList title="Sponsor Pipeline" rows={sponsors} primary={["sponsor_name"]} secondary={["sponsorship_level", "campaign_name", "status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="AI Generated Assets" icon={<Search size={22} />}>
              <div className="grid gap-3 md:grid-cols-2">
                {aiAssets.slice(0, 6).map((asset) => (
                  <article key={value(asset, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(asset, ["asset_type"])}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(asset, ["title"])}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{value(asset, ["content"])}</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Program Categories and Production Archive" icon={<Library size={22} />}>
              {activePrograms.length === 0 ? <p className="text-sm text-ink/68">Program record pending. Run the updated broadcast migration to seed this category.</p> : null}
              {activePrograms.map((program) => (
                <article key={value(program, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(program, ["program_type"])}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{value(program, ["program_name"])}</h3>
                  <p className="mt-2 leading-7 text-ink/70">{value(program, ["description"])}</p>
                </article>
              ))}
            </Panel>
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </article>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <article className="border border-gold-500/18 bg-navy-950 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink/68">{body}</p>
    </article>
  );
}

function RecordList({ title, rows, primary, secondary }: { title: string; rows: DbRow[]; primary: string[]; secondary: string[] }) {
  return (
    <section className="grid gap-3">
      <h3 className="font-semibold text-white">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-ink/62">No records yet.</p> : null}
      {rows.slice(0, 5).map((row) => (
        <article key={`${title}-${value(row, ["id"], value(row, primary))}`} className="border border-gold-500/18 bg-navy-950 p-4">
          <p className="font-semibold text-white">{value(row, primary)}</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{secondary.map((key) => value(row, [key])).filter(Boolean).join(" · ")}</p>
        </article>
      ))}
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="terminal-panel p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-gold-300">{icon}</span>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}
