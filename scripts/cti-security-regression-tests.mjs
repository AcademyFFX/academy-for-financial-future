import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateCtiEligibility } from './cti-certificate-eligibility.mjs';

// Offline checks only. This does not test PostgreSQL RLS, SQL execution,
// Supabase grants, RPC permissions, or real certificate issuance.
const sql = readFileSync(new URL('./sql/aff-cti-certificate-mapping-STAGING-PROPOSAL.sql', import.meta.url), 'utf8');
const checks = [
  ['unconditional safety stop', /RAISE EXCEPTION 'SAFETY STOP:/i.test(sql)],
  ['rollback only', /ROLLBACK\s*;/i.test(sql) && !/^\s*COMMIT\s*;/im.test(sql)],
  ['exactly twelve course gate', /IF v_count <> 12 THEN/i.test(sql)],
  ['draft certification', /'Draft'/i.test(sql)],
  ['idempotent mapping', /ON CONFLICT \(certification_id,course_id\) DO NOTHING/i.test(sql)],
  ['existing mapping conflict check', /Existing mapping conflict/i.test(sql)],
  ['no RLS disable', !/DISABLE ROW LEVEL SECURITY|SET\s+row_security\s*=\s*off/i.test(sql)],
];
for (const [name, passed] of checks) assert.equal(passed, true, name);
const good = {
  policy:{institutionally_approved:true,version_verified:true,minimumProgramAverage:80,minimumCapstone:80},
  student:{identity_verified:true,enrollment_verified:true},
  completions:Array.from({length:12},(_,i)=>({course_code:`AFF-CTI-${101+i}`,status:'Completed',verified:true})),
  assessments:{workbook:90,caseStudies:90,writtenExam:90,capstoneDefense:90},
  program:{average:90,average_verified:true},
  exam:{completed:true,integrity_verified:true,review_status:'Approved'},
  capstone:{status:'Approved',instructor_approved:true,oral_defense_completed:true,rubric:{problem:9,evidence:14,logic:14,technical:9,ethics:14,alternatives:9,recommendation:9,writing:9,oral:5}},
  academic_integrity:{clear:true,reviewed:true},
  instructor:{final_signoff:true}
};
assert.equal(evaluateCtiEligibility(good).eligible,true);
assert.equal(evaluateCtiEligibility(good).certificateIssued,false);
const mutations = [
  ['forged exam review',{...good,exam:{...good.exam,review_status:'Student Approved'}}],
  ['unverified course',{...good,completions:good.completions.map((c,i)=>i===0?{...c,verified:false}:c)}],
  ['unverified program average',{...good,program:{average:90,average_verified:false}}],
  ['missing instructor signoff',{...good,instructor:{final_signoff:false}}],
  ['missing integrity',{...good,academic_integrity:{clear:false,reviewed:true}}],
  ['capstone over maximum',{...good,capstone:{...good.capstone,rubric:{...good.capstone.rubric,oral:6}}}],
  ['invalid module score',{...good,assessments:{...good.assessments,writtenExam:101}}],
  ['unapproved policy',{...good,policy:{...good.policy,institutionally_approved:false}}],
];
for (const [name, candidate] of mutations) assert.equal(evaluateCtiEligibility(candidate).eligible,false,name);
console.log(`PASS: ${checks.length + 2 + mutations.length} offline security assertions; no database authorization tested.`);
