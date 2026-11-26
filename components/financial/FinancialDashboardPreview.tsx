// Disconnected preview only. Do not mount on a public route.
// Future server-side authorization and verified reporting integration required.
const metrics=["Gross collections","Refunds","Processing fees","Net collections","Commission accruals","Affiliate payouts","Outstanding liabilities","Unresolved discrepancies"];
export default function FinancialDashboardPreview(){
 return <section aria-label="AFF Financial Intelligence Center preview" style={{background:"#08182e",color:"#e8d5a0",padding:24,borderRadius:12}}>
 <header><p>ACADEMY FOR FINANCIAL FUTURE</p><h1>Financial Intelligence Center</h1><p>Development preview — financial data not connected</p></header>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16}}>
 {metrics.map(label=><article key={label} style={{background:"#152a43",padding:16,borderRadius:8}}><h2 style={{fontSize:14}}>{label}</h2><p style={{fontSize:22}}>Unavailable</p></article>)}
 </div>
 <h2>Reconciliation</h2><p>Awaiting verified ledger and provider evidence.</p>
 <h2>Financial controls</h2><p>Payment activation and payout actions are not available in this preview.</p>
 </section>;
}
