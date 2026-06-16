import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { StudentEnrollmentForm } from "@/components/student-enrollment-form";

export default function EnrollmentPage() {
  return (
    <>
      <PageHeader
        eyebrow="AFF Enrollment"
        title="Apply to Academy for Financial Future."
        text="Create your student account, select your membership plan, and submit your Academy application for review."
      />
      <Section>
        <StudentEnrollmentForm />
      </Section>
    </>
  );
}
