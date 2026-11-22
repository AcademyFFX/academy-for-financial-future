import assert from 'node:assert/strict';
import { issueAttemptToken } from './aff-attempt-token.mjs';
import { submitSecureExam } from './aff-secure-exam-transaction.mjs';
const {token,tokenHash}=issueAttemptToken();
const exam={id:'exam-1',courseId:19,status:'Published',passingScore:80,maxAttempts:2,durationSeconds:60,questions:[{id:'q1',correctOptionId:'a',optionIds:['a','b']}]};
const session={id:'attempt-1',userId:'student-A',examId:'exam-1',examVersionId:'exam-1',tokenHash,expiresAtMs:60000,startedAtMs:1000,attemptNumber:1,consumedAtMs:null};
const payload={examId:'exam-1',token,answers:{q1:'a'},score:0,passed:false,studentId:'student-B'};
function mock({enrolled=true,consumed=false,expired=false}={}) {
  const calls=[];
  const tx={runAtomic:async fn=>fn({
    lockAttempt:async()=>({...session,consumedAtMs:consumed?2000:null,expiresAtMs:expired?1000:60000}),
    getTrustedAssessment:async()=>exam,
    verifyEnrollment:async()=>enrolled,
    insertAuthoritativeResult:async data=>(calls.push(['insert',data]),'result-1'),
    consumeAttempt:async data=>(calls.push(['consume',data]),undefined)
  })};
  return {tx,calls};
}
const principal={userId:'student-A'};
let m=mock();
let r=await submitSecureExam({principal,payload,tx:m.tx,nowMs:2000});
assert.equal(r.ok,true);
assert.equal(r.score,100);
assert.equal(r.passed,true);
assert.equal(m.calls.length,2);
assert.equal(m.calls[0][1].userId,'student-A');
assert.equal(m.calls[0][1].score,100);
assert.equal(m.calls[1][0],'consume');
for(const [label,options] of [['not enrolled',{enrolled:false}],['already consumed',{consumed:true}],['expired',{expired:true}]]) {
 m=mock(options);
 r=await submitSecureExam({principal,payload,tx:m.tx,nowMs:2000});
 assert.equal(r.ok,false,label);
 assert.equal(m.calls.length,0,label);
}
m=mock();r=await submitSecureExam({principal,payload:{...payload,token:'bad'},tx:m.tx,nowMs:2000});
assert.equal(r.ok,false);assert.equal(m.calls.length,0);
m=mock();r=await submitSecureExam({principal,payload:{...payload,answers:{q1:'b'}},tx:m.tx,nowMs:2000});
assert.equal(r.ok,true);assert.equal(r.score,0);assert.equal(r.passed,false);
console.log('PASS: mock transactional grading contract assertions; no database accessed');
