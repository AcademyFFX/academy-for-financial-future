import type { ChartAnalystSection } from "@/lib/chart-analyst";

export type ChartReport = {
  id: string | number;
  student_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string | null;
  platform: string;
  dr_moricette_review_mode: boolean;
  student_notes: string | null;
  summary: string;
  overall_grade: number;
  risk_rating: string;
  sections: ChartAnalystSection[];
  created_at: string;
};

const validGrades = new Set(["Developing", "Competent", "Professional", "Institutional"]);

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeWebUrl(value: unknown) {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseSections(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeChartSections(value: unknown): ChartAnalystSection[] {
  return parseSections(value).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const row = candidate as Record<string, unknown>;
    const title = text(row.title);
    if (!title) return [];

    const rawGrade = text(row.grade, "Developing");
    const grade = validGrades.has(rawGrade) ? rawGrade : "Developing";
    return [{
      title,
      finding: text(row.finding, "No finding was recorded for this section."),
      grade: grade as ChartAnalystSection["grade"],
      action: text(row.action, "Review this section with an AFF instructor.")
    }];
  });
}

export function normalizeChartReport(value: unknown, fallbackPublicUrl: string | null = null): ChartReport | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "number" || typeof row.id === "string" ? row.id : "";
  const fileName = text(row.file_name);
  if (id === "" || !fileName) return null;

  const parsedSize = Number(row.file_size ?? 0);
  const parsedGrade = Number(row.overall_grade ?? 0);
  return {
    id,
    student_id: text(row.student_id),
    file_name: fileName,
    file_type: text(row.file_type),
    file_size: Number.isFinite(parsedSize) ? parsedSize : 0,
    storage_path: text(row.storage_path),
    public_url: safeWebUrl(row.public_url) || safeWebUrl(fallbackPublicUrl),
    platform: text(row.platform, "Chart"),
    dr_moricette_review_mode: row.dr_moricette_review_mode === true || row.dr_moricette_review_mode === "true",
    student_notes: text(row.student_notes) || null,
    summary: text(row.summary, "No analysis summary was recorded."),
    overall_grade: Number.isFinite(parsedGrade) ? parsedGrade : 0,
    risk_rating: text(row.risk_rating, "Not rated"),
    sections: normalizeChartSections(row.sections),
    created_at: text(row.created_at)
  };
}

export function isImageChartReport(report: Pick<ChartReport, "file_name" | "file_type">) {
  return report.file_type.toLowerCase().startsWith("image/") || /\.(png|jpe?g)$/i.test(report.file_name);
}

export function getChartAssetPresentation(report: Pick<ChartReport, "file_name" | "file_type" | "public_url">) {
  if (!report.public_url) return { kind: "missing" as const, url: null, label: report.file_name };
  return {
    kind: isImageChartReport(report) ? "image" as const : "document" as const,
    url: report.public_url,
    label: report.file_name
  };
}
