import {summarizeFinancialPeriod,type FinancialReportEntry} from "./financial-reporting";
// Pure serializer; server must authorize the actor and audit delivery separately.
// No personal identifiers, raw provider evidence, or spreadsheet formulas exported.
export function buildFinancialAuditExport(entries:readonly FinancialReportEntry[],start:string,end:string){
 const reports=summarizeFinancialPeriod(entries,start,end);
 return JSON.stringify({schemaVersion:1,scope:"period_activity_not_account_balance",start,end,completeness:"not_independently_verified",reports},null,2);
}
