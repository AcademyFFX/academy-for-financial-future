import { Mail, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Connect with the Forex Training Division." text="Use the inquiry form for admissions, course support, corporate cohorts, or certificate verification." />
      <Section>
        <SectionInner className="grid gap-8 lg:grid-cols-[.8fr_1fr]">
          <div className="terminal-panel grid h-fit gap-5 p-6 text-ink/76">
            <p className="flex gap-3"><Mail className="text-gold-300" size={20} /> admissions@academyfinancialfuture.com</p>
            <p className="flex gap-3"><Phone className="text-gold-300" size={20} /> +1 (000) 000-0000</p>
            <p className="flex gap-3"><MapPin className="text-gold-300" size={20} /> Professional online forex education</p>
          </div>
          <form className="terminal-panel grid gap-4 p-6">
            {["Name", "Email", "Subject"].map((label) => (
              <label key={label} className="grid gap-2 text-sm text-ink/74">
                {label}
                <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" />
              </label>
            ))}
            <label className="grid gap-2 text-sm text-ink/74">
              Message
              <textarea className="min-h-36 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" />
            </label>
            <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950">Send Inquiry</button>
          </form>
        </SectionInner>
      </Section>
    </>
  );
}
