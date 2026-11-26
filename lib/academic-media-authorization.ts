// Trusted server evidence only. Pure preflight; not a storage policy.
export type MediaEvidence = {
  actorId: string; assetId: string; audience: 'student' | 'instructor' | 'assignment';
  authenticated: boolean; accountAllowed: boolean; published: boolean;
  courseEntitled: boolean; enrolled: boolean; assignedInstructor: boolean;
  assignmentOwnerId?: string; assignedEvaluator: boolean;
};
export function authorizeAcademicMedia(e: MediaEvidence): boolean {
  if (!e || typeof e.actorId !== 'string' || !e.actorId.trim() ||
      e.actorId !== e.actorId.trim() || typeof e.assetId !== 'string' ||
      !e.assetId.trim() || e.assetId !== e.assetId.trim() ||
      e.authenticated !== true || e.accountAllowed !== true) return false;
  switch (e.audience) {
    case 'student': return e.published === true && e.courseEntitled === true && e.enrolled === true;
    case 'instructor': return e.assignedInstructor === true;
    case 'assignment': return e.assignmentOwnerId === e.actorId || e.assignedEvaluator === true;
    default: return false;
  }
}
