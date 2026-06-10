"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpenText,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  GraduationCap,
  HandHeart,
  Handshake,
  Landmark,
  LineChart,
  Megaphone,
  RefreshCw,
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
type Program = {
  id: string;
  program_name: string;
  program_type: string;
  region: string;
  program_status: string;
  beneficiaries_count: number | null;
  budget_allocated: number | null;
};
type Volunteer = {
  id: string;
  volunteer_name: string;
  focus_area: string;
  volunteer_status: string;
  hours_committed: number | null;
};

const adminEmail = "acafffx@gmail.com";
const initialCampaign = {
  applicantName: "",
  applicantEmail: "",
  campaignName: "Youth Financial Literacy Outreach",
  region: "",
  requestedSupport: "Scholarship Outreach",
  impactGoal: ""
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

export default function FoundationPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("Applicant");
  const [isAdmin, setIsAdmin] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [form, setForm] = useState(initialCampaign);
  const [message, setMessage] = useState("Loading Global Foundation and Humanitarian Impact Division...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadFoundation = useCallback(async () => {
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
      setStudentName(typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Applicant");
      setIsAdmin(admin);
      setForm((current) => ({ ...current, applicantName: current.applicantName || user.user_metadata?.name || "", applicantEmail: current.applicantEmail || user.email || "" }));

      const [
        programsResult,
        volunteersResult,
        campaignsResult,
        grantsResult,
        ambassadorsResult,
        governanceResult,
        reportsResult,
        partnershipsResult,
        endowmentResult,
        researchResult,
        campusResult,
        eventsResult
      ] = await Promise.all([
        supabase.from("foundation_programs").select("*").order("program_type", { ascending: true }).limit(200),
        supabase.from("foundation_volunteers").select("*").order("hours_committed", { ascending: false }).limit(200),
        admin
          ? supabase.from("foundation_humanitarian_campaigns").select("*").order("created_at", { ascending: false }).limit(200)
          : supabase.from("foundation_humanitarian_campaigns").select("*").eq("submitted_by", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("foundation_grant_distributions").select("*").limit(200),
        supabase.from("foundation_ambassadors").select("*").limit(200),
        supabase.from("foundation_governance_records").select("*").limit(200),
        supabase.from("foundation_impact_reports").select("*").limit(200),
        supabase.from("foundation_education_partnerships").select("*").limit(200),
        admin ? supabase.from("endowment_scholarship_funds").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("research_publications").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_directory").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("event_calendar").select("*").limit(100) : Promise.resolve({ data: [], error: null })
      ]);

      if (programsResult.error) throw programsResult.error;
      if (volunteersResult.error) throw volunteersResult.error;
      if (campaignsResult.error) throw campaignsResult.error;

      setPrograms((programsResult.data ?? []) as Program[]);
      setVolunteers((volunteersResult.data ?? []) as Volunteer[]);
      setTables({
        campaigns: (campaignsResult.data ?? []) as DbRow[],
        grants: (grantsResult.data ?? []) as DbRow[],
        ambassadors: (ambassadorsResult.data ?? []) as DbRow[],
        governance: (governanceResult.data ?? []) as DbRow[],
        reports: (reportsResult.data ?? []) as DbRow[],
        partnerships: (partnershipsResult.data ?? []) as DbRow[],
        endowment: (endowmentResult.data ?? []) as DbRow[],
        research: (researchResult.data ?? []) as DbRow[],
        campus: (campusResult.data ?? []) as DbRow[],
        events: (eventsResult.data ?? []) as DbRow[]
      });
      setMessage("Foundation and Humanitarian Impact Division synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Foundation migration to enable humanitarian impact records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadFoundation();
  }, [loadFoundation]);

  const analytics = useMemo(() => {
    const grants = tables.grants ?? [];
    const campaigns = tables.campaigns ?? [];
    const reports = tables.reports ?? [];
    const beneficiaries = programs.reduce((total, program) => total + Number(program.beneficiaries_count ?? 0), 0);
    const budget = programs.reduce((total, program) => total + Number(program.budget_allocated ?? 0), 0);
    const grantsDistributed = grants.reduce((total, row) => total + numberValue(row, ["distribution_amount"]), 0);
    const volunteerHours = volunteers.reduce((total, row) => total + Number(row.hours_committed ?? 0), 0);
    return {
      programs: programs.length,
      beneficiaries,
      budget,
      grantsDistributed,
      campaigns: campaigns.length,
      volunteerHours,
      reports: reports.length,
      ambassadors: (tables.ambassadors ?? []).length,
      partnerships: (tables.partnerships ?? []).length
    };
  }, [programs, tables, volunteers]);

  async function submitCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting humanitarian campaign request...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("foundation_humanitarian_campaigns").insert({
        submitted_by: studentId,
        applicant_name: form.applicantName.trim() || studentName,
        applicant_email: form.applicantEmail.trim() || studentEmail,
        campaign_name: form.campaignName,
        region: form.region.trim() || null,
        requested_support: form.requestedSupport,
        impact_goal: form.impactGoal.trim() || null,
        campaign_status: "Submitted"
      }).select("*").single();
      if (error) throw error;
      setTables((current) => ({ ...current, campaigns: [data as DbRow, ...(current.campaigns ?? [])] }));
      setForm(initialCampaign);
      setMessage("Humanitarian campaign request submitted to AFF Foundation review.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit campaign request."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Global Foundation and Humanitarian Impact Division"
        title="Institutional command center for scholarships, youth literacy, economic empowerment, and global community impact."
        text="Manage scholarship outreach, youth financial literacy, community development, international education partnerships, grant distribution, volunteers, humanitarian campaigns, ambassadors, governance, and annual impact reports."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Humanitarian Impact Operations</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadFoundation}>
              <RefreshCw size={16} /> Refresh Foundation
            </button>
          </div>

          {isAdmin ? (
            <section className="grid gap-4 md:grid-cols-4">
              <Metric icon={<HandHeart size={22} />} label="Impact Programs" value={String(analytics.programs)} detail={`${analytics.beneficiaries} beneficiaries tracked`} />
              <Metric icon={<GraduationCap size={22} />} label="Outreach Budget" value={money(analytics.budget)} detail="program budgets allocated" />
              <Metric icon={<Handshake size={22} />} label="Grants Distributed" value={money(analytics.grantsDistributed)} detail={`${analytics.campaigns} humanitarian campaigns`} />
              <Metric icon={<Users size={22} />} label="Volunteer Hours" value={String(analytics.volunteerHours)} detail={`${analytics.ambassadors} global ambassadors`} />
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Scholarship Outreach and Economic Empowerment Programs" icon={<Sprout size={22} />}>
              {loading ? <p className="bg-navy-950 p-5 text-ink/68">Loading foundation programs...</p> : null}
              {programs.map((program) => (
                <div key={program.id} className="bg-navy-950 p-5">
                  <p className="text-xs uppercase tracking-[.2em] text-gold-300">{program.program_type}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{program.program_name}</h3>
                  <div className="mt-4 grid gap-2 text-sm text-ink/72">
                    <StatLite label="Region" value={program.region} />
                    <StatLite label="Status" value={program.program_status} />
                    <StatLite label="Beneficiaries" value={String(program.beneficiaries_count ?? 0)} />
                    <StatLite label="Budget" value={money(Number(program.budget_allocated ?? 0))} />
                  </div>
                </div>
              ))}
            </Panel>

            <form onSubmit={submitCampaign} className="terminal-panel grid h-fit gap-4 p-6">
              <div className="flex items-center gap-3">
                <Send className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Humanitarian Campaign Tracking</h2>
              </div>
              <Input label="Applicant Name" value={form.applicantName} onChange={(v) => setForm((c) => ({ ...c, applicantName: v }))} />
              <Input label="Applicant Email" value={form.applicantEmail} onChange={(v) => setForm((c) => ({ ...c, applicantEmail: v }))} />
              <Input label="Campaign Name" value={form.campaignName} onChange={(v) => setForm((c) => ({ ...c, campaignName: v }))} />
              <Input label="Region" value={form.region} onChange={(v) => setForm((c) => ({ ...c, region: v }))} />
              <Input label="Requested Support" value={form.requestedSupport} onChange={(v) => setForm((c) => ({ ...c, requestedSupport: v }))} />
              <Textarea label="Impact Goal" value={form.impactGoal} onChange={(v) => setForm((c) => ({ ...c, impactGoal: v }))} />
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <Send size={18} /> Submit Campaign
              </button>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="Youth Financial Literacy Initiatives" icon={<BookOpenText size={22} />} headers={["Program", "Region", "Beneficiaries", "Status"]} rows={programs.filter((p) => p.program_type === "Youth Financial Literacy").map((p) => [p.program_name, p.region, String(p.beneficiaries_count ?? 0), p.program_status])} />
            <RecordTable title="Community Development Projects" icon={<Building2 size={22} />} headers={["Program", "Region", "Budget", "Status"]} rows={programs.filter((p) => p.program_type === "Community Development").map((p) => [p.program_name, p.region, money(Number(p.budget_allocated ?? 0)), p.program_status])} />
            <RecordTable title="International Education Partnerships" icon={<Globe2 size={22} />} headers={["Partner", "Region", "Scope", "Status"]} rows={(tables.partnerships ?? []).map((row) => [value(row, ["partner_name"]), value(row, ["region"]), value(row, ["partnership_scope"]), value(row, ["partnership_status"])])} />
            <RecordTable title="Grant Distribution Management" icon={<ClipboardCheck size={22} />} headers={["Recipient", "Program", "Amount", "Status"]} rows={(tables.grants ?? []).map((row) => [value(row, ["recipient_name"]), value(row, ["program_name"]), money(numberValue(row, ["distribution_amount"])), value(row, ["distribution_status"])])} />
            <RecordTable title="Volunteer Management" icon={<Users size={22} />} headers={["Volunteer", "Focus", "Hours", "Status"]} rows={volunteers.map((row) => [row.volunteer_name, row.focus_area, String(row.hours_committed ?? 0), row.volunteer_status])} />
            <RecordTable title="Global Ambassador Program" icon={<Award size={22} />} headers={["Ambassador", "Region", "Focus", "Status"]} rows={(tables.ambassadors ?? []).map((row) => [value(row, ["ambassador_name"]), value(row, ["region"]), value(row, ["focus_area"]), value(row, ["ambassador_status"])])} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="Social Impact Reporting" icon={<BarChart3 size={22} />} headers={["Report", "Period", "Status", "Published"]} rows={(tables.reports ?? []).map((row) => [value(row, ["report_title"]), value(row, ["reporting_period"]), value(row, ["report_status"]), value(row, ["published_at"])])} />
            <RecordTable title="Foundation Governance Dashboard" icon={<Landmark size={22} />} headers={["Record", "Governance Area", "Status", "Review Date"]} rows={(tables.governance ?? []).map((row) => [value(row, ["record_title"]), value(row, ["governance_area"]), value(row, ["governance_status"]), value(row, ["review_date"])])} />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="Annual Impact Reports" icon={<LineChart size={22} />} headers={["Report", "Period", "Beneficiaries", "Investment"]} rows={(tables.reports ?? []).map((row) => [value(row, ["report_title"]), value(row, ["reporting_period"]), value(row, ["beneficiaries_reached"]), money(numberValue(row, ["impact_investment"]))])} />
            <Panel title="Connected AFF Divisions" icon={<ShieldCheck size={22} />}>
              <StatLine label="Endowment Scholarship Funds" value={String((tables.endowment ?? []).length)} />
              <StatLine label="Research Institute Publications" value={String((tables.research ?? []).length)} />
              <StatLine label="Campus Expansion Records" value={String((tables.campus ?? []).length)} />
              <StatLine label="Events Division Programs" value={String((tables.events ?? []).length)} />
              <StatLine label="Executive Command Center" value="Foundation impact metrics connected" />
            </Panel>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <ExecutiveTile icon={<HandHeart size={20} />} label="Humanitarian Impact" value={String(analytics.beneficiaries)} detail="beneficiaries reached" />
            <ExecutiveTile icon={<Megaphone size={20} />} label="Campaigns" value={String(analytics.campaigns)} detail="campaigns tracked" />
            <ExecutiveTile icon={<Handshake size={20} />} label="Partnerships" value={String(analytics.partnerships)} detail="education partners" />
            <ExecutiveTile icon={<CheckCircle2 size={20} />} label="Reports" value={String(analytics.reports)} detail="impact reports archived" />
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

function StatLite({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink/54">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
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
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
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
