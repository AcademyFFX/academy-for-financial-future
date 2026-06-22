import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CourseUploadCenter } from "@/components/course-upload-center";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function CourseUploadCenterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin / Course Management / Upload Center"
        title="AFF Course Upload Center"
        text="Manage learning assets, course structure, quizzes, student progress, and certificate assignment from one instructor workspace."
      />
      <Section>
        <SectionInner>
          <Link
            href="/admin/course-management"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gold transition hover:text-cream"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Course Management
          </Link>
          <CourseUploadCenter />
        </SectionInner>
      </Section>
    </>
  );
}
