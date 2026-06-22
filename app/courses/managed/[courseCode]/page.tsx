"use client";

import { useParams } from "next/navigation";
import { LmsCourseCenter } from "@/components/lms-course-center";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

export default function ManagedCoursePage() {
  const params = useParams<{ courseCode: string }>();
  const courseCode = decodeURIComponent(params.courseCode);
  return (
    <>
      <PageHeader eyebrow="AFF Global University Course" title="Managed learning, progress, assessment, and certification." text="Complete every module, pass the course assessment, and unlock the official AFF completion certificate." />
      <Section><SectionInner><LmsCourseCenter courseCode={courseCode} /></SectionInner></Section>
    </>
  );
}
