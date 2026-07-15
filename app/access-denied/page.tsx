import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function AccessDeniedPage() {
  return (
    <>
      <PageHeader
        eyebrow="Access Denied"
        title="Administrator authorization required."
        text="This Academy for Financial Future area contains private student or administrative records and is restricted to verified academy administrators."
      />
      <Section>
        <SectionInner>
          <div className="terminal-panel mx-auto max-w-2xl p-6 text-center">
            <ShieldAlert className="mx-auto text-gold-300" size={42} />
            <h2 className="mt-4 text-2xl font-semibold text-white">You do not have permission to view this page.</h2>
            <p className="mt-3 leading-7 text-ink/72">
              Return to your student dashboard to continue your courses, profile, billing, and academy tools.
            </p>
            <Link href="/student-dashboard" className="mt-6 inline-flex bg-gold-500 px-5 py-3 font-bold text-navy-950">
              Back to Student Dashboard
            </Link>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
