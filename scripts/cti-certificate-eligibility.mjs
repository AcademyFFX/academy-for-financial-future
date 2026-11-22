// Offline, report-only evaluator. Inputs are trusted test fixtures, NOT authority for issuance.
const CODES = Array.from({ length: 12 }, (_, i) => `AFF-CTI-${101 + i}`);
const RUBRIC = Object.freeze({ problem: 10, evidence: 15, logic: 15, technical: 10, ethics: 15, alternatives: 10, recommendation: 10, writing: 10, oral: 5 });
const WEIGHTS = Object.freeze({ workbook: 0.15, caseStudies: 0.20, writtenExam: 0.25, capstoneDefense: 0.40 });
const validScore = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
export function evaluateCtiEligibility(input = {}) {
  const blockers = [];
  const completions = Array.isArray(input.completions) ? input.completions : [];
  const complete = new Set(completions.filter(x => x?.verified === true && x.status === 'Completed').map(x => x.course_code));
  const missingCourses = CODES.filter(code => !complete.has(code));
  if (input.policy?.institutionally_approved !== true || input.policy?.version_verified !== true || input.policy?.minimumProgramAverage !== 80 || input.policy?.minimumCapstone !== 80) blockers.push('Institutionally approved 80/80 policy and version not verified');
  if (input.student?.identity_verified !== true || input.student?.enrollment_verified !== true) blockers.push('Student identity or enrollment not verified');
  if (missingCourses.length) blockers.push('Incomplete verified courses: ' + missingCourses.join(', '));
  const rubric = input.capstone?.rubric ?? {};
  const rubricValid = Object.entries(RUBRIC).every(([key, max]) => typeof rubric[key] === 'number' && Number.isFinite(rubric[key]) && rubric[key] >= 0 && rubric[key] <= max);
  const rubricTotal = rubricValid ? Object.values(rubric).reduce((sum, value) => sum + value, 0) : null;
  if (!rubricValid) blockers.push('Complete valid 100-point capstone rubric not verified');
  if (rubricTotal === null || rubricTotal < 80) blockers.push('Capstone score below proposed 80-point minimum');
  if (input.capstone?.status !== 'Approved' || input.capstone?.instructor_approved !== true || input.capstone?.oral_defense_completed !== true) blockers.push('Capstone and oral defense not instructor-approved');
  const assessments = input.assessments ?? {};
  const assessmentsValid = Object.keys(WEIGHTS).every(key => validScore(assessments[key]));
  const module12Weighted = assessmentsValid ? Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + assessments[key] * weight, 0) : null;
  if (!assessmentsValid || module12Weighted < 80) blockers.push('Module 12 weighted assessment below proposed 80% minimum or invalid');
  // The program average is separate from Module 12's weighted assessment score.
  if (!validScore(input.program?.average) || input.program?.average_verified !== true || input.program.average < 80) blockers.push('Verified program average below proposed 80% minimum or unavailable');
  if (input.exam?.completed !== true || input.exam?.integrity_verified !== true || input.exam?.review_status !== 'Approved') blockers.push('Final exam completion, integrity or review not verified');
  if (input.academic_integrity?.clear !== true || input.academic_integrity?.reviewed !== true) blockers.push('Academic integrity clearance not verified');
  if (input.instructor?.final_signoff !== true) blockers.push('Final instructor signoff missing');
  return { program: 'AFF Critical Thinking & Independent Judgment', eligible: blockers.length === 0, missingCourses, module12Weighted, capstoneRubricTotal: rubricTotal, blockers, action: 'REPORT_ONLY', certificateIssued: false };
}
