// Pure policy helper; not connected to webhook until invoice identity and
// transaction reconciliation are implemented and tested.
export function renewalEntitlement(input: {
  currentPeriodEnd: string | null;
  verifiedInvoice: boolean;
  invoicePaid: boolean;
  matchingSubscription: boolean;
  matchingMembership: boolean;
  liveMode: boolean;
  proposedPeriodEnd: string | null;
  suspended: boolean;
  cancelled: boolean;
}, now = Date.now()) {
  const current = input.currentPeriodEnd ? Date.parse(input.currentPeriodEnd) : NaN;
  const proposed = input.proposedPeriodEnd ? Date.parse(input.proposedPeriodEnd) : NaN;
  if (input.suspended || input.cancelled) return { action: "review" as const };
  if (!input.verifiedInvoice || !input.invoicePaid || !input.matchingSubscription ||
      !input.matchingMembership || !input.liveMode || !Number.isFinite(proposed) ||
      proposed <= now || (Number.isFinite(current) && proposed <= current)) {
    return { action: "preserve" as const };
  }
  return { action: "extend" as const, periodEnd: new Date(proposed).toISOString() };
}
