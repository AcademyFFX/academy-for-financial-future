import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About Academy" title="Professional finance education with institutional standards." text="The Academy for Financial Future prepares students to approach forex markets with disciplined analysis, risk control, and documented performance review." />
      <Section>
        <SectionInner className="grid gap-8 lg:grid-cols-[1fr_.8fr]">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-white">Administrator</h2>
            <p className="mt-4 text-xl text-gold-300">Dr. Jean Rene Moricette</p>
            <p className="mt-5 leading-8 text-ink/76">
              The academy structure supports formal cohorts, student accountability, downloadable training resources, certification exams, and administrative oversight for a premium educational experience.
            </p>
          </div>
          <div className="terminal-panel p-6">
            <p className="text-xs uppercase tracking-[.26em] text-gold-300">Institutional Model</p>
            <div className="gold-rule my-5" />
            <p className="leading-8 text-ink/74">
              Bloomberg Terminal precision meets Harvard Business School clarity: dense market data, executive education pacing, and structured student workflows.
            </p>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
