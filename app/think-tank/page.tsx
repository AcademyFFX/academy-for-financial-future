"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  Brain,
  BriefcaseBusiness,
  Building2,
  Download,
  FileText,
  Globe2,
  GraduationCap,
  HandHeart,
  Landmark,
  Library,
  LineChart,
  Network,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Telescope,
  TrendingUp,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const centers = [
  {
    title: "Economic Policy Center",
    icon: Landmark,
    items: ["Economic policy reports", "Fiscal policy analysis", "Monetary policy analysis", "Labor market studies", "Inflation studies", "Global growth reports"]
  },
  {
    title: "Forex & Capital Markets Center",
    icon: LineChart,
    items: ["Currency market research", "Institutional order flow studies", "Liquidity reports", "Central bank research", "Market cycle analysis", "Asset allocation studies"]
  },
  {
    title: "Constitutional & Civic Policy Center",
    icon: Scale,
    items: ["Constitutional research", "Civic trust studies", "Governance reports", "Institutional accountability studies", "Democracy and participation research"]
  },
  {
    title: "Human Flourishing Center",
    icon: HandHeart,
    items: ["Character development research", "Leadership studies", "Community resilience studies", "Education effectiveness research", "Purpose and meaning studies"]
  },
  {
    title: "Future of Education Center",
    icon: GraduationCap,
    items: ["AI in education", "Financial literacy research", "Civic literacy research", "Educational innovation", "Global learning systems"]
  },
  {
    title: "Strategic Foresight Lab",
    icon: Telescope,
    items: ["Future trends analysis", "Scenario planning", "Geopolitical forecasting", "Technology impact studies", "Long-term risk assessments"]
  }
];

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

