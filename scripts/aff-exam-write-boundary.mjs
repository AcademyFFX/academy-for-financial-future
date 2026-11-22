// AFF exam write boundary — pure offline validation, NOT a deployed API.
// A trusted server must derive actor identity and role from verified auth context.
const STUDENT_FIELDS = new Set(['answers', 'submitted_at']);
const REVIEW_FIELDS = new Set(['automatic_score','manual_score','score','result','pass_fail','status','reviewed_by','reviewed_at','instructor_comments']);
const OWNERSHIP_FIELDS = new Set(['id','student_id','aff_student_id','certification_id','exam_id','attempt_number']);
const hasOwn = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
export function validateExamMutation({ actor, action, payload, attempt } = {}) {
  const deny = reason => ({ allowed:false,reason,action:'DENY',writesPerformed:0 });
  if (!actor || actor.authenticated !== true || !actor.userId || !payload || typeof payload !== 'object' || Array.isArray(payload) || !attempt) return deny('Unverified actor, payload or attempt');
  if (action === 'submit') {
    if (actor.userId !== attempt.student_id) return deny('Student ownership mismatch');
    if (attempt.submitted_at != null) return deny('Attempt already submitted');
    if (Object.keys(payload).some(key => !STUDENT_FIELDS.has(key))) return deny('Disallowed student field');
    if (!hasOwn(payload,'answers') || !Array.isArray(payload.answers) || payload.answers.length === 0) return deny('Missing answers');
    // Submitted time must be generated server-side, never accepted from a client.
    if (hasOwn(payload,'submitted_at')) return deny('Client timestamp forbidden');
    return {allowed:true,reason:'Submission shape accepted; server must verify enrollment and persist through trusted endpoint',action:'VALIDATE_ONLY',writesPerformed:0};
  }
  if (action === 'grade') {
    if (actor.serverVerified !== true || actor.canGrade !== true || !actor.userId) return deny('Trusted grader authorization required');
    if (attempt.submitted_at == null) return deny('Unsubmitted attempt');
    if (attempt.reviewed_at != null) return deny('Finalized review is immutable');
    if (!Object.keys(payload).length || Object.keys(payload).some(key => !REVIEW_FIELDS.has(key))) return deny('Disallowed grading field');
    if (Object.keys(payload).some(key => OWNERSHIP_FIELDS.has(key))) return deny('Ownership fields immutable');
    if (hasOwn(payload,'reviewed_by') || hasOwn(payload,'reviewed_at')) return deny('Reviewer identity and time must be server-generated');
    for (const key of ['score','manual_score','automatic_score']) {
      if (hasOwn(payload,key) && (typeof payload[key] !== 'number' || !Number.isFinite(payload[key]) || payload[key] < 0 || payload[key] > 100)) return deny('Invalid score');
    }
    return {allowed:true,reason:'Grading shape accepted; server must verify role and write audit record',action:'VALIDATE_ONLY',writesPerformed:0};
  }
  return deny('Unsupported mutation');
}
