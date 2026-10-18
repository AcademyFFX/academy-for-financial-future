type CertificateDateRecord = {
  issue_date?: unknown;
  completion_date?: unknown;
};

function storedDate(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveStoredCertificateDates(record: CertificateDateRecord) {
  return {
    issueDate: storedDate(record.issue_date) ?? "",
    completionDate: storedDate(record.completion_date)
  };
}

export function formatStoredCertificateDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
