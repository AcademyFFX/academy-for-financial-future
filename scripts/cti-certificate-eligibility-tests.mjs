import assert from 'node:assert/strict';
import { evaluateCtiEligibility } from './cti-certificate-eligibility.mjs';
const base = {
 policy: { institutionally_approved: true, version_verified: true, minimumProgramAverage: 80, minimumCapstone: 80 },
 student: { identity_verified: true, enrollment_verified: true },
 completions: Array.from({ length: 12 }, (_, i) => ({ course_code: `AFF-CTI-${101+i}`, status: 'Completed', verified: true })),
 assessments: { workbook: 90, caseStudies: 90, writtenExam: 90, capstoneDefense: 90 },
 program: { average: 90, average_verified: true },
 exam: { completed: true, integrity_verified: true, review_status: 'Approved' },
 capstone: { status: 'Approved', instructor_approved: true, oral_defense_completed: true, rubric: { problem: 9, evidence: 14, logic: 14, technical: 9, ethics: 14, alternatives: 9, recommendation: 9, writing: 9, oral: 5 } },
 academic_integrity: { clear: true, reviewed: true },
 instructor: { final_signoff: true }
};
const check = (value, label) => assert.equal(evaluateCtiEligibility(value).eligible, false, label);
const good = evaluateCtiEligibility(base);
assert.equal(good.eligible, true);
assert.equal(good.capstoneRubricTotal, 92);
assert.equal(good.module12Weighted, 90);
assert.equal(good.certificateIssued, false);
assert.equal(good.action, 'REPORT_ONLY');
check({ ...base, policy: { ...base.policy, institutionally_approved: false } }, 'unapproved policy');
check({ ...base, completions: base.completions.slice(0, 11) }, 'missing course');
check({ ...base, program: { average: 79, average_verified: true } }, 'program average below 80');
check({ ...base, program: { average: 95, average_verified: false } }, 'unverified average');
check({ ...base, assessments: { ...base.assessments, workbook: NaN } }, 'invalid assessment');
check({ ...base, capstone: { ...base.capstone, rubric: { ...base.capstone.rubric, evidence: 0, logic: 0 } } }, 'capstone below 80');
check({ ...base, capstone: { ...base.capstone, rubric: { ...base.capstone.rubric, oral: 6 } } }, 'rubric out of range');
check({ ...base, capstone: { ...base.capstone, oral_defense_completed: false } }, 'oral defense missing');
check({ ...base, exam: { ...base.exam, integrity_verified: false } }, 'exam integrity');
check({ ...base, academic_integrity: { clear: false } }, 'academic integrity');
check({ ...base, instructor: { final_signoff: false } }, 'instructor signoff');
console.log('PASS: 12 offline eligibility assertions; no certificate issuance');
