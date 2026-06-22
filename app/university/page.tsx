"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartCandlestick,
  FileBadge,
  FileText,
  Globe2,
  GraduationCap,
  Landmark,
  Library,
  Mic,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Tv,
  Upload,
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
const degreeTypes = ["Diploma", "Advanced Diploma", "Professional Certification"];
const universityOffices = [
  { title: "Academic Catalog", body: "Programs, departments, learning pathways, degree requirements, and academic records.", icon: Library },
  { title: "Degree Catalog", body: "Associate, bachelor, master, and doctorate pathways connected to AFF certification and research.", icon: GraduationCap },
  { title: "Faculty Directory", body: "Instructor faculty, research faculty, broadcast faculty, civic faculty, and AI systems faculty.", icon: Users },
  { title: "Research Centers", body: "Financial markets, institutional trading, economic intelligence, media, civic, flourishing, and AI research.", icon: BarChart3 },
  { title: "Academic Calendar", body: "Orientation, exam review weeks, research colloquia, international sessions, and live academic events.", icon: CalendarDays },
  { title: "Student Services", body: "Student support, advising, course access, enrollment status, messages, and mobile app support.", icon: BriefcaseBusiness },
  { title: "Registrar Office", body: "Transcript records, degree progress, academic standing, graduation approval, and verification.", icon: FileText },
  { title: "Financial Aid Office", body: "Scholarship readiness, endowment connection, sponsorship pathways, and membership status support.", icon: Landmark },
  { title: "International Programs", body: "Global Network, international events, campus expansion, partner institutions, and student recruitment.", icon: Globe2 }
];
const connectedDivisions = [
  { href: "/ai-coach", label: "AI Coach", icon: Bot },
  { href: "/voice-coach", label: "Voice Coach", icon: Mic },
  { href: "/chart-analyst", label: "Chart Analyst", icon: Upload },
  { href: "/trading-floor", label: "Trading Floor", icon: ChartCandlestick },
  { href: "/research-institute", label: "Research Institute", icon: Library },
  { href: "/career-center", label: "Career Center", icon: BriefcaseBusiness },
  { href: "/tv-studio", label: "TV Studio", icon: Tv },
  { href: "/civic-leadership", label: "Civic Leadership", icon: Scale },
  { href: "/accreditation", label: "Accreditation", icon: ShieldCheck },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/campus-expansion", label: "Campus Expansion", icon: Building2 },
  { href: "/endowment-fund", label: "Endowment Fund", icon: Landmark }
];

