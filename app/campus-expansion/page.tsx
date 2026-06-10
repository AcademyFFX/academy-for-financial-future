"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  Globe2,
  GraduationCap,
  Handshake,
  Landmark,
  Map,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type Campus = {
  id: string;
  campus_name: string;
  region: string;
  country: string;
  city: string | null;
  campus_status: string;
  director_name: string | null;
  enrollment_count: number | null;
  monthly_revenue: number | null;
};

type FranchiseApplication = {
  id: string;
  applicant_name: string;
  territory_requested: string;
  application_status: string;
  submitted_at: string;
};

type RegionalDirector = {
  id: string;
  director_name: string;
  region: string;
  director_status: string;
};

const adminEmail = "acafffx@gmail.com";
const initialApplication = {
  applicantName: "",
  applicantEmail: "",
  phone: "",
  country: "",
  territoryRequested: "",
  investmentReadiness: "Exploring",
  experienceSummary: ""
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

export default function CampusExpansionPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("Applicant");
  const [isAdmin, setIsAdmin] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [applications, setApplications] = useState<FranchiseApplication[]>([]);
  const [directors, setDirectors] = useState<RegionalDirector[]>([]);
  const [adminTables, setAdminTables] = useState<Record<string, DbRow[]>>({});
  const [applicationForm, setApplicationForm] = useState(initialApplication);
  const [message, setMessage] = useState("Loading Global Franchise and Campus Expansion Division...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadExpansion = useCallback(async () => {
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
      setApplicationForm((current) => ({ ...current, applicantName: current.applicantName || user.user_metadata?.name || "", applicantEmail: current.applicantEmail || user.email || "" }));

      const [
        campusesResult,
        applicationsResult,
        directorsResult,
        instructorResult,
        enrollmentResult,
        revenueResult,
        territoryResult,
        localEventsResult,
        partnersResult,
        renewalsResult,
        accreditationResult,
        careerResult
      ] = await Promise.all([
        supabase.from("campus_directory").select("*").order("region", { ascending: true }).limit(200),
        admin
          ? supabase.from("campus_franchise_applications").select("*").order("submitted_at", { ascending: false }).limit(200)
          : supabase.from("campus_franchise_applications").select("*").eq("applicant_user_id", user.id).order("submitted_at", { ascending: false }).limit(50),
        supabase.from("campus_regional_directors").select("*").order("region", { ascending: true }).limit(100),
        admin ? supabase.from("campus_instructor_certifications").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_enrollment_reports").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_revenue_reports").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_territories").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_local_events").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_partner_institutions").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_franchise_renewals").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("aff_partner_institutions").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("career_employers").select("*").limit(100) : Promise.resolve({ data: [], error: null })
      ]);

      if (campusesResult.error) throw campusesResult.error;
      if (applicationsResult.error) throw applicationsResult.error;
      if (directorsResult.error) throw directorsResult.error;

      setCampuses((campusesResult.data ?? []) as Campus[]);
      setApplications((applicationsResult.data ?? []) as FranchiseApplication[]);
      setDirectors((directorsResult.data ?? []) as RegionalDirector[]);
      setAdminTables({
        instructorCertifications: (instructorResult.data ?? []) as DbRow[],
        enrollment: (enrollmentResult.data ?? []) as DbRow[],
        revenue: (revenueResult.data ?? []) as DbRow[],
        territories: (territoryResult.data ?? []) as DbRow[],
        localEvents: (localEventsResult.data ?? []) as DbRow[],
        partners: (partnersResult.data ?? []) as DbRow[],
        renewals: (renewalsResult.data ?? []) as DbRow[],
        accreditationPartners: (accreditationResult.data ?? []) as DbRow[],
        careerEmployers: (careerResult.data ?? []) as DbRow[]
      });
      setMessage("Campus Expansion Division synchronized with global operating records.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Campus Expansion migration to enable global expansion records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadExpansion();
  }, [loadExpansion]);

  const analytics = useMemo(() => {
    const enrollment = adminTables.enrollment ?? [];
    const revenue = adminTables.revenue ?? [];
    const territories = adminTables.territories ?? [];
    const renewals = adminTables.renewals ?? [];
    const activeCampuses = campuses.filter((campus) => campus.campus_status === "Active").length;
    const reservedTerritories = territories.filter((row) => value(row, ["territory_status"]) === "Reserved").length;
    const grossRevenue = revenue.reduce((total, row) => total + numberValue(row, ["gross_revenue"]), 0);
    const totalEnrollment = enrollment.reduce((total, row) => total + numberValue(row, ["active_students"]), 0);
    return {
      activeCampuses,
      totalEnrollment: totalEnrollment || campuses.reduce((total, campus) => total + Number(campus.enrollment_count ?? 0), 0),
      grossRevenue: grossRevenue || campuses.reduce((total, campus) => total + Number(campus.monthly_revenue ?? 0), 0),
      applications: applications.length,
      directors: directors.length,
      territories: territories.length,
      territoryOccupancy: percent(reservedTerritories, territories.length),
      localEvents: (adminTables.localEvents ?? []).length,
      partners: (adminTables.partners ?? []).length,
      renewals: renewals.filter((row) => value(row, ["renewal_status"]) === "Pending").length,
      instructorCertifications: (adminTables.instructorCertifications ?? []).length
    };
  }, [adminTables, applications.length, campuses, directors.length]);

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting franchise application...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("campus_franchise_applications").insert({
        applicant_user_id: studentId,
        applicant_name: applicationForm.applicantName.trim() || studentName,
        applicant_email: applicationForm.applicantEmail.trim() || studentEmail,
        phone: applicationForm.phone.trim() || null,
        country: applicationForm.country.trim() || null,
        territory_requested: applicationForm.territoryRequested.trim(),
        investment_readiness: applicationForm.investmentReadiness,
        experience_summary: applicationForm.experienceSummary.trim() || null,
        application_status: "Submitted"
      }).select("*").single();

      if (error) throw error;
      setApplications((current) => [data as FranchiseApplication, ...current]);
      setApplicationForm(initialApplication);
      setMessage("Franchise application submitted to AFF expansion review.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit franchise application."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Global Franchise and Campus Expansion Division"
        title="Executive command center for AFF campuses, territories, franchise partners, and global growth."
        text="Manage campus directories, franchise applications, regional directors, instructor certification, enrollment dashboards, revenue reporting, territory controls, local events, partner institutions, renewals, and global expansion analytics."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Expansion Operations</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadExpansion}>
              <RefreshCw size={16} /> Refresh Expansion
            </button>
          </div>

          {isAdmin ? (
            <section className="grid gap-4 md:grid-cols-4">
              <Metric icon={<Building2 size={22} />} label="Active Campuses" value={String(analytics.activeCampuses)} detail={`${analytics.directors} regional directors`} />
              <Metric icon={<Users size={22} />} label="Campus Enrollment" value={String(analytics.totalEnrollment)} detail="active students across campus reports" />
              <Metric icon={<DollarSign size={22} />} label="Campus Revenue" value={money(analytics.grossRevenue)} detail="gross revenue reporting" />
              <Metric icon={<Map size={22} />} label="Territory Occupancy" value={`${analytics.territoryOccupancy}%`} detail={`${analytics.territories} territories tracked`} />
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <Globe2 className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Campus Directory</h2>
                </div>
              </div>
              {loading ? (
                <p className="p-5 text-ink/68">Loading campus directory...</p>
              ) : campuses.length === 0 ? (
                <p className="p-5 text-ink/68">No campus records found.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                  {campuses.map((campus) => (
                    <article key={campus.id} className="bg-navy-950 p-5">
                      <p className="text-xs uppercase tracking-[.2em] text-gold-300">{campus.region}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{campus.campus_name}</h3>
                      <p className="mt-2 text-sm text-ink/58">{campus.city ?? "Regional"} - {campus.country}</p>
                      <div className="mt-4 grid gap-2 text-sm text-ink/72">
                        <StatLite label="Status" value={campus.campus_status} />
                        <StatLite label="Director" value={campus.director_name ?? "Pending assignment"} />
                        <StatLite label="Enrollment" value={String(campus.enrollment_count ?? 0)} />
                        <StatLite label="Monthly Revenue" value={money(Number(campus.monthly_revenue ?? 0))} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={submitApplication} className="terminal-panel grid h-fit gap-4 p-6">
              <div className="flex items-center gap-3">
                <Send className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Franchise Application System</h2>
              </div>
              <Input label="Applicant Name" value={applicationForm.applicantName} onChange={(v) => setApplicationForm((c) => ({ ...c, applicantName: v }))} />
              <Input label="Applicant Email" value={applicationForm.applicantEmail} onChange={(v) => setApplicationForm((c) => ({ ...c, applicantEmail: v }))} />
              <Input label="Phone" value={applicationForm.phone} onChange={(v) => setApplicationForm((c) => ({ ...c, phone: v }))} />
              <Input label="Country" value={applicationForm.country} onChange={(v) => setApplicationForm((c) => ({ ...c, country: v }))} />
              <Input label="Territory Requested" value={applicationForm.territoryRequested} onChange={(v) => setApplicationForm((c) => ({ ...c, territoryRequested: v }))} required />
              <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={applicationForm.investmentReadiness} onChange={(e) => setApplicationForm((c) => ({ ...c, investmentReadiness: e.target.value }))}>
                <option>Exploring</option>
                <option>Ready Now</option>
                <option>Needs Financing</option>
                <option>Institutional Partner</option>
              </select>
              <Textarea label="Experience Summary" value={applicationForm.experienceSummary} onChange={(v) => setApplicationForm((c) => ({ ...c, experienceSummary: v }))} />
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <Send size={18} /> Submit Application
              </button>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Regional Director Management" icon={<UserCog size={22} />}>
              {directors.length === 0 ? <p className="bg-navy-950 p-5 text-ink/68">No regional directors found.</p> : null}
              {directors.map((director) => <StatLine key={director.id} label={`${director.director_name} - ${director.region}`} value={director.director_status} />)}
            </Panel>
            <Panel title="Campus Instructor Certification Tracking" icon={<Award size={22} />}>
              {(adminTables.instructorCertifications ?? []).length === 0 ? <p className="bg-navy-950 p-5 text-ink/68">No campus instructor certifications found.</p> : null}
              {(adminTables.instructorCertifications ?? []).map((row) => <StatLine key={`inst-${value(row, ["id"])}`} label={`${value(row, ["instructor_name"])} - ${value(row, ["campus_name"])}`} value={value(row, ["certification_status"])} />)}
            </Panel>
          </section>

          {isAdmin ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <RecordTable title="Campus Enrollment Dashboard" icon={<GraduationCap size={22} />} headers={["Campus", "Period", "Active Students", "New Enrollments"]} rows={(adminTables.enrollment ?? []).map((row) => [value(row, ["campus_name"]), value(row, ["reporting_period"]), value(row, ["active_students"]), value(row, ["new_enrollments"])])} />
              <RecordTable title="Campus Revenue Reporting" icon={<DollarSign size={22} />} headers={["Campus", "Period", "Gross Revenue", "Status"]} rows={(adminTables.revenue ?? []).map((row) => [value(row, ["campus_name"]), value(row, ["reporting_period"]), money(numberValue(row, ["gross_revenue"])), value(row, ["report_status"])])} />
              <RecordTable title="Territory Management" icon={<MapPin size={22} />} headers={["Territory", "Region", "Status", "Director"]} rows={(adminTables.territories ?? []).map((row) => [value(row, ["territory_name"]), value(row, ["region"]), value(row, ["territory_status"]), value(row, ["regional_director"])])} />
              <RecordTable title="Local Event Management" icon={<CalendarDays size={22} />} headers={["Event", "Campus", "Date", "Status"]} rows={(adminTables.localEvents ?? []).map((row) => [value(row, ["event_title"]), value(row, ["campus_name"]), value(row, ["event_date"]), value(row, ["event_status"])])} />
              <RecordTable title="Partner Institution Management" icon={<Handshake size={22} />} headers={["Partner", "Campus", "Status", "Scope"]} rows={(adminTables.partners ?? []).map((row) => [value(row, ["institution_name"]), value(row, ["campus_name"]), value(row, ["partnership_status"]), value(row, ["program_scope"])])} />
              <RecordTable title="Franchise Renewal Monitoring" icon={<ShieldCheck size={22} />} headers={["Campus", "Renewal Due", "Status", "Notes"]} rows={(adminTables.renewals ?? []).map((row) => [value(row, ["campus_name"]), value(row, ["renewal_due_date"]), value(row, ["renewal_status"]), value(row, ["notes"])])} />
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="Franchise Applications" icon={<ClipboardCheck size={22} />} headers={["Applicant", "Territory", "Status", "Submitted"]} rows={applications.map((row) => [row.applicant_name, row.territory_requested, row.application_status, new Date(row.submitted_at).toLocaleDateString()])} />
            <Panel title="Connected Divisions" icon={<Landmark size={22} />}>
              <StatLine label="Accreditation Division Partners" value={String((adminTables.accreditationPartners ?? []).length)} />
              <StatLine label="Events Division Local Events" value={String(analytics.localEvents)} />
              <StatLine label="Career Center Employer Partners" value={String((adminTables.careerEmployers ?? []).length)} />
              <StatLine label="Executive Command Center" value="Expansion metrics connected" />
            </Panel>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <ExecutiveTile icon={<TrendingUp size={20} />} label="Global Expansion" value={String(campuses.length)} detail="campuses in directory" />
            <ExecutiveTile icon={<BadgeCheck size={20} />} label="Franchise Pipeline" value={String(analytics.applications)} detail="applications tracked" />
            <ExecutiveTile icon={<CheckCircle2 size={20} />} label="Renewals" value={String(analytics.renewals)} detail="pending franchise renewals" />
            <ExecutiveTile icon={<BarChart3 size={20} />} label="Revenue" value={money(analytics.grossRevenue)} detail="campus reporting total" />
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Input({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm text-ink/72">
      {label}
      <input required={required} className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)} />
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
