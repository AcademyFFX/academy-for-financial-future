import { AFFInstitutionalLogo } from "@/components/aff-logo";

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-navy-950 px-4">
      <div className="text-center">
        <AFFInstitutionalLogo className="h-48 w-72" priority />
        <div className="mx-auto mt-8 h-1 w-56 overflow-hidden bg-charcoal">
          <div className="h-full w-1/2 animate-pulse bg-gold-500" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[.28em] text-gold-300">Loading Academy Portal</p>
      </div>
    </div>
  );
}
