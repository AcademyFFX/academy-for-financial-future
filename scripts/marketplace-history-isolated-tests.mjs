import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
const source=fs.readFileSync("app/api/marketplace/history/route.ts","utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function run({user={id:"student-a"},authError=null,error=null,rows=[]}={}){
 const calls=[],exports={};
 const q={};
 for(const method of ["select","eq","order","limit"]) q[method]=(...args)=>{calls.push([method,...args]);return q};
 q.then=resolve=>resolve({data:rows,error});
 const modules={"next/server":{NextResponse:{json:(body,options)=>({body,status:options.status??200,headers:options.headers})}},"@/lib/supabase-server":{createSupabaseServerClient:()=>({auth:{getUser:async()=>({data:{user},error:authError})}})},"@/lib/supabase-admin":{createSupabaseAdminClient:()=>({from(table){calls.push(["from",table]);return q}})}};
 new Function("require","exports",js)(name=>{assert.ok(modules[name]);return modules[name]},exports);
 return {response:await exports.GET(),calls};
}
for(const args of [{user:null},{authError:new Error("invalid")}]){const r=await run(args);assert.equal(r.response.status,401);assert.equal(r.calls.length,0)}
let r=await run({error:new Error("private database error")});assert.equal(r.response.status,503);assert.ok(!JSON.stringify(r.response.body).includes("private database error"));
r=await run();assert.deepEqual(r.response.body.purchases,[]);
for(const status of ["Paid","Checkout Started","Refunded","Cancelled"]){
 r=await run({rows:[{id:1,product_title:"Lab",product_category:"Courses",amount:10,currency:"USD",purchase_status:status,created_at:"2026-11-28",access_url:"private-secret",student_email:"private@example.invalid"}]});
 assert.equal(r.response.status,200);
 assert.deepEqual(r.calls.filter(c=>c[0]==="eq"),[["eq","student_id","student-a"]]);
 assert.ok(r.calls.some(c=>c[0]==="limit"&&c[1]===50));
 assert.equal(r.response.headers["Cache-Control"],"private, no-store");
 const p=r.response.body.purchases[0];
 assert.equal(p.payment_verified,false);assert.equal(p.access_authorized,false);assert.equal(p.access_url,null);assert.equal(p.purchase_status,status);
 assert.ok(!JSON.stringify(p).includes("private"));
}
const page=fs.readFileSync("app/marketplace/page.tsx","utf8");
assert.ok(page.includes('fetch("/api/marketplace/history"'));
assert.ok(!page.includes('.from("marketplace_purchases")'));
assert.ok(!page.includes("href={purchase.access_url"));
assert.ok(page.includes("Settlement verification pending"));
console.log("Marketplace history mocked authentication, ownership query, redaction and interface guards passed");
