import assert from 'node:assert/strict';
import { scoreAssessment } from './aff-server-assessment-scoring.mjs';
const actor={authenticated:true,userId:'student-A',enrollmentVerified:true,nextAttemptNumber:1,startedAtMs:1000};
const assessment={id:'exam-1',status:'Published',maxAttempts:3,durationSeconds:60,passingScore:80,questions:[{id:'q1',correctOptionId:'a',optionIds:['a','b']},{id:'q2',correctOptionId:'b',optionIds:['a','b']}]};
const submission={examId:'exam-1',studentId:'student-A',token:'secure-attempt-token-0001',tokenVerified:true,attemptNumber:1,selectedAnswers:{q1:'a',q2:'b'}};
const evaluate=(a=actor,e=assessment,s=submission,nowMs=2000)=>scoreAssessment({actor:a,assessment:e,submission:s,nowMs});
assert.deepEqual([evaluate().accepted,evaluate().score,evaluate().passed,evaluate().persisted],[true,100,true,false]);
const bad=[
 ['forged client score',{...submission,score:0}], // score ignored, canonical result still 100
];
assert.equal(evaluate(actor,assessment,bad[0][1]).score,100);
const cases=[
 ['cross-student',{...submission,studentId:'student-B'}],
 ['token missing',{...submission,tokenVerified:false}],
 ['replay attempt',{...submission,attemptNumber:2}],
 ['unknown question',{...submission,selectedAnswers:{q3:'a'}}],
 ['invalid option',{...submission,selectedAnswers:{q1:'z'}}],
];
for(const [label,s] of cases) assert.equal(evaluate(actor,assessment,s).accepted,false,label);
assert.equal(evaluate({...actor,enrollmentVerified:false}).accepted,false);
assert.equal(evaluate(actor,assessment,submission,70000).accepted,false);
assert.equal(evaluate(actor,{...assessment,status:'Draft'}).accepted,false);
assert.equal(evaluate(actor,{...assessment,questions:[{id:'q1',correctOptionId:'x',optionIds:['a','b']}]}).accepted,false);
assert.equal(evaluate(actor,{...assessment,passingScore:120}).accepted,false);
assert.equal(evaluate(actor,assessment,{...submission,selectedAnswers:{q1:'b',q2:'b'}}).score,50);
assert.equal(evaluate(actor,assessment,{...submission,selectedAnswers:{q1:'b',q2:'b'}}).passed,false);
console.log('PASS: 14 offline scoring assertions; no database writes');
