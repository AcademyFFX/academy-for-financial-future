// Server-only primitives for AFF assessment attempt tokens.
// Not a deployed endpoint. Persistence, atomic consumption and authentication
// must be provided by a trusted database-backed service.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

export function issueAttemptToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashAttemptToken(token) };
}
export function hashAttemptToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new TypeError('Invalid attempt token format');
  }
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
export function verifyAttemptToken({ token, storedHash, studentId, expectedStudentId, examId, expectedExamId, expiresAtMs, nowMs, consumedAtMs }) {
  if (!studentId || studentId !== expectedStudentId || !examId || examId !== expectedExamId) return false;
  if (!Number.isFinite(nowMs) || !Number.isFinite(expiresAtMs) || nowMs >= expiresAtMs || consumedAtMs != null) return false;
  if (typeof storedHash !== 'string' || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  try {
    return timingSafeEqual(Buffer.from(hashAttemptToken(token), 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}
// IMPORTANT: verifyAttemptToken alone cannot prevent replay. The caller MUST
// atomically mark the token consumed in the same DB transaction as submission.
