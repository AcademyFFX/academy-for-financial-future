import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
import { featureCards, metrics } from "@/lib/data";
import { Section, SectionInner } from "@/components/section";

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[calc(100vh-77px)] overflow-hidden border-b border-gold-500/20">
        <Image src="/images/academy-hero.png" alt="Luxury financial academy trading classroom" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/86 to-navy-900/24" />
        <div className="relative mx-auto flex min-h-[calc(100vh-77px)] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.32em] text-gold-300">Forex Training Division</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
            Academy for Financial Future
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/82">
            A professional financial education platform for disciplined forex training, course accountability, certification readiness, and institutional-grade student development.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-gold-500 px-6 py-3 font-bold text-navy-950">
              Enroll Now <ArrowRight size={18} />
            </Link>
            <Link href="/courses" className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-6 py-3 font-semibold text-gold-300">
              <PlayCircle size={18} /> View Courses
            </Link>
          </div>
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-px overflow-hidden border border-gold-500/25 bg-gold-500/20 md:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-navy-950/88 p-4">
                <metric.icon className="mb-3 text-gold-300" size={20} />
                <p className="text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[.16em] text-ink/62">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Section>
        <SectionInner>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.28em] text-gold-300">Platform Capabilities</p>
            <h2 className="mt-4 font-serif text-4xl font-semibold text-white">Built for a serious forex education institution.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article key={feature.title} className="terminal-panel p-6">
                <feature.icon className="text-gold-300" size={24} />
                <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 leading-7 text-ink/70">{feature.text}</p>
              </article>
            ))}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
