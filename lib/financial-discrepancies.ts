import {matchFinancialTransaction, type ReconciliationRecord} from "./financial-reconciliation";
// Inputs must be complete, trusted snapshots of the same reconciliation scope.
export function detectFinancialDiscrepancies(provider:readonly ReconciliationRecord[], ledger:readonly ReconciliationRecord[]) {
 const key=(r:ReconciliationRecord)=>JSON.stringify([r.providerAccount,r.transactionId,r.kind]);
 const group=(rows:readonly ReconciliationRecord[])=>{
  const m=new Map<string,ReconciliationRecord[]>();
  for(const r of rows){matchFinancialTransaction(r,[]);const k=key(r);const a=m.get(k);if(a)a.push(r);else m.set(k,[r]);}
  return m;
 };
 const p=group(provider),l=group(ledger);
 return [...new Set([...p.keys(),...l.keys()])].sort().map(k=>{
  const a=p.get(k)??[],b=l.get(k)??[];
  const identity=JSON.parse(k) as [string,string,string];
  const result=a.length>1||b.length>1?{status:"duplicate" as const}:a.length===0?{status:"missing_provider" as const}:b.length===0?{status:"missing_ledger" as const}:matchFinancialTransaction(a[0],b);
  return {identity,providerCount:a.length,ledgerCount:b.length,...result};
 });
}
