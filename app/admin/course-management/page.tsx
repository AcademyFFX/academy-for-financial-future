import Link from "next/link";
import { UploadCloud } from "lucide-react";
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
      <Section>
        <SectionInner>
          <div className="mb-8 flex flex-col gap-4 border border-gold/35 bg-navy-900 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Admin / Course Management</p>
              <h2 className="mt-2 text-xl font-semibold text-cream">Course Upload Center</h2>
              <p className="mt-1 max-w-2xl text-sm text-cream/70">
                Upload course media, build modules and quizzes, monitor progress, and assign completion certificates.
              </p>
            </div>
            <Link
              href="/admin/course-management/upload-center"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-gold bg-gold px-4 py-2 text-sm font-semibold text-navy transition hover:bg-cream"
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Open Upload Center
            </Link>
          </div>
          <AdminLmsManager />
        </SectionInner>
      </Section>
    </>
  );
}
