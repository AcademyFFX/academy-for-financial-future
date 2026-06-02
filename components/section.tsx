import type { ReactNode } from "react";

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`px-4 py-14 sm:px-6 lg:px-8 ${className}`}>{children}</section>;
}

export function SectionInner({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-7xl ${className}`}>{children}</div>;
}
