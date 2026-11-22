// Pure, offline AFF CTI certificate eligibility evaluator.
// Does not query or modify a database and cannot issue certificates.
export function evaluateCtiEligibility(input) {
  const requiredCodes = Array.from({ length: 12 }, (_, i) => `AFF-CTI-${String(101 + i)}`);
  const completions = Array.isArray(input?.completions) ? input.completions : [];
  const unique = new Set(completions.filter(x => x && x.verified === true && x.status === "Completed").map(x => String(x.course_code ?? "").toUpperCase()));
  const missingCourses = requiredCodes.filter(code => !unique.has(code));
  const attempt = input?.exam ?? {};
  const threshold = input?.approvedPassingScore;
  const passingScoreVerified = Number.isFinite(threshold) && threshold >= 0 && threshold <= 100;
  const passedExam = passingScoreVerified && Number.isFinite(attempt.score) && attempt.score >= threshold && attempt.integrity_verified === true && attempt.review_status === "Approved";
  const capstoneApproved = input?.capstone?.status === "Approved" && input.capstone?.rubric_verified === true && input.capstone?.instructor_approved === true;
  const studentVerified = input?.student?.identity_verified === true && input.student?.enrollment_verified === true;
  const blockers = [];
  if (!studentVerified) blockers.push("Student identity and enrollment not verified");
  if (missingCourses.length) blockers.push("Incomplete verified courses: " + missingCourses.join(", "));
  if (!passingScoreVerified) blockers.push("Approved exam passing threshold not configured");
  if (!passedExam) blockers.push("Approved and integrity-verified passing exam not established");
  if (!capstoneApproved) blockers.push("Instructor-approved capstone and rubric not established");
  return { program: "AFF Critical Thinking & Independent Judgment", eligible: blockers.length === 0, blockers, missingCourses, action: "REPORT_ONLY", certificateIssued: false };
}
