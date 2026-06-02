import { AuthPanel } from "@/components/auth-panel";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";

export default function RegisterPage() {
  return (
    <>
      <PageHeader eyebrow="Student Registration" title="Apply to the Forex Training Division." text="Create a student account to begin enrollment and receive academy onboarding instructions." />
      <Section><AuthPanel mode="register" /></Section>
    </>
  );
}
