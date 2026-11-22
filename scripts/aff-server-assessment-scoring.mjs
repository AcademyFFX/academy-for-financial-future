// AFF server-side assessment scoring core (pure, no database/network calls).
// Import ONLY from server code. Never bundle canonical questions with answers in browser.
const reject = reason => ({ accepted: false, reason, persisted: false });
export function scoreAssessment({ actor, assessment, submission, nowMs } = {}) {
  if (actor?.authenticated !== true || !actor.userId || actor.enrollmentVerified !== true) return reject('Unauthorized student or enrollment');
  if (!assessment || assessment.status !== 'Published' || !Array.isArray(assessment.questions) || !assessment.questions.length) return reject('Assessment unavailable');
  if (!submission || submission.examId !== assessment.id || submission.studentId !== actor.userId) return reject('Submission identity or exam mismatch');
  if (typeof submission.token !== 'string' || submission.token.length < 16 || submission.token.length > 256 || submission.tokenVerified !== true) return reject('Unverified attempt token');
  if (!Number.isInteger(submission.attemptNumber) || submission.attemptNumber < 1 || submission.attemptNumber > assessment.maxAttempts || submission.attemptNumber !== actor.nextAttemptNumber) return reject('Attempt limit or sequence violation');
  if (!Number.isFinite(nowMs) || !Number.isFinite(actor.startedAtMs) || nowMs < actor.startedAtMs || nowMs > actor.startedAtMs + assessment.durationSeconds * 1000) return reject('Expired or invalid attempt window');
  const selected = submission.selectedAnswers;
  if (!selected || typeof selected !== 'object' || Array.isArray(selected)) return reject('Invalid answers');
  const ids = new Set();
  for (const question of assessment.questions) {
    if (!question?.id || typeof question.correctOptionId !== 'string' || !Array.isArray(question.optionIds) || !question.optionIds.includes(question.correctOptionId) || ids.has(question.id)) return reject('Invalid canonical question bank');
    ids.add(question.id);
  }
  if (Object.keys(selected).some(id => !ids.has(id))) return reject('Unknown question identifier');
  if (Object.values(selected).some(value => typeof value !== 'string')) return reject('Invalid option identifier');
  if (assessment.questions.some(q => Object.hasOwn(selected,q.id) && !q.optionIds.includes(selected[q.id]))) return reject('Unknown option identifier');
  if (!Number.isInteger(assessment.passingScore) || assessment.passingScore < 0 || assessment.passingScore > 100) return reject('Invalid passing threshold');
  const correct = assessment.questions.filter(q => selected[q.id] === q.correctOptionId).length;
  const score = Math.round(100 * correct / assessment.questions.length);
  return { accepted: true, score, passed: score >= assessment.passingScore, correctCount: correct, totalQuestions: assessment.questions.length, attemptNumber: submission.attemptNumber, studentId: actor.userId, examId: assessment.id, persisted: false, action: 'SERVER_VALIDATION_ONLY' };
}
