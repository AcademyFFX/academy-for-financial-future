// Pure comparison of trusted, normalized records; no settlement or ledger writes.
export type ReconciliationRecord = {providerAccount:string; transactionId:string; kind:string; currency:string; amountMinor:number; status:string};
export function matchFinancialTransaction(evidence:ReconciliationRecord, ledger:readonly ReconciliationRecord[]) {
 const valid=(r:ReconciliationRecord)=>[r.providerAccount,r.transactionId,r.kind,r.status].every(v=>typeof v==="string"&&v.trim()===v&&v.length>0)&&/^[a-z]{3}$/.test(r.currency)&&Number.isSafeInteger(r.amountMinor)&&r.amountMinor>=0;
 if(!valid(evidence)||!ledger.every(valid)) throw Error("Invalid normalized reconciliation evidence");
 const matches=ledger.filter(r=>r.providerAccount===evidence.providerAccount&&r.transactionId===evidence.transactionId&&r.kind===evidence.kind);
 if(matches.length===0)return {status:"missing" as const};
 if(matches.length>1)return {status:"duplicate" as const};
 const r=matches[0];
 const differences=(["currency","amountMinor","status"] as const).filter(k=>r[k]!==evidence[k]);
 if(differences.length)return {status:"mismatch" as const,differences};
 if(evidence.status!=="settled")return {status:"pending" as const};
 return {status:"matched" as const};
}
