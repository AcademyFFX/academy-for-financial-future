/** Pure access decision; storage permissions must independently enforce private objects. */
export function canSignCourseMedia(input: {
  isAdmin: boolean;
  assetStatus: string | null;
  studentId: number | null;
  enrollmentStudentId: number | null;
  enrollmentCourseId: number | null;
  assetCourseId: number;
  enrollmentStatus: string | null;
}): boolean {
  if (input.isAdmin) return true;
  if (input.assetStatus !== "Published" || input.studentId === null) return false;
  if (input.enrollmentStudentId !== input.studentId || input.enrollmentCourseId !== input.assetCourseId) return false;
  return ["active", "enrolled", "completed"].includes((input.enrollmentStatus ?? "").trim().toLowerCase());
}
