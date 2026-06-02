import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { assignments, metrics } from "@/lib/data";

export default function AdminPage() {
  return (
    <>
      <PageHeader eyebrow="Admin Dashboard" title="Institutional oversight for Dr. Jean Rene Moricette." text="Manage enrollments, student progress, assignments, exam readiness, certificate approvals, and announcements." />
      <Section>
        <SectionInner>
          <div className="grid gap-4 md:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="terminal-panel p-5">
                <metric.icon className="text-gold-300" size={20} />
                <p className="mt-4 text-3xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-sm text-ink/66">{metric.label}</p>
              </div>
            ))}
          </div>
          <div className="terminal-panel mt-8 overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-gold-500/18 text-sm">
              {["Workflow", "Status", "Admin Action"].map((header) => <div key={header} className="bg-navy-800 p-4 font-semibold text-gold-300">{header}</div>)}
              {assignments.flatMap((assignment) => [
                <div key={`${assignment.title}-title`} className="bg-navy-950 p-4 text-ink/78">{assignment.title}</div>,
                <div key={`${assignment.title}-status`} className="bg-navy-950 p-4 text-ink/78">{assignment.status}</div>,
                <div key={`${assignment.title}-action`} className="bg-navy-950 p-4 text-gold-300">Review</div>
              ])}
            </div>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