const initialTranscriptForm = {
  programName: "Forex Anatomy Professional Certification",
  courseTitle: "",
  grade: "",
  creditHours: "1",
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

export default function UniversityPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [affiliation, setAffiliation] = useState<DbRow | null>(null);
  const [adminProgramForm, setAdminProgramForm] = useState({
    collegeName: "College of Financial Markets",
    programName: "",
    credentialType: "Professional Certification",
    description: "",
    creditHoursRequired: "24"
  });
  const [adminFacultyForm, setAdminFacultyForm] = useState({
    facultyName: "",
    title: "Instructor Faculty",
    collegeName: "College of Financial Markets",
    departmentName: "Academic Programs",
    expertise: ""
  });
  const [form, setForm] = useState(initialTranscriptForm);
  const [message, setMessage] = useState("Loading AFF Global University...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadUniversity = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/university");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "AFF Student";
      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");
      setIsAdmin(admin);

      const [collegesResult, programsResult, degreesResult, academicDegreesResult, transcriptsResult, progressResult, honorsResult, departmentsResult, facultyResult, centersResult, calendarResult, affiliationResult] = await Promise.all([
        supabase.from("university_colleges").select("*").order("display_order", { ascending: true }).limit(100),
        supabase.from("university_programs").select("*").order("college_name", { ascending: true }).limit(200),
        supabase.from("university_degrees").select("*").order("degree_type", { ascending: true }).limit(200),
        supabase.from("academic_degree_programs").select("*").order("credits_required", { ascending: true }).limit(100),
        admin
          ? supabase.from("university_transcripts").select("*").order("completed_at", { ascending: false }).limit(200)
          : supabase.from("university_transcripts").select("*").eq("student_id", user.id).order("completed_at", { ascending: false }).limit(80),
        admin
          ? supabase.from("student_degree_progress").select("*").order("updated_at", { ascending: false }).limit(200)
          : supabase.from("student_degree_progress").select("*").eq("student_id", user.id).order("updated_at", { ascending: false }).limit(80),
        admin
          ? supabase.from("university_honors").select("*").order("awarded_at", { ascending: false }).limit(200)
          : supabase.from("university_honors").select("*").eq("student_id", user.id).order("awarded_at", { ascending: false }).limit(80),
        supabase.from("university_departments").select("*").order("college_name", { ascending: true }).limit(200),
        supabase.from("university_faculty").select("*").order("college_name", { ascending: true }).limit(200),
        supabase.from("university_research_centers").select("*").order("college_name", { ascending: true }).limit(100),
        supabase.from("university_academic_calendar").select("*").order("event_date", { ascending: true }).limit(100),
        supabase.from("student_academic_affiliations").select("*").eq("student_id", user.id).maybeSingle()
      ]);

      if (collegesResult.error) throw collegesResult.error;
      if (programsResult.error) throw programsResult.error;
      if (degreesResult.error) throw degreesResult.error;
      if (transcriptsResult.error) throw transcriptsResult.error;

      let affiliationRow = affiliationResult.data as DbRow | null;
      if (!affiliationRow && !affiliationResult.error) {
        const { data } = await supabase
          .from("student_academic_affiliations")
          .insert({
            student_id: user.id,
            student_name: name,
            student_email: user.email,
            college_affiliation: "College of Financial Markets",
            degree_affiliation: "Associate of Financial Markets",
            academic_standing: "Good Standing"
          })
          .select("*")
          .single();
        affiliationRow = (data ?? null) as DbRow | null;
      }

      setTables({
        colleges: (collegesResult.data ?? []) as DbRow[],
        programs: (programsResult.data ?? []) as DbRow[],
        degrees: (degreesResult.data ?? []) as DbRow[],
        academicDegrees: (academicDegreesResult.data ?? []) as DbRow[],
        transcripts: (transcriptsResult.data ?? []) as DbRow[],
        progress: (progressResult.data ?? []) as DbRow[],
        honors: (honorsResult.data ?? []) as DbRow[],
        departments: (departmentsResult.data ?? []) as DbRow[],
        faculty: (facultyResult.data ?? []) as DbRow[],
        centers: (centersResult.data ?? []) as DbRow[],
        calendar: (calendarResult.data ?? []) as DbRow[]
      });
      setAffiliation(affiliationRow);
      setMessage("AFF Global University academic records synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the AFF Global University migration to enable academic records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUniversity();
  }, [loadUniversity]);

  const analytics = useMemo(() => {
    const progress = tables.progress ?? [];
    const transcripts = tables.transcripts ?? [];
    const completedCredits = transcripts.reduce((total, row) => total + numberValue(row, ["credit_hours"]), 0);
    const avgProgress = progress.length ? Math.round(progress.reduce((total, row) => total + numberValue(row, ["completion_percentage"]), 0) / progress.length) : 0;
    return {
      colleges: (tables.colleges ?? []).length,
      programs: (tables.programs ?? []).length,
      degrees: (tables.degrees ?? []).length,
      academicDegrees: (tables.academicDegrees ?? []).length,
      transcripts: transcripts.length,
      progress: progress.length,
      honors: (tables.honors ?? []).length,
      faculty: (tables.faculty ?? []).length,
      researchCenters: (tables.centers ?? []).length,
      completedCredits,
      avgProgress
    };
  }, [tables]);

  async function submitTranscript(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting transcript record...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("university_transcripts").insert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        program_name: form.programName,
        course_title: form.courseTitle.trim(),
        grade: form.grade.trim() || "In Review",
        credit_hours: Number(form.creditHours) || 0,
        transcript_status: "Submitted",
        notes: form.notes.trim() || null
      }).select("*").single();

      if (error) throw error;
      setTables((current) => ({ ...current, transcripts: [data as DbRow, ...(current.transcripts ?? [])] }));
      setForm(initialTranscriptForm);
      setMessage("Transcript record submitted to AFF Global University.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit transcript record."));
    }
  }

  async function saveProgram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving university program...");
    try {
      const supabase = createClient();
      const college = (tables.colleges ?? []).find((row) => value(row, ["college_name"]) === adminProgramForm.collegeName);
      const { error } = await supabase.from("university_programs").insert({
        college_id: value(college ?? {}, ["id"]) || null,
        college_name: adminProgramForm.collegeName,
        program_name: adminProgramForm.programName,
        credential_type: adminProgramForm.credentialType,
        description: adminProgramForm.description,
        credit_hours_required: Number(adminProgramForm.creditHoursRequired) || 0
      });
      if (error) throw error;
      setAdminProgramForm((current) => ({ ...current, programName: "", description: "" }));
      setMessage("University program saved.");
      await loadUniversity();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save university program."));
    }
  }

  async function saveFaculty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving faculty record...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("university_faculty").insert({
        faculty_name: adminFacultyForm.facultyName,
        title: adminFacultyForm.title,
        college_name: adminFacultyForm.collegeName,
        department_name: adminFacultyForm.departmentName,
        expertise: adminFacultyForm.expertise
      });
      if (error) throw error;
      setAdminFacultyForm((current) => ({ ...current, facultyName: "", expertise: "" }));
      setMessage("Faculty record saved.");
      await loadUniversity();
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save faculty record."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Global University"
        title="A protected global university system for colleges, degrees, faculty, research, student services, and academic governance."
        text="Explore the university homepage, academic catalog, degree catalog, faculty directory, research centers, calendar, registrar, financial aid, student services, and international programs."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">University Dashboard</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadUniversity}>
              <RefreshCw size={16} /> Refresh University
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Building2 size={22} />} label="Colleges" value={String(analytics.colleges)} detail={`${analytics.programs} academic programs`} />
            <Metric icon={<GraduationCap size={22} />} label="Degree Framework" value={String(analytics.degrees + analytics.academicDegrees)} detail="certificates, associate, bachelor, master, doctorate" />
            <Metric icon={<FileText size={22} />} label="Transcript Records" value={String(analytics.transcripts)} detail={`${analytics.completedCredits} academic credits tracked`} />
            <Metric icon={<Award size={22} />} label="Faculty & Research" value={`${analytics.faculty}/${analytics.researchCenters}`} detail={`${analytics.avgProgress}% average progress`} />
          </section>

          <Link href="/courses" className="terminal-panel flex flex-col gap-4 p-6 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">AFF Course Management System</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Open the managed academic course library</h2>
              <p className="mt-2 text-sm text-ink/68">Access Supabase-backed courses, modules, video lessons, PDF notes, homework, quizzes, progress tracking, and completion certificates.</p>
            </div>
            <Library className="text-gold-300" size={28} />
          </Link>

          <section className="grid gap-6 lg:grid-cols-2">
            <Link href="/courses/managed/AFF-PSY-201" className="terminal-panel overflow-hidden transition hover:border-gold-400/60">
              <div className="aspect-[16/7] bg-cover bg-center" style={{ backgroundImage: "url(/course-thumbnails/trading-psychology-emotions-money.png)" }} />
              <div className="p-5">
                <p className="text-xs uppercase tracking-[.2em] text-gold-300">Trading Psychology · 10 Modules</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Trading Forex: The Management of Emotions Around Money</h2>
                <p className="mt-3 text-sm text-ink/68">Certified Trading Psychology Practitioner (CTPP)</p>
              </div>
            </Link>
            <Link href="/courses/managed/AFF-TMP-301" className="terminal-panel overflow-hidden transition hover:border-gold-400/60">
              <div className="aspect-[16/7] bg-cover bg-center" style={{ backgroundImage: "url(/course-thumbnails/theology-monetary-policy.png)" }} />
              <div className="p-5">
                <p className="text-xs uppercase tracking-[.2em] text-gold-300">School of Economics, Philosophy & Civilization · 10 Modules</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Theology & Monetary Policy: How Spiritual Principles Shape Economic Realities</h2>
                <p className="mt-3 text-sm text-ink/68">Certificate in Theology & Monetary Policy</p>
              </div>
            </Link>
          </section>

          <section className="terminal-panel p-6">
            <p className="text-xs uppercase tracking-[.22em] text-gold-300">University Homepage</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Academy for Financial Future Global University</h2>
            <p className="mt-3 max-w-4xl leading-7 text-ink/72">
              AFF Global University organizes financial markets, institutional trading, economic intelligence, media, civic leadership,
              human flourishing, and artificial intelligence into one academic ecosystem for professional education and institutional leadership.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <StatLine label="College Affiliation" value={value(affiliation ?? {}, ["college_affiliation"], "College of Financial Markets")} />
              <StatLine label="Degree Affiliation" value={value(affiliation ?? {}, ["degree_affiliation"], "Associate of Financial Markets")} />
              <StatLine label="Academic Standing" value={value(affiliation ?? {}, ["academic_standing"], "Good Standing")} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {universityOffices.map((office) => (
              <article key={office.title} className="terminal-panel p-5">
                <office.icon className="text-gold-300" size={24} />
                <h2 className="mt-4 text-xl font-semibold text-white">{office.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink/68">{office.body}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="University Colleges" icon={<Landmark size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                {(tables.colleges ?? []).map((college) => (
                  <div key={value(college, ["id"])} className="bg-navy-950 p-5">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(college, ["college_code"])}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{value(college, ["college_name"])}</h3>
                    <p className="mt-3 text-sm leading-7 text-ink/70">{value(college, ["description"])}</p>
                    <p className="mt-3 text-sm font-semibold text-gold-300">{value(college, ["dean_name"], "AFF Academic Council")}</p>
                  </div>
                ))}
                {!loading && (tables.colleges ?? []).length === 0 ? <p className="bg-navy-950 p-5 text-sm text-ink/68">Run the university migration to seed colleges.</p> : null}
              </div>
            </Panel>

            <Panel title="Degree Framework" icon={<FileBadge size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {degreeTypes.map((degreeType) => {
                  const degreeRows = (tables.degrees ?? []).filter((row) => value(row, ["degree_type"]) === degreeType);
                  return (
                    <div key={degreeType} className="bg-navy-950 p-5">
                      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{degreeType}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{degreeRows.length}</p>
                      <p className="mt-2 text-sm text-ink/64">{degreeRows.map((row) => value(row, ["degree_name"])).filter(Boolean).slice(0, 3).join(" | ") || "Framework ready"}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Academic Catalog" icon={<Library size={22} />}>
              <RecordList rows={tables.departments ?? []} empty="No departments found. Run the university upgrade migration." primary={["department_name"]} secondary={["college_name", "department_chair", "department_status"]} />
            </Panel>
            <Panel title="Degree Catalog" icon={<GraduationCap size={22} />}>
              <RecordList rows={[...(tables.academicDegrees ?? []), ...(tables.degrees ?? [])]} empty="No degree records found." primary={["degree_name"]} secondary={["degree_id", "degree_level", "degree_type", "credits_required", "credit_hours_required"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Faculty Directory" icon={<Users size={22} />}>
              <RecordList rows={tables.faculty ?? []} empty="No faculty records found." primary={["faculty_name"]} secondary={["title", "college_name", "department_name", "expertise"]} />
            </Panel>
            <Panel title="Research Centers" icon={<BarChart3 size={22} />}>
              <RecordList rows={tables.centers ?? []} empty="No research centers found." primary={["center_name"]} secondary={["college_name", "director_name", "research_focus"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
            <Panel title="Academic Calendar" icon={<CalendarDays size={22} />}>
              <RecordList rows={tables.calendar ?? []} empty="No academic calendar events found." primary={["event_title"]} secondary={["event_type", "event_date", "event_location", "event_status"]} />
            </Panel>
            <Panel title="Registrar, Financial Aid, and International Programs" icon={<Globe2 size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-3">
                <div className="bg-navy-950 p-5">
                  <FileText className="text-gold-300" size={22} />
                  <h3 className="mt-3 font-semibold text-white">Registrar Office</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/68">Transcripts, degree progress, standing, and graduation records.</p>
                </div>
                <div className="bg-navy-950 p-5">
                  <Landmark className="text-gold-300" size={22} />
                  <h3 className="mt-3 font-semibold text-white">Financial Aid Office</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/68">Scholarship readiness, endowment links, and sponsorship pathways.</p>
                </div>
                <div className="bg-navy-950 p-5">
                  <Globe2 className="text-gold-300" size={22} />
                  <h3 className="mt-3 font-semibold text-white">International Programs</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/68">Global Network, events, campus expansion, and partner institutions.</p>
                </div>
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Student Academic Transcript System" icon={<FileText size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitTranscript}>
                <Input label="Program name" value={form.programName} onChange={(next) => setForm((current) => ({ ...current, programName: next }))} />
                <Input label="Course title" value={form.courseTitle} onChange={(next) => setForm((current) => ({ ...current, courseTitle: next }))} required />
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Grade" value={form.grade} onChange={(next) => setForm((current) => ({ ...current, grade: next }))} />
                  <Input label="Credit hours" type="number" min="0" step="0.5" value={form.creditHours} onChange={(next) => setForm((current) => ({ ...current, creditHours: next }))} />
                </div>
                <Textarea label="Transcript notes" value={form.notes} onChange={(next) => setForm((current) => ({ ...current, notes: next }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Submit Transcript Record
                </button>
              </form>
              <RecordList rows={tables.transcripts ?? []} empty="No transcript records yet." primary={["course_title"]} secondary={["program_name", "grade", "credit_hours", "transcript_status"]} />
            </Panel>

            <Panel title="University Progress Tracking" icon={<BarChart3 size={22} />}>
              {(tables.progress ?? []).length === 0 ? <p className="bg-navy-950 p-5 text-sm text-ink/68">No degree progress records yet.</p> : null}
              {(tables.progress ?? []).map((row) => (
                <ProgressRow key={value(row, ["id"])} label={value(row, ["degree_name"], "Degree Progress")} value={numberValue(row, ["completion_percentage"])} detail={`${value(row, ["credits_completed"], "0")}/${value(row, ["credits_required"], "0")} credits completed`} />
              ))}
              <RecordList rows={tables.honors ?? []} empty="No university honors yet." primary={["honor_title"]} secondary={["honor_level", "awarded_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="University Governance" icon={<ShieldCheck size={22} />}>
              <StatLine label="Chancellor" value="Dr. Jean Rene Moricette" />
              <StatLine label="Accreditation Readiness" value="Framework Prepared" />
              <StatLine label="Degree Management" value="Supabase Registry" />
              <StatLine label="Transcript Governance" value={isAdmin ? "Administrator View" : "Student View"} />
              <StatLine label="Future Academic Senate" value="Architecture Ready" />
            </Panel>

            <Panel title="Connected AFF Academic Ecosystem" icon={<Library size={22} />}>
              <div className="grid gap-px bg-gold-500/14 sm:grid-cols-2 lg:grid-cols-3">
                {connectedDivisions.map((item) => (
                  <Link key={item.href} href={item.href} className="bg-navy-950 p-4 transition hover:bg-navy-900">
                    <item.icon className="text-gold-300" size={20} />
                    <p className="mt-3 font-semibold text-white">{item.label}</p>
                  </Link>
                ))}
              </div>
            </Panel>
          </section>

          <Panel title="University Programs" icon={<GraduationCap size={22} />}>
            <div className="grid gap-px bg-gold-500/14 md:grid-cols-2 xl:grid-cols-3">
              {(tables.programs ?? []).map((program) => (
                <div key={value(program, ["id"])} className="bg-navy-950 p-5">
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(program, ["college_name"])}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{value(program, ["program_name"])}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{value(program, ["description"])}</p>
                  <p className="mt-3 text-sm font-semibold text-gold-300">{value(program, ["credential_type"])} | {value(program, ["program_status"])}</p>
                </div>
              ))}
            </div>
          </Panel>

          {isAdmin ? (
            <section className="grid gap-6 xl:grid-cols-2">
              <Panel title="Admin University Office: Manage Programs" icon={<UserCog size={22} />}>
                <form className="grid gap-4 bg-navy-950 p-5" onSubmit={saveProgram}>
                  <Select label="College" value={adminProgramForm.collegeName} options={(tables.colleges ?? []).map((row) => value(row, ["college_name"]))} onChange={(next) => setAdminProgramForm((current) => ({ ...current, collegeName: next }))} />
                  <Input label="Program name" value={adminProgramForm.programName} onChange={(next) => setAdminProgramForm((current) => ({ ...current, programName: next }))} required />
                  <Select label="Credential type" value={adminProgramForm.credentialType} options={degreeTypes} onChange={(next) => setAdminProgramForm((current) => ({ ...current, credentialType: next }))} />
                  <Input label="Credits required" type="number" value={adminProgramForm.creditHoursRequired} onChange={(next) => setAdminProgramForm((current) => ({ ...current, creditHoursRequired: next }))} />
                  <Textarea label="Description" value={adminProgramForm.description} onChange={(next) => setAdminProgramForm((current) => ({ ...current, description: next }))} />
                  <button className="bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">Save Program</button>
                </form>
              </Panel>

              <Panel title="Admin University Office: Manage Faculty" icon={<Users size={22} />}>
                <form className="grid gap-4 bg-navy-950 p-5" onSubmit={saveFaculty}>
                  <Input label="Faculty name" value={adminFacultyForm.facultyName} onChange={(next) => setAdminFacultyForm((current) => ({ ...current, facultyName: next }))} required />
                  <Input label="Title" value={adminFacultyForm.title} onChange={(next) => setAdminFacultyForm((current) => ({ ...current, title: next }))} />
                  <Select label="College" value={adminFacultyForm.collegeName} options={(tables.colleges ?? []).map((row) => value(row, ["college_name"]))} onChange={(next) => setAdminFacultyForm((current) => ({ ...current, collegeName: next }))} />
                  <Input label="Department" value={adminFacultyForm.departmentName} onChange={(next) => setAdminFacultyForm((current) => ({ ...current, departmentName: next }))} />
                  <Textarea label="Expertise" value={adminFacultyForm.expertise} onChange={(next) => setAdminFacultyForm((current) => ({ ...current, expertise: next }))} />
                  <button className="bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">Save Faculty</button>
                </form>
              </Panel>
            </section>
          ) : null}
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

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}

function ProgressRow({ label, value: progress, detail }: { label: string; value: number; detail: string }) {
  const fill = Math.min(100, Math.max(0, progress));
  return (
    <div className="bg-navy-950 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm font-semibold text-gold-300">{fill}%</p>
      </div>
      <div className="mt-3 h-2 bg-navy-800">
        <div className="h-full bg-gold-500" style={{ width: `${fill}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink/54">{detail}</p>
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

function Select({ label, value: selected, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <select className="border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" value={selected} onChange={(event) => onChange(event.target.value)}>
        {options.filter(Boolean).map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function RecordList({ rows, empty, primary, secondary }: { rows: DbRow[]; empty: string; primary: string[]; secondary: string[] }) {
  if (rows.length === 0) return <p className="bg-navy-950 p-5 text-sm text-ink/68">{empty}</p>;

  return (
    <div className="grid gap-px bg-gold-500/14">
      {rows.slice(0, 8).map((row, index) => (
        <div key={value(row, ["id"], String(index))} className="bg-navy-950 p-4">
          <p className="font-semibold text-white">{value(row, primary, "University record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/64">{secondary.map((key) => value(row, [key])).filter(Boolean).join(" | ")}</p>
        </div>
      ))}
    </div>
  );
}
