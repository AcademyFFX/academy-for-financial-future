import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { journalRows } from "@/lib/data";

export default function JournalPage() {
  return (
    <>
      <PageHeader eyebrow="Trading Journal" title="Document decisions before performance becomes emotion." text="Students can log pairs, session timing, bias, outcomes, and review notes for mentor evaluation." />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form className="terminal-panel grid h-fit gap-4 p-6">
            {["Currency Pair", "Session", "Direction", "Result", "Review Notes"].map((label) => (
              <label key={label} className="grid gap-2 text-sm text-ink/74">
                {label}
                <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" />
              </label>
            ))}
            <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950">Save Journal Entry</button>
          </form>
          <div className="terminal-panel overflow-hidden">
            <div className="grid grid-cols-5 gap-px bg-gold-500/18 text-sm">
              {["Pair", "Session", "Bias", "Result", "Review"].map((header) => <div key={header} className="bg-navy-800 p-4 font-semibold text-gold-300">{header}</div>)}
              {journalRows.flatMap((row) => row.map((cell, index) => <div key={`${row[0]}-${cell}-${index}`} className="bg-navy-950 p-4 text-ink/76">{cell}</div>))}
            </div>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
