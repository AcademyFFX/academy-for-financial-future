export type QuizAssetRow = Record<string, unknown>;

function text(row: QuizAssetRow | undefined, key: string) {
  const value = row?.[key];
  return value === null || value === undefined ? "" : String(value).trim();
}

function assetLessonKey(row: QuizAssetRow) {
  return `${text(row, "course_id")}::${text(row, "lesson_id")}`;
}

function lessonRowKey(row: QuizAssetRow) {
  return `${text(row, "course_id")}::${text(row, "id")}`;
}

export function publishedQuizAssets(assets: QuizAssetRow[]) {
  return assets.filter((asset) => text(asset, "asset_type").toLowerCase() === "quiz" && text(asset, "asset_status").toLowerCase() === "published");
}

export function selectCanonicalQuizAssets(assets: QuizAssetRow[], lessons: QuizAssetRow[]) {
  const canonicalGroupByLesson = new Map(
    lessons
      .map((lesson) => [lessonRowKey(lesson), text(lesson, "canonical_quiz_group_id")] as const)
      .filter((entry) => entry[1])
  );

  return publishedQuizAssets(assets).filter((asset) => {
    const canonicalGroup = canonicalGroupByLesson.get(assetLessonKey(asset));
    return !canonicalGroup || text(asset, "quiz_group_id") === canonicalGroup;
  });
}

export type DuplicateQuizAssetWarning = {
  key: string;
  courseId: string;
  lessonId: string;
  assetCount: number;
  titles: string[];
  canonicalGroupId: string;
  competingAssetCount: number;
};

export function duplicatePublishedQuizAssetWarnings(assets: QuizAssetRow[], lessons: QuizAssetRow[]): DuplicateQuizAssetWarning[] {
  const canonicalGroupByLesson = new Map(
    lessons
      .map((lesson) => [lessonRowKey(lesson), text(lesson, "canonical_quiz_group_id")] as const)
      .filter((entry) => entry[1])
  );
  const grouped = new Map<string, QuizAssetRow[]>();
  for (const asset of publishedQuizAssets(assets).filter((asset) => text(asset, "lesson_id"))) {
    const key = assetLessonKey(asset);
    grouped.set(key, [...(grouped.get(key) ?? []), asset]);
  }

  return Array.from(grouped.entries()).flatMap(([key, rows]) => {
    if (rows.length < 2) return [];
    const [courseId, lessonId] = key.split("::");
    const canonicalGroupId = canonicalGroupByLesson.get(key) ?? "";
    return [{
      key,
      courseId,
      lessonId,
      assetCount: rows.length,
      titles: Array.from(new Set(rows.map((row) => text(row, "asset_title")).filter(Boolean))),
      canonicalGroupId,
      competingAssetCount: canonicalGroupId ? rows.filter((row) => text(row, "quiz_group_id") !== canonicalGroupId).length : rows.length
    }];
  });
}
