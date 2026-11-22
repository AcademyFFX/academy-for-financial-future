import assert from "node:assert/strict";
import { evaluateCtiEligibility } from "./cti-certificate-eligibility.mjs";
const base = {
 student: { identity_verified: true, enrollment_verified: true },
 completions: Array.from({ length: 12 }, (_, i) => ({ course_code: `AFF-CTI-${101+i}`, status: "Completed", verified: true })),
 approvedPassingScore: 80,
 exam: { score: 88, integrity_verified: true, review_status: "Approved" },
 capstone: { status: "Approved", rubric_verified: true, instructor_approved: true }
};
const good = evaluateCtiEligibility(base);
assert.equal(good.eligible, true);
assert.equal(good.certificateIssued, false);
assert.equal(good.action, "REPORT_ONLY");
assert.equal(evaluateCtiEligibility({ ...base, completions: base.completions.slice(0, 11) }).eligible, false);
assert.equal(evaluateCtiEligibility({ ...base, approvedPassingScore: undefined }).eligible, false);
assert.equal(evaluateCtiEligibility({ ...base, exam: { ...base.exam, integrity_verified: false } }).eligible, false);
assert.equal(evaluateCtiEligibility({ ...base, capstone: { ...base.capstone, instructor_approved: false } }).eligible, false);
assert.equal(evaluateCtiEligibility({ ...base, student: { ...base.student, enrollment_verified: false } }).eligible, false);
console.log("CTI certificate eligibility offline tests passed");
