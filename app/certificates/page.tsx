import { Award } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function CertificatesPage() {
  return (
    <>
      <PageHeader eyebrow="Certificates" title="Generate verified completion certificates." text="Certificates are issued after required coursework, assignments, quizzes, and certification exams are complete." />
      <Section>
        <SectionInner>
          <div className="terminal-panel mx-auto max-w-4xl p-8 text-center shadow-gold">
            <Award className="mx-auto text-gold-300" size={48} />
            <p className="mt-6 text-xs uppercase tracking-[.3em] text-gold-300">Certificate of Completion</p>
            <h2 className="mt-5 font-serif text-4xl font-semibold text-white">Forex Training Division</h2>
            <p className="mx-auto mt-5 max-w-2xl leading-8 text-ink/74">
              Awarded by Academy for Financial Future upon successful completion of the professional forex curriculum and certification examination.
            </p>
            <div className="gold-rule my-8" />
            <p className="text-gold-300">Administrator Signature: Dr. Jean Rene Moricette</p>
            <button className="mt-8 bg-gold-500 px-6 py-3 font-bold text-navy-950">Generate Certificate</button>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
