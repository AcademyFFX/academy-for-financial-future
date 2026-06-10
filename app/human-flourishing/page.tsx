"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpenText,
  CalendarDays,
  Globe2,
  GraduationCap,
  HandHeart,
  Handshake,
  HeartPulse,
  Landmark,
  Library,
  LineChart,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Sprout,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const initialCampaign = {
  campaignName: "",
  campaignRegion: "",
  focusArea: "Peace Education",
  serviceGoal: "",
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

export default function HumanFlourishingPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Global Citizen");
  const [studentEmail, setStudentEmail] = useState("");
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [form, setForm] = useState(initialCampaign);
  const [message, setMessage] = useState("Loading Global Peace, Prosperity and Human Flourishing Institute...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadInstitute = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/human-flourishing");
        return;
      }

      const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "AFF Global Citizen";
      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");

      const [programsResult, peaceResult, prosperityResult, tracksResult, fellowshipsResult, campaignsResult, reportsResult, impactResult] = await Promise.all([
        supabase.from("flourishing_programs").select("*").order("program_category", { ascending: true }).limit(100),
        supabase.from("peace_initiatives").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("prosperity_projects").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("human_development_tracks").select("*").order("track_name", { ascending: true }).limit(100),
        supabase.from("leadership_fellowships").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("global_service_campaigns").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("flourishing_reports").select("*").order("published_at", { ascending: false }).limit(100),
        supabase.from("flourishing_impact_metrics").select("*").order("reporting_period", { ascending: false }).limit(100)
      ]);

      if (programsResult.error) throw programsResult.error;
      if (peaceResult.error) throw peaceResult.error;
      if (campaignsResult.error) throw campaignsResult.error;

      setTables({
        programs: (programsResult.data ?? []) as DbRow[],
        peace: (peaceResult.data ?? []) as DbRow[],
        prosperity: (prosperityResult.data ?? []) as DbRow[],
        tracks: (tracksResult.data ?? []) as DbRow[],
        fellowships: (fellowshipsResult.data ?? []) as DbRow[],
        campaigns: (campaignsResult.data ?? []) as DbRow[],
        reports: (reportsResult.data ?? []) as DbRow[],
        impact: (impactResult.data ?? []) as DbRow[]
      });
      setMessage("Human Flourishing Institute synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Human Flourishing migration to enable institute records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadInstitute();
  }, [loadInstitute]);

  const analytics = useMemo(() => {
    const impact = tables.impact ?? [];
    return {
      programs: (tables.programs ?? []).length,
      peace: (tables.peace ?? []).length,
      prosperity: (tables.prosperity ?? []).length,
      tracks: (tables.tracks ?? []).length,
      fellowships: (tables.fellowships ?? []).length,
      campaigns: (tables.campaigns ?? []).length,
      reports: (tables.reports ?? []).length,
      beneficiaries: impact.reduce((total, row) => total + numberValue(row, ["beneficiaries_count"]), 0),
      wellBeingScore: impact.length ? Math.round(impact.reduce((total, row) => total + numberValue(row, ["wellbeing_score"]), 0) / impact.length) : 0
    };
  }, [tables]);

  async function submitCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting global service campaign...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("global_service_campaigns").insert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        campaign_name: form.campaignName.trim(),
        campaign_region: form.campaignRegion.trim(),
        focus_area: form.focusArea,
        service_goal: form.serviceGoal.trim(),
        notes: form.notes.trim() || null,
        campaign_status: "Submitted"
      }).select("*").single();
      if (error) throw error;
      setTables((current) => ({ ...current, campaigns: [data as DbRow, ...(current.campaigns ?? [])] }));
      setForm(initialCampaign);
      setMessage("Global service campaign submitted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit campaign."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Global Peace, Prosperity and Human Flourishing Institute"
        title="Institutional center for peace education, prosperity initiatives, moral responsibility, and human development."
        text="Coordinate peace education, prosperity projects, human development curriculum, moral responsibility research, well-being projects, international partnerships, fellowships, reports, service campaigns, and impact measurement."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Flourishing Operations</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadInstitute}>
              <RefreshCw size={16} /> Refresh Institute
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<HeartPulse size={22} />} label="Well-Being Score" value={`${analytics.wellBeingScore}`} detail={`${analytics.beneficiaries} beneficiaries tracked`} />
            <Metric icon={<Sprout size={22} />} label="Flourishing Programs" value={String(analytics.programs)} detail={`${analytics.tracks} human development tracks`} />
            <Metric icon={<Handshake size={22} />} label="Peace and Prosperity" value={String(analytics.peace + analytics.prosperity)} detail="initiatives and projects" />
            <Metric icon={<Award size={22} />} label="Fellowships" value={String(analytics.fellowships)} detail={`${analytics.campaigns} service campaigns`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Peace Education and Prosperity Initiatives" icon={<HandHeart size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                <RecordList rows={tables.programs ?? []} empty="No flourishing programs found." primary={["program_name"]} secondary={["program_category", "program_status", "enrolled_count"]} />
                <RecordList rows={tables.peace ?? []} empty="No peace initiatives found." primary={["initiative_name"]} secondary={["region", "initiative_status", "participants_count"]} />
              </div>
            </Panel>

            <Panel title="Global Service Campaigns" icon={<Globe2 size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitCampaign}>
                <Input label="Campaign name" value={form.campaignName} onChange={(next) => setForm((current) => ({ ...current, campaignName: next }))} required />
                <Input label="Campaign region" value={form.campaignRegion} onChange={(next) => setForm((current) => ({ ...current, campaignRegion: next }))} required />
                <Input label="Focus area" value={form.focusArea} onChange={(next) => setForm((current) => ({ ...current, focusArea: next }))} />
                <Textarea label="Service goal" value={form.serviceGoal} onChange={(next) => setForm((current) => ({ ...current, serviceGoal: next }))} />
                <Textarea label="Notes" value={form.notes} onChange={(next) => setForm((current) => ({ ...current, notes: next }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Submit Campaign
                </button>
              </form>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Human Development Curriculum" icon={<GraduationCap size={22} />}>
              <RecordList rows={tables.tracks ?? []} empty="No human development tracks found." primary={["track_name"]} secondary={["track_level", "track_status", "modules_count"]} />
            </Panel>
            <Panel title="Moral Responsibility Research" icon={<Library size={22} />}>
              <RecordList rows={tables.reports ?? []} empty="No flourishing reports found." primary={["report_title"]} secondary={["report_category", "published_at", "report_status"]} />
            </Panel>
            <Panel title="Leadership Fellowships" icon={<Users size={22} />}>
              <RecordList rows={tables.fellowships ?? []} empty="No leadership fellowships found." primary={["fellowship_name"]} secondary={["region", "fellowship_status", "fellows_count"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="Impact Measurement Dashboard" icon={<BarChart3 size={22} />}>
              <StatLine label="Beneficiaries" value={String(analytics.beneficiaries)} />
              <StatLine label="Well-Being Score" value={String(analytics.wellBeingScore)} />
              <StatLine label="Reports" value={String(analytics.reports)} />
              <StatLine label="Campaigns" value={String(analytics.campaigns)} />
              <StatLine label="Fellowships" value={String(analytics.fellowships)} />
            </Panel>
            <Panel title="Connected AFF Institutions" icon={<LineChart size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-3">
                <LinkCard href="/digital-civilization" label="Digital Civilization" icon={<Sprout size={20} />} />
                <LinkCard href="/civic-leadership" label="Civic Leadership" icon={<Scale size={20} />} />
                <LinkCard href="/foundation" label="Foundation" icon={<HandHeart size={20} />} />
                <LinkCard href="/research-institute" label="Research Institute" icon={<BookOpenText size={20} />} />
                <LinkCard href="/events" label="Events" icon={<CalendarDays size={20} />} />
                <LinkCard href="/global-network" label="Global Network" icon={<Globe2 size={20} />} />
                <LinkCard href="/university" label="University" icon={<GraduationCap size={20} />} />
                <LinkCard href="/endowment-fund" label="Endowment Fund" icon={<Landmark size={20} />} />
                <LinkCard href="/executive-command-center" label="Executive Command" icon={<BarChart3 size={20} />} />
              </div>
            </Panel>
          </section>

          <Panel title="Community Well-Being and Prosperity Projects" icon={<ShieldCheck size={22} />}>
            <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
              <RecordList rows={tables.prosperity ?? []} empty="No prosperity projects found." primary={["project_name"]} secondary={["region", "project_status", "beneficiaries_count"]} />
              <RecordList rows={tables.campaigns ?? []} empty="No service campaigns found." primary={["campaign_name"]} secondary={["campaign_region", "focus_area", "campaign_status"]} />
            </div>
          </Panel>

          {loading ? <p className="text-sm text-ink/60">Loading institute records...</p> : null}
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
          <p className="font-semibold text-white">{value(row, primary, "Flourishing record")}</p>
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
