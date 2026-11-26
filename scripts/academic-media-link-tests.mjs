import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(name, requireFn) {
 const source=readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
 const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 const mod={exports:{}};
 new Function('module','exports','require',outputText)(mod,mod.exports,requireFn);
 return mod.exports;
}
const auth=load('academic-media-authorization');
const {issueAcademicMediaLink:issue}=load('academic-media-link',name=>{assert.equal(name,'./academic-media-authorization');return auth;});
const evidence={actorId:'student-a',assetId:'asset-a',audience:'student',authenticated:true,accountAllowed:true,published:true,courseEntitled:true,enrolled:true,assignedInstructor:false,assignedEvaluator:false};
const base={evidence,bucket:'aff-course-assets',objectKey:'course/lesson.pdf'};
let calls=[];
const sign=async (...args)=>{calls.push(args);return 'https://example.invalid/signed';};
const deps=record=>({resolve:async()=>record,signPrivateObject:sign});
assert.deepEqual(await issue('asset-a',deps(base)),{url:'https://example.invalid/signed',expiresIn:300});
assert.deepEqual(calls,[['aff-course-assets','course/lesson.pdf',300]]);
const denied=[
 null,{...base,evidence:{...evidence,authenticated:false}},
 {...base,evidence:{...evidence,courseEntitled:false}},
 {...base,evidence:{...evidence,enrolled:false}},
 {...base,evidence:{...evidence,published:false}},
 {...base,evidence:{...evidence,assetId:'other'}},
 {...base,bucket:'unknown'},{...base,bucket:'assignment-submissions'},
 ...['../file','/file','a//b','a/./b','a/%2e%2e/b','a?b','a#b','a\\b',''].map(objectKey=>({...base,objectKey})),
 {...base,evidence:{...evidence,audience:'instructor'}},
 {...base,bucket:'assignment-submissions',evidence:{...evidence,audience:'assignment',assignmentOwnerId:'other'}}
];
calls=[];
for(const record of denied) assert.equal(await issue('asset-a',deps(record)),null);
assert.equal(await issue(' ',deps(base)),null);
assert.equal(calls.length,0,'denied requests never sign');
const assignment={...base,bucket:'assignment-submissions',evidence:{...evidence,audience:'assignment',assignmentOwnerId:'student-a'}};
assert.equal((await issue('asset-a',deps(assignment))).expiresIn,300);
await assert.rejects(()=>issue('asset-a',{...deps(base),signPrivateObject:async()=>{throw new Error('unavailable');}}),/unavailable/);
await assert.rejects(()=>issue('asset-a',{...deps(base),signPrivateObject:async()=> 'http://example.invalid'}),/Media signing failed/);
console.log('Academic media link security assertions passed');
