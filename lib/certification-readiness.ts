export type CertificationRow = Record<string, unknown>;

function text(row: CertificationRow | undefined | null, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalized(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function enabled(value: unknown, fallback = true) {
  if (value === null || value === undefined || value === "") return fallback;
  return !["false", "0", "no", "optional"].includes(normalized(value));
}

function published(row: CertificationRow) {
  const status = text(row, ["publication_status", "asset_status", "status", "lesson_status"]);
  return !status || ["published", "active", "available"].includes(normalized(status));
}

function payload(row: CertificationRow) {
  const raw = text(row, ["signed_url"]);
  if (!raw) return {} as CertificationRow;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as CertificationRow : {};
  } catch {
    return {} as CertificationRow;
  }
}

export function resolveForexFoundationsCourse(courses: CertificationRow[], catalog: CertificationRow[]) {
  const catalogItem = catalog.find((row) => normalized(row.slug) === "forex-foundations");
  const mappedCourseId = text(catalogItem, ["course_id"]);
  const course = courses.find((row) => mappedCourseId && text(row, ["id"]) === mappedCourseId)
    ?? courses.find((row) => normalized(text(row, ["course_name", "title"])) === "forex foundations")
    ?? null;
  return { course, catalogItem: catalogItem ?? null };
}

export function calculateCertificationReadiness(input: {
  courseId: string;
  enrollmentRows: CertificationRow[];
  lessons: CertificationRow[];
  progressRows: CertificationRow[];
  assignmentDefinitions: CertificationRow[];
  assignmentSubmissions: CertificationRow[];
  attempts: CertificationRow[];
  certificationId: string;
  minimumPassingScore?: number;
}) {
  const activeEnrollment = input.enrollmentRows.some((row) => {
    const status = normalized(text(row, ["enrollment_status", "status"]) || "active");
    return text(row, ["course_id"]) === input.courseId && ["active", "approved", "enrolled", "in progress"].includes(status);
  });
  const requiredLessons = input.lessons.filter((row) =>
    text(row, ["course_id"]) === input.courseId && published(row) && enabled(row.required_completion)
  );
  const completedLessonIds = new Set(input.progressRows
    .filter((row) => text(row, ["course_id"]) === input.courseId && enabled(row.completed, true))
    .map((row) => text(row, ["lesson_id"]))
    .filter(Boolean));
  const completedLessons = requiredLessons.filter((row) => completedLessonIds.has(text(row, ["id"]))).length;
  const requiredAssignments = input.assignmentDefinitions.filter((row) => {
    const definition = payload(row);
    return text(row, ["course_id"]) === input.courseId
      && normalized(text(row, ["asset_type"])) === "assignment"
      && published(row)
      && enabled(definition.required, true);
  });
  const approvedSubmissions = input.assignmentSubmissions.filter((row) =>
    text(row, ["course_id"]) === input.courseId && normalized(text(row, ["status"])) === "approved"
  );
  const approvedAssignments = requiredAssignments.filter((definition) => {
    const definitionId = text(definition, ["id"]);
    const lessonId = text(definition, ["lesson_id"]);
    return approvedSubmissions.some((submission) => {
      const linkedId = text(submission, ["assignment_asset_id", "course_asset_id", "asset_id", "assignment_definition_id"]);
      return (linkedId && linkedId === definitionId) || (!linkedId && lessonId && text(submission, ["lesson_id"]) === lessonId);
    });
  }).length;
  const minimumPassingScore = Math.max(80, input.minimumPassingScore ?? 80);
  const passingAttempt = input.attempts.find((row) => {
    const status = normalized(text(row, ["status"]));
    return text(row, ["certification_id"]) === input.certificationId
      && ["pass", "passed"].includes(normalized(text(row, ["result", "pass_fail"])))
      && Number(text(row, ["score"]) || 0) >= minimumPassingScore
      && (!status || ["submitted", "completed", "certification approved"].includes(status));
  }) ?? null;
  const score = Number(text(passingAttempt, ["score"]) || 0);
  const lessonsReady = requiredLessons.length > 0 && completedLessons === requiredLessons.length;
  const assignmentsReady = approvedAssignments === requiredAssignments.length;

  return {
    activeEnrollment,
    requiredLessons: requiredLessons.length,
    completedLessons,
    requiredAssignments: requiredAssignments.length,
    approvedAssignments,
    hasPassingExam: Boolean(passingAttempt),
    passingAttemptId: text(passingAttempt, ["id"]),
    score,
    eligible: activeEnrollment && lessonsReady && assignmentsReady && Boolean(passingAttempt)
  };
}
