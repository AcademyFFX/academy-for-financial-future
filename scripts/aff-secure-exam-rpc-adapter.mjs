// Review-only, nondeployed adapter. The database RPC must perform
// locking, grading, insert and token consumption in ONE transaction.
export function makeExamRpcAdapter(rpc) {
  if (typeof rpc !== 'function') throw new TypeError('Trusted RPC required');
  return async ({ token, examId, answers }) => {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) ||
        typeof examId !== 'string' || !examId ||
        !answers || typeof answers !== 'object' || Array.isArray(answers) ||
        Object.keys(answers).length > 500 ||
        Object.values(answers).some(x => typeof x !== 'string' || x.length > 256))
      return { ok:false, code:'INVALID_REQUEST' };
    // No student_id, score, pass/fail, timestamp or reviewer accepted.
    const { data, error } = await rpc('aff_submit_secure_exam',
      { p_token:token, p_exam_id:examId, p_answers:answers });
    if (error || !data?.ok || !Number.isInteger(data.score) ||
        data.score < 0 || data.score > 100 || typeof data.passed !== 'boolean')
      return { ok:false, code:'SUBMISSION_FAILED' };
    return { ok:true, score:data.score, passed:data.passed, resultId:data.result_id ?? null };
  };
}
