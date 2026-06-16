"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Award, SearchCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type VerificationResult = {
  student_name: string;
  certificate_name: string;
  issue_date: string;
  certificate_number: string;
  status: string;
};

export default function VerifyCertificatePage() {
  const [certificateNumber, setCertificateNumber] = useState("");
  const [message, setMessage] = useState("Enter an AFF certificate number to validate authenticity.");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function verifyCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setMessage("Checking AFF certificate registry...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("digital_certificates")
        .select("student_name, certificate_name, issue_date, certificate_number, status")
        .eq("certificate_number", certificateNumber.trim())
        .eq("status", "Valid")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setMessage("Certificate not found or invalid certificate number.");
        return;
      }

      setResult(data as VerificationResult);
      setMessage("Verified Certificate");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify certificate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Public Verification Portal"
        title="Verify an AFF certificate."
        text="Employers, institutions, and partners can validate Academy for Financial Future digital credentials using the official certificate number."
      />
      <Section>
        <SectionInner className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <form className="terminal-panel grid h-fit gap-4 p-6" onSubmit={verifyCertificate}>
            <Award className="text-gold-300" size={34} />
            <label className="grid gap-2 text-sm text-ink/74">
              Certificate Number
              <input
                className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                placeholder="AFF-2026-00001"
                value={certificateNumber}
                onChange={(event) => setCertificateNumber(event.target.value)}
                required
              />
            </label>
            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" disabled={loading} type="submit">
              <SearchCheck size={18} /> Verify Certificate
            </button>
            <p className="text-sm text-ink/68">{message}</p>
          </form>

          <section className="terminal-panel p-6">
            {result ? (
              <div>
                <p className="text-xs uppercase tracking-[.24em] text-gold-300">Valid</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Verified Certificate</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Detail label="Student Name" value={result.student_name} />
                  <Detail label="Issue Date" value={new Date(result.issue_date).toLocaleDateString()} />
                  <Detail label="Certification" value={result.certificate_name} />
                  <Detail label="Certificate Number" value={result.certificate_number} />
                </div>
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center text-center">
                <div>
                  <SearchCheck className="mx-auto text-gold-300" size={44} />
                  <h2 className="mt-4 text-2xl font-semibold text-white">Certificate Verification</h2>
                  <p className="mt-3 max-w-xl text-ink/68">A valid result will display student name, issue date, certification, and certificate number.</p>
                </div>
              </div>
            )}
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
