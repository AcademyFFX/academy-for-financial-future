"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  BookOpenText,
  Building2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HandHeart,
  Landmark,
  Library,
  MessageSquare,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sprout,
  Target,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const divisions = [
  {
    title: "Constitutional Studies Division",
    icon: ShieldCheck,
    items: ["Constitutional literacy courses", "Constitutional history", "Rights and responsibilities", "Comparative constitutions", "Civic participation modules"]
  },
  {
    title: "Public Leadership Division",
    icon: Users,
    items: ["Ethical leadership training", "Decision-making simulations", "Public speaking programs", "Crisis leadership", "Community leadership"]
  },
  {
    title: "Economic Governance Division",
    icon: Landmark,
    items: ["Fiscal policy", "Monetary policy", "Public budgeting", "Economic development", "Infrastructure planning"]
  },
  {
    title: "Public Administration Division",
    icon: Building2,
    items: ["Government management", "Public sector operations", "Policy implementation", "Public accountability", "Regulatory systems"]
  }
];

const simulationModules = ["Legislative simulations", "Public policy simulations", "Constitutional case studies", "Economic crisis simulations", "Leadership response exercises"];

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

export default function GovernanceSchoolPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("AFF Public Leader");
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [message, setMessage] = useState("Loading AFF School of Governance, Public Leadership & Nation Building...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadSchool = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/governance-school");
        return;
      }

      const name =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
          ? user.user_metadata.name
          : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
            ? user.user_metadata.full_name
            : user.email?.split("@")[0] ?? "AFF Public Leader";
      setStudentName(name);

      const [coursesResult, programsResult, casesResult, projectsResult, serviceResult, certsResult, publicationsResult, metricsResult] = await Promise.all([
        supabase.from("constitutional_courses").select("*").order("display_order", { ascending: true }).limit(120),
        supabase.from("leadership_programs").select("*").order("program_type", { ascending: true }).limit(160),
        supabase.from("public_policy_cases").select("*").order("created_at", { ascending: false }).limit(160),
        supabase.from("nation_building_projects").select("*").order("created_at", { ascending: false }).limit(160),
        supabase.from("community_service_records").select("*").order("served_at", { ascending: false }).limit(200),
        supabase.from("leadership_certifications").select("*").order("issued_at", { ascending: false }).limit(200),
        supabase.from("civic_publications").select("*").order("published_at", { ascending: false }).limit(200),
        supabase.from("governance_metrics").select("*").order("reporting_period", { ascending: false }).limit(120)
      ]);

      if (coursesResult.error) throw coursesResult.error;
      if (programsResult.error) throw programsResult.error;

      setTables({
        courses: (coursesResult.data ?? []) as DbRow[],
        programs: (programsResult.data ?? []) as DbRow[],
        cases: (casesResult.data ?? []) as DbRow[],
        projects: (projectsResult.data ?? []) as DbRow[],
        service: (serviceResult.data ?? []) as DbRow[],
        certifications: (certsResult.data ?? []) as DbRow[],
        publications: (publicationsResult.data ?? []) as DbRow[],
        metrics: (metricsResult.data ?? []) as DbRow[]
      });
      setMessage("Governance, Public Leadership and Nation Building School synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Governance School migration to enable public leadership records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSchool();
  }, [loadSchool]);

  const analytics = useMemo(() => {
    const metrics = tables.metrics ?? [];
    const serviceHours = (tables.service ?? []).reduce((total, row) => total + numberValue(row, ["service_hours"]), 0);
    return {
      courses: (tables.courses ?? []).length,
      programs: (tables.programs ?? []).length,
      certifications: (tables.certifications ?? []).length,
      serviceHours,
      publications: (tables.publications ?? []).length,
      policyCases: (tables.cases ?? []).length,
      civicEngagement: metrics.length ? Math.round(metrics.reduce((total, row) => total + numberValue(row, ["civic_engagement_score"]), 0) / metrics.length) : 0,
      policyParticipation: metrics.reduce((total, row) => total + numberValue(row, ["public_policy_participation"]), 0)
    };
  }, [tables]);

  return (
    <>
      <PageHeader
        eyebrow="AFF School of Governance, Public Leadership & Nation Building"
        title="Ethical leadership, constitutional literacy, public administration, nation building, and civic responsibility."
        text="A protected academy division for civic formation, public leadership training, economic governance, policy simulations, nation-building projects, leadership certifications, publications, and executive impact analytics."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Governance Command Desk</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-sm text-ink/54">{loading ? "Loading governance school records..." : `${studentName} - public leadership pathway ready.`}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadSchool}>
              <RefreshCw size={16} /> Refresh School
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BookOpenCheck size={22} />} label="Constitutional Courses" value={String(analytics.courses)} detail="literacy, history, rights, comparative systems" />
            <Metric icon={<Award size={22} />} label="Leadership Certifications" value={String(analytics.certifications)} detail="civic, public, nation building, impact" />
            <Metric icon={<HandHeart size={22} />} label="Community Service" value={`${analytics.serviceHours}`} detail="service hours and civic responsibility records" />
            <Metric icon={<BarChart3 size={22} />} label="Civic Engagement" value={`${analytics.civicEngagement}/100`} detail={`${analytics.policyParticipation} policy participation records`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Core Governance Divisions" icon={<Scale size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                {divisions.map((division) => (
                  <div key={division.title} className="bg-navy-950 p-5">
                    <division.icon className="text-gold-300" size={22} />
                    <h3 className="mt-4 font-semibold text-white">{division.title}</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-ink/62">
                      {division.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Simulation Center" icon={<Target size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {simulationModules.map((item) => <StatusRow key={item} label={item} value="Scenario Ready" />)}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Constitutional Studies" icon={<Library size={22} />}>
              <RecordList rows={tables.courses ?? []} empty="No constitutional courses found." primary={["course_title"]} secondary={["course_level", "module_count", "course_status"]} />
            </Panel>
            <Panel title="Leadership Programs" icon={<Users size={22} />}>
              <RecordList rows={tables.programs ?? []} empty="No leadership programs found." primary={["program_name"]} secondary={["program_type", "training_format", "program_status"]} />
            </Panel>
            <Panel title="Public Policy Cases" icon={<ClipboardCheck size={22} />}>
              <RecordList rows={tables.cases ?? []} empty="No public policy cases found." primary={["case_title"]} secondary={["case_type", "simulation_type", "case_status", "created_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Nation Building Institute" icon={<Sprout size={22} />}>
              <RecordList rows={tables.projects ?? []} empty="No nation-building projects found." primary={["project_title"]} secondary={["project_type", "community_region", "impact_score", "project_status"]} />
            </Panel>
            <Panel title="Leadership Certifications" icon={<Award size={22} />}>
              <RecordList rows={tables.certifications ?? []} empty="No leadership certifications found." primary={["certification_title"]} secondary={["student_name", "certification_type", "certification_status", "issued_at"]} />
            </Panel>
            <Panel title="Publication Center" icon={<FileText size={22} />}>
              <RecordList rows={tables.publications ?? []} empty="No civic publications found." primary={["publication_title"]} secondary={["publication_type", "author_name", "publication_status", "published_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Community Service and Public Accountability" icon={<HandHeart size={22} />}>
              <RecordList rows={tables.service ?? []} empty="No community service records found." primary={["service_project"]} secondary={["student_name", "service_category", "service_hours", "served_at"]} />
            </Panel>
            <Panel title="Connected Civic Systems" icon={<Building2 size={22} />}>
              <div className="grid gap-3 p-5">
                <LinkButton href="/civic-leadership" label="Civic Leadership Institute" icon={<Scale size={18} />} />
                <LinkButton href="/university" label="University" icon={<GraduationCap size={18} />} />
                <LinkButton href="/publishing-house" label="Publishing House" icon={<BookOpenText size={18} />} />
                <LinkButton href="/research-institute" label="Research Institute" icon={<Library size={18} />} />
                <LinkButton href="/human-flourishing" label="Human Flourishing" icon={<HandHeart size={18} />} />
                <LinkButton href="/executive-command-center" label="Executive Command" icon={<BarChart3 size={18} />} />
              </div>
            </Panel>
          </section>

          <Panel title="Executive Analytics" icon={<BarChart3 size={22} />}>
            <div className="grid gap-px bg-gold-500/14 md:grid-cols-4">
              <StatusRow label="Leadership Metrics" value={`${(tables.metrics ?? []).length} records`} />
              <StatusRow label="Community Service" value={`${analytics.serviceHours} hours`} />
              <StatusRow label="Civic Engagement Score" value={`${analytics.civicEngagement}/100`} />
              <StatusRow label="Policy Participation" value={String(analytics.policyParticipation)} />
            </div>
          </Panel>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5 shadow-gold">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-xs uppercase tracking-[.2em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-ink/64">{detail}</p>
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

function RecordList({ rows, empty, primary, secondary }: { rows: DbRow[]; empty: string; primary: string[]; secondary: string[] }) {
  if (rows.length === 0) return <p className="bg-navy-950 p-5 text-sm text-ink/68">{empty}</p>;
  return (
    <div className="grid gap-px bg-gold-500/14">
      {rows.map((row, index) => (
        <div key={`${value(row, primary, "record")}-${index}`} className="bg-navy-950 p-5">
          <p className="font-semibold text-white">{value(row, primary, "AFF governance record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            {secondary.map((key) => (key.includes("_at") || key.includes("date") ? shortDate(value(row, [key])) : value(row, [key]))).filter(Boolean).join(" - ")}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="text-right text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function LinkButton({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300 transition hover:border-gold-400">
      {icon}
      {label}
    </Link>
  );
}
