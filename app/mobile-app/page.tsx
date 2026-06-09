import { Smartphone, TabletSmartphone, UploadCloud } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";

const mobileViews = [
  "Student Dashboard",
  "Courses",
  "Trading Journal",
  "Assignments",
  "Live Trading Room",
  "Certification Exams",
  "Certificates",
  "Messaging Center"
];

const deploymentSteps = [
  "Install Expo CLI and EAS CLI in the mobile workspace.",
  "Add EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_ACADEMY_WEB_URL.",
  "Connect EAS project ID in mobile/app.json.",
  "Run iOS and Android preview builds.",
  "Submit production builds through EAS Submit after App Store Connect and Google Play Console setup."
];

export default function MobileAppPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mobile Companion"
        title="AFF mobile app system for iOS and Android."
        text="The Academy for Financial Future companion app is prepared with Expo, Supabase-ready authentication, native mobile screens, and deployment configuration."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <section className="grid gap-5 lg:grid-cols-3">
            <InfoCard icon={<Smartphone size={24} />} title="Native Mobile UX" text="Dedicated mobile screens for the core student experience with AFF navy-gold styling, compact navigation, unread badges, and mobile-first card layouts." />
            <InfoCard icon={<TabletSmartphone size={24} />} title="Expo Ready" text="The companion app lives in the mobile workspace with Expo app configuration, EAS build profiles, TypeScript, Supabase adapter, and environment template." />
            <InfoCard icon={<UploadCloud size={24} />} title="Store Deployment" text="Prepared for iOS and Android build pipelines through EAS Build and EAS Submit after production credentials are connected." />
          </section>

          <section className="terminal-panel p-6">
            <h2 className="text-2xl font-semibold text-white">Mobile Views Included</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {mobileViews.map((view) => (
                <div key={view} className="border border-gold-500/20 bg-navy-950 p-4">
                  <p className="font-semibold text-white">{view}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="terminal-panel p-6">
            <h2 className="text-2xl font-semibold text-white">Deployment Plan</h2>
            <ol className="mt-5 grid gap-3">
              {deploymentSteps.map((step, index) => (
                <li key={step} className="flex gap-3 border border-gold-500/16 bg-navy-950 p-4 text-ink/74">
                  <span className="text-gold-300">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="terminal-panel p-6">
      <div className="text-gold-300">{icon}</div>
      <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 leading-7 text-ink/70">{text}</p>
    </article>
  );
}
