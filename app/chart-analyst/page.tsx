"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bot, Download, FileImage, FileText, RefreshCw, Send, ShieldCheck, Upload, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { chartAnalysisSections, type ChartAnalystSection } from "@/lib/chart-analyst";
import { createClient } from "@/lib/supabase";

type ChartReport = {
  id: string | number;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url?: string | null;
  platform: string;
  dr_moricette_review_mode: boolean;
  student_notes?: string | null;
  summary: string;
  overall_grade: number;
  risk_rating: string;
  sections: ChartAnalystSection[];
  created_at: string;
};

const acceptedTypes = ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf";
const platforms = ["TradingView", "MT4", "MT5", "PNG/JPG Chart", "PDF Chart Packet"];

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
}

function buildSimplePdf(report: ChartReport) {
  const lines = [
    "Academy for Financial Future",
    "AFF AI Chart Analyst Report",
    `File: ${report.file_name}`,
    `Platform: ${report.platform}`,
    `Overall Grade: ${report.overall_grade}%`,
    `Risk Rating: ${report.risk_rating}`,
    `Dr. Moricette Review Mode: ${report.dr_moricette_review_mode ? "Enabled" : "Disabled"}`,
    "",
    report.summary,
    "",
    ...report.sections.flatMap((section) => [
      section.title,
      `Grade: ${section.grade}`,
      `Finding: ${section.finding}`,
      `Action: ${section.action}`,
      ""
    ])
  ].slice(0, 55);

  const content = [
    "BT",
    "/F1 11 Tf",
    "50 780 Td",
    ...lines.flatMap((line, index) => [
      index === 0 ? "/F1 16 Tf" : index === 1 ? "/F1 13 Tf" : "/F1 10 Tf",
      `(${escapePdfText(line)}) Tj`,
      "0 -15 Td"
    ]),
    "ET"
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`
  ];
  const body = objects.join("\n");
  return `%PDF-1.4\n${body}\ntrailer << /Root 1 0 R >>\n%%EOF`;
}

export default function ChartAnalystPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [reports, setReports] = useState<ChartReport[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState("TradingView");
  const [studentNotes, setStudentNotes] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [activeReport, setActiveReport] = useState<ChartReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState("Loading AFF AI Chart Analyst history...");

  const analytics = useMemo(() => {
    const avg = reports.length ? Math.round(reports.reduce((total, report) => total + Number(report.overall_grade ?? 0), 0) / reports.length) : 0;
    return {
      reports: reports.length,
      avg,
      reviewMode: reports.filter((report) => report.dr_moricette_review_mode).length,
      highRisk: reports.filter((report) => ["Elevated", "High"].includes(report.risk_rating)).length
    };
  }, [reports]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadReports = useCallback(async () => {
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

      setStudentId(user.id);
      const { data, error } = await supabase
        .from("chart_analyst_reports")
        .select("*")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      const rows = (data ?? []) as ChartReport[];
      setReports(rows);
      setActiveReport(rows[0] ?? null);
      setStatus("AFF AI Chart Analyst ready.");
    } catch (error) {
      setStatus(getErrorMessage(error, "Run the Chart Analyst migration to enable report history."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function submitAnalysis(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setStatus("Upload a TradingView, MT4, MT5, PNG, JPG, or PDF chart file first.");
      return;
    }

    setAnalyzing(true);
    setStatus("Uploading chart and preparing institutional analysis...");

    try {
      const supabase = createClient();
      const extension = selectedFile.name.split(".").pop() ?? "chart";
      const storagePath = `${studentId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await supabase.storage
        .from("chart-analyst-uploads")
        .upload(storagePath, selectedFile, {
          cacheControl: "3600",
          contentType: selectedFile.type || `application/${extension}`
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("chart-analyst-uploads").getPublicUrl(storagePath);
      const response = await fetch("/api/chart-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type || extension,
          fileSize: selectedFile.size,
          storagePath,
          publicUrl: publicData.publicUrl,
          platform,
          studentNotes,
          drMoricetteReviewMode: reviewMode
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to analyze chart.");

      const report = payload.report as ChartReport;
      setReports((current) => [report, ...current]);
      setActiveReport(report);
      setSelectedFile(null);
      setStudentNotes("");
      setStatus("Chart analysis generated and saved.");
    } catch (error) {
      setStatus(getErrorMessage(error, "Unable to upload or analyze chart."));
    } finally {
      setAnalyzing(false);
    }
  }

  function downloadReport(report: ChartReport) {
    const pdf = buildSimplePdf(report);
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `AFF-chart-analysis-${report.id}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF AI Chart Analyst"
        title="Institutional chart review for Forex Anatomy, liquidity, structure, and risk."
        text="Upload TradingView, MT4, MT5, PNG, JPG, or PDF chart evidence and generate structured analysis reports prepared for OpenAI Vision integration."
      />

      <Section>
        <SectionInner className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="grid gap-6">
            <div className="terminal-panel p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Chart Intelligence</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{status}</p>
                </div>
                <Link className="inline-flex items-center justify-center gap-2 border border-gold-500/40 px-4 py-2 text-sm font-semibold text-gold-300" href="/ai-coach">
                  <Bot size={16} /> Connect AI Coach
                </Link>
              </div>
            </div>

            <form className="terminal-panel grid gap-5 p-5" onSubmit={submitAnalysis}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-ink/72">
                  Chart platform
                  <select className="border border-gold-500/24 bg-navy-950 px-3 py-3 text-white outline-none focus:border-gold-400" value={platform} onChange={(event) => setPlatform(event.target.value)}>
                    {platforms.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink/72">
                  Upload chart file
                  <input className="border border-gold-500/24 bg-navy-950 px-3 py-3 text-white outline-none file:mr-3 file:border-0 file:bg-gold-500 file:px-3 file:py-2 file:font-bold file:text-navy-950" type="file" accept={acceptedTypes} onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-ink/72">
                Student chart notes
                <textarea className="min-h-28 border border-gold-500/24 bg-navy-950 px-3 py-3 text-white outline-none focus:border-gold-400" value={studentNotes} onChange={(event) => setStudentNotes(event.target.value)} placeholder="Example: EUR/USD London session, possible liquidity sweep into bearish order block..." />
              </label>

              <label className="flex items-center gap-3 border border-gold-500/20 bg-navy-950 p-4 text-sm font-semibold text-ink/78">
                <input className="h-4 w-4 accent-gold-500" type="checkbox" checked={reviewMode} onChange={(event) => setReviewMode(event.target.checked)} />
                Dr. Moricette Review Mode
              </label>

              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={analyzing}>
                <Send size={18} /> Generate Chart Analysis
              </button>
            </form>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric icon={<FileText size={20} />} label="Reports" value={String(analytics.reports)} />
              <Metric icon={<BarChart3 size={20} />} label="Average Grade" value={`${analytics.avg}%`} />
              <Metric icon={<ShieldCheck size={20} />} label="Dr. Review" value={String(analytics.reviewMode)} />
              <Metric icon={<Wand2 size={20} />} label="Elevated Risk" value={String(analytics.highRisk)} />
            </section>

            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <FileImage className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Analysis Engine Sections</h2>
                </div>
              </div>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                {chartAnalysisSections.map((section, index) => (
                  <div key={section} className="bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{String(index + 1).padStart(2, "0")}</p>
                    <p className="mt-2 font-semibold text-white">{section}</p>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <aside className="grid h-fit gap-6">
            <section className="terminal-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">Report History</h2>
                <button className="text-gold-300" type="button" onClick={loadReports} aria-label="Refresh chart reports">
                  <RefreshCw size={18} />
                </button>
              </div>
              <div className="mt-4 grid gap-2">
                {loading ? <p className="text-sm text-ink/68">Loading reports...</p> : null}
                {!loading && reports.length === 0 ? <p className="text-sm text-ink/68">No chart analysis reports yet.</p> : null}
                {reports.map((report) => (
                  <button key={report.id} className={`border px-4 py-3 text-left ${activeReport?.id === report.id ? "border-gold-400 bg-gold-500 text-navy-950" : "border-gold-500/24 bg-navy-950 text-ink/76"}`} type="button" onClick={() => setActiveReport(report)}>
                    <span className="block font-semibold">{report.file_name}</span>
                    <span className={`mt-1 block text-xs ${activeReport?.id === report.id ? "text-navy-900" : "text-ink/54"}`}>{report.platform} | {report.overall_grade}% | {report.risk_rating}</span>
                  </button>
                ))}
              </div>
            </section>

            {activeReport ? (
              <section className="terminal-panel overflow-hidden">
                <div className="border-b border-gold-500/20 p-5">
                  <h2 className="text-xl font-semibold text-white">Latest Analysis</h2>
                  <p className="mt-2 text-sm text-ink/64">{activeReport.summary}</p>
                  <button className="mt-4 inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={() => downloadReport(activeReport)}>
                    <Download size={16} /> Download PDF
                  </button>
                </div>
                <div className="grid gap-px bg-gold-500/14">
                  {activeReport.sections.map((section) => (
                    <div key={section.title} className="bg-navy-950 p-4">
                      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{section.title}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/72">{section.finding}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{section.grade}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="terminal-panel p-5">
              <div className="flex items-center gap-3">
                <Upload className="text-gold-300" size={20} />
                <h2 className="text-xl font-semibold text-white">Vision Architecture</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                Uploads are saved to Supabase Storage and analyzed through `/api/chart-analyst`. The route stores structured JSON reports today and is prepared for OpenAI Vision chart interpretation once credentials are configured.
              </p>
            </section>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-sm uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}
