"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  Bot,
  Building2,
  ChartCandlestick,
  ClipboardCheck,
  Coins,
  GraduationCap,
  Landmark,
  LineChart,
  PieChart,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const desks = ["Currency Trading Desk", "Equity Trading Desk", "Bond Trading Desk", "Commodity Trading Desk", "Derivatives Desk", "Structured Products Desk"];
const assetModels = ["Portfolio Construction", "Asset Allocation", "Diversification Models", "Risk Budgeting", "Portfolio Rebalancing", "Performance Attribution"];
const centralBankLabs = ["Interest Rate Decisions", "Inflation Targeting", "Monetary Policy Tools", "Economic Stabilization Exercises"];

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

function money(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

export default function InvestmentBankPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Analyst");
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [message, setMessage] = useState("Loading AFF Global Investment Bank & Asset Management Institute...");
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
        router.replace("/login?next=/investment-bank");
        return;
      }

      const name =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
          ? user.user_metadata.name
          : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
            ? user.user_metadata.full_name
            : user.email?.split("@")[0] ?? "AFF Analyst";
      setStudentId(user.id);
      setStudentName(name);

      const [
        portfoliosResult,
        holdingsResult,
        allocationsResult,
        riskResult,
        committeesResult,
        memosResult,
        fundsResult,
        wealthResult,
        strategiesResult
      ] = await Promise.all([
        supabase.from("investment_portfolios").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("portfolio_holdings").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("asset_allocations").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("risk_reports").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("investment_committees").select("*").order("meeting_date", { ascending: false }).limit(200),
        supabase.from("research_memos").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("student_funds").select("*").order("performance_rank", { ascending: true }).limit(200),
        supabase.from("wealth_management_profiles").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("hedge_fund_strategies").select("*").order("created_at", { ascending: false }).limit(200)
      ]);

      if (portfoliosResult.error) throw portfoliosResult.error;
      if (riskResult.error) throw riskResult.error;

      setTables({
        portfolios: (portfoliosResult.data ?? []) as DbRow[],
        holdings: (holdingsResult.data ?? []) as DbRow[],
        allocations: (allocationsResult.data ?? []) as DbRow[],
        risk: (riskResult.data ?? []) as DbRow[],
        committees: (committeesResult.data ?? []) as DbRow[],
        memos: (memosResult.data ?? []) as DbRow[],
        funds: (fundsResult.data ?? []) as DbRow[],
        wealth: (wealthResult.data ?? []) as DbRow[],
        strategies: (strategiesResult.data ?? []) as DbRow[]
      });
      setMessage("Investment banking and asset management institute synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Investment Bank migration to enable institutional finance records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadInstitute();
  }, [loadInstitute]);

  const analytics = useMemo(() => {
    const portfolios = tables.portfolios ?? [];
    const funds = tables.funds ?? [];
    const risk = tables.risk ?? [];
    const committees = tables.committees ?? [];
    const memos = tables.memos ?? [];
    const portfolioValue = portfolios.reduce((total, row) => total + numberValue(row, ["portfolio_value"]), 0);
    const fundValue = funds.reduce((total, row) => total + numberValue(row, ["fund_nav"]), 0);
    const avgReturn = funds.length ? Math.round(funds.reduce((total, row) => total + numberValue(row, ["risk_adjusted_return"]), 0) / funds.length) : 0;
    const avgVar = risk.length ? Math.round(risk.reduce((total, row) => total + numberValue(row, ["var_percent"]), 0) / risk.length) : 0;
    return {
      portfolioValue,
      fundValue,
      avgReturn,
      avgVar,
      committees: committees.length,
      approvals: committees.filter((row) => value(row, ["decision_status"]) === "Approved").length,
      memos: memos.length,
      strategies: (tables.strategies ?? []).length,
      wealthProfiles: (tables.wealth ?? []).length
    };
  }, [tables]);

  return (
    <>
      <PageHeader
        eyebrow="AFF Global Investment Bank & Asset Management Institute"
        title="Institutional money management laboratory for trading desks, portfolios, funds, wealth, risk, and investment committees."
        text="Teach students how real institutional money is managed through investment banking desks, asset allocation, hedge fund simulations, private wealth planning, risk committees, central bank simulation, and student fund competitions."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Institutional Finance Command Desk</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-sm text-ink/54">{loading ? "Loading institute records..." : `${studentName} - student fund and institutional finance lab ready.`}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadInstitute}>
              <RefreshCw size={16} /> Refresh Institute
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<PieChart size={22} />} label="Portfolio AUM" value={money(analytics.portfolioValue)} detail="demo institutional portfolio value" />
            <Metric icon={<Trophy size={22} />} label="Student Funds" value={money(analytics.fundValue)} detail={`${analytics.avgReturn}% avg risk-adjusted return`} />
            <Metric icon={<ShieldCheck size={22} />} label="Risk Metrics" value={`${analytics.avgVar}% VaR`} detail="average committee risk exposure" />
            <Metric icon={<ClipboardCheck size={22} />} label="Committee Activity" value={`${analytics.approvals}/${analytics.committees}`} detail={`${analytics.memos} research memos reviewed`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Investment Bank Division" icon={<Landmark size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2 xl:grid-cols-3">
                {desks.map((desk) => (
                  <div key={desk} className="bg-navy-950 p-5">
                    <p className="font-semibold text-white">{desk}</p>
                    <p className="mt-2 text-sm text-ink/62">Institutional desk simulation, trade workflow, market briefings, and risk handoff.</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Central Bank Simulation" icon={<Building2 size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {centralBankLabs.map((item) => <StatusRow key={item} label={item} value="Simulation Ready" />)}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Asset Management Division" icon={<PieChart size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {assetModels.map((model) => <StatusRow key={model} label={model} value="Active Model" />)}
              </div>
            </Panel>
            <Panel title="Hedge Fund Simulator" icon={<TrendingUp size={22} />}>
              <RecordList rows={tables.strategies ?? []} empty="No hedge fund strategies found." primary={["strategy_name"]} secondary={["strategy_type", "target_return", "risk_level", "strategy_status"]} />
            </Panel>
            <Panel title="Private Wealth Management" icon={<UserRound size={22} />}>
              <RecordList rows={tables.wealth ?? []} empty="No wealth profiles found." primary={["client_name"]} secondary={["planning_focus", "risk_profile", "portfolio_value", "profile_status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Risk Management Committee" icon={<AlertTriangle size={22} />}>
              <RecordList rows={tables.risk ?? []} empty="No risk reports found." primary={["report_title"]} secondary={["var_percent", "stress_test_result", "drawdown_percent", "liquidity_risk"]} />
            </Panel>
            <Panel title="Investment Committee" icon={<Users size={22} />}>
              <RecordList rows={tables.committees ?? []} empty="No committee records found." primary={["committee_title"]} secondary={["decision_type", "decision_status", "capital_allocation", "meeting_date"]} />
            </Panel>
            <Panel title="Student Fund Simulator" icon={<Coins size={22} />}>
              <RecordList rows={tables.funds ?? []} empty="No student funds found." primary={["fund_name"]} secondary={["team_name", "fund_nav", "performance_rank", "risk_adjusted_return"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Research Memos and Portfolio Holdings" icon={<BookOpenText size={22} />}>
              <div className="grid gap-px bg-gold-500/14 xl:grid-cols-2">
                <RecordList rows={tables.memos ?? []} empty="No research memos found." primary={["memo_title"]} secondary={["asset_class", "recommendation", "utilization_count", "created_at"]} />
                <RecordList rows={tables.holdings ?? []} empty="No portfolio holdings found." primary={["security_name"]} secondary={["asset_class", "ticker", "market_value", "weight_percent"]} />
              </div>
            </Panel>
            <Panel title="Connected Institutional Systems" icon={<BarChart3 size={22} />}>
              <div className="grid gap-3 p-5">
                <LinkButton href="/economic-intelligence" label="Economic Intelligence" icon={<LineChart size={18} />} />
                <LinkButton href="/research-institute" label="Research Institute" icon={<BookOpenText size={18} />} />
                <LinkButton href="/university" label="University" icon={<GraduationCap size={18} />} />
                <LinkButton href="/trading-floor" label="Trading Floor" icon={<ChartCandlestick size={18} />} />
                <LinkButton href="/ai-coach" label="AI Coach" icon={<Bot size={18} />} />
                <LinkButton href="/chart-analyst" label="Chart Analyst" icon={<BarChart3 size={18} />} />
                <LinkButton href="/executive-command-center" label="Executive Command" icon={<Target size={18} />} />
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
          <p className="font-semibold text-white">{value(row, primary, "AFF investment record")}</p>
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
