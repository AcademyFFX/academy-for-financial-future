import ExecutiveCommandCenterPage from "@/app/executive-command-center/page";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { Section, SectionInner } from "@/components/section";

export default function AdminCommandCenterPage() {
  return (
    <>
      <Section>
        <SectionInner>
          <AdminRouteAudit routeName="/admin/command-center" />
        </SectionInner>
      </Section>
      <ExecutiveCommandCenterPage />
    </>
  );
}
