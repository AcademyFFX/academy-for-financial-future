import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/academic-media-authorization.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
const mod = { exports: {} };
new Function('module', 'exports', outputText)(mod, mod.exports);
const { authorizeAcademicMedia: authorize } = mod.exports;
const base = { actorId:'student-a', assetId:'asset-a', audience:'student', authenticated:true, accountAllowed:true, published:true, courseEntitled:true, enrolled:true, assignedInstructor:false, assignedEvaluator:false };
const cases = [
 ['valid student',{},true],
 ['anonymous',{authenticated:false},false],
 ['restricted',{accountAllowed:false},false],
 ['draft',{published:false},false],
 ['no entitlement',{courseEntitled:false},false],
 ['not enrolled',{enrolled:false},false],
 ['unknown audience',{audience:'unknown'},false],
 ['blank actor',{actorId:''},false],
 ['blank asset',{assetId:' '},false],
 ['noncanonical actor',{actorId:' student-a'},false],
 ['untrusted boolean',{authenticated:'true'},false],
 ['instructor denied',{audience:'instructor'},false],
 ['assigned instructor',{audience:'instructor',assignedInstructor:true},true],
 ['own assignment',{audience:'assignment',assignmentOwnerId:'student-a'},true],
 ['other assignment',{audience:'assignment',assignmentOwnerId:'student-b'},false],
 ['assigned evaluator',{audience:'assignment',assignmentOwnerId:'student-b',assignedEvaluator:true},true],
 ['restricted evaluator',{audience:'assignment',assignedEvaluator:true,accountAllowed:false},false],
 ['missing owner',{audience:'assignment'},false],
 ['unauthenticated instructor',{audience:'instructor',assignedInstructor:true,authenticated:false},false]
];
for (const [name, patch, expected] of cases) assert.equal(authorize({...base,...patch}),expected,name);
assert.equal(authorize(null),false,'null evidence');
console.log('20 academic media authorization assertions passed');
