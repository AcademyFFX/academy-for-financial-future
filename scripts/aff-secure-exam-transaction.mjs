// Contract for an atomic grading transaction; not a deployed DB implementation.
// tx.runAtomic MUST lock and consume the attempt and insert the result in ONE DB transaction.
import { scoreAssessment } from './aff-server-assessment-scoring.mjs';
import { verifyAttemptToken } from './aff-attempt-token.mjs';
export async function submitSecureExam({ principal, payload, tx, nowMs }) {
  if (!principal?.userId || !payload || !tx || typeof tx.runAtomic !== 'function') {
    return { ok:false, code:'INVALID_REQUEST' };
  }
  if (typeof payload.examId !== 'string' || typeof payload.token !== 'string' ||
      !payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) {
    return { ok:false, code:'INVALID_REQUEST' };
  }
  // No score, pass, studentId, review metadata or timing accepted from client.
  return tx.runAtomic(async context => {
    const session=await context.lockAttempt({ userId:principal.userId, examId:payload.examId, token:payload.token });
    if (!session) return { ok:false, code:'ATTEMPT_UNAVAILABLE' };
    const valid=verifyAttemptToken({
      token:payload.token, storedHash:session.tokenHash, studentId:principal.userId,
      expectedStudentId:session.userId, examId:payload.examId, expectedExamId:session.examId,
      expiresAtMs:session.expiresAtMs, nowMs, consumedAtMs:session.consumedAtMs
    });
    if (!valid) return { ok:false, code:'ATTEMPT_UNAVAILABLE' };
    const trusted=await context.getTrustedAssessment(session.examVersionId);
    const actor={ authenticated:true, userId:principal.userId,
      enrollmentVerified:await context.verifyEnrollment(principal.userId, trusted.courseId),
      nextAttemptNumber:session.attemptNumber, startedAtMs:session.startedAtMs };
    const grade=scoreAssessment({
      actor, assessment:trusted,
      submission:{ examId:trusted.id, studentId:principal.userId, token:payload.token,
        tokenVerified:true, attemptNumber:session.attemptNumber, selectedAnswers:payload.answers },
      nowMs
    });
    if (!grade.accepted || trusted.id !== payload.examId || session.examVersionId !== trusted.id)
      return { ok:false, code:'ASSESSMENT_REJECTED' };
    // Implementations MUST guarantee atomicity of both calls and rollback on errors.
    const resultId=await context.insertAuthoritativeResult({ userId:principal.userId, examId:trusted.id,
      attemptId:session.id, score:grade.score, passed:grade.passed, answers:payload.answers });
    await context.consumeAttempt({ attemptId:session.id, resultId, consumedAtMs:nowMs });
    return { ok:true, resultId, score:grade.score, passed:grade.passed };
  });
}
