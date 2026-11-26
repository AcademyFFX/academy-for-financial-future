import assert from 'node:assert/strict';
const base='http://127.0.0.1:54321';
const key=process.env.LAB_SERVICE_ROLE_KEY;
assert.ok(key,'Missing disposable local service credential');
const bucket='aff-synthetic-private';
const path=bucket+'/lesson.txt';
const marker='AFF synthetic private storage test';
const headers={apikey:key,Authorization:'Bearer '+key};
async function request(route,options={}){
 const url=new URL(route,base);
 assert.equal(url.origin,base);
 return fetch(url,{...options,redirect:'error'});
}
async function ok(route,options){
 const r=await request(route,options);
 assert.ok(r.ok,'Local storage operation failed: '+r.status);
 return r;
}
await ok('/storage/v1/bucket',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:bucket,name:bucket,public:false})});
await ok('/storage/v1/object/'+path,{method:'POST',headers:{...headers,'Content-Type':'text/plain'},body:marker});
const direct=await request('/storage/v1/object/public/'+path);
assert.ok([400,401,403,404].includes(direct.status),'Private object public access must be denied');
console.log('Private object direct public URL denied');
const signed=await (await ok('/storage/v1/object/sign/'+path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:5})})).json();
assert.equal(typeof signed.signedURL,'string');
assert.ok(signed.signedURL.startsWith('/object/sign/'));
const route='/storage/v1'+signed.signedURL;
assert.equal(await (await ok(route)).text(),marker);
console.log('Actual signed private object retrieval verified');
await new Promise(resolve=>setTimeout(resolve,7000));
const expired=await request(route);
assert.ok([400,401,403,404].includes(expired.status),'Expired signed link must be denied');
console.log('Actual signed link expiration verified');

 // Local synthetic identities; no production credentials or user data.
const password='DisposableLabOnly!'+crypto.randomUUID();
for(const label of ['student-a','student-b','evaluator','instructor']){
 const email=label+'@example.invalid';
 await ok('/auth/v1/admin/users',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true})});
 const session=await (await ok('/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password})})).json();
 assert.ok(session.access_token&&session.user?.id);
 const userHeaders={apikey:key,Authorization:'Bearer '+session.access_token};
 const read=await request('/storage/v1/object/authenticated/'+path,{headers:userHeaders});
 assert.ok([400,401,403,404].includes(read.status),label+' default read must be denied');
 const sign=await request('/storage/v1/object/sign/'+path,{method:'POST',headers:{...userHeaders,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:30})});
 assert.ok([400,401,403,404].includes(sign.status),label+' default signing must be denied');
 console.log(label+' default read and signing denial verified');
}
