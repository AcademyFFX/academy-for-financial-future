import { CalendarDays, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress";
import { Section, SectionInner } from "@/components/section";
import { courses, metrics } from "@/lib/data";

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Student Dashboard" title="Your academic command center." text="Track course progress, upcoming deadlines, exam readiness, and certificate milestones from one operational view." />
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
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="terminal-panel p-6">
              <h2 className="text-xl font-semibold text-white">Course Progress</h2>
              <div className="mt-5 grid gap-5">
                {courses.map((course) => (
                  <div key={course.title}>
                    <div className="mb-2 flex justify-between text-sm"><span>{course.title}</span><span className="text-gold-300">{course.progress}%</span></div>
                    <ProgressBar value={course.progress} />
                  </div>
                ))}
              </div>
            </div>
            <div className="terminal-panel p-6">
              <h2 className="text-xl font-semibold text-white">Next Actions</h2>
              <div className="mt-5 grid gap-4 text-sm text-ink/76">
                <p className="flex gap-3"><CalendarDays className="shrink-0 text-gold-300" size={18} /> Submit Trading Plan Blueprint by June 8, 2026.</p>
                <p className="flex gap-3"><CheckCircle2 className="shrink-0 text-gold-300" size={18} /> Complete Technical Analysis Lab quiz 3.</p>
                <p className="flex gap-3"><CheckCircle2 className="shrink-0 text-gold-300" size={18} /> Upload three chart markups for review.</p>
              </div>
            </div>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
