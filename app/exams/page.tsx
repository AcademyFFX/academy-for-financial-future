import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { examSections } from "@/lib/data";

export default function ExamsPage() {
  return (
    <>
      <PageHeader eyebrow="Certification Exams" title="Assessment built around professional judgment." text="The final exam combines technical knowledge, risk discipline, trade psychology, and an applied market case study." />
      <Section>
        <SectionInner className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {examSections.map((section) => (
            <article key={section.title} className="terminal-panel p-6">
              <p className="text-xs uppercase tracking-[.24em] text-gold-300">{section.time}</p>
              <h2 className="mt-4 text-xl font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-ink/70">{section.questions} questions</p>
            </article>
          ))}
        </SectionInner>
      </Section>
    </>
  );
}
