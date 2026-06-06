"use client";

import { Search, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type Certificate = {
  certificate_number: string;
  student_name: string;
  course_name: string;
  score: number;
  issue_date: string;
  verification_code: string;
};

export default function VerifyCertificatePage() {
  const [certificateNumber, setCertificateNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [message, setMessage] = useState("Enter the certificate number and verification code exactly as shown.");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  async function verifyCertificate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSearched(true);
    setCertificate(null);
    setMessage("Checking certificate record...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("certificates")
        .select("certificate_number,student_name,course_name,score,issue_date,verification_code")
        .eq("certificate_number", certificateNumber.trim().toUpperCase())
        .eq("verification_code", verificationCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setMessage("Certificate not found or invalid verification code");
        return;
      }

      setCertificate(data as Certificate);
      setMessage("Certificate verified.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Certificate not found or invalid verification code"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Verify Certificate"
        title="Public certificate verification portal."
        text="Confirm Academy for Financial Future certificate authenticity using the certificate number and verification code."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={verifyCertificate} className="terminal-panel grid h-fit gap-4 p-6 shadow-gold">
            <label className="grid gap-2 text-sm text-ink/74">
              Certificate Number
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                placeholder="AFF-2026-00001"
                value={certificateNumber}
                onChange={(event) => setCertificateNumber(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm text-ink/74">
              Verification Code
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                placeholder="ABC123DEF456"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                required
              />
            </label>
            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={loading}>
              <Search size={18} /> {loading ? "Verifying..." : "Verify Certificate"}
            </button>
            <p className="text-sm text-ink/70">{message}</p>
          </form>

          {certificate ? (
            <article className="terminal-panel p-8 shadow-gold">
              <ShieldCheck className="text-gold-300" size={42} />
              <p className="mt-6 text-xs uppercase tracking-[.28em] text-gold-300">Verified Certificate</p>
              <h2 className="mt-4 font-serif text-4xl font-semibold text-white">{certificate.student_name}</h2>
              <div className="gold-rule my-6" />
              <div className="grid gap-4 text-ink/76 sm:grid-cols-2">
                <p><span className="text-gold-300">Course Name:</span> {certificate.course_name}</p>
                <p><span className="text-gold-300">Score:</span> {certificate.score}%</p>
                <p><span className="text-gold-300">Issue Date:</span> {new Date(certificate.issue_date).toLocaleDateString()}</p>
                <p><span className="text-gold-300">Certificate Number:</span> {certificate.certificate_number}</p>
                <p className="sm:col-span-2"><span className="text-gold-300">Verification Code:</span> {certificate.verification_code}</p>
              </div>
            </article>
          ) : (
            <div className="terminal-panel grid place-items-center p-8 text-center">
              {searched ? <XCircle className="text-red-300" size={42} /> : <ShieldCheck className="text-gold-300" size={42} />}
              <h2 className="mt-5 text-2xl font-semibold text-white">
                {searched ? "Certificate not found or invalid verification code" : "Ready to verify"}
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-ink/70">
                {searched ? "Check both values and try again." : "Verification results will appear here after a successful lookup."}
              </p>
            </div>
          )}
        </SectionInner>
      </Section>
    </>
  );
}
