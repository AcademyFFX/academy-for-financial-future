"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileText,
  GraduationCap,
  Handshake,
  Landmark,
  LineChart,
  PiggyBank,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  TrendingUp,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type Donor = {
  id: string;
  donor_name: string;
  donor_type: string;
  giving_level: string;
  total_giving: number | null;
  donor_status: string;
};

type ScholarshipApplication = {
  id: string;
  applicant_name: string;
  fund_name: string;
  requested_amount: number | null;
  application_status: string;
  submitted_at: string;
};

const adminEmail = "acafffx@gmail.com";
const initialScholarship = {
  applicantName: "",
  applicantEmail: "",
  fundName: "AFF Forex Training Scholarship Fund",
  requestedAmount: "500",
  financialNeed: "",
  careerGoal: ""
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

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function EndowmentFundPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [isAdmin, setIsAdmin] = useState(false);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [scholarshipApplications, setScholarshipApplications] = useState<ScholarshipApplication[]>([]);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [form, setForm] = useState(initialScholarship);
  const [message, setMessage] = useState("Loading Endowment and Investment Fund Division...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadFund = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      setStudentId(user.id);
      setStudentEmail(user.email ?? "");
      setStudentName(typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Student");
      setIsAdmin(admin);
      setForm((current) => ({ ...current, applicantName: current.applicantName || user.user_metadata?.name || "", applicantEmail: current.applicantEmail || user.email || "" }));

      const [
        donorsResult,
        scholarshipsResult,
        applicationsResult,
        grantsResult,
        sponsorshipsResult,
        alumniResult,
        portfolioResult,
        budgetResult,
        transparencyResult,
        boardResult,
        allocationsResult,
        careerResult,
        researchResult,
        campusResult,
        eventsResult
      ] = await Promise.all([
        supabase.from("endowment_donors").select("*").order("total_giving", { ascending: false }).limit(200),
        supabase.from("endowment_scholarship_funds").select("*").limit(200),
        admin
          ? supabase.from("endowment_scholarship_applications").select("*").order("submitted_at", { ascending: false }).limit(200)
          : supabase.from("endowment_scholarship_applications").select("*").eq("student_id", user.id).order("submitted_at", { ascending: false }).limit(50),
        supabase.from("endowment_grants").select("*").limit(200),
        supabase.from("endowment_corporate_sponsorships").select("*").limit(200),
        supabase.from("endowment_alumni_giving").select("*").limit(200),
        supabase.from("endowment_investment_portfolio").select("*").limit(200),
        supabase.from("endowment_budget_plans").select("*").limit(200),
        supabase.from("endowment_transparency_reports").select("*").limit(200),
        supabase.from("endowment_board_members").select("*").limit(200),
        supabase.from("endowment_research_grant_allocations").select("*").limit(200),
        admin ? supabase.from("career_placements").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("research_publications").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_directory").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("event_calendar").select("*").limit(100) : Promise.resolve({ data: [], error: null })
      ]);

      if (donorsResult.error) throw donorsResult.error;
      if (scholarshipsResult.error) throw scholarshipsResult.error;
      if (applicationsResult.error) throw applicationsResult.error;

      setDonors((donorsResult.data ?? []) as Donor[]);
      setScholarshipApplications((applicationsResult.data ?? []) as ScholarshipApplication[]);
      setTables({
        scholarships: (scholarshipsResult.data ?? []) as DbRow[],
        grants: (grantsResult.data ?? []) as DbRow[],
        sponsorships: (sponsorshipsResult.data ?? []) as DbRow[],
        alumni: (alumniResult.data ?? []) as DbRow[],
        portfolio: (portfolioResult.data ?? []) as DbRow[],
        budget: (budgetResult.data ?? []) as DbRow[],
        transparency: (transparencyResult.data ?? []) as DbRow[],
        board: (boardResult.data ?? []) as DbRow[],
        allocations: (allocationsResult.data ?? []) as DbRow[],
        career: (careerResult.data ?? []) as DbRow[],
        research: (researchResult.data ?? []) as DbRow[],
        campus: (campusResult.data ?? []) as DbRow[],
        events: (eventsResult.data ?? []) as DbRow[]
      });
      setMessage("Endowment and Investment Fund Division synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Endowment Fund migration to enable financial foundation records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadFund();
  }, [loadFund]);

  const analytics = useMemo(() => {
    const scholarships = tables.scholarships ?? [];
    const grants = tables.grants ?? [];
    const sponsorships = tables.sponsorships ?? [];
    const alumni = tables.alumni ?? [];
    const portfolio = tables.portfolio ?? [];
    const budget = tables.budget ?? [];
    const allocations = tables.allocations ?? [];
    const totalDonations = donors.reduce((total, donor) => total + Number(donor.total_giving ?? 0), 0);
    const scholarshipCapital = scholarships.reduce((total, row) => total + numberValue(row, ["fund_balance"]), 0);
    const portfolioValue = portfolio.reduce((total, row) => total + numberValue(row, ["current_value"]), 0);
    const plannedBudget = budget.reduce((total, row) => total + numberValue(row, ["planned_amount"]), 0);
    const allocatedGrants = allocations.reduce((total, row) => total + numberValue(row, ["allocated_amount"]), 0);
    const activeSponsors = sponsorships.filter((row) => value(row, ["sponsorship_status"]) === "Active").length;
    return {
      totalDonations,
      scholarshipCapital,
      portfolioValue,
      plannedBudget,
      allocatedGrants,
      donors: donors.length,
      grants: grants.length,
      activeSponsors,
      alumniGifts: alumni.length,
      applications: scholarshipApplications.length,
      awardRate: percent(scholarshipApplications.filter((app) => app.application_status === "Awarded").length, scholarshipApplications.length)
    };
  }, [donors, scholarshipApplications, tables]);

  async function submitScholarship(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting scholarship application...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("endowment_scholarship_applications").insert({
        student_id: studentId,
        applicant_name: form.applicantName.trim() || studentName,
        applicant_email: form.applicantEmail.trim() || studentEmail,
        fund_name: form.fundName,
        requested_amount: Number(form.requestedAmount),
        financial_need_statement: form.financialNeed.trim() || null,
        career_goal: form.careerGoal.trim() || null,
        application_status: "Submitted"
      }).select("*").single();

      if (error) throw error;
      setScholarshipApplications((current) => [data as ScholarshipApplication, ...current]);
      setForm(initialScholarship);
      setMessage("Scholarship application submitted to AFF foundation review.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit scholarship application."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Endowment and Investment Fund Division"
        title="Institutional finance command center for AFF scholarships, grants, sponsorships, and investment stewardship."
        text="Manage donors, scholarship funds, grants, corporate sponsors, alumni giving, endowment performance, investment portfolio tracking, budgets, transparency reports, foundation board records, and research grant allocations."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Foundation Operations</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadFund}>
              <RefreshCw size={16} /> Refresh Fund
            </button>
          </div>

          {isAdmin ? (
            <section className="grid gap-4 md:grid-cols-4">
              <Metric icon={<PiggyBank size={22} />} label="Endowment Value" value={money(analytics.portfolioValue)} detail={`${analytics.donors} donors managed`} />
              <Metric icon={<GraduationCap size={22} />} label="Scholarship Funds" value={money(analytics.scholarshipCapital)} detail={`${analytics.applications} scholarship applications`} />
              <Metric icon={<Handshake size={22} />} label="Corporate Sponsors" value={String(analytics.activeSponsors)} detail="active sponsorship portal records" />
              <Metric icon={<Scale size={22} />} label="Research Grants" value={money(analytics.allocatedGrants)} detail={`${analytics.grants} grant records`} />
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Endowment Performance Dashboard" icon={<LineChart size={22} />}>
              <StatLine label="Total Donor Giving" value={money(analytics.totalDonations)} />
              <StatLine label="Investment Portfolio Value" value={money(analytics.portfolioValue)} />
              <StatLine label="Scholarship Fund Balance" value={money(analytics.scholarshipCapital)} />
              <StatLine label="Budget Plans" value={money(analytics.plannedBudget)} />
              <StatLine label="Scholarship Award Rate" value={`${analytics.awardRate}%`} />
            </Panel>

            <form onSubmit={submitScholarship} className="terminal-panel grid h-fit gap-4 p-6">
              <div className="flex items-center gap-3">
                <Send className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Scholarship Application Workflow</h2>
              </div>
              <Input label="Applicant Name" value={form.applicantName} onChange={(v) => setForm((c) => ({ ...c, applicantName: v }))} />
              <Input label="Applicant Email" value={form.applicantEmail} onChange={(v) => setForm((c) => ({ ...c, applicantEmail: v }))} />
              <Input label="Fund Name" value={form.fundName} onChange={(v) => setForm((c) => ({ ...c, fundName: v }))} />
              <Input label="Requested Amount" value={form.requestedAmount} onChange={(v) => setForm((c) => ({ ...c, requestedAmount: v }))} />
              <Textarea label="Financial Need Statement" value={form.financialNeed} onChange={(v) => setForm((c) => ({ ...c, financialNeed: v }))} />
              <Textarea label="Career Goal" value={form.careerGoal} onChange={(v) => setForm((c) => ({ ...c, careerGoal: v }))} />
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <Send size={18} /> Submit Scholarship Request
              </button>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="Donor Management" icon={<Users size={22} />} headers={["Donor", "Type", "Level", "Total Giving"]} rows={donors.map((donor) => [donor.donor_name, donor.donor_type, donor.giving_level, money(Number(donor.total_giving ?? 0))])} />
            <RecordTable title="Scholarship Fund Tracking" icon={<Award size={22} />} headers={["Fund", "Balance", "Awarded", "Status"]} rows={(tables.scholarships ?? []).map((row) => [value(row, ["fund_name"]), money(numberValue(row, ["fund_balance"])), money(numberValue(row, ["awarded_amount"])), value(row, ["fund_status"])])} />
            <RecordTable title="Grant Management" icon={<ClipboardCheck size={22} />} headers={["Grant", "Purpose", "Amount", "Status"]} rows={(tables.grants ?? []).map((row) => [value(row, ["grant_name"]), value(row, ["grant_purpose"]), money(numberValue(row, ["grant_amount"])), value(row, ["grant_status"])])} />
            <RecordTable title="Corporate Sponsorship Portal" icon={<Building2 size={22} />} headers={["Sponsor", "Level", "Amount", "Status"]} rows={(tables.sponsorships ?? []).map((row) => [value(row, ["sponsor_name"]), value(row, ["sponsor_level"]), money(numberValue(row, ["sponsorship_amount"])), value(row, ["sponsorship_status"])])} />
            <RecordTable title="Alumni Giving Program" icon={<BadgeDollarSign size={22} />} headers={["Alumnus", "Campaign", "Gift", "Status"]} rows={(tables.alumni ?? []).map((row) => [value(row, ["alumni_name"]), value(row, ["campaign_name"]), money(numberValue(row, ["gift_amount"])), value(row, ["gift_status"])])} />
            <RecordTable title="Investment Portfolio Tracking" icon={<TrendingUp size={22} />} headers={["Asset", "Class", "Value", "Return"]} rows={(tables.portfolio ?? []).map((row) => [value(row, ["asset_name"]), value(row, ["asset_class"]), money(numberValue(row, ["current_value"])), `${numberValue(row, ["return_rate"])}%`])} />
            <RecordTable title="Budget Planning Tools" icon={<DollarSign size={22} />} headers={["Budget", "Division", "Planned", "Status"]} rows={(tables.budget ?? []).map((row) => [value(row, ["budget_name"]), value(row, ["division_name"]), money(numberValue(row, ["planned_amount"])), value(row, ["budget_status"])])} />
            <RecordTable title="Foundation Board Dashboard" icon={<Landmark size={22} />} headers={["Member", "Role", "Status", "Term End"]} rows={(tables.board ?? []).map((row) => [value(row, ["member_name"]), value(row, ["board_role"]), value(row, ["member_status"]), value(row, ["term_end_date"])])} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="Financial Transparency Reports" icon={<FileText size={22} />} headers={["Report", "Period", "Status", "Published"]} rows={(tables.transparency ?? []).map((row) => [value(row, ["report_title"]), value(row, ["reporting_period"]), value(row, ["report_status"]), value(row, ["published_at"])])} />
            <RecordTable title="Research Grant Allocation System" icon={<BarChart3 size={22} />} headers={["Project", "Researcher", "Amount", "Status"]} rows={(tables.allocations ?? []).map((row) => [value(row, ["research_project"]), value(row, ["researcher_name"]), money(numberValue(row, ["allocated_amount"])), value(row, ["allocation_status"])])} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="Scholarship Applications" icon={<GraduationCap size={22} />} headers={["Applicant", "Fund", "Amount", "Status"]} rows={scholarshipApplications.map((row) => [row.applicant_name, row.fund_name, money(Number(row.requested_amount ?? 0)), row.application_status])} />
            <Panel title="Connected AFF Divisions" icon={<ShieldCheck size={22} />}>
              <StatLine label="Career Center Placements" value={String((tables.career ?? []).length)} />
              <StatLine label="Research Institute Publications" value={String((tables.research ?? []).length)} />
              <StatLine label="Campus Expansion Records" value={String((tables.campus ?? []).length)} />
              <StatLine label="Events Division Programs" value={String((tables.events ?? []).length)} />
              <StatLine label="Executive Command Center" value="Fund metrics connected" />
            </Panel>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <ExecutiveTile icon={<PiggyBank size={20} />} label="Endowment" value={money(analytics.portfolioValue)} detail="investment portfolio value" />
            <ExecutiveTile icon={<GraduationCap size={20} />} label="Scholarships" value={money(analytics.scholarshipCapital)} detail="funds available and tracked" />
            <ExecutiveTile icon={<Handshake size={20} />} label="Sponsors" value={String(analytics.activeSponsors)} detail="corporate sponsorship records" />
            <ExecutiveTile icon={<CheckCircle2 size={20} />} label="Transparency" value={String((tables.transparency ?? []).length)} detail="financial reports archived" />
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm text-ink/72">
      {label}
      <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm text-ink/72">
      {label}
      <textarea className="min-h-24 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5 shadow-gold">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-5 text-sm uppercase tracking-[.2em] text-ink/54">{label}</p>
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
      <div className="grid gap-px bg-gold-500/14">{children}</div>
    </section>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function RecordTable({ title, icon, headers, rows }: { title: string; icon: ReactNode; headers: string[]; rows: string[][] }) {
  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-gold-500/20 p-5">
        <div className="flex items-center gap-3">
          <span className="text-gold-300">{icon}</span>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-ink/68">No records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-navy-800">
                {headers.map((header) => <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="bg-navy-950">
                  {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="p-4 text-ink/76">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ExecutiveTile({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-sm uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-ink/62">{detail}</p>
    </article>
  );
}
