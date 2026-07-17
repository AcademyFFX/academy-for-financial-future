import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function AdminEnrollmentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin / Enrollment"
        title="AFF Enrollment Review"
        text="Administrator route for applicant approval, student activation, membership review, and enrollment synchronization."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <AdminRouteAudit routeName="/admin/enrollment" />
          <div className="terminal-panel p-6">
            <p className="text-sm leading-7 text-ink/72">
              Enrollment review tools are managed inside the Admin Operations Dashboard so application, student, membership, and enrollment state refresh together.
            </p>
            <Link
              href="/admin#enrollment-review"
              className="mt-5 inline-flex items-center gap-2 bg-gold-500 px-5 py-3 text-sm font-bold text-navy-950 transition hover:bg-gold-300"
            >
              Open Enrollment Review <ArrowRight size={16} />
            </Link>
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
