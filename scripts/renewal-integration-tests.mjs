import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
function load(path,deps={}) {
 const {outputText}=ts.transpileModule(readFileSync(new URL("../"+path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const mod={exports:{}};
 new Function("require","module","exports",outputText)(name=>{if(!Object.hasOwn(deps,name)) throw Error("Unexpected dependency: "+name);return deps[name]},mod,mod.exports);
 return mod.exports;
}
const evidence=load("lib/renewal-evidence.ts");
const normalizer=load("lib/renewal-normalizer.ts",{"@/lib/renewal-evidence":evidence});
const {normalizeRenewalEvidence}=normalizer;
const expected={subscriptionId:"sub_mock",customerId:"cus_mock",priceId:"price_mock",currency:"usd",amountMinor:1000};
function fixture(){
 const common={customer:"cus_mock",livemode:true};
 return {invoice:{...common,id:"in_mock",object:"invoice",status:"paid",subscription:"sub_mock",payment_intent:"pi_mock",currency:"usd",total:1000,amount_paid:1000,amount_remaining:0,billing_reason:"subscription_cycle",lines:{has_more:false,data:[{subscription:"sub_mock",type:"subscription",proration:false,quantity:1,amount:1000,currency:"usd",price:{id:"price_mock",type:"recurring"},period:{start:1796083200,end:1798761600}}]}},subscription:{...common,id:"sub_mock",object:"subscription",status:"active",cancel_at_period_end:false},payment:{...common,id:"pi_mock",object:"payment_intent",status:"succeeded",currency:"usd",amount_received:1000,invoice:"in_mock"}};
}
const normalize=r=>normalizeRenewalEvidence("evt_mock",r,expected);
assert.equal(normalize(fixture()).amountMinor,1000);
const mutations=[
 r=>r.invoice.customer="cus_other",r=>r.subscription.id="sub_other",
 r=>r.payment.id="pi_other",r=>r.payment.invoice="in_other",
 r=>r.invoice.amount_paid=999,r=>r.payment.amount_received=999,
 r=>r.payment.currency="eur",r=>r.invoice.status="open",
 r=>r.payment.status="processing",r=>r.invoice.livemode=false,
 r=>r.subscription.status="canceled",r=>r.subscription.cancel_at_period_end=true,
 r=>r.invoice.lines.has_more=true,r=>r.invoice.lines.data[0].proration=true,
 r=>r.invoice.lines.data[0].price.id="price_other",
 r=>r.invoice.lines.data[0].period.end=1,
 r=>r.invoice.billing_reason="subscription_create"
];
for(const mutate of mutations){const r=fixture();mutate(r);assert.throws(()=>normalize(r));}
const event={id:"evt_mock",type:"invoice.paid",livemode:true,created:1796083200,data:{object:fixture().invoice}};
process.env.STRIPE_MONTHLY_MEMBERSHIP_PRICE_ID="price_mock";
let calls=0, outcome="extended", rpcError=null, args;
const db={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{id:"membership_mock",stripe_subscription_id:"sub_mock",stripe_customer_id:"cus_mock",active_membership_plan:"Monthly Membership"},error:null})})})}),rpc:async(name,p)=>{assert.equal(name,"aff_record_verified_renewal");calls++;args=p;return {data:outcome,error:rpcError}}};
let records=fixture();
const adapter=load("lib/verified-renewal.ts",{"@/lib/supabase-admin":{createSupabaseAdminClient:()=>db},"@/lib/stripe-rest":{stripeRequest:async()=>({id:"price_mock",object:"price",livemode:true,type:"recurring",unit_amount:1000,currency:"usd"})},"@/lib/renewal-provider":{retrieveRenewalRecords:async()=>records},"@/lib/renewal-normalizer":normalizer});
assert.equal(await adapter.recordVerifiedRenewal(event),"extended");
assert.equal(args.p_amount,1000);
assert.equal(args.p_invoice,"in_mock");
outcome="already_recorded";
assert.equal(await adapter.recordVerifiedRenewal(event),"already_recorded");
rpcError={message:"simulated failure"};
await assert.rejects(()=>adapter.recordVerifiedRenewal(event));
rpcError=null;
const before=calls;
records=fixture();records.payment.amount_received=1;
await assert.rejects(()=>adapter.recordVerifiedRenewal(event));
await assert.rejects(()=>adapter.recordVerifiedRenewal({...event,livemode:false}));
assert.equal(calls,before);
console.log("Renewal mock integration assertions passed; database atomicity and concurrency NOT tested.");
