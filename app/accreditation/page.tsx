"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileBadge,
  FileCheck2,
  GraduationCap,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Stamp,
  UserCheck
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type QueryResult = { table: string; data: DbRow[]; error?: string };

const adminEmail = "acafffx@gmail.com";
const tables = [
  "aff_accreditation_records",
  "aff_instructor_applications",
  "aff_instructor_certifications",
  "aff_continuing_education_credits",
  "aff_franchise_licenses",
  "aff_partner_institutions",
  "aff_license_renewals",
  "aff_compliance_reviews",
  "aff_digital_credentials"
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

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function dateIsWithin(raw: string, days: number) {
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  const diff = date.getTime() - Date.now();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

export default function AccreditationPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading Accreditation and Licensing Division...");
  const [datasets, setDatasets] = useState<Record<string, DbRow[]>>({});
  const [tableErrors, setTableErrors] = useState<string[]>([]);

  const loadDivision = useCallback(async () => {
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

      if (user.email?.toLowerCase() !== adminEmail) {
        setAuthorized(false);
        setMessage("Accreditation and licensing records are restricted to the Academy administrator account.");
        return;
      }

      setAuthorized(true);

      const results = await Promise.all(
        tables.map(async (table): Promise<QueryResult> => {
          const { data, error } = await supabase.from(table).select("*").limit(1000);
          return { table, data: (data ?? []) as DbRow[], error: error?.message };
        })
      );

      setDatasets(Object.fromEntries(results.map((result) => [result.table, result.data])));
      setTableErrors(results.filter((result) => result.error).map((result) => `${result.table}: ${result.error}`));
      setMessage("Accreditation and Licensing Division synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load accreditation records.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDivision();
  }, [loadDivision]);

  const analytics = useMemo(() => {
    const accreditations = datasets.aff_accreditation_records ?? [];
    const applications = datasets.aff_instructor_applications ?? [];
    const certifications = datasets.aff_instructor_certifications ?? [];
    const ceCredits = datasets.aff_continuing_education_credits ?? [];
    const franchises = datasets.aff_franchise_licenses ?? [];
    const partners = datasets.aff_partner_institutions ?? [];
    const renewals = datasets.aff_license_renewals ?? [];
    const compliance = datasets.aff_compliance_reviews ?? [];
    const credentials = datasets.aff_digital_credentials ?? [];

    const activeCertifications = certifications.filter((row) => value(row, ["certification_status"]) === "Active").length;
    const activeFranchises = franchises.filter((row) => value(row, ["license_status"]) === "Active").length;
    const activePartners = partners.filter((row) => value(row, ["partnership_status"]) === "Active").length;
    const pendingApplications = applications.filter((row) => value(row, ["application_status"]) === "Submitted").length;
    const pendingRenewals = renewals.filter((row) => value(row, ["renewal_status"]) === "Pending").length;
    const compliantReviews = compliance.filter((row) => value(row, ["review_status"]) === "Compliant").length;
    const expiringCredentials = credentials.filter((row) => dateIsWithin(value(row, ["expiration_date"]), 90)).length;
    const totalCredits = ceCredits.reduce((total, row) => total + numberValue(row, ["credit_hours"]), 0);

    return {
      accreditations,
      applications,
      certifications,
      ceCredits,
      franchises,
      partners,
      renewals,
      compliance,
      credentials,
      activeCertifications,
      activeFranchises,
      activePartners,
      pendingApplications,
      pendingRenewals,
      compliantReviews,
      complianceRate: percent(compliantReviews, compliance.length),
      expiringCredentials,
      totalCredits
    };
  }, [datasets]);

  if (!authorized && !loading) {
    return (
      <>
        <PageHeader eyebrow="AFF Licensing Division" title="Accreditation access is restricted." text={message} />
        <Section>
          <SectionInner>
            <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950" type="button" onClick={() => router.replace("/login")}>
              Return to Login
            </button>
          </SectionInner>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Accreditation and Licensing Division"
        title="Executive oversight for AFF credentials, institutional partners, and licensed academy operations."
        text="Manage instructor certification, academy accreditation, continuing education credits, franchise licensing, partner institutions, renewals, compliance tracking, and digital credential governance."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Division Status</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadDivision}>
              <RefreshCw size={16} /> Refresh Records
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<UserCheck size={22} />} label="Certified Instructors" value={String(analytics.activeCertifications)} detail={`${analytics.pendingApplications} applications pending`} />
            <Metric icon={<Building2 size={22} />} label="Partner Institutions" value={String(analytics.activePartners)} detail={`${analytics.accreditations.length} accreditation records`} />
            <Metric icon={<Landmark size={22} />} label="Franchise Licenses" value={String(analytics.activeFranchises)} detail={`${analytics.pendingRenewals} renewals pending`} />
            <Metric icon={<ShieldCheck size={22} />} label="Compliance Rate" value={`${analytics.complianceRate}%`} detail={`${analytics.expiringCredentials} credentials expire within 90 days`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Credential Governance" icon={<FileBadge size={22} />}>
              <StatLine label="Digital Credentials" value={String(analytics.credentials.length)} />
              <StatLine label="Active Instructor Certifications" value={String(analytics.activeCertifications)} />
              <StatLine label="Continuing Education Hours" value={String(analytics.totalCredits)} />
              <StatLine label="Accreditation Records" value={String(analytics.accreditations.length)} />
              <StatLine label="Compliance Reviews" value={String(analytics.compliance.length)} />
            </Panel>

            <Panel title="Renewal and Compliance Watch" icon={<CalendarClock size={22} />}>
              <ProgressRow label="Compliance Reviews" value={analytics.complianceRate} detail={`${analytics.compliantReviews}/${analytics.compliance.length} marked compliant`} />
              <StatLine label="Pending Renewals" value={String(analytics.pendingRenewals)} />
              <StatLine label="Credentials Expiring Soon" value={String(analytics.expiringCredentials)} />
              <StatLine label="Pending Instructor Applications" value={String(analytics.pendingApplications)} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable
              title="Instructor Applications"
              icon={<ClipboardCheck size={22} />}
              headers={["Applicant", "Program", "Status", "Submitted"]}
              rows={analytics.applications.map((row) => [
                value(row, ["applicant_name"]),
                value(row, ["program_requested"]),
                value(row, ["application_status"]),
                formatDate(value(row, ["submitted_at", "created_at"]))
              ])}
            />
            <RecordTable
              title="Franchise Licensing"
              icon={<Stamp size={22} />}
              headers={["Licensee", "Territory", "Status", "Renewal"]}
              rows={analytics.franchises.map((row) => [
                value(row, ["licensee_name"]),
                value(row, ["territory"]),
                value(row, ["license_status"]),
                formatDate(value(row, ["renewal_due_date"]))
              ])}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable
              title="Partner Institutions"
              icon={<Building2 size={22} />}
              headers={["Institution", "Type", "Status", "Contact"]}
              rows={analytics.partners.map((row) => [
                value(row, ["institution_name"]),
                value(row, ["institution_type"]),
                value(row, ["partnership_status"]),
                value(row, ["contact_email"])
              ])}
            />
            <RecordTable
              title="Digital Credential Registry"
              icon={<Award size={22} />}
              headers={["Credential", "Holder", "Status", "Verification"]}
              rows={analytics.credentials.map((row) => [
                value(row, ["credential_title"]),
                value(row, ["holder_name"]),
                value(row, ["credential_status"]),
                value(row, ["verification_code"])
              ])}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <ExecutiveTile icon={<GraduationCap size={20} />} label="Instructor Certification" value={String(analytics.certifications.length)} detail="credentialed educator records" />
            <ExecutiveTile icon={<FileCheck2 size={20} />} label="CE Credits" value={String(analytics.totalCredits)} detail="approved continuing education hours" />
            <ExecutiveTile icon={<BadgeCheck size={20} />} label="Accreditation" value={String(analytics.accreditations.length)} detail="academy authorization records" />
            <ExecutiveTile icon={<CheckCircle2 size={20} />} label="Compliance" value={`${analytics.complianceRate}%`} detail="division compliance health" />
          </section>

          {tableErrors.length > 0 ? (
            <details className="terminal-panel p-5 text-sm text-ink/68">
              <summary className="cursor-pointer text-gold-300">Accreditation data sources needing migration or RLS access</summary>
              <ul className="mt-4 grid gap-2">
                {tableErrors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            </details>
          ) : null}
        </SectionInner>
      </Section>
    </>
  );
}

function formatDate(raw: string) {
  if (!raw) return "Not recorded";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
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

function ProgressRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="bg-navy-950 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm font-semibold text-gold-300">{value}%</p>
      </div>
      <div className="mt-3 h-2 bg-navy-800">
        <div className="h-full bg-gold-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink/54">{detail}</p>
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
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
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
