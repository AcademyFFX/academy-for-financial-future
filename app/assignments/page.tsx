import { UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { assignments } from "@/lib/data";

export default function AssignmentsPage() {
  return (
    <>
      <PageHeader eyebrow="Assignments" title="Submit work that proves process, not luck." text="Homework workflows support trading plans, chart analysis, risk worksheets, and reflective performance reviews." />
      <Section>
        <SectionInner className="grid gap-4">
          {assignments.map((assignment) => (
            <article key={assignment.title} className="terminal-panel flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{assignment.title}</h2>
                <p className="mt-2 text-sm text-ink/68">Due: {assignment.due}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-sm text-gold-300">{assignment.status}</span>
                <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-5 py-3 text-sm font-semibold text-gold-300">
                  <UploadCloud size={17} /> Upload
                </button>
              </div>
            </article>
          ))}
        </SectionInner>
      </Section>
    </>
  );
}
