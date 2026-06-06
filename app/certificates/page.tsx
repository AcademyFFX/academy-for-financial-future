"use client";

import { useRouter } from "next/navigation";
import { Award, Download, PlusCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type Certificate = {
  id: string;
  certificate_number: string;
  student_id: string;
  student_name: string;
  course_name: string;
  score: number;
  issue_date: string;
  verification_code: string;
};

type CertificateRow = Partial<Certificate>;

export default function CertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("Certificates are issued automatically after passing certification exams.");

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeCertificate(row: CertificateRow): Certificate {
    return {
      id: String(row.id ?? crypto.randomUUID()),
      certificate_number: String(row.certificate_number ?? ""),
      student_id: String(row.student_id ?? ""),
      student_name: String(row.student_name ?? "Student"),
      course_name: String(row.course_name ?? "Forex Training Division"),
      score: Number(row.score ?? 0),
      issue_date: row.issue_date ?? new Date().toISOString().slice(0, 10),
      verification_code: String(row.verification_code ?? "")
    };
  }

  function createVerificationCode() {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  }

  function createCertificateNumber() {
    return `AFF-2026-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
  }

  useEffect(() => {
    async function loadCertificates() {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("certificates")
          .select("*")
          .eq("student_id", user.id)
          .order("issue_date", { ascending: false });

        if (error) throw error;
        setCertificates(((data ?? []) as CertificateRow[]).map(normalizeCertificate));
      } catch (error) {
        setMessage(getErrorMessage(error, "Unable to load certificates."));
      } finally {
        setLoading(false);
      }
    }

    loadCertificates();
  }, [router]);

  function downloadCertificate(certificate: Certificate) {
    const content = `
ACADEMY FOR FINANCIAL FUTURE
Forex Training Division

Certificate of Completion

This certifies that ${certificate.student_name}
has successfully completed ${certificate.course_name}
with a score of ${certificate.score}%.

Certificate Number: ${certificate.certificate_number}
Issue Date: ${new Date(certificate.issue_date).toLocaleDateString()}
Verification Code: ${certificate.verification_code}

Administrator: Dr. Jean Rene Moricette
`;
    const blob = new Blob([content.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificate.certificate_number}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function generateCertificate() {
    setGenerating(true);
    setMessage("Generating certificate...");

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const { data: latestExam, error: examError } = await supabase
        .from("exams")
        .select("score")
        .eq("student_id", user.id)
        .gte("score", 80)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (examError) throw examError;

      const profileName = typeof profile?.full_name === "string" && profile.full_name.trim().length > 0 ? profile.full_name : null;
      const metadataName =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
          ? user.user_metadata.name
          : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
            ? user.user_metadata.full_name
            : null;

      const payload = {
        certificate_number: createCertificateNumber(),
        student_id: user.id,
        student_name: profileName ?? metadataName ?? user.email ?? "Student",
        course_name: "Forex Training Division",
        score: Number(latestExam?.score ?? 100),
        issue_date: new Date().toISOString().slice(0, 10),
        verification_code: createVerificationCode()
      };

      const { data, error } = await supabase
        .from("certificates")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setCertificates((current) => [normalizeCertificate(data as CertificateRow), ...current]);
      setMessage("Certificate generated successfully.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to generate certificate."));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Certificates"
        title="Verified student certificates."
        text="Passing exam scores automatically generate certificate records for the Academy for Financial Future."
      />
      <Section>
        <SectionInner>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink/70">{message}</p>
            <button
              className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60"
              type="button"
              onClick={generateCertificate}
              disabled={generating}
            >
              <PlusCircle size={18} /> {generating ? "Generating..." : "Generate Certificate"}
            </button>
          </div>
          {loading ? (
            <div className="terminal-panel p-6 text-ink/72">Loading certificates...</div>
          ) : certificates.length === 0 ? (
            <div className="terminal-panel p-8 text-center shadow-gold">
              <Award className="mx-auto text-gold-300" size={48} />
              <h2 className="mt-5 font-serif text-3xl font-semibold text-white">No certificates issued yet.</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-8 text-ink/74">Generate a certificate after passing an exam, or create one manually for verified completion.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {certificates.map((certificate) => (
                <article key={certificate.id} className="terminal-panel p-6 shadow-gold">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[.28em] text-gold-300">Certificate of Completion</p>
                      <h2 className="mt-4 font-serif text-3xl font-semibold text-white">{certificate.course_name}</h2>
                    </div>
                    <Award className="shrink-0 text-gold-300" size={34} />
                  </div>
                  <div className="gold-rule my-6" />
                  <div className="grid gap-3 text-sm text-ink/76">
                    <p><span className="text-gold-300">Student:</span> {certificate.student_name}</p>
                    <p><span className="text-gold-300">Score:</span> {certificate.score}%</p>
                    <p><span className="text-gold-300">Issued:</span> {new Date(certificate.issue_date).toLocaleDateString()}</p>
                    <p><span className="text-gold-300">Certificate Number:</span> {certificate.certificate_number}</p>
                    <p><span className="text-gold-300">Verification Code:</span> {certificate.verification_code}</p>
                  </div>
                  <button
                    className="mt-6 inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950"
                    type="button"
                    onClick={() => downloadCertificate(certificate)}
                  >
                    <Download size={18} /> Download Certificate
                  </button>
                </article>
              ))}
            </div>
          )}
        </SectionInner>
      </Section>
    </>
  );
}
