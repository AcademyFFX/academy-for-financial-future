"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  Bot,
  Building2,
  CalendarDays,
  ChartCandlestick,
  Download,
  FileText,
  Filter,
  Globe2,
  GraduationCap,
  Landmark,
  LineChart,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  Tv
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const centralBanks = ["Federal Reserve", "ECB", "BOJ", "BOE", "SNB", "BOC", "RBA", "RBNZ"];
const currencies = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
const eventFilters = ["All", "High", "Medium", "Low"];

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

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

export default function EconomicIntelligencePage() {
  const router = useRouter();
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [eventFilter, setEventFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Loading AFF Global Economic Intelligence Network...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadIntelligence = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/economic-intelligence");
        return;
      }

      const [
        eventsResult,
        centralBankResult,
        inflationResult,
        currencyResult,
        riskResult,
        geopoliticalResult,
        forecastsResult,
        commentaryResult,
        downloadsResult
      ] = await Promise.all([
        supabase.from("economic_events").select("*").order("event_time", { ascending: true }).limit(250),
        supabase.from("central_bank_reports").select("*").order("published_at", { ascending: false }).limit(120),
        supabase.from("inflation_reports").select("*").order("report_date", { ascending: false }).limit(120),
        supabase.from("currency_reports").select("*").order("published_at", { ascending: false }).limit(160),
        supabase.from("global_risk_reports").select("*").order("published_at", { ascending: false }).limit(120),
        supabase.from("geopolitical_reports").select("*").order("published_at", { ascending: false }).limit(120),
        supabase.from("economic_forecasts").select("*").order("forecast_date", { ascending: false }).limit(160),
        supabase.from("market_commentary").select("*").order("published_at", { ascending: false }).limit(60),
        supabase.from("research_downloads").select("*").order("downloaded_at", { ascending: false }).limit(200)
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (centralBankResult.error) throw centralBankResult.error;

      setTables({
        events: (eventsResult.data ?? []) as DbRow[],
        centralBanks: (centralBankResult.data ?? []) as DbRow[],
        inflation: (inflationResult.data ?? []) as DbRow[],
        currency: (currencyResult.data ?? []) as DbRow[],
        risk: (riskResult.data ?? []) as DbRow[],
        geopolitical: (geopoliticalResult.data ?? []) as DbRow[],
        forecasts: (forecastsResult.data ?? []) as DbRow[],
        commentary: (commentaryResult.data ?? []) as DbRow[],
        downloads: (downloadsResult.data ?? []) as DbRow[]
      });
      setMessage("Global Economic Intelligence synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Economic Intelligence migration to enable macro intelligence records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  const analytics = useMemo(() => {
    const forecasts = tables.forecasts ?? [];
    const accuracyRows = forecasts.filter((row) => numberValue(row, ["accuracy_score"]) > 0);
    const avgAccuracy = accuracyRows.length ? Math.round(accuracyRows.reduce((total, row) => total + numberValue(row, ["accuracy_score"]), 0) / accuracyRows.length) : 0;
    const riskRows = tables.risk ?? [];
    const avgRisk = riskRows.length ? Math.round(riskRows.reduce((total, row) => total + numberValue(row, ["risk_score"]), 0) / riskRows.length) : 0;
    return {
      events: (tables.events ?? []).length,
      highImpact: (tables.events ?? []).filter((row) => value(row, ["impact_level"]) === "High").length,
      reports: (tables.centralBanks ?? []).length + (tables.inflation ?? []).length + (tables.currency ?? []).length + riskRows.length + (tables.geopolitical ?? []).length,
      downloads: (tables.downloads ?? []).length,
      forecasts: forecasts.length,
      avgAccuracy,
      avgRisk,
      commentary: (tables.commentary ?? []).length
    };
  }, [tables]);

  const filteredEvents = useMemo(() => {
    const events = tables.events ?? [];
    const filtered = eventFilter === "All" ? events : events.filter((row) => value(row, ["impact_level"]) === eventFilter);
    const needle = search.trim().toLowerCase();
    if (!needle) return filtered;
    return filtered.filter((row) => [value(row, ["event_name"]), value(row, ["country"]), value(row, ["currency"]), value(row, ["event_category"])].join(" ").toLowerCase().includes(needle));
  }, [eventFilter, search, tables]);

  return (
    <>
      <PageHeader
        eyebrow="AFF Global Economic Intelligence Network"
        title="Institutional macroeconomic, currency, central bank, and geopolitical intelligence division."
        text="Monitor central banks, inflation, employment, global risk, currency reports, geopolitical events, forecasts, research downloads, and live market commentary for professional forex education."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Macroeconomic Command Desk</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-sm text-ink/54">{loading ? "Loading global intelligence..." : "Central bank, calendar, risk, currency, geopolitical, and research desks online."}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadIntelligence}>
              <RefreshCw size={16} /> Refresh Intelligence
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<CalendarDays size={22} />} label="Economic Events" value={String(analytics.events)} detail={`${analytics.highImpact} high impact events`} />
            <Metric icon={<FileText size={22} />} label="Economic Reports" value={String(analytics.reports)} detail="central bank, inflation, currency, risk, geopolitical" />
            <Metric icon={<TrendingUp size={22} />} label="Forecast Accuracy" value={`${analytics.avgAccuracy}%`} detail={`${analytics.forecasts} forecast records`} />
            <Metric icon={<ShieldAlert size={22} />} label="Global Risk Score" value={`${analytics.avgRisk}/100`} detail={`${analytics.downloads} research downloads`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Central Bank Command Center" icon={<Landmark size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2 xl:grid-cols-4">
                {centralBanks.map((bank) => {
                  const report = (tables.centralBanks ?? []).find((row) => value(row, ["bank_name"]) === bank);
                  return (
                    <div key={bank} className="bg-navy-950 p-4">
                      <p className="font-semibold text-white">{bank}</p>
                      <p className="mt-2 text-sm text-gold-300">{value(report ?? {}, ["policy_bias"], "Monitoring")}</p>
                      <p className="mt-2 text-xs leading-5 text-ink/58">{value(report ?? {}, ["summary"], "Awaiting latest policy intelligence.")}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Live Market Commentary" icon={<Newspaper size={22} />}>
              <RecordList rows={tables.commentary ?? []} empty="No market commentary found." primary={["title"]} secondary={["priority", "published_by", "published_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="Economic Calendar" icon={<Filter size={22} />}>
              <div className="grid gap-3 bg-navy-950 p-5">
                <label className="text-xs uppercase tracking-[.18em] text-gold-300" htmlFor="event-search">Event Filtering</label>
                <div className="flex items-center gap-3 border border-gold-500/25 bg-navy-900 px-4 py-3">
                  <Search className="text-gold-300" size={18} />
                  <input id="event-search" className="w-full bg-transparent text-white outline-none" placeholder="Search event, country, currency" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {eventFilters.map((filter) => (
                    <button key={filter} className={`border px-3 py-2 text-sm ${eventFilter === filter ? "border-gold-500 bg-gold-500 text-navy-950" : "border-gold-500/25 text-ink/72"}`} type="button" onClick={() => setEventFilter(filter)}>
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="Historical Event Archive" icon={<CalendarDays size={22} />}>
              <RecordList rows={filteredEvents} empty="No economic events found." primary={["event_name"]} secondary={["country", "currency", "impact_level", "event_time"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Inflation Command Center" icon={<LineChart size={22} />}>
              <RecordList rows={tables.inflation ?? []} empty="No inflation reports found." primary={["report_title"]} secondary={["country", "cpi", "core_cpi", "employment_data", "report_date"]} />
            </Panel>
            <Panel title="Global Risk Monitor" icon={<AlertTriangle size={22} />}>
              <RecordList rows={tables.risk ?? []} empty="No global risk reports found." primary={["report_title"]} secondary={["risk_category", "risk_score", "yield_curve_status", "published_at"]} />
            </Panel>
            <Panel title="Currency Intelligence" icon={<ChartCandlestick size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {currencies.map((currency) => {
                  const report = (tables.currency ?? []).find((row) => value(row, ["currency_code"]) === currency);
                  return <StatusRow key={currency} label={`${currency} Report`} value={value(report ?? {}, ["bias"], "Monitoring")} />;
                })}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Geopolitical Intelligence" icon={<Globe2 size={22} />}>
              <RecordList rows={tables.geopolitical ?? []} empty="No geopolitical reports found." primary={["report_title"]} secondary={["risk_type", "region", "impact_level", "published_at"]} />
            </Panel>
            <Panel title="Forex Research Desk" icon={<BookOpenText size={22} />}>
              <RecordList rows={tables.forecasts ?? []} empty="No economic forecasts found." primary={["forecast_title"]} secondary={["forecast_type", "currency_focus", "accuracy_score", "forecast_date"]} />
            </Panel>
            <Panel title="Research Downloads" icon={<Download size={22} />}>
              <RecordList rows={tables.downloads ?? []} empty="No research downloads found." primary={["research_title"]} secondary={["student_email", "download_type", "downloaded_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Executive Analytics" icon={<BarChart3 size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                <StatusRow label="Economic Reports" value={String(analytics.reports)} />
                <StatusRow label="Research Downloads" value={String(analytics.downloads)} />
                <StatusRow label="Forecast Accuracy" value={`${analytics.avgAccuracy}%`} />
                <StatusRow label="User Engagement" value={`${analytics.commentary} commentary records`} />
                <StatusRow label="Global Risk Score" value={`${analytics.avgRisk}/100`} />
                <StatusRow label="High Impact Events" value={String(analytics.highImpact)} />
              </div>
            </Panel>
            <Panel title="Connected Intelligence Systems" icon={<Building2 size={22} />}>
              <div className="grid gap-3 p-5">
                <LinkButton href="/research-institute" label="Research Institute" icon={<BookOpenText size={18} />} />
                <LinkButton href="/trading-floor" label="Trading Floor" icon={<ChartCandlestick size={18} />} />
                <LinkButton href="/ai-coach" label="AI Forex Coach" icon={<Bot size={18} />} />
                <LinkButton href="/chart-analyst" label="Chart Analyst" icon={<BarChart3 size={18} />} />
                <LinkButton href="/university" label="University" icon={<GraduationCap size={18} />} />
                <LinkButton href="/publishing-house" label="Publishing House" icon={<Tv size={18} />} />
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
          <p className="font-semibold text-white">{value(row, primary, "AFF economic intelligence record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            {secondary
              .map((key) => (key.includes("_at") || key.includes("date") || key.includes("time") ? shortDate(value(row, [key])) : value(row, [key])))
              .filter(Boolean)
              .join(" - ")}
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
