import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { announcements } from "@/lib/data";

export default function AnnouncementsPage() {
  return (
    <>
      <PageHeader eyebrow="Announcements" title="Official notices for active cohorts." text="Students can review upcoming workshops, exam windows, live sessions, and administrative updates." />
      <Section>
        <SectionInner className="grid gap-4">
          {announcements.map((item) => (
            <article key={item.title} className="terminal-panel flex gap-5 p-6">
              <Megaphone className="mt-1 shrink-0 text-gold-300" size={22} />
              <div>
                <p className="text-sm text-gold-300">{item.date}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 leading-7 text-ink/72">{item.body}</p>
              </div>
            </article>
          ))}
        </SectionInner>
      </Section>
    </>
  );
}