export default function ThinkTankPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading AFF Global Think Tank...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadThinkTank = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/think-tank");
        return;
      }

      const [reportsResult, briefsResult, fellowsResult, grantsResult, scenariosResult, foresightResult, impactResult, publicationsResult] = await Promise.all([
        supabase.from("think_tank_reports").select("*").order("published_at", { ascending: false }).limit(220),
        supabase.from("policy_briefs").select("*").order("published_at", { ascending: false }).limit(220),
        supabase.from("research_fellows").select("*").order("fellow_name", { ascending: true }).limit(180),
        supabase.from("research_grants").select("*").order("created_at", { ascending: false }).limit(180),
        supabase.from("future_scenarios").select("*").order("scenario_year", { ascending: true }).limit(180),
        supabase.from("foresight_studies").select("*").order("published_at", { ascending: false }).limit(180),
        supabase.from("policy_impact_metrics").select("*").order("reporting_period", { ascending: false }).limit(120),
        supabase.from("think_tank_publications").select("*").order("published_at", { ascending: false }).limit(240)
      ]);

      if (reportsResult.error) throw reportsResult.error;
      if (fellowsResult.error) throw fellowsResult.error;

      setTables({
        reports: (reportsResult.data ?? []) as DbRow[],
        briefs: (briefsResult.data ?? []) as DbRow[],
        fellows: (fellowsResult.data ?? []) as DbRow[],
        grants: (grantsResult.data ?? []) as DbRow[],
        scenarios: (scenariosResult.data ?? []) as DbRow[],
        foresight: (foresightResult.data ?? []) as DbRow[],
        impact: (impactResult.data ?? []) as DbRow[],
        publications: (publicationsResult.data ?? []) as DbRow[]
      });
      setMessage("AFF Global Think Tank synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Think Tank migration to enable strategic research records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadThinkTank();
  }, [loadThinkTank]);

  const analytics = useMemo(() => {
    const outputs = [...(tables.reports ?? []), ...(tables.briefs ?? []), ...(tables.publications ?? []), ...(tables.foresight ?? [])];
    const impact = tables.impact ?? [];
    return {
      output: outputs.length,
      downloads: outputs.reduce((total, row) => total + numberValue(row, ["download_count"]), 0),
      citations: outputs.reduce((total, row) => total + numberValue(row, ["citation_count"]), 0),
      fellows: (tables.fellows ?? []).length,
      grants: (tables.grants ?? []).length,
      scenarios: (tables.scenarios ?? []).length,
      policyImpact: impact.length ? Math.round(impact.reduce((total, row) => total + numberValue(row, ["policy_impact_score"]), 0) / impact.length) : 0,
      globalReach: impact.reduce((total, row) => total + numberValue(row, ["countries_reached"]), 0)
    };
  }, [tables]);

  const library = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = [
      ...(tables.reports ?? []).map((row) => ({ ...row, source: "Think Tank Report" })),
      ...(tables.briefs ?? []).map((row) => ({ ...row, source: "Policy Brief" })),
      ...(tables.publications ?? []).map((row) => ({ ...row, source: "Publication" })),
      ...(tables.foresight ?? []).map((row) => ({ ...row, source: "Foresight Study" }))
    ];
    if (!needle) return rows.slice(0, 16);
    return rows.filter((row) => [value(row, ["title", "report_title", "brief_title", "publication_title", "study_title"]), value(row, ["center_name"]), value(row, ["category"]), value(row, ["author_name"])].join(" ").toLowerCase().includes(needle));
  }, [search, tables]);

  return (
    <>
      <PageHeader
        eyebrow="AFF Global Think Tank"
        title="Strategic research, policy analysis, economic forecasting, institutional intelligence, and future studies."
        text="The highest-level AFF research division for economic policy, forex and capital markets, constitutional policy, human flourishing, education futures, strategic foresight, publications, fellows, grants, and global policy impact."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Strategic Research Command</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-sm text-ink/54">{loading ? "Loading think tank intelligence..." : "Research centers, foresight labs, fellows, grants, and publications are online."}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadThinkTank}>
              <RefreshCw size={16} /> Refresh Think Tank
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BookOpenText size={22} />} label="Research Output" value={String(analytics.output)} detail="reports, briefs, journals, and executive summaries" />
            <Metric icon={<Download size={22} />} label="Downloads" value={String(analytics.downloads)} detail={`${analytics.citations} citations tracked`} />
            <Metric icon={<Users size={22} />} label="Research Fellows" value={String(analytics.fellows)} detail={`${analytics.grants} grants and research teams`} />
            <Metric icon={<Globe2 size={22} />} label="Global Reach" value={String(analytics.globalReach)} detail={`${analytics.policyImpact}/100 policy impact score`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Strategic Research Centers" icon={<Network size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                {centers.map((center) => (
                  <div key={center.title} className="bg-navy-950 p-5">
                    <center.icon className="text-gold-300" size={22} />
                    <h3 className="mt-4 font-semibold text-white">{center.title}</h3>
                    <ul className="mt-3 grid gap-2 text-sm text-ink/62">
                      {center.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Executive Analytics" icon={<BarChart3 size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                <StatusRow label="Research Output" value={String(analytics.output)} />
                <StatusRow label="Downloads" value={String(analytics.downloads)} />
                <StatusRow label="Citations" value={String(analytics.citations)} />
                <StatusRow label="Policy Impact" value={`${analytics.policyImpact}/100`} />
                <StatusRow label="Fellow Performance" value={`${analytics.fellows} fellows`} />
                <StatusRow label="Global Reach" value={`${analytics.globalReach} countries`} />
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="Publication Engine Search" icon={<Search size={22} />}>
              <div className="bg-navy-950 p-5">
                <label className="text-xs uppercase tracking-[.18em] text-gold-300" htmlFor="think-tank-search">Search Reports, Briefs, Journals</label>
                <div className="mt-3 flex items-center gap-3 border border-gold-500/25 bg-navy-900 px-4 py-3">
                  <Search className="text-gold-300" size={18} />
                  <input id="think-tank-search" className="w-full bg-transparent text-white outline-none" placeholder="Search title, center, category, author" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
              </div>
            </Panel>
            <Panel title="Think Tank Publications Library" icon={<Library size={22} />}>
              <RecordList rows={library} empty="No think tank publications found." primary={["report_title", "brief_title", "publication_title", "study_title", "title"]} secondary={["source", "center_name", "publication_type", "download_count", "published_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Economic Policy and Capital Markets" icon={<TrendingUp size={22} />}>
              <RecordList rows={tables.reports ?? []} empty="No strategic reports found." primary={["report_title"]} secondary={["center_name", "report_type", "citation_count", "published_at"]} />
            </Panel>
            <Panel title="Policy Briefs" icon={<FileText size={22} />}>
              <RecordList rows={tables.briefs ?? []} empty="No policy briefs found." primary={["brief_title"]} secondary={["policy_area", "target_audience", "policy_status", "published_at"]} />
            </Panel>
            <Panel title="Strategic Foresight Lab" icon={<Telescope size={22} />}>
              <RecordList rows={tables.scenarios ?? []} empty="No future scenarios found." primary={["scenario_title"]} secondary={["scenario_year", "scenario_theme", "risk_level", "scenario_status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Foresight Studies" icon={<Sparkles size={22} />}>
              <RecordList rows={tables.foresight ?? []} empty="No foresight studies found." primary={["study_title"]} secondary={["study_type", "time_horizon", "impact_score", "published_at"]} />
            </Panel>
            <Panel title="Research Fellows Program" icon={<BriefcaseBusiness size={22} />}>
              <RecordList rows={tables.fellows ?? []} empty="No research fellows found." primary={["fellow_name"]} secondary={["fellowship_track", "research_center", "publication_count", "fellow_status"]} />
            </Panel>
            <Panel title="Research Grants" icon={<Target size={22} />}>
              <RecordList rows={tables.grants ?? []} empty="No research grants found." primary={["grant_title"]} secondary={["recipient_name", "grant_amount", "grant_status", "created_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Policy Impact Metrics" icon={<BarChart3 size={22} />}>
              <RecordList rows={tables.impact ?? []} empty="No policy impact metrics found." primary={["metric_title", "reporting_period"]} secondary={["policy_impact_score", "countries_reached", "institutional_citations", "created_at"]} />
            </Panel>
            <Panel title="Connected Strategic Systems" icon={<Building2 size={22} />}>
              <div className="grid gap-3 p-5">
                <LinkButton href="/economic-intelligence" label="Economic Intelligence" icon={<LineChart size={18} />} />
                <LinkButton href="/research-institute" label="Research Institute" icon={<BookOpenText size={18} />} />
                <LinkButton href="/university" label="University" icon={<GraduationCap size={18} />} />
                <LinkButton href="/publishing-house" label="Publishing House" icon={<Library size={18} />} />
                <LinkButton href="/governance-school" label="Governance School" icon={<Scale size={18} />} />
                <LinkButton href="/human-flourishing" label="Human Flourishing" icon={<HandHeart size={18} />} />
                <LinkButton href="/executive-command-center" label="Executive Command" icon={<Brain size={18} />} />
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
          <p className="font-semibold text-white">{value(row, primary, "AFF think tank record")}</p>
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
