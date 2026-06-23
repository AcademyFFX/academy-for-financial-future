import { PageHeader } from "@/components/page-header";
import { PasswordResetPanel } from "@/components/password-reset-panel";
import { Section } from "@/components/section";

export default function ResetPasswordPage() {
  return (
    <>
      <PageHeader eyebrow="Account Recovery" title="Reset your AFF password." text="Request a secure recovery link or choose a new password after opening the link from Supabase." />
      <Section><PasswordResetPanel /></Section>
    </>
  );
}
