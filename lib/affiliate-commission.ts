// Pure calculation only. Caller must resolve verified ledger payment and approved
// policy server-side. No database writes, eligibility authorization or payouts.
export function calculateAffiliateCommission(input: {
  eligibleAmountMinor: number;
  rateBasisPoints: number;
  currency: string;
  policyCurrency: string;
  policyVersion: string;
}) {
  const {eligibleAmountMinor,rateBasisPoints,currency,policyCurrency,policyVersion}=input;
  if (!Number.isSafeInteger(eligibleAmountMinor) || eligibleAmountMinor < 0 ||
      !Number.isSafeInteger(rateBasisPoints) || rateBasisPoints < 0 || rateBasisPoints > 10000 ||
      !/^[a-z]{3}$/.test(currency) || currency !== policyCurrency ||
      typeof policyVersion !== "string" || !policyVersion.trim()) {
    throw new Error("Invalid commission calculation inputs");
  }
  // Round down to the nearest minor unit; proposed policy, not a commercial rate.
  const amount = Number(BigInt(eligibleAmountMinor)*BigInt(rateBasisPoints)/BigInt(10000));
  return {commissionMinor:amount,currency,policyVersion,eligibleAmountMinor,rateBasisPoints};
}
