"use client";

import { useRouter } from "next/navigation";
import {
  Archive,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  Landmark,
  Library,
  LineChart,
  NotebookTabs,
  Quote,
  RefreshCw,
  Send,
  Star,
  TrendingUp,
  UserRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type ResearchItem = {
  id: string;
  title: string;
  category: string;
  abstract: string | null;
  author_name: string;
  publication_status: string;
  publication_date: string | null;
  pdf_url: string | null;
  citation_text: string | null;
};

type AnalystProfile = {
  id: string;
  analyst_name: string;
  specialty: string;
  ranking_score: number | null;
  reports_published: number | null;
  profile_status: string;
};

type Submission = {
  id: string;
  student_name: string;
  title: string;
  category: string;
  review_status: string;
  submitted_at: string;
};

type Citation = {
  id: string;
  source_title: string;
  citation_style: string;
  reference_text: string;
};

const adminEmail = "acafffx@gmail.com";
const categories = [
  "All",
  "Economic Research Library",
  "Central Bank Intelligence Reports",
  "Weekly Forex Outlook Reports",
  "Institutional Order Flow Research",
  "Forex White Papers",
  "Student Research Publications",
  "Academic Journal Archive",
  "Quarterly Currency Forecast Reports"
];

const initialSubmission = {
  title: "",
  category: "Student Research Publications",
  abstract: "",
  pdfUrl: "",
  citationText: ""
};

const iconByCategory: Record<string, ReactNode> = {
  "Economic Research Library": <Library size={22} />,
  "Central Bank Intelligence Reports": <Landmark size={22} />,
  "Weekly Forex Outlook Reports": <CalendarDays size={22} />,
  "Institutional Order Flow Research": <LineChart size={22} />,
  "Forex White Papers": <FileText size={22} />,
  "Student Research Publications": <GraduationCap size={22} />,
  "Academic Journal Archive": <Archive size={22} />,
  "Quarterly Currency Forecast Reports": <TrendingUp size={22} />
};

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function ResearchInstitutePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("Student Researcher");
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [analysts, setAnalysts] = useState<AnalystProfile[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [submissionForm, setSubmissionForm] = useState(initialSubmission);
  const [message, setMessage] = useState("Loading Research and Economic Intelligence Institute...");
  const [loading, setLoading] = useState(true);

  const filteredItems = useMemo(() => {
    return activeCategory === "All" ? items : items.filter((item) => item.category === activeCategory);
  }, [activeCategory, items]);

  const analytics = useMemo(() => {
    const published = items.filter((item) => item.publication_status === "Published").length;
    const downloads = items.filter((item) => item.pdf_url).length;
    const pending = submissions.filter((submission) => submission.review_status === "Submitted").length;
    return {
      totalResearch: items.length,
      published,
      publicationRate: percent(published, items.length),
      downloads,
      pending,
      analysts: analysts.length,
      citations: citations.length
    };
  }, [analysts.length, citations.length, items, submissions]);

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
      setStudentName(typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Student Researcher");
      setIsAdmin(admin);

      const [itemsResult, analystsResult, submissionsResult, citationsResult] = await Promise.all([
        supabase.from("research_publications").select("*").in("publication_status", admin ? ["Draft", "Submitted", "Published", "Archived"] : ["Published"]).order("publication_date", { ascending: false }).limit(200),
        supabase.from("research_analyst_profiles").select("*").order("ranking_score", { ascending: false }).limit(50),
        admin
          ? supabase.from("research_submissions").select("*").order("submitted_at", { ascending: false }).limit(200)
          : supabase.from("research_submissions").select("*").eq("student_id", user.id).order("submitted_at", { ascending: false }).limit(50),
        supabase.from("research_citations").select("*").order("created_at", { ascending: false }).limit(100)
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (analystsResult.error) throw analystsResult.error;
      if (submissionsResult.error) throw submissionsResult.error;
      if (citationsResult.error) throw citationsResult.error;

      setItems((itemsResult.data ?? []) as ResearchItem[]);
      setAnalysts((analystsResult.data ?? []) as AnalystProfile[]);
      setSubmissions((submissionsResult.data ?? []) as Submission[]);
      setCitations((citationsResult.data ?? []) as Citation[]);
      setMessage("Research Institute synchronized with live academic intelligence.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Research Institute migration to enable research records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadInstitute();
  }, [loadInstitute]);

  async function submitResearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting research for academic review...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("research_submissions").insert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        title: submissionForm.title.trim(),
        category: submissionForm.category,
        abstract: submissionForm.abstract.trim(),
        pdf_url: submissionForm.pdfUrl.trim() || null,
        citation_text: submissionForm.citationText.trim() || null,
        review_status: "Submitted"
      }).select("*").single();

      if (error) throw error;
      setSubmissions((current) => [data as Submission, ...current]);
      setSubmissionForm(initialSubmission);
      setMessage("Research submitted to the AFF academic review desk.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit research."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Research and Economic Intelligence Institute"
        title="Academic research command center for forex intelligence, central banks, order flow, and currency forecasts."
        text="Access AFF research publications, central bank intelligence, institutional order flow reports, academic journals, student research, analyst rankings, citations, and PDF research downloads."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Academic Intelligence</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadInstitute}>
              <RefreshCw size={16} /> Refresh Research
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BookOpen size={22} />} label="Research Library" value={String(analytics.totalResearch)} detail={`${analytics.publicationRate}% published archive rate`} />
            <Metric icon={<Download size={22} />} label="PDF Downloads" value={String(analytics.downloads)} detail="downloadable research files" />
            <Metric icon={<UserRound size={22} />} label="Analyst Profiles" value={String(analytics.analysts)} detail="ranked research contributors" />
            <Metric icon={<Quote size={22} />} label="Citations" value={String(analytics.citations)} detail={`${analytics.pending} submissions pending review`} />
          </section>

          <section className="terminal-panel p-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 text-sm font-semibold ${activeCategory === category ? "bg-gold-500 text-navy-950" : "border border-gold-500/24 text-gold-300"}`}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <NotebookTabs className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Economic Research Library</h2>
                </div>
              </div>
              {loading ? (
                <p className="p-5 text-ink/68">Loading research library...</p>
              ) : filteredItems.length === 0 ? (
                <p className="p-5 text-ink/68">No research records found for this category.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                  {filteredItems.map((item) => (
                    <article key={item.id} className="bg-navy-950 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gold-300">{iconByCategory[item.category] ?? <FileText size={22} />}</span>
                        <span className="border border-gold-500/24 px-2 py-1 text-[11px] uppercase tracking-[.16em] text-gold-300">{item.publication_status}</span>
                      </div>
                      <p className="mt-4 text-xs uppercase tracking-[.2em] text-gold-300">{item.category}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm text-ink/58">{item.author_name} - {item.publication_date ? new Date(item.publication_date).toLocaleDateString() : "Publication date pending"}</p>
                      <p className="mt-3 line-clamp-4 leading-7 text-ink/72">{item.abstract ?? "Research abstract pending."}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.pdf_url ? (
                          <a className="inline-flex items-center gap-2 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" href={item.pdf_url}>
                            <Download size={16} /> PDF
                          </a>
                        ) : null}
                        {item.citation_text ? (
                          <span className="inline-flex items-center gap-2 border border-gold-500/35 px-4 py-2 text-sm text-gold-300">
                            <Quote size={16} /> Citation Ready
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={submitResearch} className="terminal-panel grid h-fit gap-4 p-6">
              <div className="flex items-center gap-3">
                <Send className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Research Submission Portal</h2>
              </div>
              <Input label="Research Title" value={submissionForm.title} onChange={(value) => setSubmissionForm((current) => ({ ...current, title: value }))} required />
              <label className="grid gap-2 text-sm text-ink/72">
                Category
                <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={submissionForm.category} onChange={(event) => setSubmissionForm((current) => ({ ...current, category: event.target.value }))}>
                  {categories.filter((category) => category !== "All").map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <Textarea label="Research Abstract" value={submissionForm.abstract} onChange={(value) => setSubmissionForm((current) => ({ ...current, abstract: value }))} />
              <Input label="PDF Research URL" value={submissionForm.pdfUrl} onChange={(value) => setSubmissionForm((current) => ({ ...current, pdfUrl: value }))} />
              <Textarea label="Citation / References" value={submissionForm.citationText} onChange={(value) => setSubmissionForm((current) => ({ ...current, citationText: value }))} />
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <Send size={18} /> Submit Research
              </button>
            </form>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Analyst Profiles and Rankings" icon={<Star size={22} />}>
              {analysts.length === 0 ? <p className="bg-navy-950 p-5 text-ink/68">No analyst profiles found.</p> : null}
              {analysts.map((analyst) => (
                <StatLine key={analyst.id} label={`${analyst.analyst_name} - ${analyst.specialty}`} value={`${analyst.ranking_score ?? 0} pts`} />
              ))}
            </Panel>
            <Panel title="Citation and Reference System" icon={<Quote size={22} />}>
              {citations.length === 0 ? <p className="bg-navy-950 p-5 text-ink/68">No citation records found.</p> : null}
              {citations.slice(0, 8).map((citation) => (
                <div key={citation.id} className="bg-navy-950 p-4">
                  <p className="font-semibold text-white">{citation.source_title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[.18em] text-gold-300">{citation.citation_style}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{citation.reference_text}</p>
                </div>
              ))}
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable
              title={isAdmin ? "Research Dashboard Analytics: Submissions" : "My Research Submissions"}
              icon={<BarChart3 size={22} />}
              headers={["Research Title", "Category", "Status", "Submitted"]}
              rows={submissions.map((submission) => [
                submission.title,
                submission.category,
                submission.review_status,
                new Date(submission.submitted_at).toLocaleDateString()
              ])}
            />
            <Panel title="Institute Research Divisions" icon={<Building2 size={22} />}>
              <StatLine label="Central Bank Intelligence Reports" value={String(items.filter((item) => item.category === "Central Bank Intelligence Reports").length)} />
              <StatLine label="Weekly Forex Outlook Reports" value={String(items.filter((item) => item.category === "Weekly Forex Outlook Reports").length)} />
              <StatLine label="Institutional Order Flow Research" value={String(items.filter((item) => item.category === "Institutional Order Flow Research").length)} />
              <StatLine label="Quarterly Currency Forecast Reports" value={String(items.filter((item) => item.category === "Quarterly Currency Forecast Reports").length)} />
            </Panel>
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <ExecutiveTile icon={<Landmark size={20} />} label="Central Banks" value={String(items.filter((item) => item.category === "Central Bank Intelligence Reports").length)} detail="policy intelligence reports" />
            <ExecutiveTile icon={<LineChart size={20} />} label="Order Flow" value={String(items.filter((item) => item.category === "Institutional Order Flow Research").length)} detail="institutional research papers" />
            <ExecutiveTile icon={<BadgeCheck size={20} />} label="White Papers" value={String(items.filter((item) => item.category === "Forex White Papers").length)} detail="formal academic publications" />
            <ExecutiveTile icon={<GraduationCap size={20} />} label="Student Research" value={String(submissions.length)} detail="student submissions and publications" />
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
      <textarea className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)} />
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
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
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
