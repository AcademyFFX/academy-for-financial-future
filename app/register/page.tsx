import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { StudentRegistrationForm } from "@/components/student-registration-form";

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Student Registration"
        title="Apply to the Academy for Financial Future."
        text="Create your Academy for Financial Future student account and begin enrollment."
      />
      <Section>
        <StudentRegistrationForm />
      </Section>
    </>
  );
}
