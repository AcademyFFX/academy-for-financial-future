export type NormalizedQuizQuestion = {
  prompt: string;
  question: string;
  questionText: string;
  options: string[];
  choices: string[];
  answers: string[];
  correctAnswer: string;
  correct_answer: string;
  points: number;
  raw: unknown;
};

type QuestionRecord = Record<string, unknown>;

function textValue(record: QuestionRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim()) return cleanQuizAnswerText(String(value));
  }
  return fallback;
}

export function cleanQuizAnswerText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^\s*(?:options?|answer options?|correct\s*answers?)\s*:\s*/i, "")
    .replace(/^\s*(?:option|answer)\s+[a-z]\s*[:.)-]\s*/i, "")
    .replace(/^\s*(?:option|answer)\s*[:.)-]\s*/i, "")
    .replace(/^\s*(?:[a-z]|\d+)\s*[:.)-]\s+/i, "")
    .trim();
}

export function normalizeQuizOptions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((option) => {
        if (option && typeof option === "object") {
          const record = option as QuestionRecord;
          return textValue(record, ["text", "label", "value", "answer", "option"]);
        }
        return String(option ?? "");
      })
      .map(cleanQuizAnswerText)
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as QuestionRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, option]) => cleanQuizAnswerText(option))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,|]+/)
      .map(cleanQuizAnswerText)
      .filter(Boolean);
  }

  return [];
}

export function normalizeQuizQuestionRecord(record: unknown, fallbackTitle = ""): NormalizedQuizQuestion {
  const source = record && typeof record === "object" ? record as QuestionRecord : {};
  const questionText = textValue(source, ["prompt", "question", "question_text", "questionText", "text", "title"], fallbackTitle);
  const optionSource = source.options ?? source.choices ?? source.answers ?? source.answer_options ?? source.answerOptions;
  const options = normalizeQuizOptions(optionSource);
  const correctAnswer = textValue(source, ["correctAnswer", "correct_answer", "correct", "answer", "correctOption", "correct_option"]);
  const points = Number(source.points ?? source.point_value ?? source.pointValue ?? 1) || 1;

  return {
    prompt: questionText,
    question: questionText,
    questionText,
    options,
    choices: options,
    answers: options,
    correctAnswer,
    correct_answer: correctAnswer,
    points,
    raw: record
  };
}

export function serializeQuizQuestion(question: Pick<NormalizedQuizQuestion, "questionText" | "options" | "correctAnswer" | "points">) {
  const options = normalizeQuizOptions(question.options);
  const correctAnswer = cleanQuizAnswerText(question.correctAnswer);
  return {
    prompt: cleanQuizAnswerText(question.questionText),
    question: cleanQuizAnswerText(question.questionText),
    question_text: cleanQuizAnswerText(question.questionText),
    questionText: cleanQuizAnswerText(question.questionText),
    options,
    choices: options,
    answers: options,
    correctAnswer,
    correct_answer: correctAnswer,
    points: question.points,
    point_value: question.points
  };
}
