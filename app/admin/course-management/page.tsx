import { AdminLmsManager } from "@/components/admin-lms-manager";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function AdminCourseManagementPage() {
  return (
    <>
      <PageHeader
        eyebrow="AFF Course Management System"
        title="Build courses, modules, lessons, resources, homework, quizzes, and completion pathways."
        text="Administrator tools publish Supabase-backed learning experiences to the Student Dashboard, Course Library, and AFF Global University."
      />
      <Section><SectionInner><AdminLmsManager /></SectionInner></Section>
    </>
  );
}
