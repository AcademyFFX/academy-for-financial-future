import { AdminLmsManager } from "@/components/admin-lms-manager";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function AdminCourseEditorPage({ params }: { params: { courseId: string } }) {
  return (
    <>
      <PageHeader
        eyebrow="AFF COURSE MANAGEMENT SYSTEM"
        title="Edit Academy course."
        text="Manage course information, curriculum structure, lessons, resources, assignments, quizzes, and publication controls."
      />
      <Section>
        <SectionInner>
          <div className="mb-6">
            <AdminRouteAudit routeName="/admin/course-management/[courseId]" />
          </div>
          <AdminLmsManager initialCourseId={params.courseId} />
        </SectionInner>
      </Section>
    </>
  );
}
