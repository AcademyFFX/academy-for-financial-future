export function PageHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="market-grid border-b border-gold-500/20 bg-navy-900 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[.28em] text-gold-300">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold text-white sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-ink/78">{text}</p>
      </div>
    </section>
  );
}
