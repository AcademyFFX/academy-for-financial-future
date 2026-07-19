import { AdminLmsManager } from "@/components/admin-lms-manager";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function NewAdminCoursePage() {
  return (
    <>
      <PageHeader
        eyebrow="AFF COURSE MANAGEMENT SYSTEM"
        title="Create a new Academy course."
        text="Save a draft course, add modules and lessons, then publish when the Academy readiness checklist is complete."
      />
      <Section>
        <SectionInner>
          <div className="mb-6">
            <AdminRouteAudit routeName="/admin/course-management/new" />
          </div>
          <AdminLmsManager createMode />
        </SectionInner>
      </Section>
    </>
  );
}
