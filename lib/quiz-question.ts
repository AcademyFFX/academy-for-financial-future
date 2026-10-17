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
  answerKeySource: string;
  answerKeyIssue: "" | "missing" | "conflict";
  raw: unknown;
};

type QuestionRecord = Record<string, unknown>;

const quizAnswerFieldNames = ["correctAnswer", "correct_answer", "correct", "answer", "correctOption", "correct_option"] as const;

export type QuizAnswerKeyAudit = {
  correctAnswer: string;
  source: string;
  issue: "" | "missing" | "conflict";
  candidates: Array<{ source: string; rawValue: string; resolvedValue: string; valid: boolean }>;
};

function stripLeadingOptionDecorations(value: string) {
  let output = value.trimStart();
  while (output) {
    const codePoint = output.codePointAt(0);
    if (codePoint === undefined) break;
    const isDecoration =
      (codePoint >= 0x2000 && codePoint <= 0x206f) ||
      (codePoint >= 0x2500 && codePoint <= 0x27bf) ||
      (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
      codePoint === 0xfeff ||
      (codePoint >= 0x1f300 && codePoint <= 0x1faff);
    if (!isDecoration) break;
    output = output.slice(codePoint > 0xffff ? 2 : 1).trimStart();
  }
  return output;
}

function textValue(record: QuestionRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim()) return cleanQuizAnswerText(String(value));
  }
  return fallback;
}

export function cleanQuizAnswerText(value: unknown) {
  const withoutLeadingDecoration = stripLeadingOptionDecorations(String(value ?? "").normalize("NFKC"));
  const withoutOptionPrefix = withoutLeadingDecoration
    .trim()
    .replace(/^\s*(?:options?|answer options?|correct\s*answers?)\s*:\s*/i, "")
    .replace(/^\s*(?:option|answer)\s+[a-z]\s*[:.)-]\s*/i, "")
    .replace(/^\s*(?:option|answer)\s*[:.)-]\s*/i, "")
    .replace(/^\s*(?:[a-z]|\d+)\s*[:.)-]\s+/i, "");
  return stripLeadingOptionDecorations(withoutOptionPrefix).trim();
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

export function auditQuizCorrectAnswer(questionValue: unknown, payloadValue?: unknown): QuizAnswerKeyAudit {
  const question = questionValue && typeof questionValue === "object" ? questionValue as QuestionRecord : {};
  const payload = payloadValue && typeof payloadValue === "object" ? payloadValue as QuestionRecord : {};
  const options = normalizeQuizOptions(question.options ?? question.choices ?? question.answers ?? question.answer_options ?? question.answerOptions);
  const records: Array<{ label: string; record: QuestionRecord }> = [];
  const seen = new Set<object>();
  const nestedAnswerContainers = ["question", "answerKey", "answer_key", "grading", "metadata", "quiz", "data"];
  const collectRecords = (label: string, record: QuestionRecord, depth: number) => {
    if (seen.has(record) || depth > 4) return;
    seen.add(record);
    records.push({ label, record });
    for (const key of nestedAnswerContainers) {
      const nested = record[key];
      if (nested && typeof nested === "object" && !Array.isArray(nested)) collectRecords(`${label}.${key}`, nested as QuestionRecord, depth + 1);
    }
  };
  collectRecords("question", question, 0);
  if (payload !== question) collectRecords("payload", payload, 0);

  const candidates: QuizAnswerKeyAudit["candidates"] = [];
  for (const { label, record } of records) {
    for (const field of quizAnswerFieldNames) {
      const raw = record[field];
      if (raw === null || raw === undefined || !String(raw).trim()) continue;
      const rawValue = String(raw);
      const resolvedValue = resolveQuizAnswerToOption(raw, options);
      const valid = options.length === 0
        ? Boolean(normalizeQuizAnswerForComparison(resolvedValue))
        : options.some((option) => normalizeQuizAnswerForComparison(option) === normalizeQuizAnswerForComparison(resolvedValue));
      candidates.push({ source: `${label}.${field}`, rawValue, resolvedValue, valid });
    }
  }

  const validCandidates = candidates.filter((candidate) => candidate.valid);
  const exactTextCandidates = validCandidates.filter((candidate) =>
    options.some((option) => normalizeQuizAnswerForComparison(option) === normalizeQuizAnswerForComparison(candidate.rawValue))
  );
  const preferredCandidate = exactTextCandidates[0] ?? validCandidates[0];
  const uniqueAnswers = new Set(validCandidates.map((candidate) => normalizeQuizAnswerForComparison(candidate.resolvedValue)));
  return {
    correctAnswer: preferredCandidate?.resolvedValue ?? "",
    source: preferredCandidate?.source ?? "",
    issue: validCandidates.length === 0 ? "missing" : uniqueAnswers.size > 1 ? "conflict" : "",
    candidates
  };
}

export function quizAnswerIsCorrect(selectedAnswer: unknown, correctAnswer: unknown, optionsValue: unknown) {
  const selected = resolveQuizAnswerToOption(selectedAnswer, optionsValue);
  const correct = resolveQuizAnswerToOption(correctAnswer, optionsValue);
  return Boolean(selected && correct && normalizeQuizAnswerForComparison(selected) === normalizeQuizAnswerForComparison(correct));
}

export function normalizeQuizQuestionRecord(record: unknown, fallbackTitle = "", payloadValue?: unknown): NormalizedQuizQuestion {
  const source = record && typeof record === "object" ? record as QuestionRecord : {};
  const questionText = textValue(source, ["prompt", "question", "question_text", "questionText", "text", "title"], fallbackTitle);
  const optionSource = source.options ?? source.choices ?? source.answers ?? source.answer_options ?? source.answerOptions;
  const options = normalizeQuizOptions(optionSource);
  const answerKeyAudit = auditQuizCorrectAnswer(source, payloadValue);
  const correctAnswer = answerKeyAudit.correctAnswer;
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
    answerKeySource: answerKeyAudit.source,
    answerKeyIssue: answerKeyAudit.issue,
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
