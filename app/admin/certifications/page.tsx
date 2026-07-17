import CertificationsPage from "@/app/certifications/page";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { Section, SectionInner } from "@/components/section";

export default function AdminCertificationsPage() {
  return (
    <>
      <Section>
        <SectionInner>
          <AdminRouteAudit routeName="/admin/certifications" />
        </SectionInner>
      </Section>
      <CertificationsPage />
    </>
  );
}
