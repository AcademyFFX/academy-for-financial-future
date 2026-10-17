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

export function normalizeQuizAnswerForComparison(value: unknown) {
  return cleanQuizAnswerText(value)
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim()
    .toLowerCase();
}

function referencedOptionIndex(value: unknown, optionCount: number) {
  const raw = String(value ?? "").trim();
  const letterMatch = raw.match(/^(?:(?:option|answer)\s*)?([a-z])(?:\s*[:.)-])?$/i);
  if (letterMatch) {
    const index = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
    return index >= 0 && index < optionCount ? index : -1;
  }

  const numberMatch = raw.match(/^(?:(?:option|answer)\s*)?(\d+)(?:\s*[:.)-])?$/i);
  if (!numberMatch) return -1;
  const number = Number(numberMatch[1]);
  if (number === 0 && optionCount > 0) return 0;
  return number >= 1 && number <= optionCount ? number - 1 : -1;
}

export function resolveQuizAnswerToOption(answer: unknown, optionsValue: unknown) {
  const options = normalizeQuizOptions(optionsValue);
  const normalizedAnswer = normalizeQuizAnswerForComparison(answer);
  if (!normalizedAnswer) return "";

  const textMatch = options.find((option) => normalizeQuizAnswerForComparison(option) === normalizedAnswer);
  if (textMatch) return textMatch;

  const optionIndex = referencedOptionIndex(answer, options.length);
  return optionIndex >= 0 ? options[optionIndex] : cleanQuizAnswerText(answer);
}

export function quizAnswerIsCorrect(selectedAnswer: unknown, correctAnswer: unknown, optionsValue: unknown) {
  const selected = resolveQuizAnswerToOption(selectedAnswer, optionsValue);
  const correct = resolveQuizAnswerToOption(correctAnswer, optionsValue);
  return Boolean(selected && correct && normalizeQuizAnswerForComparison(selected) === normalizeQuizAnswerForComparison(correct));
}

export function normalizeQuizQuestionRecord(record: unknown, fallbackTitle = ""): NormalizedQuizQuestion {
  const source = record && typeof record === "object" ? record as QuestionRecord : {};
  const questionText = textValue(source, ["prompt", "question", "question_text", "questionText", "text", "title"], fallbackTitle);
  const optionSource = source.options ?? source.choices ?? source.answers ?? source.answer_options ?? source.answerOptions;
  const options = normalizeQuizOptions(optionSource);
  const storedCorrectAnswer = textValue(source, ["correctAnswer", "correct_answer", "correct", "answer", "correctOption", "correct_option"]);
  const correctAnswer = resolveQuizAnswerToOption(storedCorrectAnswer, options);
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
