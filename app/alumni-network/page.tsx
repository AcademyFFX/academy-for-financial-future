"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BadgeDollarSign,
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartCandlestick,
  Crown,
  FileCheck2,
  Globe2,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Landmark,
  LineChart,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
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

const adminEmail = "acafffx@gmail.com";
const initialMentor = {
  mentorName: "",
  mentorEmail: "",
  mentorType: "Career Coaching",
  expertise: "Forex Training Division, certification readiness, career direction",
  availability: "Monthly"
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

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

export default function AlumniNetworkPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Graduate");
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [query, setQuery] = useState("");
  const [mentorForm, setMentorForm] = useState(initialMentor);
  const [message, setMessage] = useState("Loading AFF Global Alumni Network...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadAlumni = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/alumni-network");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      const name =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
          ? user.user_metadata.name
          : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
            ? user.user_metadata.full_name
            : user.email?.split("@")[0] ?? "AFF Graduate";

      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");
      setIsAdmin(admin);
      setMentorForm((current) => ({ ...current, mentorName: current.mentorName || name, mentorEmail: current.mentorEmail || user.email || "" }));

      const [
        alumniResult,
        chaptersResult,
        groupsResult,
        mentorsResult,
        employersResult,
        eventsResult,
        donationsResult,
        awardsResult,
        storiesResult
      ] = await Promise.all([
        supabase.from("aff_alumni").select("*").order("graduation_year", { ascending: false }).limit(300),
        supabase.from("alumni_chapters").select("*").order("region", { ascending: true }).limit(200),
        supabase.from("alumni_groups").select("*").order("group_type", { ascending: true }).limit(200),
        supabase.from("alumni_mentors").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("alumni_employers").select("*").order("employer_name", { ascending: true }).limit(200),
        supabase.from("alumni_events").select("*").order("event_date", { ascending: true }).limit(200),
        admin
          ? supabase.from("alumni_donations").select("*").order("created_at", { ascending: false }).limit(300)
          : supabase.from("alumni_donations").select("*").or(`student_id.eq.${user.id},donor_email.eq.${user.email}`).order("created_at", { ascending: false }).limit(50),
        supabase.from("alumni_awards").select("*").order("awarded_at", { ascending: false }).limit(200),
        supabase.from("alumni_success_stories").select("*").order("published_at", { ascending: false }).limit(200)
      ]);

      if (alumniResult.error) throw alumniResult.error;
      if (chaptersResult.error) throw chaptersResult.error;
      if (groupsResult.error) throw groupsResult.error;

      setTables({
        alumni: (alumniResult.data ?? []) as DbRow[],
        chapters: (chaptersResult.data ?? []) as DbRow[],
        groups: (groupsResult.data ?? []) as DbRow[],
        mentors: (mentorsResult.data ?? []) as DbRow[],
        employers: (employersResult.data ?? []) as DbRow[],
        events: (eventsResult.data ?? []) as DbRow[],
        donations: (donationsResult.data ?? []) as DbRow[],
        awards: (awardsResult.data ?? []) as DbRow[],
        stories: (storiesResult.data ?? []) as DbRow[]
      });
      setMessage("AFF Global Alumni Network synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Alumni Network migration to enable lifelong alumni records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAlumni();
  }, [loadAlumni]);

  const analytics = useMemo(() => {
    const alumni = tables.alumni ?? [];
    const mentors = tables.mentors ?? [];
    const donations = tables.donations ?? [];
    const employers = tables.employers ?? [];
    const chapters = tables.chapters ?? [];
    const employed = alumni.filter((row) => value(row, ["employment_status"]) === "Employed" || value(row, ["employment_status"]) === "Founder").length;
    const earnings = alumni.reduce((total, row) => total + numberValue(row, ["estimated_annual_earnings"]), 0);
    return {
      alumni: alumni.length,
      chapters: chapters.length,
      activeChapters: chapters.filter((row) => value(row, ["chapter_status"]) === "Active").length,
      groups: (tables.groups ?? []).length,
      mentors: mentors.length,
      mentorParticipation: percent(mentors.filter((row) => value(row, ["mentor_status"]) === "Active").length, mentors.length),
      employers: employers.length,
      hiringRequests: employers.reduce((total, row) => total + numberValue(row, ["hiring_requests"]), 0),
      events: (tables.events ?? []).length,
      donations: donations.reduce((total, row) => total + numberValue(row, ["donation_amount"]), 0),
      awards: (tables.awards ?? []).length,
      stories: (tables.stories ?? []).length,
      employmentRate: percent(employed, alumni.length),
      averageEarnings: alumni.length ? Math.round(earnings / alumni.length) : 0
    };
  }, [tables]);

  const filteredAlumni = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const alumni = tables.alumni ?? [];
    if (!needle) return alumni;
    return alumni.filter((row) =>
      [
        value(row, ["full_name"]),
        value(row, ["country"]),
        value(row, ["industry"]),
        value(row, ["certifications_earned"]),
        value(row, ["career_achievements"]),
        value(row, ["research_publications"])
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, tables]);

  async function registerMentor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Registering alumni mentor profile...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("alumni_mentors")
        .insert({
          student_id: studentId,
          mentor_name: mentorForm.mentorName.trim() || studentName,
          mentor_email: mentorForm.mentorEmail.trim() || studentEmail,
          mentor_type: mentorForm.mentorType,
          expertise: mentorForm.expertise.trim(),
          availability: mentorForm.availability,
          mentor_status: "Active"
        })
        .select("*")
        .single();

      if (error) throw error;
      setTables((current) => ({ ...current, mentors: [data as DbRow, ...(current.mentors ?? [])] }));
      setMentorForm(initialMentor);
      setMessage("Alumni mentor profile registered.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to register alumni mentor profile."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Global Alumni Network"
        title="A lifelong alumni ecosystem for graduates, mentors, employers, investors, researchers, and institutional partners."
        text="Connect alumni directory records, regional chapters, professional groups, mentorship, employer hiring, alumni events, fundraising, awards, and executive analytics across the global AFF community."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Lifelong Graduate Ecosystem</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-sm text-ink/54">{loading ? "Loading alumni records..." : `${studentName} - ${studentEmail}`}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadAlumni}>
              <RefreshCw size={16} /> Refresh Alumni Network
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<GraduationCap size={22} />} label="Alumni Growth" value={String(analytics.alumni)} detail="graduate profiles worldwide" />
            <Metric icon={<BriefcaseBusiness size={22} />} label="Employment Rate" value={`${analytics.employmentRate}%`} detail={`${money(analytics.averageEarnings)} average reported earnings`} />
            <Metric icon={<HeartHandshake size={22} />} label="Mentor Participation" value={`${analytics.mentorParticipation}%`} detail={`${analytics.mentors} alumni mentors`} />
            <Metric icon={<BadgeDollarSign size={22} />} label="Donations" value={money(analytics.donations)} detail="scholarship, research, campus, and endowment support" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Alumni Directory" icon={<Users size={22} />}>
              <div className="bg-navy-950 p-5">
                <label className="text-xs uppercase tracking-[.18em] text-gold-300" htmlFor="alumni-search">Alumni Search</label>
                <div className="mt-3 flex items-center gap-3 border border-gold-500/25 bg-navy-900 px-4 py-3">
                  <Search className="text-gold-300" size={18} />
                  <input id="alumni-search" className="w-full bg-transparent text-white outline-none" placeholder="Search by name, country, industry, certification, research, or achievement" value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
              </div>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                <RecordList rows={filteredAlumni} empty="No alumni profiles found." primary={["full_name"]} secondary={["graduation_year", "certifications_earned", "industry", "country"]} />
              </div>
            </Panel>

            <Panel title="Mentorship System" icon={<Handshake size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={registerMentor}>
                <Input label="Mentor name" value={mentorForm.mentorName} onChange={(next) => setMentorForm((current) => ({ ...current, mentorName: next }))} />
                <Input label="Mentor email" type="email" value={mentorForm.mentorEmail} onChange={(next) => setMentorForm((current) => ({ ...current, mentorEmail: next }))} />
                <Select label="Mentor type" value={mentorForm.mentorType} onChange={(next) => setMentorForm((current) => ({ ...current, mentorType: next }))} options={["Career Coaching", "Trading Coaching", "Leadership Coaching", "Research Mentorship", "Student Mentoring"]} />
                <Textarea label="Expertise" value={mentorForm.expertise} onChange={(next) => setMentorForm((current) => ({ ...current, expertise: next }))} />
                <Select label="Availability" value={mentorForm.availability} onChange={(next) => setMentorForm((current) => ({ ...current, availability: next }))} options={["Weekly", "Monthly", "Quarterly", "By Request"]} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Register Mentor
                </button>
              </form>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Regional and Country Chapters" icon={<Globe2 size={22} />}>
              <RecordList rows={tables.chapters ?? []} empty="No alumni chapters found." primary={["chapter_name"]} secondary={["region", "country", "chapter_status", "member_count"]} />
            </Panel>
            <Panel title="Industry, Trading, Research, and Civic Groups" icon={<Scale size={22} />}>
              <RecordList rows={tables.groups ?? []} empty="No alumni groups found." primary={["group_name"]} secondary={["group_type", "focus_area", "member_count", "group_status"]} />
            </Panel>
            <Panel title="Employer Portal" icon={<BriefcaseBusiness size={22} />}>
              <RecordList rows={tables.employers ?? []} empty="No alumni employers found." primary={["employer_name"]} secondary={["industry", "hiring_requests", "matching_status", "verification_status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Alumni Events" icon={<CalendarDays size={22} />}>
              <RecordList rows={tables.events ?? []} empty="No alumni events found." primary={["event_title"]} secondary={["event_type", "event_date", "registration_status", "attendee_count"]} />
            </Panel>
            <Panel title="Alumni Fundraising" icon={<Landmark size={22} />}>
              <RecordList rows={tables.donations ?? []} empty="No alumni donations found." primary={["donor_name"]} secondary={["donation_type", "donation_amount", "campaign_name", "created_at"]} />
            </Panel>
            <Panel title="Alumni Recognition" icon={<Trophy size={22} />}>
              <RecordList rows={tables.awards ?? []} empty="No alumni awards found." primary={["award_title"]} secondary={["recipient_name", "award_category", "awarded_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Success Stories and Hall of Fame" icon={<Crown size={22} />}>
              <RecordList rows={tables.stories ?? []} empty="No alumni success stories found." primary={["story_title"]} secondary={["alumni_name", "story_category", "published_at"]} />
            </Panel>
            <Panel title="Executive Analytics" icon={<BarChart3 size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                <Stat label="Global Chapter Activity" value={`${analytics.activeChapters}/${analytics.chapters}`} />
                <Stat label="Alumni Groups" value={String(analytics.groups)} />
                <Stat label="Employer Hiring Requests" value={String(analytics.hiringRequests)} />
                <Stat label="Alumni Events" value={String(analytics.events)} />
                <Stat label="Recognition Records" value={String(analytics.awards)} />
                <Stat label="Success Stories" value={String(analytics.stories)} />
              </div>
              <div className="mt-5 grid gap-3">
                <LinkButton href="/career-center" label="Career Center" icon={<BriefcaseBusiness size={18} />} />
                <LinkButton href="/endowment-fund" label="Endowment Fund" icon={<BadgeDollarSign size={18} />} />
                <LinkButton href="/executive-command-center" label="Executive Command" icon={<LineChart size={18} />} />
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
          <p className="font-semibold text-white">{value(row, primary, "AFF alumni record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            {secondary
              .map((key) => (key.includes("_at") || key.includes("date") ? shortDate(value(row, [key])) : value(row, [key])))
              .filter(Boolean)
              .join(" - ")}
          </p>
        </div>
      ))}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (next: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm text-ink/72">
      <span className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</span>
      <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (next: string) => void; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm text-ink/72">
      <span className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</span>
      <select className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  return (
    <label className="grid gap-2 text-sm text-ink/72">
      <span className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</span>
      <textarea className="min-h-24 border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="font-semibold text-white">{value}</span>
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
