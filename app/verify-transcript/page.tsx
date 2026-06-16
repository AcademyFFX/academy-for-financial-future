"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { FileSearch, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type TranscriptResult = {
  transcript_id: string;
  degree_id: string;
  degree_name: string;
  student_name: string;
  aff_student_id: string;
  issued_at: string;
  credits_earned: number;
  gpa_equivalent: number;
  status: string;
};

export default function VerifyTranscriptPage() {
  const [transcriptId, setTranscriptId] = useState("");
  const [degreeId, setDegreeId] = useState("");
  const [message, setMessage] = useState("Enter a transcript ID and degree ID to validate an AFF academic record.");
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function verifyTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setMessage("Checking AFF academic registry...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("academic_transcript_records")
        .select("transcript_id, degree_id, degree_name, student_name, aff_student_id, issued_at, credits_earned, gpa_equivalent, status")
        .eq("transcript_id", transcriptId.trim())
        .eq("degree_id", degreeId.trim())
        .eq("status", "Valid")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setMessage("Transcript not found or invalid transcript and degree combination.");
        return;
      }

      setResult(data as TranscriptResult);
      setMessage("Verified Transcript");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify transcript.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Academic Verification Portal"
        title="Verify an AFF transcript."
        text="Employers, institutions, and partners can validate Academy for Financial Future transcript records using the official transcript ID and degree ID."
      />
      <Section>
        <SectionInner className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <form className="terminal-panel grid h-fit gap-4 p-6" onSubmit={verifyTranscript}>
            <FileSearch className="text-gold-300" size={34} />
            <label className="grid gap-2 text-sm text-ink/74">
              Transcript ID
              <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="AFF-TR-2026-000001" value={transcriptId} onChange={(event) => setTranscriptId(event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm text-ink/74">
              Degree ID
              <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="AFF-AFM" value={degreeId} onChange={(event) => setDegreeId(event.target.value)} required />
            </label>
            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" disabled={loading} type="submit">
              <ShieldCheck size={18} /> Verify Transcript
            </button>
            <p className="text-sm text-ink/68">{message}</p>
          </form>

          <section className="terminal-panel p-6">
            {result ? (
              <div>
                <p className="text-xs uppercase tracking-[.24em] text-gold-300">Valid</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Verified Academic Transcript</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Detail label="Student Name" value={result.student_name} />
                  <Detail label="Student ID" value={result.aff_student_id} />
                  <Detail label="Degree" value={result.degree_name} />
                  <Detail label="Degree ID" value={result.degree_id} />
                  <Detail label="Transcript ID" value={result.transcript_id} />
                  <Detail label="Issue Date" value={new Date(result.issued_at).toLocaleDateString()} />
                  <Detail label="Credits Earned" value={String(result.credits_earned)} />
                  <Detail label="GPA Equivalent" value={String(result.gpa_equivalent)} />
                </div>
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center text-center">
                <div>
                  <FileSearch className="mx-auto text-gold-300" size={44} />
                  <h2 className="mt-4 text-2xl font-semibold text-white">Transcript Verification</h2>
                  <p className="mt-3 max-w-xl text-ink/68">A valid result will display student identity, degree record, credits earned, GPA equivalent, and issue date.</p>
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
      <p className="mt-2 text-lg font-semibold text-white">{value || "Not recorded"}</p>
    </div>
  );
}
