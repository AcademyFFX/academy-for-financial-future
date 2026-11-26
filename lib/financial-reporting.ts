// Pure reporting over trusted, complete, normalized ledger snapshots.
// Period is UTC, start inclusive/end exclusive. No recognized revenue or profit inference.
const kinds=["collection","refund","fee","dispute_debit","dispute_credit","commission_accrual","commission_reversal","affiliate_payout"] as const;
type Kind=typeof kinds[number];
export type FinancialReportEntry={id:string;currency:string;amountMinor:number;kind:Kind;occurredAt:string;verified:boolean};
export function summarizeFinancialPeriod(entries:readonly FinancialReportEntry[],start:string,end:string){
 const time=(s:string)=>{const t=Date.parse(s);if(!Number.isFinite(t)||new Date(t).toISOString()!==s)throw Error("Expected canonical UTC timestamp");return t;};
 const lo=time(start),hi=time(end);if(lo>=hi)throw Error("Invalid reporting period");
 const seen=new Set<string>(), groups=new Map<string,Record<Kind,bigint>>();
 for(const e of entries){
  const t=time(e.occurredAt);
  if(typeof e.id!=="string"||!e.id.trim()||e.id!==e.id.trim()||seen.has(e.id)||!(/^[a-z]{3}$/).test(e.currency)||!Number.isSafeInteger(e.amountMinor)||e.amountMinor<0||!kinds.includes(e.kind)||e.verified!==true)throw Error("Unverified or invalid report evidence");
  seen.add(e.id);if(t<lo||t>=hi)continue;
  let g=groups.get(e.currency);if(!g){g=Object.fromEntries(kinds.map(k=>[k,BigInt(0)])) as Record<Kind,bigint>;groups.set(e.currency,g);}
  g[e.kind]+=BigInt(e.amountMinor);
 }
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([currency,g])=>({currency,start,end,totalsMinor:Object.fromEntries(kinds.map(k=>[k,g[k].toString()])),netCollectionsMinor:(g.collection-g.refund-g.fee-g.dispute_debit+g.dispute_credit).toString(),commissionLiabilityMovementMinor:(g.commission_accrual-g.commission_reversal-g.affiliate_payout).toString()}));
}
