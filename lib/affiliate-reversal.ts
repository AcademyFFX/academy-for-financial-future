// Pure calculation; trusted ledger inputs and atomic event deduplication required.
export function calculateAffiliateReversal(x: {
 originalEligibleMinor:number; originalCommissionMinor:number;
 cumulativeEligibleRefundMinor:number; previouslyReversedMinor:number;
}) {
 const {originalEligibleMinor:a,originalCommissionMinor:c,cumulativeEligibleRefundMinor:r,previouslyReversedMinor:p}=x;
 if (![a,c,r,p].every(v=>Number.isSafeInteger(v)&&v>=0) || a===0 || c>a || r>a || p>c)
 throw Error("Invalid reversal evidence");
 // Proposed proportional cumulative rounding, with exact full-refund reversal.
 const target=Number(BigInt(c)*BigInt(r)/BigInt(a));
 if(p>target) throw Error("Reversal history requires reconciliation");
 return {adjustmentMinor:target-p,cumulativeReversedMinor:target,remainingCommissionMinor:c-target};
}
