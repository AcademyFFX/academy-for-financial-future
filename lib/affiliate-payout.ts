// Review-only preflight. Never accepts client-supplied authority as evidence.
// Caller must resolve all fields from trusted server records and revalidate atomically.
// This function cannot release funds or persist an approval.
export function validateAffiliatePayoutApproval(x: {
 requestId:string; affiliateUserId:string; requesterUserId:string; approverUserId:string;
 approverAuthorized:boolean; affiliateActive:boolean; status:string;
 amountMinor:number; availableMinor:number; currency:string; balanceCurrency:string;
 holdCleared:boolean; reconciliationClear:boolean; existingPayout:boolean;
}) {
 const ids=[x.requestId,x.affiliateUserId,x.requesterUserId,x.approverUserId];
 if(ids.some(v=>typeof v!=="string"||!v.trim()||v!==v.trim()) ||
 x.approverUserId===x.affiliateUserId || x.approverUserId===x.requesterUserId ||
 x.approverAuthorized!==true || x.affiliateActive!==true || x.status!=="pending" ||
 !Number.isSafeInteger(x.amountMinor)||x.amountMinor<=0 ||
 !Number.isSafeInteger(x.availableMinor)||x.availableMinor<x.amountMinor ||
 !/^[a-z]{3}$/.test(x.currency)||x.currency!==x.balanceCurrency ||
 x.holdCleared!==true || x.reconciliationClear!==true || x.existingPayout!==false)
 throw Error("Payout approval requires reconciliation");
 return {requestId:x.requestId,approverUserId:x.approverUserId,amountMinor:x.amountMinor,currency:x.currency,decision:"eligible_for_transactional_review" as const};
}
