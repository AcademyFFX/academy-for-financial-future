import LiveClassroomPage from "@/app/live-classroom/page";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { Section, SectionInner } from "@/components/section";

export default function AdminLiveClassroomPage() {
  return (
    <>
      <Section>
        <SectionInner>
          <AdminRouteAudit routeName="/admin/live-classroom" />
        </SectionInner>
      </Section>
      <LiveClassroomPage />
    </>
  );
}
