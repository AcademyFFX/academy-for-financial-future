// Pure preflight only. All inputs must be resolved from trusted server records.
// Database uniqueness and transactional revalidation are mandatory before accrual.
export function validateAffiliateReferral(input: {
 affiliateId: string; affiliateUserId: string; studentUserId: string;
 referralId: string; referralAffiliateId: string; referralStudentUserId: string;
 paymentId: string; paymentStudentUserId: string;
 affiliateActive: boolean; referralVerified: boolean; paymentVerified: boolean;
 paymentEligible: boolean; attributionValid: boolean; existingCommission: boolean;
}) {
 const x=input;
 const ids=[x.affiliateId,x.affiliateUserId,x.studentUserId,x.referralId,x.referralAffiliateId,x.referralStudentUserId,x.paymentId,x.paymentStudentUserId];
 if(ids.some(v=>typeof v!=="string" || !v.trim() || v!==v.trim())) throw Error("Missing canonical identity");
 if(x.affiliateUserId===x.studentUserId || x.referralAffiliateId!==x.affiliateId ||
 x.referralStudentUserId!==x.studentUserId || x.paymentStudentUserId!==x.studentUserId ||
 x.affiliateActive!==true || x.referralVerified!==true || x.paymentVerified!==true ||
 x.paymentEligible!==true || x.attributionValid!==true || x.existingCommission!==false)
 throw Error("Referral requires reconciliation");
 return {affiliateId:x.affiliateId,referralId:x.referralId,paymentId:x.paymentId,studentUserId:x.studentUserId};
}
