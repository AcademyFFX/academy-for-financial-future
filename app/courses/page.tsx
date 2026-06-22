import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { CourseManagement } from "@/components/course-management";
import { LmsCourseCenter } from "@/components/lms-course-center";

export default function CoursesPage() {
  return (
    <>
      <PageHeader eyebrow="Forex Courses" title="A structured path from foundations to institutional strategy." text="Each course combines video lessons, PDF downloads, practical assignments, and progress tracking." />
      <Section>
        <SectionInner className="grid gap-10">
          <LmsCourseCenter />
          <CourseManagement />
        </SectionInner>
      </Section>
    </>
  );
}
