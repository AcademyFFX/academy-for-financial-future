import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import ts from 'typescript';
import {createAcademicFixtures} from '../security-review/academic-storage-fixtures.mjs';
function load(name,req){
 const source=readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 const mod={exports:{}};
 new Function('module','exports','require',outputText)(mod,mod.exports,req);
 return mod.exports;
}
const auth=load('academic-media-authorization');
const {issueAcademicMediaLink:issue}=load('academic-media-link',name=>{assert.equal(name,'./academic-media-authorization');return auth;});
const {root,manifest:m,cleanup}=await createAcademicFixtures();
try {
 const cases=[
 ['student-a','lesson',true],['student-a','workbook',true],['student-b','lesson',false],
 ['anonymous','lesson',false],['student-a','draft',false],['student-a','key',false],
 ['instructor-i','key',true],['staff-u','key',false],['student-a','assignment-a',true],
 ['student-b','assignment-a',false],['student-b','assignment-b',true],
 ['evaluator-e','assignment-a',true],['staff-u','assignment-a',false],
 ['student-a','lesson',false,true],['student-a','missing',false]
 ];
 for(const [actor,id,expected,expired] of cases){
 let signed=0;
 const result=await issue(id,{
 resolve:async assetId=>{
 const a=m.assets.find(x=>x.id===assetId);if(!a)return null;
 return {bucket:a.bucket,objectKey:a.key,evidence:{actorId:actor,assetId,audience:a.audience,published:a.published===true,authenticated:m.identities.includes(actor),accountAllowed:m.identities.includes(actor),courseEntitled:!expired&&m.entitled.includes(actor),enrolled:m.enrolled.includes(actor),assignedInstructor:m.instructors.includes(actor),assignmentOwnerId:a.owner,assignedEvaluator:m.evaluators.includes(actor)}};
 },
 signPrivateObject:async(bucket,key,seconds)=>{
 signed++;assert.equal(seconds,300);
 assert.match(await readFile(join(root,bucket,key),'utf8'),/^SYNTHETIC AFF TEST ONLY:/);
 return 'https://example.invalid/mock-signed';
 }
 });
 assert.equal(Boolean(result),expected,actor+' '+id);
 assert.equal(signed,expected?1:0);
 }
 console.log('15 synthetic access scenarios passed; mock signer only');
} finally {await cleanup();}
await assert.rejects(()=>access(root),{code:'ENOENT'});
console.log('Disposable fixture cleanup verified');
