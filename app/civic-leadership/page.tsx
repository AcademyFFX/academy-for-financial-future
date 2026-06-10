"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HandHeart,
  Landmark,
  MessageSquare,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
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
  description: string | null;
  program_status: string;
  enrolled_count: number | null;
  completion_count: number | null;
};

const adminEmail = "acafffx@gmail.com";

const initialServiceForm = {
  serviceProject: "",
  serviceCategory: "Community Outreach",
  hours: "1",
  notes: ""
};

const initialJournalForm = {
  journalTitle: "",
  leadershipTheme: "Moral Responsibility",
  reflection: ""
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

export default function CivicLeadershipPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("Student Leader");
  const [isAdmin, setIsAdmin] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [journalForm, setJournalForm] = useState(initialJournalForm);
  const [message, setMessage] = useState("Loading Institute for Civic and Moral Leadership...");
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
        router.replace("/login");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      setStudentId(user.id);
      setStudentEmail(user.email ?? "");
      setStudentName(typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Student Leader");
      setIsAdmin(admin);

      const [
        programsResult,
        serviceResult,
        journalsResult,
        forumsResult,
        publicationsResult,
        outreachResult,
        certificationsResult,
        examsResult,
        researchResult,
        foundationResult,
        careerResult,
        campusResult
      ] = await Promise.all([
        supabase.from("civic_programs").select("*").order("program_type", { ascending: true }).limit(200),
        admin
          ? supabase.from("civic_service_hours").select("*").order("served_at", { ascending: false }).limit(200)
          : supabase.from("civic_service_hours").select("*").eq("student_id", user.id).order("served_at", { ascending: false }).limit(50),
        admin
          ? supabase.from("civic_student_journals").select("*").order("created_at", { ascending: false }).limit(200)
          : supabase.from("civic_student_journals").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("civic_policy_forums").select("*").order("scheduled_at", { ascending: true }).limit(100),
        supabase.from("civic_research_publications").select("*").order("published_at", { ascending: false }).limit(100),
        supabase.from("civic_outreach_projects").select("*").order("created_at", { ascending: false }).limit(100),
        admin
          ? supabase.from("civic_ethics_certifications").select("*").order("issued_at", { ascending: false }).limit(200)
          : supabase.from("civic_ethics_certifications").select("*").eq("student_id", user.id).order("issued_at", { ascending: false }).limit(50),
        admin
          ? supabase.from("civic_leadership_exams").select("*").order("submitted_at", { ascending: false }).limit(200)
          : supabase.from("civic_leadership_exams").select("*").eq("student_id", user.id).order("submitted_at", { ascending: false }).limit(50),
        admin ? supabase.from("research_publications").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("foundation_programs").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("career_placements").select("*").limit(100) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("campus_directory").select("*").limit(100) : Promise.resolve({ data: [], error: null })
      ]);

      if (programsResult.error) throw programsResult.error;
      if (serviceResult.error) throw serviceResult.error;
      if (journalsResult.error) throw journalsResult.error;

      setPrograms((programsResult.data ?? []) as Program[]);
      setTables({
        service: (serviceResult.data ?? []) as DbRow[],
        journals: (journalsResult.data ?? []) as DbRow[],
        forums: (forumsResult.data ?? []) as DbRow[],
        publications: (publicationsResult.data ?? []) as DbRow[],
        outreach: (outreachResult.data ?? []) as DbRow[],
        certifications: (certificationsResult.data ?? []) as DbRow[],
        exams: (examsResult.data ?? []) as DbRow[],
        research: (researchResult.data ?? []) as DbRow[],
        foundation: (foundationResult.data ?? []) as DbRow[],
        career: (careerResult.data ?? []) as DbRow[],
        campus: (campusResult.data ?? []) as DbRow[]
      });
      setMessage("Civic and Moral Leadership Institute synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Civic and Moral Leadership migration to enable institute records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadInstitute();
  }, [loadInstitute]);

  const analytics = useMemo(() => {
    const service = tables.service ?? [];
    const journals = tables.journals ?? [];
    const outreach = tables.outreach ?? [];
    const certifications = tables.certifications ?? [];
    const exams = tables.exams ?? [];
    const totalEnrolled = programs.reduce((total, program) => total + Number(program.enrolled_count ?? 0), 0);
    const totalCompleted = programs.reduce((total, program) => total + Number(program.completion_count ?? 0), 0);
    const serviceHours = service.reduce((total, row) => total + numberValue(row, ["hours"]), 0);
    const averageExam = exams.length ? Math.round(exams.reduce((total, row) => total + numberValue(row, ["score"]), 0) / exams.length) : 0;

    return {
      programs: programs.length,
      totalEnrolled,
      completionRate: percent(totalCompleted, Math.max(totalEnrolled, 1)),
      serviceHours,
      journals: journals.length,
      forums: (tables.forums ?? []).length,
      publications: (tables.publications ?? []).length,
      outreachProjects: outreach.length,
      impactScore: outreach.reduce((total, row) => total + numberValue(row, ["impact_score"]), 0),
      certifications: certifications.length,
      exams: exams.length,
      averageExam,
      connectedResearch: (tables.research ?? []).length,
      connectedFoundation: (tables.foundation ?? []).length,
      connectedCareer: (tables.career ?? []).length,
      connectedCampus: (tables.campus ?? []).length
    };
  }, [programs, tables]);

  async function submitService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting community service record...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("civic_service_hours").insert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        service_project: serviceForm.serviceProject.trim(),
        service_category: serviceForm.serviceCategory,
        hours: Number(serviceForm.hours),
        notes: serviceForm.notes.trim() || null,
        service_status: "Submitted"
      }).select("*").single();

      if (error) throw error;
      setTables((current) => ({ ...current, service: [data as DbRow, ...(current.service ?? [])] }));
      setServiceForm(initialServiceForm);
      setMessage("Community service record submitted for leadership review.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit community service record."));
    }
  }

  async function submitJournal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting leadership journal...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("civic_student_journals").insert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        journal_title: journalForm.journalTitle.trim(),
        leadership_theme: journalForm.leadershipTheme,
        reflection: journalForm.reflection.trim(),
        review_status: "Submitted"
      }).select("*").single();

      if (error) throw error;
      setTables((current) => ({ ...current, journals: [data as DbRow, ...(current.journals ?? [])] }));
      setJournalForm(initialJournalForm);
      setMessage("Student leadership journal submitted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit leadership journal."));
    }
  }

  async function startLeadershipExam() {
    setMessage("Opening Leadership Certification Exam record...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("civic_leadership_exams").insert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        exam_title: "Civic and Moral Leadership Certification Exam",
        score: 0,
        result: "In Progress"
      }).select("*").single();

      if (error) throw error;
      setTables((current) => ({ ...current, exams: [data as DbRow, ...(current.exams ?? [])] }));
      setMessage("Leadership Certification Exam record created.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to create leadership exam record."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Institute for Civic and Moral Leadership"
        title="Civic literacy, ethics, public policy, and servant leadership inside the AFF academic system."
        text="Advance student formation through constitutional studies, moral responsibility, public policy dialogue, community service, leadership journals, social impact analytics, and leadership certification exams."
      />

      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Civic Leadership Operations</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadInstitute}>
              <RefreshCw size={16} /> Refresh Institute
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Scale size={22} />} label="Leadership Academies" value={String(analytics.programs)} detail={`${analytics.totalEnrolled} learners tracked`} />
            <Metric icon={<HandHeart size={22} />} label="Community Service" value={`${analytics.serviceHours}`} detail="verified service hours" />
            <Metric icon={<FileText size={22} />} label="Research and Journals" value={String(analytics.publications + analytics.journals)} detail={`${analytics.forums} policy forums active`} />
            <Metric icon={<Award size={22} />} label="Certification Pathways" value={String(analytics.certifications)} detail={`${analytics.exams} exam records, ${analytics.averageExam}% average`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Civic Literacy, Moral Responsibility, and Constitutional Studies" icon={<Landmark size={22} />}>
              {loading ? <p className="bg-navy-950 p-5 text-ink/68">Loading civic academies...</p> : null}
              {programs.length === 0 && !loading ? <p className="bg-navy-950 p-5 text-ink/68">Run the Civic Leadership migration to seed institute programs.</p> : null}
              {programs.map((program) => (
                <div key={program.id} className="bg-navy-950 p-5">
                  <p className="text-xs uppercase tracking-[.2em] text-gold-300">{program.program_type}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{program.program_name}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink/70">{program.description}</p>
                  <div className="mt-4 grid gap-2 text-sm text-ink/72">
                    <StatLite label="Status" value={program.program_status} />
                    <StatLite label="Completion" value={`${program.completion_count ?? 0}/${program.enrolled_count ?? 0} students`} />
                  </div>
                </div>
              ))}
            </Panel>

            <Panel title="Community Service Tracking" icon={<ClipboardCheck size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitService}>
                <Input label="Service project" value={serviceForm.serviceProject} onChange={(value) => setServiceForm((current) => ({ ...current, serviceProject: value }))} required />
                <Input label="Service category" value={serviceForm.serviceCategory} onChange={(value) => setServiceForm((current) => ({ ...current, serviceCategory: value }))} />
                <Input label="Hours" type="number" value={serviceForm.hours} onChange={(value) => setServiceForm((current) => ({ ...current, hours: value }))} min="0.25" step="0.25" required />
                <Textarea label="Service notes" value={serviceForm.notes} onChange={(value) => setServiceForm((current) => ({ ...current, notes: value }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Submit Service
                </button>
              </form>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Student Leadership Journals" icon={<BookOpenCheck size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitJournal}>
                <Input label="Journal title" value={journalForm.journalTitle} onChange={(value) => setJournalForm((current) => ({ ...current, journalTitle: value }))} required />
                <Input label="Leadership theme" value={journalForm.leadershipTheme} onChange={(value) => setJournalForm((current) => ({ ...current, leadershipTheme: value }))} />
                <Textarea label="Leadership reflection" value={journalForm.reflection} onChange={(value) => setJournalForm((current) => ({ ...current, reflection: value }))} required />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Submit Journal
                </button>
              </form>
              <RecordList rows={tables.journals ?? []} empty="No leadership journals submitted yet." primaryKeys={["journal_title"]} secondaryKeys={["leadership_theme", "review_status"]} />
            </Panel>

            <Panel title="Leadership Certification Exams" icon={<ShieldCheck size={22} />}>
              <div className="bg-navy-950 p-5">
                <p className="text-sm leading-7 text-ink/70">
                  Leadership certification requires civic literacy, moral responsibility, community service, ethics study, and public policy formation.
                </p>
                <button className="mt-5 inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 font-bold text-gold-300" type="button" onClick={startLeadershipExam}>
                  <CheckCircle2 size={16} /> Start Exam Record
                </button>
              </div>
              <RecordList rows={tables.exams ?? []} empty="No leadership exam records yet." primaryKeys={["exam_title"]} secondaryKeys={["result", "score", "submitted_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Public Policy Discussion Forums" icon={<MessageSquare size={22} />}>
              <RecordList rows={tables.forums ?? []} empty="No policy forums scheduled." primaryKeys={["forum_title"]} secondaryKeys={["policy_area", "forum_status", "scheduled_at"]} />
            </Panel>

            <Panel title="Civic Research Publications" icon={<GraduationCap size={22} />}>
              <RecordList rows={tables.publications ?? []} empty="No civic research publications yet." primaryKeys={["title"]} secondaryKeys={["author_name", "publication_category", "publication_status"]} />
            </Panel>

            <Panel title="Community Outreach Dashboard" icon={<Users size={22} />}>
              <RecordList rows={tables.outreach ?? []} empty="No outreach projects found." primaryKeys={["project_name"]} secondaryKeys={["community_region", "project_status", "participants_count"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Social Impact Analytics" icon={<BarChart3 size={22} />}>
              <StatLine label="Institute program completion" value={`${analytics.completionRate}%`} />
              <StatLine label="Community outreach projects" value={String(analytics.outreachProjects)} />
              <StatLine label="Aggregate impact score" value={String(analytics.impactScore)} />
              <StatLine label="Student leadership journals" value={String(analytics.journals)} />
              <StatLine label="Ethics certifications" value={String(analytics.certifications)} />
            </Panel>

            <Panel title="Connected AFF Divisions" icon={<Building2 size={22} />}>
              <StatLine label="Research Institute records" value={String(analytics.connectedResearch)} />
              <StatLine label="Foundation programs" value={String(analytics.connectedFoundation)} />
              <StatLine label="Career Center placements" value={String(analytics.connectedCareer)} />
              <StatLine label="Campus Expansion locations" value={String(analytics.connectedCampus)} />
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
    <div className="flex items-center justify-between gap-4">
      <span>{label}</span>
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

function Input({ label, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <input
        {...props}
        className="border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none transition focus:border-gold-400"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Textarea({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <textarea
        className="min-h-28 border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none transition focus:border-gold-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </label>
  );
}

function RecordList({ rows, empty, primaryKeys, secondaryKeys }: { rows: DbRow[]; empty: string; primaryKeys: string[]; secondaryKeys: string[] }) {
  if (rows.length === 0) {
    return <p className="bg-navy-950 p-5 text-sm text-ink/68">{empty}</p>;
  }

  return (
    <>
      {rows.slice(0, 6).map((row, index) => (
        <div key={value(row, ["id"], String(index))} className="bg-navy-950 p-5">
          <p className="font-semibold text-white">{value(row, primaryKeys, "Academy record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/64">
            {secondaryKeys.map((key) => value(row, [key])).filter(Boolean).join(" | ")}
          </p>
        </div>
      ))}
    </>
  );
}
