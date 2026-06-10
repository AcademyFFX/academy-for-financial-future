"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpenText,
  Building2,
  CalendarDays,
  Globe2,
  GraduationCap,
  HandHeart,
  Library,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Sprout,
  Tv,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const ranks = ["Bronze Citizen", "Silver Citizen", "Gold Citizen", "Platinum Citizen", "Distinguished Global Citizen"];
const initialProject = {
  projectTitle: "",
  pillarName: "Financial Literacy",
  communityRegion: "",
  impactGoal: "",
  notes: ""
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

function rankFromScore(score: number) {
  if (score >= 900) return "Distinguished Global Citizen";
  if (score >= 700) return "Platinum Citizen";
  if (score >= 500) return "Gold Citizen";
  if (score >= 250) return "Silver Citizen";
  return "Bronze Citizen";
}

export default function DigitalCivilizationPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Citizen");
  const [studentEmail, setStudentEmail] = useState("");
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [form, setForm] = useState(initialProject);
  const [message, setMessage] = useState("Loading AFF Digital Civilization...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadCivilization = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/digital-civilization");
        return;
      }

      const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "AFF Citizen";
      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");

      const [pillarsResult, indexResult, citizenshipResult, projectsResult, forumsResult, libraryResult, leadershipResult, impactResult] = await Promise.all([
        supabase.from("civilization_pillars").select("*").order("display_order", { ascending: true }).limit(50),
        supabase.from("civilization_index_scores").select("*").eq("student_id", user.id).order("updated_at", { ascending: false }).limit(1),
        supabase.from("global_citizenship_records").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("community_projects").select("*").order("created_at", { ascending: false }).limit(80),
        supabase.from("public_policy_forums").select("*").order("scheduled_at", { ascending: true }).limit(80),
        supabase.from("civilization_library").select("*").order("published_at", { ascending: false }).limit(80),
        supabase.from("global_leadership_programs").select("*").order("program_name", { ascending: true }).limit(80),
        supabase.from("civilization_impact_metrics").select("*").order("reporting_period", { ascending: false }).limit(80)
      ]);

      if (pillarsResult.error) throw pillarsResult.error;
      if (indexResult.error) throw indexResult.error;
      if (projectsResult.error) throw projectsResult.error;

      setTables({
        pillars: (pillarsResult.data ?? []) as DbRow[],
        index: (indexResult.data ?? []) as DbRow[],
        citizenship: (citizenshipResult.data ?? []) as DbRow[],
        projects: (projectsResult.data ?? []) as DbRow[],
        forums: (forumsResult.data ?? []) as DbRow[],
        library: (libraryResult.data ?? []) as DbRow[],
        leadership: (leadershipResult.data ?? []) as DbRow[],
        impact: (impactResult.data ?? []) as DbRow[]
      });
      setMessage("AFF Digital Civilization synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Digital Civilization migration to enable civilization records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCivilization();
  }, [loadCivilization]);

  const analytics = useMemo(() => {
    const index = (tables.index ?? [])[0] ?? {};
    const score = numberValue(index, ["index_score"], 0);
    const impact = tables.impact ?? [];
    return {
      pillars: (tables.pillars ?? []).length,
      score,
      rank: value(index, ["citizen_rank"], rankFromScore(score)),
      projects: (tables.projects ?? []).length,
      beneficiaries: impact.reduce((total, row) => total + numberValue(row, ["beneficiaries_count"]), 0),
      forums: (tables.forums ?? []).length,
      library: (tables.library ?? []).length,
      leadership: (tables.leadership ?? []).length
    };
  }, [tables]);

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting community transformation project...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("community_projects").insert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        project_title: form.projectTitle.trim(),
        pillar_name: form.pillarName,
        community_region: form.communityRegion.trim(),
        impact_goal: form.impactGoal.trim(),
        notes: form.notes.trim() || null,
        project_status: "Submitted"
      }).select("*").single();

      if (error) throw error;
      setTables((current) => ({ ...current, projects: [data as DbRow, ...(current.projects ?? [])] }));
      setForm(initialProject);
      setMessage("Community transformation project submitted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit project."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Digital Civilization"
        title="A civic, moral, financial, and human development operating layer for global impact."
        text="Track the five civilization pillars, AFF Civilization Index, global citizenship rank, community projects, public policy forums, awareness media, leadership programs, library resources, and social impact metrics."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Civilization Command</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadCivilization}>
              <RefreshCw size={16} /> Refresh Civilization
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Globe2 size={22} />} label="Civilization Index" value={String(analytics.score)} detail={analytics.rank} />
            <Metric icon={<Scale size={22} />} label="Five Pillars" value={String(analytics.pillars)} detail="financial, economic, civic, moral, human" />
            <Metric icon={<Sprout size={22} />} label="Community Projects" value={String(analytics.projects)} detail={`${analytics.beneficiaries} beneficiaries tracked`} />
            <Metric icon={<Award size={22} />} label="Leadership Academy" value={String(analytics.leadership)} detail={`${analytics.forums} policy forums`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Five Civilization Pillars" icon={<Building2 size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                {(tables.pillars ?? []).map((pillar) => (
                  <div key={value(pillar, ["id"])} className="bg-navy-950 p-5">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(pillar, ["pillar_status"], "Active")}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{value(pillar, ["pillar_name"])}</h3>
                    <p className="mt-3 text-sm leading-7 text-ink/70">{value(pillar, ["description"])}</p>
                  </div>
                ))}
                {!loading && (tables.pillars ?? []).length === 0 ? <p className="bg-navy-950 p-5 text-sm text-ink/68">Run the migration to seed the civilization pillars.</p> : null}
              </div>
            </Panel>

            <Panel title="Student Citizen Ranks" icon={<ShieldCheck size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {ranks.map((rank) => (
                  <div key={rank} className={`flex items-center justify-between gap-4 p-4 ${analytics.rank === rank ? "bg-gold-500 text-navy-950" : "bg-navy-950 text-ink/72"}`}>
                    <span className="font-semibold">{rank}</span>
                    <span className="text-sm">{analytics.rank === rank ? "Current" : "Pathway"}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Community Transformation Projects" icon={<HandHeart size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitProject}>
                <Input label="Project title" value={form.projectTitle} onChange={(next) => setForm((current) => ({ ...current, projectTitle: next }))} required />
                <Input label="Pillar" value={form.pillarName} onChange={(next) => setForm((current) => ({ ...current, pillarName: next }))} />
                <Input label="Community region" value={form.communityRegion} onChange={(next) => setForm((current) => ({ ...current, communityRegion: next }))} required />
                <Textarea label="Impact goal" value={form.impactGoal} onChange={(next) => setForm((current) => ({ ...current, impactGoal: next }))} />
                <Textarea label="Notes" value={form.notes} onChange={(next) => setForm((current) => ({ ...current, notes: next }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Submit Project
                </button>
              </form>
              <RecordList rows={tables.projects ?? []} empty="No transformation projects yet." primary={["project_title"]} secondary={["pillar_name", "community_region", "project_status"]} />
            </Panel>

            <Panel title="Public Policy Forum" icon={<MessageSquare size={22} />}>
              <RecordList rows={tables.forums ?? []} empty="No public policy forums scheduled." primary={["forum_title"]} secondary={["policy_area", "priority_level", "scheduled_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Community Awareness Media Network" icon={<Tv size={22} />}>
              <RecordList rows={(tables.library ?? []).filter((row) => value(row, ["resource_type"]) === "Media")} empty="No awareness media records." primary={["title"]} secondary={["pillar_name", "resource_status"]} />
            </Panel>
            <Panel title="Civilization Library" icon={<Library size={22} />}>
              <RecordList rows={tables.library ?? []} empty="No civilization library resources." primary={["title"]} secondary={["pillar_name", "resource_type", "resource_status"]} />
            </Panel>
            <Panel title="Global Leadership Academy" icon={<GraduationCap size={22} />}>
              <RecordList rows={tables.leadership ?? []} empty="No leadership programs found." primary={["program_name"]} secondary={["pillar_name", "program_status", "enrolled_count"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="Social Impact Dashboard" icon={<BarChart3 size={22} />}>
              <StatLine label="Beneficiaries" value={String(analytics.beneficiaries)} />
              <StatLine label="Library Resources" value={String(analytics.library)} />
              <StatLine label="Policy Forums" value={String(analytics.forums)} />
              <StatLine label="Leadership Programs" value={String(analytics.leadership)} />
              <StatLine label="Current Citizen Rank" value={analytics.rank} />
            </Panel>
            <Panel title="Connected Civilization Systems" icon={<Megaphone size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-3">
                <LinkCard href="/civic-leadership" label="Civic Leadership" icon={<Scale size={20} />} />
                <LinkCard href="/research-institute" label="Research Institute" icon={<BookOpenText size={20} />} />
                <LinkCard href="/tv-studio" label="TV Studio" icon={<Tv size={20} />} />
                <LinkCard href="/foundation" label="Foundation" icon={<HandHeart size={20} />} />
                <LinkCard href="/events" label="Events" icon={<CalendarDays size={20} />} />
                <LinkCard href="/university" label="University" icon={<GraduationCap size={20} />} />
                <LinkCard href="/global-network" label="Global Network" icon={<Globe2 size={20} />} />
                <LinkCard href="/executive-command-center" label="Executive Command" icon={<BarChart3 size={20} />} />
              </div>
            </Panel>
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5 shadow-gold">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-5 text-sm uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 font-serif text-4xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm text-ink/64">{detail}</p>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-gold-500/20 p-5">
        <div className="flex items-center gap-3">
          <span className="text-gold-300">{icon}</span>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatLine({ label, value: text }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="text-right font-semibold text-white">{text}</span>
    </div>
  );
}

function Input({ label, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <input {...props} className="border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value: text, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <textarea className="min-h-24 border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" value={text} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function RecordList({ rows, empty, primary, secondary }: { rows: DbRow[]; empty: string; primary: string[]; secondary: string[] }) {
  if (rows.length === 0) return <p className="bg-navy-950 p-5 text-sm text-ink/68">{empty}</p>;

  return (
    <div className="grid gap-px bg-gold-500/14">
      {rows.slice(0, 8).map((row, index) => (
        <div key={value(row, ["id"], String(index))} className="bg-navy-950 p-4">
          <p className="font-semibold text-white">{value(row, primary, "Civilization record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/64">{secondary.map((key) => value(row, [key])).filter(Boolean).join(" | ")}</p>
        </div>
      ))}
    </div>
  );
}

function LinkCard({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link className="bg-navy-950 p-5 transition hover:bg-navy-900" href={href}>
      <div className="text-gold-300">{icon}</div>
      <p className="mt-3 font-semibold text-white">{label}</p>
    </Link>
  );
}
