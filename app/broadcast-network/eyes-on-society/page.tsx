"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bot, FileText, Library, MessageSquare, Mic, PlayCircle, Radio, Search, Tv, Users, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const divisionName = "Eyes on Society TV";
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

const features = [
  "Episode Library",
  "Featured Interviews",
  "Expert Panels",
  "Community Reports",
  "Documentary Series",
  "Student Journalism Projects",
  "Live Town Hall Events",
  "Viewer Questions & Responses"
];

const aiActions = ["Episode summaries", "Interview transcripts", "Social media clips", "Topic recommendations", "Research briefs"];

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
  const [message, setMessage] = useState("Loading Eyes on Society TV...");
  const [programs, setPrograms] = useState<DbRow[]>([]);
  const [library, setLibrary] = useState<DbRow[]>([]);
  const [aiAssets, setAiAssets] = useState<DbRow[]>([]);
  const [analytics, setAnalytics] = useState<DbRow[]>([]);
  const [activeCategory, setActiveCategory] = useState("Education & Literacy");

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

      const [programRows, libraryRows, aiRows, analyticsRows] = await Promise.all([
        safeSelect(supabase, "broadcast_programs", (table) => supabase.from(table).select("*").eq("division_name", divisionName).order("program_name", { ascending: true })),
        safeSelect(supabase, "broadcast_media_library", (table) => supabase.from(table).select("*").eq("division_name", divisionName).order("created_at", { ascending: false })),
        safeSelect(supabase, "broadcast_ai_media_assets", (table) => supabase.from(table).select("*").ilike("title", "%Eyes on Society%").order("created_at", { ascending: false })),
        safeSelect(supabase, "broadcast_analytics", (table) => supabase.from(table).select("*").eq("division_name", divisionName).order("recorded_at", { ascending: false }))
      ]);

      setPrograms(programRows);
      setLibrary(libraryRows);
      setAiAssets(aiRows);
      setAnalytics(analyticsRows);
      setMessage("Eyes on Society TV synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the broadcast network migration to enable Eyes on Society TV.");
    }
  }, [router]);

  useEffect(() => {
    loadDivision();
  }, [loadDivision]);

  const metrics = useMemo(() => {
    const views = analytics.reduce((total, row) => total + numberValue(row, ["views"]), 0);
    const watchTime = analytics.reduce((total, row) => total + numberValue(row, ["watch_time_minutes"]), 0);
    const subscribers = analytics.reduce((total, row) => total + numberValue(row, ["subscribers"]), 0);
    const engagement = analytics.length ? Math.round(analytics.reduce((total, row) => total + numberValue(row, ["engagement_score"]), 0) / analytics.length) : 0;
    return { views, watchTime, subscribers, engagement };
  }, [analytics]);

  const activePrograms = programs.filter((program) => value(program, ["program_name"]) === activeCategory);
  const activeMedia = library.filter((item) => value(item, ["program_name"]) === activeCategory);

  async function generateAsset(assetType: string) {
    setMessage(`Generating ${assetType.toLowerCase()}...`);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("broadcast_ai_media_assets").insert({
        asset_type: assetType === "Interview transcripts" ? "Show Notes" : assetType === "Topic recommendations" ? "Title Ideas" : assetType === "Research briefs" ? "Show Notes" : assetType === "Social media clips" ? "Social Media Clips" : "Episode Summary",
        title: `Eyes on Society ${assetType}: ${activeCategory}`,
        content: `AI-generated ${assetType.toLowerCase()} for ${activeCategory}. Frame the social issue, key ideas, community implications, viewer questions, research references, and responsible action steps.`,
        created_by: "AFF AI Media Assistant"
      });
      if (error) throw error;
      setMessage(`${assetType} generated.`);
      await loadDivision();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to generate ${assetType}.`);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Eyes on Society TV"
        title="Exploring the issues, ideas, challenges, and opportunities shaping modern society."
        text="A dedicated AFF broadcast division hosted by Dr. Jean R. Moricette with programs on education, economy, leadership, community, technology, culture, youth, finance, public policy, and social responsibility."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <section className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-xs uppercase tracking-[.18em] text-gold-300">Host Profile: Dr. Jean R. Moricette</p>
            </div>
            <Link href="/broadcast-network" className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 text-sm font-semibold text-gold-300">
              <Tv size={18} /> Broadcast Network
            </Link>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Video size={22} />} label="Views" value={String(metrics.views)} />
            <Metric icon={<BarChart3 size={22} />} label="Audience Engagement" value={`${metrics.engagement}%`} />
            <Metric icon={<PlayCircle size={22} />} label="Watch Time" value={`${metrics.watchTime} min`} />
            <Metric icon={<Users size={22} />} label="Subscriber Growth" value={String(metrics.subscribers)} />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`terminal-panel p-4 text-left text-sm font-semibold transition ${activeCategory === category ? "border-gold-300 bg-gold-500/10 text-white" : "text-ink/76 hover:border-gold-400/60"}`}>
                {category}
              </button>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
            <Panel title={`${activeCategory} Programming`} icon={<Radio size={22} />}>
              {activePrograms.length === 0 ? <p className="text-sm text-ink/68">Program record pending. Run the updated broadcast migration to seed this category.</p> : null}
              {activePrograms.map((program) => (
                <article key={value(program, ["id"])} className="border border-gold-500/18 bg-navy-950 p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(program, ["program_type"])}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{value(program, ["program_name"])}</h3>
                  <p className="mt-2 leading-7 text-ink/70">{value(program, ["description"])}</p>
                </article>
              ))}
            </Panel>

            <Panel title="Division Features" icon={<MessageSquare size={22} />}>
              <div className="grid gap-3 md:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="font-semibold text-white">{feature}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Media Assets" icon={<Library size={22} />}>
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

            <Panel title="Media Asset Index" icon={<FileText size={22} />}>
              <div className="grid gap-3 md:grid-cols-2">
                {["Episode Archive", "Video Library", "Podcast Versions", "Downloadable Show Notes", "Research References"].map((asset) => (
                  <div key={asset} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="font-semibold text-white">{asset}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="AI Media Assistant" icon={<Bot size={22} />}>
              {aiActions.map((action) => (
                <button key={action} className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => generateAsset(action)}>
                  Generate {action}
                </button>
              ))}
            </Panel>
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
          </section>

          <Panel title="Featured Interviews, Expert Panels, Reports, and Town Halls" icon={<Mic size={22} />}>
            <div className="grid gap-3 md:grid-cols-4">
              {["Featured Interviews", "Expert Panels", "Community Reports", "Live Town Hall Events"].map((item) => (
                <div key={item} className="border border-gold-500/18 bg-navy-950 p-4">
                  <p className="font-semibold text-white">{item}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">Designed for viewer questions, informed responses, and public dialogue.</p>
                </div>
              ))}
            </div>
          </Panel>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
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
