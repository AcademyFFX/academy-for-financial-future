import { AuthPanel } from "@/components/auth-panel";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";

export default function LoginPage() {
  return (
    <>
      <PageHeader eyebrow="Student Login" title="Access your training workspace." text="Sign in to review progress, submit homework, take quizzes, and prepare for certification." />
      <Section><AuthPanel mode="login" /></Section>
    </>
  );
}
