"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Award,
  BarChart3,
  BookMarked,
  BookOpenText,
  ClipboardCheck,
  Copyright,
  Download,
  FileText,
  GraduationCap,
  Library,
  Mic2,
  Newspaper,
  PenLine,
  Podcast,
  Quote,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Tv,
  UserRound,
  Users,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";
const initialSubmission = {
  title: "",
  authorName: "",
  authorEmail: "",
  submissionType: "Book Manuscript",
  abstract: "",
  manuscriptUrl: ""
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

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

export default function PublishingHousePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Contributor");
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [query, setQuery] = useState("");
  const [submission, setSubmission] = useState(initialSubmission);
  const [message, setMessage] = useState("Loading AFF Publishing & Media House...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadPublishingHouse = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/publishing-house");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      const name =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
          ? user.user_metadata.name
          : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
            ? user.user_metadata.full_name
            : user.email?.split("@")[0] ?? "AFF Contributor";

      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");
      setIsAdmin(admin);
      setSubmission((current) => ({ ...current, authorName: current.authorName || name, authorEmail: current.authorEmail || user.email || "" }));

      const [
        booksResult,
        authorsResult,
        publicationsResult,
        researchResult,
        journalsResult,
        articlesResult,
        mediaResult,
        podcastsResult,
        reviewsResult,
        copyrightResult,
        substackResult
      ] = await Promise.all([
        supabase.from("aff_books").select("*").order("published_at", { ascending: false }).limit(200),
        supabase.from("aff_authors").select("*").order("author_name", { ascending: true }).limit(200),
        supabase.from("aff_publications").select("*").order("publication_date", { ascending: false }).limit(250),
        supabase.from("aff_research_papers").select("*").order("published_at", { ascending: false }).limit(250),
        supabase.from("aff_journals").select("*").order("issue_date", { ascending: false }).limit(150),
        supabase.from("aff_articles").select("*").order("published_at", { ascending: false }).limit(250),
        supabase.from("aff_media_library").select("*").order("recorded_at", { ascending: false }).limit(250),
        supabase.from("aff_podcasts").select("*").order("published_at", { ascending: false }).limit(150),
        admin
          ? supabase.from("aff_editorial_reviews").select("*").order("created_at", { ascending: false }).limit(250)
          : supabase.from("aff_editorial_reviews").select("*").or(`contributor_id.eq.${user.id},contributor_email.eq.${user.email}`).order("created_at", { ascending: false }).limit(50),
        supabase.from("aff_copyright_registry").select("*").order("registered_at", { ascending: false }).limit(200),
        supabase.from("aff_substack_archive").select("*").order("published_at", { ascending: false }).limit(200)
      ]);

      if (booksResult.error) throw booksResult.error;
      if (authorsResult.error) throw authorsResult.error;
      if (publicationsResult.error) throw publicationsResult.error;

      setTables({
        books: (booksResult.data ?? []) as DbRow[],
        authors: (authorsResult.data ?? []) as DbRow[],
        publications: (publicationsResult.data ?? []) as DbRow[],
        research: (researchResult.data ?? []) as DbRow[],
        journals: (journalsResult.data ?? []) as DbRow[],
        articles: (articlesResult.data ?? []) as DbRow[],
        media: (mediaResult.data ?? []) as DbRow[],
        podcasts: (podcastsResult.data ?? []) as DbRow[],
        reviews: (reviewsResult.data ?? []) as DbRow[],
        copyright: (copyrightResult.data ?? []) as DbRow[],
        substack: (substackResult.data ?? []) as DbRow[]
      });
      setMessage("AFF Publishing & Media House synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Publishing House migration to enable publishing and media records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPublishingHouse();
  }, [loadPublishingHouse]);

  const analytics = useMemo(() => {
    const publications = [...(tables.books ?? []), ...(tables.publications ?? []), ...(tables.research ?? []), ...(tables.journals ?? []), ...(tables.articles ?? [])];
    const downloads = publications.reduce((total, row) => total + numberValue(row, ["download_count"]), 0);
    const citations = (tables.research ?? []).reduce((total, row) => total + numberValue(row, ["citation_count"]), 0);
    const mediaViews = [...(tables.media ?? []), ...(tables.podcasts ?? [])].reduce((total, row) => total + numberValue(row, ["view_count", "listen_count"]), 0);
    const approvedReviews = (tables.reviews ?? []).filter((row) => ["Approved", "Published"].includes(value(row, ["review_status", "workflow_status"]))).length;
    return {
      publications: publications.length,
      books: (tables.books ?? []).length,
      authors: (tables.authors ?? []).length,
      downloads,
      citations,
      mediaViews,
      subscribers: (tables.substack ?? []).reduce((total, row) => total + numberValue(row, ["subscriber_count"]), 0),
      reviews: (tables.reviews ?? []).length,
      reviewApprovalRate: percent(approvedReviews, (tables.reviews ?? []).length),
      copyright: (tables.copyright ?? []).length
    };
  }, [tables]);

  const libraryItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = [
      ...(tables.books ?? []).map((row) => ({ ...row, source: "Book" })),
      ...(tables.publications ?? []).map((row) => ({ ...row, source: "Publication" })),
      ...(tables.research ?? []).map((row) => ({ ...row, source: "Research" })),
      ...(tables.articles ?? []).map((row) => ({ ...row, source: "Article" })),
      ...(tables.media ?? []).map((row) => ({ ...row, source: "Media" }))
    ];
    if (!needle) return items.slice(0, 12);
    return items
      .filter((row) =>
        [value(row, ["title", "book_title", "article_title", "media_title"]), value(row, ["author_name"]), value(row, ["category"]), value(row, ["keywords"])]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
      .slice(0, 20);
  }, [query, tables]);

  async function submitManuscript(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Submitting work to the editorial board...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("aff_editorial_reviews")
        .insert({
          contributor_id: studentId,
          contributor_name: submission.authorName.trim() || studentName,
          contributor_email: submission.authorEmail.trim() || studentEmail,
          submission_title: submission.title.trim(),
          submission_type: submission.submissionType,
          abstract: submission.abstract.trim(),
          manuscript_url: submission.manuscriptUrl.trim() || null,
          review_status: "Submitted",
          workflow_status: "Editorial Review"
        })
        .select("*")
        .single();

      if (error) throw error;
      setTables((current) => ({ ...current, reviews: [data as DbRow, ...(current.reviews ?? [])] }));
      setSubmission(initialSubmission);
      setMessage("Submission received by the AFF editorial board.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit work for editorial review."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Publishing & Media House"
        title="Official publishing, broadcasting, research, journalism, and intellectual property division."
        text="Manage Academy books, authors, ISBNs, research publications, academic journals, Dr. Jean R. Moricette collections, media archives, Substack publishing, editorial reviews, copyright registry, and digital library access."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Publishing Command Desk</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-sm text-ink/54">{loading ? "Loading publishing records..." : `${studentName} - ${studentEmail}`}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadPublishingHouse}>
              <RefreshCw size={16} /> Refresh Publishing House
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BookMarked size={22} />} label="Publications" value={String(analytics.publications)} detail={`${analytics.books} books, ${analytics.authors} authors`} />
            <Metric icon={<Download size={22} />} label="Downloads" value={String(analytics.downloads)} detail="PDF, digital library, and research downloads" />
            <Metric icon={<Quote size={22} />} label="Research Citations" value={String(analytics.citations)} detail="DOI and citation intelligence" />
            <Metric icon={<Video size={22} />} label="Media Views" value={String(analytics.mediaViews)} detail="video, podcast, webinar, and conference views" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Digital Library Search" icon={<Library size={22} />}>
              <div className="bg-navy-950 p-5">
                <label className="text-xs uppercase tracking-[.18em] text-gold-300" htmlFor="publishing-search">Search Books, Papers, Media, Articles</label>
                <div className="mt-3 flex items-center gap-3 border border-gold-500/25 bg-navy-900 px-4 py-3">
                  <Search className="text-gold-300" size={18} />
                  <input id="publishing-search" className="w-full bg-transparent text-white outline-none" placeholder="Search title, author, category, keyword, DOI, ISBN" value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
              </div>
              <RecordList rows={libraryItems} empty="No digital library records found." primary={["book_title", "title", "article_title", "media_title"]} secondary={["source", "author_name", "category", "publication_status"]} />
            </Panel>

            <Panel title="Book Submissions and Editorial Review" icon={<ClipboardCheck size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitManuscript}>
                <Input label="Submission title" value={submission.title} onChange={(next) => setSubmission((current) => ({ ...current, title: next }))} required />
                <Input label="Author name" value={submission.authorName} onChange={(next) => setSubmission((current) => ({ ...current, authorName: next }))} />
                <Input label="Author email" type="email" value={submission.authorEmail} onChange={(next) => setSubmission((current) => ({ ...current, authorEmail: next }))} />
                <Select label="Submission type" value={submission.submissionType} onChange={(next) => setSubmission((current) => ({ ...current, submissionType: next }))} options={["Book Manuscript", "Research Paper", "White Paper", "Article", "Podcast", "Video", "Journal Submission"]} />
                <Textarea label="Abstract" value={submission.abstract} onChange={(next) => setSubmission((current) => ({ ...current, abstract: next }))} />
                <Input label="Manuscript URL" value={submission.manuscriptUrl} onChange={(next) => setSubmission((current) => ({ ...current, manuscriptUrl: next }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Submit to Editorial Board
                </button>
              </form>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Book Publishing Division" icon={<BookOpenText size={22} />}>
              <RecordList rows={tables.books ?? []} empty="No book catalog records found." primary={["book_title"]} secondary={["author_name", "isbn", "edition_type", "publishing_status"]} />
            </Panel>
            <Panel title="Author Profiles and ISBN Records" icon={<UserRound size={22} />}>
              <RecordList rows={tables.authors ?? []} empty="No author profiles found." primary={["author_name"]} secondary={["author_type", "primary_topic", "books_published", "author_status"]} />
            </Panel>
            <Panel title="Research Publications" icon={<FileText size={22} />}>
              <RecordList rows={tables.research ?? []} empty="No research papers found." primary={["title"]} secondary={["research_type", "doi", "citation_count", "publication_status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Dr. Jean R. Moricette Collection" icon={<Award size={22} />}>
              <RecordList rows={(tables.articles ?? []).filter((row) => value(row, ["collection_name"]) === "Dr. Jean R. Moricette Collection")} empty="No Dr. Moricette collection records found." primary={["article_title"]} secondary={["article_type", "category", "published_at"]} />
            </Panel>
            <Panel title="Media Broadcasting Archive" icon={<Tv size={22} />}>
              <RecordList rows={tables.media ?? []} empty="No media archive records found." primary={["media_title"]} secondary={["media_type", "series_name", "view_count", "recorded_at"]} />
            </Panel>
            <Panel title="Podcast Library" icon={<Podcast size={22} />}>
              <RecordList rows={tables.podcasts ?? []} empty="No podcast episodes found." primary={["episode_title"]} secondary={["podcast_name", "host_name", "listen_count", "published_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Substack Division" icon={<Newspaper size={22} />}>
              <RecordList rows={tables.substack ?? []} empty="No newsletter archive records found." primary={["article_title"]} secondary={["newsletter_name", "subscriber_count", "published_at"]} />
            </Panel>
            <Panel title="Editorial Board" icon={<Users size={22} />}>
              <RecordList rows={tables.reviews ?? []} empty="No editorial review records found." primary={["submission_title"]} secondary={["submission_type", "review_status", "workflow_status", "contributor_name"]} />
            </Panel>
            <Panel title="Intellectual Property" icon={<Copyright size={22} />}>
              <RecordList rows={tables.copyright ?? []} empty="No copyright registry records found." primary={["work_title"]} secondary={["work_type", "owner_name", "registration_number", "rights_status"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Academic Journals and Citation System" icon={<Archive size={22} />}>
              <RecordList rows={tables.journals ?? []} empty="No academic journal records found." primary={["journal_title"]} secondary={["volume", "issue", "doi_prefix", "issue_date"]} />
            </Panel>
            <Panel title="Executive Analytics and Connected Divisions" icon={<BarChart3 size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                <Stat label="Editorial Approval Rate" value={`${analytics.reviewApprovalRate}%`} />
                <Stat label="Substack Subscribers" value={String(analytics.subscribers)} />
                <Stat label="Authors" value={String(analytics.authors)} />
                <Stat label="Copyright Records" value={String(analytics.copyright)} />
              </div>
              <div className="mt-5 grid gap-3">
                <LinkButton href="/tv-studio" label="TV Studio" icon={<Tv size={18} />} />
                <LinkButton href="/research-institute" label="Research Institute" icon={<BookOpenText size={18} />} />
                <LinkButton href="/university" label="University" icon={<GraduationCap size={18} />} />
                <LinkButton href="/civic-leadership" label="Civic Leadership" icon={<Scale size={18} />} />
                <LinkButton href="/executive-command-center" label="Executive Command" icon={<BarChart3 size={18} />} />
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
          <p className="font-semibold text-white">{value(row, primary, "AFF publishing record")}</p>
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

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (next: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm text-ink/72">
      <span className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</span>
      <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400" required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
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
