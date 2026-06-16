"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bot, CalendarDays, Clapperboard, FileText, Library, Radio, Save, Tv, Upload, UserCog, Users, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";
const submissionTypes = ["Project Upload", "Student Broadcast", "Report Submission", "Interview Submission"];
const mediaTypes = ["Video", "Podcast", "Interview", "Course", "Broadcast Archive"];

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
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
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

export default function BroadcastNetworkPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Loading AFF Global Broadcasting Network...");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [divisions, setDivisions] = useState<DbRow[]>([]);
  const [programs, setPrograms] = useState<DbRow[]>([]);
  const [broadcasts, setBroadcasts] = useState<DbRow[]>([]);
  const [library, setLibrary] = useState<DbRow[]>([]);
  const [submissions, setSubmissions] = useState<DbRow[]>([]);
  const [aiAssets, setAiAssets] = useState<DbRow[]>([]);
  const [analytics, setAnalytics] = useState<DbRow[]>([]);
  const [activeDivision, setActiveDivision] = useState("AFF TV Studio");
  const [submissionForm, setSubmissionForm] = useState({
    submissionType: "Project Upload",
    title: "",
    description: "",
    mediaUrl: ""
  });
  const [mediaForm, setMediaForm] = useState({
    mediaTitle: "",
    mediaType: "Video",
    divisionName: "AFF TV Studio",
    programName: "Live Stream Desk",
    mediaUrl: "",
    durationMinutes: "30"
  });

  const isAdmin = userEmail.toLowerCase() === adminEmail;

  const loadNetwork = useCallback(async () => {
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
      const profileRows = await safeSelect(supabase, "students", (table) =>
        supabase.from(table).select("full_name, email").eq("email", user.email ?? "").order("created_at", { ascending: false }).limit(1)
      );
      setStudentName(value(profileRows[0] ?? {}, ["full_name"], user.user_metadata?.full_name ?? user.email ?? "Student"));

      const [divisionRows, programRows, broadcastRows, libraryRows, submissionRows, aiRows, analyticsRows] = await Promise.all([
        safeSelect(supabase, "broadcast_network_divisions", (table) => supabase.from(table).select("*").order("display_order", { ascending: true })),
        safeSelect(supabase, "broadcast_programs", (table) => supabase.from(table).select("*").order("division_name", { ascending: true })),
        safeSelect(supabase, "tv_broadcasts", (table) => supabase.from(table).select("*").order("scheduled_at", { ascending: true }).limit(80)),
        safeSelect(supabase, "broadcast_media_library", (table) => supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100)),
        safeSelect(supabase, "broadcast_student_submissions", (table) => supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100)),
        safeSelect(supabase, "broadcast_ai_media_assets", (table) => supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100)),
        safeSelect(supabase, "broadcast_analytics", (table) => supabase.from(table).select("*").order("recorded_at", { ascending: false }).limit(100))
      ]);

      setDivisions(divisionRows);
      setPrograms(programRows);
      setBroadcasts(broadcastRows);
      setLibrary(libraryRows);
      setSubmissions(submissionRows);
      setAiAssets(aiRows);
      setAnalytics(analyticsRows);
      setMessage("AFF Global Broadcasting Network synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the broadcast network migration to enable this division.");
    } finally {
    }
  }, [router]);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  const metrics = useMemo(() => {
    const views = analytics.reduce((total, row) => total + numberValue(row, ["views"]), 0);
    const watchTime = analytics.reduce((total, row) => total + numberValue(row, ["watch_time_minutes"]), 0);
    const subscribers = analytics.reduce((total, row) => total + numberValue(row, ["subscribers"]), 0);
    const engagement = analytics.length ? Math.round(analytics.reduce((total, row) => total + numberValue(row, ["engagement_score"]), 0) / analytics.length) : 0;
    return { views, watchTime, subscribers, engagement };
  }, [analytics]);

  const activePrograms = programs.filter((program) => value(program, ["division_name"]) === activeDivision);
  const activeLibrary = library.filter((item) => value(item, ["division_name"]) === activeDivision);
  async function submitStudentMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting student media project...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("broadcast_student_submissions").insert({
        student_id: studentId,
        student_name: studentName,
        submission_type: submissionForm.submissionType,
        title: submissionForm.title,
        description: submissionForm.description,
        media_url: submissionForm.mediaUrl,
        review_status: "Submitted"
      });
      if (error) throw error;
      setSubmissionForm({ submissionType: "Project Upload", title: "", description: "", mediaUrl: "" });
      setMessage("Student media submission sent to the Broadcast Network review queue.");
      await loadNetwork();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit student media project.");
    }
  }

  async function saveMediaAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving media library asset...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("broadcast_media_library").insert({
        media_title: mediaForm.mediaTitle,
        media_type: mediaForm.mediaType,
        division_name: mediaForm.divisionName,
        program_name: mediaForm.programName,
        media_url: mediaForm.mediaUrl,
        duration_minutes: Number(mediaForm.durationMinutes) || 0,
        access_level: "Members",
        archive_status: "Published"
      });
      if (error) throw error;
      setMediaForm((current) => ({ ...current, mediaTitle: "", mediaUrl: "" }));
      setMessage("Media library asset saved.");
      await loadNetwork();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save media asset.");
    }
  }

  async function generateAiMediaAsset(assetType: string) {
    setMessage("Generating AI media assistant asset...");
    try {
      const supabase = createClient();
      const title = `${assetType}: ${activeDivision}`;
      const content = `${assetType} generated for ${activeDivision}. Include AFF positioning, episode purpose, student learning value, audience call-to-action, and professional navy-gold institutional presentation.`;
      const { error } = await supabase.from("broadcast_ai_media_assets").insert({
        student_id: studentId,
        asset_type: assetType,
        title,
        content,
        created_by: "AFF AI Media Assistant"
      });
      if (error) throw error;
      setMessage(`${assetType} generated by AI Media Assistant.`);
      await loadNetwork();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate AI media asset.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Global Broadcasting Network"
        title="A professional media network for academy broadcasts, public programs, student media, and on-demand archives."
        text="Manage AFF TV Studio, Community Awareness TV, Destiny Alignment TV, Financial Future Network, Student Media Center, media archives, AI show assets, and broadcast analytics."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <section className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-xs uppercase tracking-[.18em] text-gold-300">{studentName} · Broadcast access desk</p>
            </div>
            <Link href="/tv-studio" className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 text-sm font-semibold text-gold-300">
              <Tv size={18} /> Open AFF TV Studio
            </Link>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Video size={22} />} label="Views" value={String(metrics.views)} />
            <Metric icon={<Clapperboard size={22} />} label="Watch Time" value={`${metrics.watchTime} min`} />
            <Metric icon={<Users size={22} />} label="Subscribers" value={String(metrics.subscribers)} />
            <Metric icon={<BarChart3 size={22} />} label="Engagement" value={`${metrics.engagement}%`} />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {divisions.map((division) => (
              <button
                key={value(division, ["id", "division_name"])}
                type="button"
                onClick={() => setActiveDivision(value(division, ["division_name"]))}
                className={`terminal-panel p-5 text-left transition ${activeDivision === value(division, ["division_name"]) ? "border-gold-300 bg-gold-500/10" : "hover:border-gold-400/60"}`}
              >
                <Radio className="text-gold-300" size={24} />
                <h2 className="mt-4 text-lg font-semibold text-white">{value(division, ["division_name"])}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/68">{value(division, ["description"])}</p>
              </button>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
            <Panel title={`${activeDivision} Programs`} icon={<CalendarDays size={22} />}>
              <div className="grid gap-3">
                {activePrograms.length === 0 ? <p className="text-sm text-ink/68">No programs found for this division yet.</p> : null}
                {activePrograms.map((program) => (
                  <article key={value(program, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(program, ["program_type"])}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(program, ["program_name"])}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{value(program, ["description"])}</p>
                    <p className="mt-2 text-xs text-gold-300">Host: {value(program, ["host_name"], "Dr. Jean Rene Moricette")}</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="AFF TV Studio Production Controls" icon={<Tv size={22} />}>
              <div className="grid gap-3 md:grid-cols-2">
                <Feature title="Live Streaming" body={`${broadcasts.filter((row) => value(row, ["status"]) === "Live").length} live broadcasts configured`} />
                <Feature title="Program Scheduling" body={`${broadcasts.filter((row) => value(row, ["status"]) === "Scheduled").length} scheduled programs`} />
                <Feature title="On-Demand Episodes" body={`${library.filter((row) => ["Video", "Course", "Broadcast Archive"].includes(value(row, ["media_type"]))).length} library assets`} />
                <Feature title="Host Management" body={`${new Set(programs.map((row) => value(row, ["host_name"]))).size} hosts and production leads`} />
                <Feature title="Guest Management" body="Guest workflow prepared through Student Media Center submissions and admin review." />
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Media Library" icon={<Library size={22} />}>
              <div className="grid gap-3">
                {activeLibrary.length === 0 ? <p className="text-sm text-ink/68">No media assets in this division yet.</p> : null}
                {activeLibrary.map((item) => (
                  <article key={value(item, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(item, ["media_type"])} · {value(item, ["access_level"])}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(item, ["media_title"])}</h3>
                    <p className="mt-2 text-sm text-ink/68">{value(item, ["program_name"], activeDivision)} · {value(item, ["duration_minutes"], "0")} min</p>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel title="Student Media Center" icon={<Upload size={22} />}>
              <form className="grid gap-3" onSubmit={submitStudentMedia}>
                <select className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none" value={submissionForm.submissionType} onChange={(event) => setSubmissionForm((current) => ({ ...current, submissionType: event.target.value }))}>
                  {submissionTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
                <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none" placeholder="Project, broadcast, report, or interview title" value={submissionForm.title} onChange={(event) => setSubmissionForm((current) => ({ ...current, title: event.target.value }))} required />
                <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none" placeholder="Media URL" value={submissionForm.mediaUrl} onChange={(event) => setSubmissionForm((current) => ({ ...current, mediaUrl: event.target.value }))} />
                <textarea className="min-h-24 border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none" placeholder="Description" value={submissionForm.description} onChange={(event) => setSubmissionForm((current) => ({ ...current, description: event.target.value }))} />
                <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">Submit Student Media</button>
              </form>
              <div className="mt-5 grid gap-3">
                {submissions.slice(0, 4).map((submission) => (
                  <div key={value(submission, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="font-semibold text-white">{value(submission, ["title"])}</p>
                    <p className="mt-1 text-xs uppercase tracking-[.16em] text-gold-300">{value(submission, ["submission_type"])} · {value(submission, ["review_status"])}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="AI Media Assistant" icon={<Bot size={22} />}>
              <button className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => generateAiMediaAsset("Episode Summary")}>Generate Episode Summary</button>
              <button className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => generateAiMediaAsset("Show Notes")}>Generate Show Notes</button>
              <button className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => generateAiMediaAsset("Title Ideas")}>Generate Titles</button>
              <button className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => generateAiMediaAsset("Social Media Clips")}>Generate Social Clips</button>
            </Panel>
            <Panel title="Generated Media Assets" icon={<FileText size={22} />}>
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
          </section>

          <Panel title="Broadcast Analytics" icon={<BarChart3 size={22} />}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {analytics.map((row) => (
                <article key={value(row, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(row, ["division_name"])}</p>
                  <h3 className="mt-2 font-semibold text-white">{value(row, ["program_name"])}</h3>
                  <p className="mt-2 text-sm text-ink/68">{value(row, ["views"], "0")} views · {value(row, ["watch_time_minutes"], "0")} min</p>
                  <p className="mt-1 text-sm text-ink/68">{value(row, ["subscribers"], "0")} subscribers · {value(row, ["engagement_score"], "0")}% engagement</p>
                </article>
              ))}
            </div>
          </Panel>

          {isAdmin ? (
            <Panel title="Broadcast Admin Controls" icon={<UserCog size={22} />}>
              <form className="grid gap-3 bg-navy-950 p-4 lg:grid-cols-2" onSubmit={saveMediaAsset}>
                <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" placeholder="Media title" value={mediaForm.mediaTitle} onChange={(event) => setMediaForm((current) => ({ ...current, mediaTitle: event.target.value }))} required />
                <select className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={mediaForm.mediaType} onChange={(event) => setMediaForm((current) => ({ ...current, mediaType: event.target.value }))}>
                  {mediaTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
                <select className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={mediaForm.divisionName} onChange={(event) => setMediaForm((current) => ({ ...current, divisionName: event.target.value }))}>
                  {divisions.map((division) => <option key={value(division, ["division_name"])}>{value(division, ["division_name"])}</option>)}
                </select>
                <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" placeholder="Program name" value={mediaForm.programName} onChange={(event) => setMediaForm((current) => ({ ...current, programName: event.target.value }))} />
                <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" placeholder="Media URL" value={mediaForm.mediaUrl} onChange={(event) => setMediaForm((current) => ({ ...current, mediaUrl: event.target.value }))} />
                <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" placeholder="Duration minutes" value={mediaForm.durationMinutes} onChange={(event) => setMediaForm((current) => ({ ...current, durationMinutes: event.target.value }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 lg:col-span-2" type="submit">
                  <Save size={18} /> Save Media Asset
                </button>
              </form>
            </Panel>
          ) : null}
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

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/68">{body}</p>
    </div>
  );
}
