"use client";

import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Handshake,
  LineChart,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type CareerProfile = {
  id?: string;
  student_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  career_goal: string | null;
  forex_skills: string | null;
  certification_status: string | null;
  resume_summary: string | null;
  resume_url: string | null;
  portfolio_url: string | null;
  placement_status: string | null;
};

type Opportunity = {
  id: string;
  employer_name: string;
  title: string;
  opportunity_type: string;
  location: string | null;
  compensation: string | null;
  description: string;
  certification_required: string | null;
  status: string;
  posted_at: string;
};

type Application = {
  id: string;
  opportunity_id: string | null;
  student_name: string;
  student_email: string;
  opportunity_title: string;
  application_status: string;
  submitted_at: string;
};

type MentorMatch = {
  id: string;
  student_name: string;
  student_email: string;
  mentor_name: string | null;
  focus_area: string;
  match_status: string;
  created_at: string;
};

const adminEmail = "acafffx@gmail.com";
const initialProfile = {
  fullName: "",
  phone: "",
  careerGoal: "Forex Analyst / Junior Market Research",
  forexSkills: "Market Structure, Risk Management, Trading Journal Discipline",
  certificationStatus: "In Progress",
  resumeSummary: "",
  resumeUrl: "",
  portfolioUrl: "",
  placementStatus: "Seeking Opportunities"
};

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function CareerCenterPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<CareerProfile | null>(null);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [mentorMatches, setMentorMatches] = useState<MentorMatch[]>([]);
  const [adminTables, setAdminTables] = useState<Record<string, DbRow[]>>({});
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [mentorFocus, setMentorFocus] = useState("Career readiness and verified certification presentation");
  const [message, setMessage] = useState("Loading AFF Career and Job Placement Center...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadCareerCenter = useCallback(async () => {
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
      setIsAdmin(admin);

      const [
        profileResult,
        opportunitiesResult,
        applicationsResult,
        mentorResult,
        employersResult,
        placementsResult,
        verificationResult
      ] = await Promise.all([
        supabase.from("career_profiles").select("*").eq("student_id", user.id).maybeSingle(),
        supabase.from("career_opportunities").select("*").eq("status", "Open").order("posted_at", { ascending: false }).limit(100),
        admin
          ? supabase.from("career_applications").select("*").order("submitted_at", { ascending: false }).limit(200)
          : supabase.from("career_applications").select("*").eq("student_id", user.id).order("submitted_at", { ascending: false }).limit(50),
        admin
          ? supabase.from("career_mentor_matches").select("*").order("created_at", { ascending: false }).limit(200)
          : supabase.from("career_mentor_matches").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(50),
        admin ? supabase.from("career_employers").select("*").limit(200) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("career_placements").select("*").limit(200) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("career_employer_verifications").select("*").limit(200) : Promise.resolve({ data: [], error: null })
      ]);

      if (profileResult.error && profileResult.error.code !== "PGRST116") throw profileResult.error;
      if (opportunitiesResult.error) throw opportunitiesResult.error;
      if (applicationsResult.error) throw applicationsResult.error;
      if (mentorResult.error) throw mentorResult.error;

      const loadedProfile = profileResult.data as CareerProfile | null;
      setProfile(loadedProfile);
      setProfileForm({
        fullName: loadedProfile?.full_name ?? user.user_metadata?.name ?? "",
        phone: loadedProfile?.phone ?? "",
        careerGoal: loadedProfile?.career_goal ?? initialProfile.careerGoal,
        forexSkills: loadedProfile?.forex_skills ?? initialProfile.forexSkills,
        certificationStatus: loadedProfile?.certification_status ?? initialProfile.certificationStatus,
        resumeSummary: loadedProfile?.resume_summary ?? "",
        resumeUrl: loadedProfile?.resume_url ?? "",
        portfolioUrl: loadedProfile?.portfolio_url ?? "",
        placementStatus: loadedProfile?.placement_status ?? initialProfile.placementStatus
      });
      setOpportunities((opportunitiesResult.data ?? []) as Opportunity[]);
      setApplications((applicationsResult.data ?? []) as Application[]);
      setMentorMatches((mentorResult.data ?? []) as MentorMatch[]);
      setAdminTables({
        employers: (employersResult.data ?? []) as DbRow[],
        placements: (placementsResult.data ?? []) as DbRow[],
        verifications: (verificationResult.data ?? []) as DbRow[]
      });
      setMessage("Career Center synchronized with live placement data.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Career Center migration to enable placement records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCareerCenter();
  }, [loadCareerCenter]);

  const analytics = useMemo(() => {
    const employers = adminTables.employers ?? [];
    const placements = adminTables.placements ?? [];
    const verifications = adminTables.verifications ?? [];
    const placed = placements.filter((row) => value(row, ["placement_status"]) === "Placed").length;
    return {
      employers: employers.length,
      placements: placements.length,
      placementRate: percent(placed, placements.length),
      verifications: verifications.length,
      applications: applications.length,
      interviews: applications.filter((row) => row.application_status === "Interview").length,
      mentorMatches: mentorMatches.length
    };
  }, [adminTables, applications, mentorMatches]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId) return;
    setMessage("Saving career profile and resume builder...");

    try {
      const supabase = createClient();
      const payload = {
        student_id: studentId,
        full_name: profileForm.fullName.trim() || studentEmail,
        email: studentEmail,
        phone: profileForm.phone.trim() || null,
        career_goal: profileForm.careerGoal.trim() || null,
        forex_skills: profileForm.forexSkills.trim() || null,
        certification_status: profileForm.certificationStatus,
        resume_summary: profileForm.resumeSummary.trim() || null,
        resume_url: profileForm.resumeUrl.trim() || null,
        portfolio_url: profileForm.portfolioUrl.trim() || null,
        placement_status: profileForm.placementStatus,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from("career_profiles").upsert(payload, { onConflict: "student_id" }).select("*").single();
      if (error) throw error;
      setProfile(data as CareerProfile);
      setMessage("Career profile saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save career profile."));
    }
  }

  async function applyToOpportunity(opportunity: Opportunity) {
    setMessage("Submitting career application...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("career_applications").insert({
        student_id: studentId,
        student_name: profileForm.fullName || studentEmail,
        student_email: studentEmail,
        opportunity_id: Number(opportunity.id),
        opportunity_title: opportunity.title,
        employer_name: opportunity.employer_name,
        resume_url: profileForm.resumeUrl || null,
        certification_status: profileForm.certificationStatus,
        application_status: "Submitted"
      }).select("*").single();
      if (error) throw error;
      setApplications((current) => [data as Application, ...current]);
      setSelectedOpportunityId(opportunity.id);
      setMessage("Application submitted to employer portal.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit application."));
    }
  }

  async function requestMentorMatch() {
    setMessage("Requesting mentor match...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("career_mentor_matches").insert({
        student_id: studentId,
        student_name: profileForm.fullName || studentEmail,
        student_email: studentEmail,
        focus_area: mentorFocus,
        match_status: "Requested"
      }).select("*").single();
      if (error) throw error;
      setMentorMatches((current) => [data as MentorMatch, ...current]);
      setMessage("Mentor match request submitted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to request mentor match."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Career and Job Placement Center"
        title="Executive career services for certified AFF students and employer partners."
        text="Build student career profiles, prepare resumes, verify certifications for employers, publish internship and job opportunities, coordinate recruiters, match mentors, and track graduate placement outcomes."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Placement Operations</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadCareerCenter}>
              <RefreshCw size={16} /> Refresh Center
            </button>
          </div>

          {isAdmin ? (
            <section className="grid gap-4 md:grid-cols-4">
              <Metric icon={<Building2 size={22} />} label="Employer Partners" value={String(analytics.employers)} detail="active recruiter portal records" />
              <Metric icon={<BriefcaseBusiness size={22} />} label="Applications" value={String(analytics.applications)} detail={`${analytics.interviews} in interview stage`} />
              <Metric icon={<GraduationCap size={22} />} label="Graduate Placements" value={String(analytics.placements)} detail={`${analytics.placementRate}% placement conversion`} />
              <Metric icon={<ShieldCheck size={22} />} label="Employer Verifications" value={String(analytics.verifications)} detail="certification checks logged" />
            </section>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <form onSubmit={saveProfile} className="terminal-panel grid h-fit gap-4 p-6">
              <div className="flex items-center gap-3">
                <UserRound className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Career Profile and Resume Builder</h2>
              </div>
              <Input label="Full Name" value={profileForm.fullName} onChange={(value) => setProfileForm((current) => ({ ...current, fullName: value }))} />
              <Input label="Phone" value={profileForm.phone} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} />
              <Input label="Career Goal" value={profileForm.careerGoal} onChange={(value) => setProfileForm((current) => ({ ...current, careerGoal: value }))} />
              <Textarea label="Forex Skills" value={profileForm.forexSkills} onChange={(value) => setProfileForm((current) => ({ ...current, forexSkills: value }))} />
              <Textarea label="Resume Summary" value={profileForm.resumeSummary} onChange={(value) => setProfileForm((current) => ({ ...current, resumeSummary: value }))} />
              <Input label="Resume URL" value={profileForm.resumeUrl} onChange={(value) => setProfileForm((current) => ({ ...current, resumeUrl: value }))} />
              <Input label="Portfolio URL" value={profileForm.portfolioUrl} onChange={(value) => setProfileForm((current) => ({ ...current, portfolioUrl: value }))} />
              <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={profileForm.placementStatus} onChange={(event) => setProfileForm((current) => ({ ...current, placementStatus: event.target.value }))}>
                <option>Seeking Opportunities</option>
                <option>Interviewing</option>
                <option>Placed</option>
                <option>Not Seeking</option>
              </select>
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <FileText size={18} /> Save Career Profile
              </button>
            </form>

            <section className="grid gap-6">
              <Panel title="Certification Verification for Employers" icon={<BadgeCheck size={22} />}>
                <StatLine label="Student Email" value={studentEmail || "Signed in student"} />
                <StatLine label="Certification Status" value={profile?.certification_status ?? profileForm.certificationStatus} />
                <StatLine label="Placement Status" value={profile?.placement_status ?? profileForm.placementStatus} />
                <StatLine label="Verification Portal" value="/verify" />
              </Panel>

              <Panel title="Mentor Matching System" icon={<Handshake size={22} />}>
                <div className="grid gap-4 bg-navy-950 p-5">
                  <Input label="Mentor Focus Area" value={mentorFocus} onChange={setMentorFocus} />
                  <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-5 py-3 font-semibold text-gold-300" type="button" onClick={requestMentorMatch}>
                    <Send size={18} /> Request Mentor Match
                  </button>
                </div>
                {mentorMatches.slice(0, 4).map((match) => (
                  <StatLine key={match.id} label={match.focus_area} value={match.match_status} />
                ))}
              </Panel>
            </section>
          </section>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <div className="flex items-center gap-3">
                <Search className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Internship Listings and Job Board</h2>
              </div>
            </div>
            {loading ? (
              <p className="p-5 text-ink/68">Loading opportunities...</p>
            ) : opportunities.length === 0 ? (
              <p className="p-5 text-ink/68">No open career opportunities found.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2 xl:grid-cols-3">
                {opportunities.map((opportunity) => (
                  <article key={opportunity.id} className="bg-navy-950 p-5">
                    <p className="text-xs uppercase tracking-[.2em] text-gold-300">{opportunity.opportunity_type}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{opportunity.title}</h3>
                    <p className="mt-2 text-sm text-ink/58">{opportunity.employer_name} - {opportunity.location ?? "Remote / Hybrid"}</p>
                    <p className="mt-3 line-clamp-4 leading-7 text-ink/72">{opportunity.description}</p>
                    <p className="mt-3 text-sm text-gold-300">{opportunity.compensation ?? "Compensation disclosed by employer"}</p>
                    <button className="mt-4 inline-flex items-center gap-2 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 disabled:opacity-60" type="button" disabled={selectedOpportunityId === opportunity.id} onClick={() => applyToOpportunity(opportunity)}>
                      <Send size={16} /> {selectedOpportunityId === opportunity.id ? "Applied" : "Apply"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {isAdmin ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <RecordTable title="Recruiter Dashboard" icon={<Building2 size={22} />} headers={["Employer", "Industry", "Status", "Contact"]} rows={(adminTables.employers ?? []).map((row) => [value(row, ["employer_name"]), value(row, ["industry"]), value(row, ["portal_status"]), value(row, ["contact_email"])])} />
              <RecordTable title="Graduate Placement Tracking" icon={<LineChart size={22} />} headers={["Graduate", "Employer", "Role", "Status"]} rows={(adminTables.placements ?? []).map((row) => [value(row, ["student_name"]), value(row, ["employer_name"]), value(row, ["job_title"]), value(row, ["placement_status"])])} />
              <RecordTable title="Employer Portal Verification Log" icon={<ShieldCheck size={22} />} headers={["Employer", "Student", "Credential", "Status"]} rows={(adminTables.verifications ?? []).map((row) => [value(row, ["employer_name"]), value(row, ["student_email"]), value(row, ["credential_checked"]), value(row, ["verification_status"])])} />
              <RecordTable title="Career Applications" icon={<ClipboardList size={22} />} headers={["Student", "Opportunity", "Status", "Submitted"]} rows={applications.map((row) => [row.student_name, row.opportunity_title, row.application_status, new Date(row.submitted_at).toLocaleDateString()])} />
            </section>
          ) : null}

          <section className="grid gap-4 md:grid-cols-4">
            <ExecutiveTile icon={<FileText size={20} />} label="Resume Builder" value={profile ? "Active" : "Draft"} detail="student career profile status" />
            <ExecutiveTile icon={<BriefcaseBusiness size={20} />} label="Job Board" value={String(opportunities.length)} detail="open internships and jobs" />
            <ExecutiveTile icon={<Mail size={20} />} label="Applications" value={String(applications.length)} detail="student or recruiter-visible submissions" />
            <ExecutiveTile icon={<BarChart3 size={20} />} label="Placement Analytics" value={`${analytics.placementRate}%`} detail="graduate placement conversion" />
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
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
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
