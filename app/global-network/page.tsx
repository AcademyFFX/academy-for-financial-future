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
  Handshake,
  Languages,
  MapPin,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCog,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";
const initialRecruitment = {
  studentName: "",
  studentEmail: "",
  country: "",
  preferredLanguage: "English",
  programInterest: "Academy for Financial Future",
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

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function GlobalNetworkPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [form, setForm] = useState(initialRecruitment);
  const [message, setMessage] = useState("Loading AFF Global Network...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/global-network");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "AFF Student";
      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");
      setIsAdmin(admin);
      setForm((current) => ({ ...current, studentName: current.studentName || name, studentEmail: current.studentEmail || user.email || "" }));

      const [
        regionalResult,
        countryResult,
        campusResult,
        recruitmentResult,
        franchiseResult,
        partnerResult,
        languageResult,
        eventResult,
        standardResult,
        instructorResult,
        performanceResult
      ] = await Promise.all([
        supabase.from("global_regional_directors").select("*").order("region", { ascending: true }).limit(100),
        supabase.from("global_country_directors").select("*").order("country", { ascending: true }).limit(200),
        supabase.from("global_campus_directory").select("*").order("region", { ascending: true }).limit(200),
        admin
          ? supabase.from("global_student_recruitment").select("*").order("created_at", { ascending: false }).limit(200)
          : supabase.from("global_student_recruitment").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(50),
        admin
          ? supabase.from("global_franchise_applications").select("*").order("submitted_at", { ascending: false }).limit(200)
          : supabase.from("global_franchise_applications").select("*").eq("applicant_user_id", user.id).order("submitted_at", { ascending: false }).limit(50),
        supabase.from("global_partner_universities").select("*").order("country", { ascending: true }).limit(200),
        supabase.from("global_language_localization").select("*").order("language_name", { ascending: true }).limit(100),
        supabase.from("global_international_events").select("*").order("event_date", { ascending: true }).limit(200),
        supabase.from("global_certification_standards").select("*").order("standard_level", { ascending: true }).limit(100),
        supabase.from("global_instructor_registry").select("*").order("region", { ascending: true }).limit(200),
        supabase.from("global_campus_performance").select("*").order("reporting_period", { ascending: false }).limit(200)
      ]);

      if (regionalResult.error) throw regionalResult.error;
      if (countryResult.error) throw countryResult.error;
      if (campusResult.error) throw campusResult.error;

      setTables({
        regional: (regionalResult.data ?? []) as DbRow[],
        country: (countryResult.data ?? []) as DbRow[],
        campuses: (campusResult.data ?? []) as DbRow[],
        recruitment: (recruitmentResult.data ?? []) as DbRow[],
        franchises: (franchiseResult.data ?? []) as DbRow[],
        partners: (partnerResult.data ?? []) as DbRow[],
        languages: (languageResult.data ?? []) as DbRow[],
        events: (eventResult.data ?? []) as DbRow[],
        standards: (standardResult.data ?? []) as DbRow[],
        instructors: (instructorResult.data ?? []) as DbRow[],
        performance: (performanceResult.data ?? []) as DbRow[]
      });
      setMessage("AFF Global Network synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Global Network migration to enable international campus records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  const analytics = useMemo(() => {
    const performance = tables.performance ?? [];
    const campuses = tables.campuses ?? [];
    const recruitment = tables.recruitment ?? [];
    const instructors = tables.instructors ?? [];
    const activeCampuses = campuses.filter((row) => value(row, ["campus_status"]) === "Active").length;
    const recruited = recruitment.filter((row) => ["Enrolled", "Accepted"].includes(value(row, ["recruitment_status"]))).length;
    const certifiedInstructors = instructors.filter((row) => value(row, ["registry_status"]) === "Certified").length;
    const enrollment = performance.reduce((total, row) => total + numberValue(row, ["active_students"]), 0);
    return {
      regions: (tables.regional ?? []).length,
      countries: (tables.country ?? []).length,
      campuses: campuses.length,
      activeCampuses,
      recruitment: recruitment.length,
      recruitmentRate: percent(recruited, recruitment.length),
      franchises: (tables.franchises ?? []).length,
      partners: (tables.partners ?? []).length,
      languages: (tables.languages ?? []).length,
      events: (tables.events ?? []).length,
      standards: (tables.standards ?? []).length,
      instructors: instructors.length,
      certifiedInstructors,
      enrollment
    };
  }, [tables]);

  async function submitRecruitment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting international student recruitment record...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("global_student_recruitment").insert({
        student_id: studentId,
        student_name: form.studentName.trim() || studentName,
        student_email: form.studentEmail.trim() || studentEmail,
        country: form.country.trim(),
        preferred_language: form.preferredLanguage,
        program_interest: form.programInterest,
        notes: form.notes.trim() || null,
        recruitment_status: "Inquiry"
      }).select("*").single();

      if (error) throw error;
      setTables((current) => ({ ...current, recruitment: [data as DbRow, ...(current.recruitment ?? [])] }));
      setForm(initialRecruitment);
      setMessage("International recruitment record submitted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit recruitment record."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Global Network"
        title="International campus system for directors, recruitment, universities, standards, languages, events, and performance."
        text="Coordinate regional directors, country directors, campus directories, global franchise applications, partner universities, localization, certification standards, instructor registry, and campus analytics."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">International Campus System</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadNetwork}>
              <RefreshCw size={16} /> Refresh Network
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Globe2 size={22} />} label="Global Reach" value={`${analytics.regions}/${analytics.countries}`} detail="regions and countries directed" />
            <Metric icon={<Building2 size={22} />} label="Campuses" value={String(analytics.campuses)} detail={`${analytics.activeCampuses} active international campuses`} />
            <Metric icon={<GraduationCap size={22} />} label="Recruitment" value={String(analytics.recruitment)} detail={`${analytics.recruitmentRate}% accepted or enrolled`} />
            <Metric icon={<Award size={22} />} label="Certified Instructors" value={String(analytics.certifiedInstructors)} detail={`${analytics.instructors} registry records`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Regional and Country Directors" icon={<UserCog size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                <RecordList rows={tables.regional ?? []} empty="No regional directors found." primary={["director_name"]} secondary={["region", "director_status", "territory_count"]} />
                <RecordList rows={tables.country ?? []} empty="No country directors found." primary={["director_name"]} secondary={["country", "region", "director_status"]} />
              </div>
            </Panel>

            <Panel title="International Student Recruitment" icon={<Users size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitRecruitment}>
                <Input label="Student name" value={form.studentName} onChange={(next) => setForm((current) => ({ ...current, studentName: next }))} />
                <Input label="Student email" type="email" value={form.studentEmail} onChange={(next) => setForm((current) => ({ ...current, studentEmail: next }))} />
                <Input label="Country" value={form.country} onChange={(next) => setForm((current) => ({ ...current, country: next }))} required />
                <Input label="Preferred language" value={form.preferredLanguage} onChange={(next) => setForm((current) => ({ ...current, preferredLanguage: next }))} />
                <Input label="Program interest" value={form.programInterest} onChange={(next) => setForm((current) => ({ ...current, programInterest: next }))} />
                <Textarea label="Notes" value={form.notes} onChange={(next) => setForm((current) => ({ ...current, notes: next }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Submit Recruitment
                </button>
              </form>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Campus Directory" icon={<MapPin size={22} />}>
              <RecordList rows={tables.campuses ?? []} empty="No international campuses found." primary={["campus_name"]} secondary={["city", "country", "campus_status", "active_students"]} />
            </Panel>
            <Panel title="Partner Universities" icon={<Handshake size={22} />}>
              <RecordList rows={tables.partners ?? []} empty="No partner universities found." primary={["university_name"]} secondary={["country", "partnership_status", "program_scope"]} />
            </Panel>
            <Panel title="Language Localization" icon={<Languages size={22} />}>
              <RecordList rows={tables.languages ?? []} empty="No localization records found." primary={["language_name"]} secondary={["locale_code", "localization_status", "translated_modules"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="International Events and Franchise Applications" icon={<CalendarDays size={22} />}>
              <RecordList rows={tables.events ?? []} empty="No international events scheduled." primary={["event_title"]} secondary={["country", "event_date", "event_status", "expected_attendance"]} />
              <RecordList rows={tables.franchises ?? []} empty="No global franchise applications found." primary={["applicant_name"]} secondary={["country", "territory_requested", "application_status"]} />
            </Panel>
            <Panel title="Global Certification Standards and Instructor Registry" icon={<ShieldCheck size={22} />}>
              <RecordList rows={tables.standards ?? []} empty="No global standards found." primary={["standard_name"]} secondary={["standard_level", "standard_status"]} />
              <RecordList rows={tables.instructors ?? []} empty="No international instructors found." primary={["instructor_name"]} secondary={["country", "region", "certification_level", "registry_status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="Campus Performance Analytics" icon={<BarChart3 size={22} />}>
              <StatLine label="Active Students" value={String(analytics.enrollment)} />
              <StatLine label="Partner Universities" value={String(analytics.partners)} />
              <StatLine label="Localization Languages" value={String(analytics.languages)} />
              <StatLine label="International Events" value={String(analytics.events)} />
              <StatLine label="Certification Standards" value={String(analytics.standards)} />
            </Panel>
            <Panel title="Connected Expansion System" icon={<BookOpenText size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-3">
                <LinkCard href="/campus-expansion" label="Campus Expansion" icon={<Building2 size={20} />} />
                <LinkCard href="/university" label="Global University" icon={<GraduationCap size={20} />} />
                <LinkCard href="/accreditation" label="Accreditation" icon={<ShieldCheck size={20} />} />
                <LinkCard href="/events" label="Events Division" icon={<CalendarDays size={20} />} />
                <LinkCard href="/career-center" label="Career Center" icon={<Users size={20} />} />
                <LinkCard href="/executive-command-center" label="Command Center" icon={<BarChart3 size={20} />} />
              </div>
            </Panel>
          </section>

          {loading ? <p className="text-sm text-ink/60">Loading global network data...</p> : null}
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
          <p className="font-semibold text-white">{value(row, primary, "Global network record")}</p>
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
