import { FileDown, Video } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress";
import { Section, SectionInner } from "@/components/section";
import { courses, downloads } from "@/lib/data";

export default function CoursesPage() {
  return (
    <>
      <PageHeader eyebrow="Forex Courses" title="A structured path from foundations to institutional strategy." text="Each course combines video lessons, PDF downloads, practical assignments, and progress tracking." />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {courses.map((course) => (
              <article key={course.title} className="terminal-panel p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.22em] text-gold-300">{course.level}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{course.title}</h2>
                    <p className="mt-3 leading-7 text-ink/72">{course.summary}</p>
                  </div>
                  <div className="flex shrink-0 gap-3 text-sm text-ink/70">
                    <span className="inline-flex items-center gap-2"><Video size={16} /> {course.lessons}</span>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm"><span>Progress</span><span className="text-gold-300">{course.progress}%</span></div>
                  <ProgressBar value={course.progress} />
                </div>
              </article>
            ))}
          </div>
          <aside className="terminal-panel h-fit p-6">
            <h2 className="text-xl font-semibold text-white">PDF Downloads</h2>
            <div className="mt-5 grid gap-3">
              {downloads.map((download) => (
                <a key={download.title} href={download.href} className="flex items-center gap-3 border border-gold-500/20 px-4 py-3 text-sm text-ink/78 hover:text-gold-300">
                  <FileDown size={17} /> {download.title}
                </a>
              ))}
            </div>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}
