import { answerForexCoachQuestion, type CoachAnswer } from "@/lib/ai-coach";

export type VoiceCoachMode =
  | "Dr. Moricette Mode"
  | "Forex Instructor Mode"
  | "Institutional Trader Mode"
  | "Civic Leadership Mode"
  | "Career Coach Mode";

export const voiceCoachModes: Array<{
  mode: VoiceCoachMode;
  label: string;
  description: string;
  focus: string;
}> = [
  {
    mode: "Dr. Moricette Mode",
    label: "Dr. Moricette Mode",
    description: "Executive academy guidance with discipline, excellence, and institutional standards.",
    focus: "academy leadership, student discipline, certification preparation, and professional formation"
  },
  {
    mode: "Forex Instructor Mode",
    label: "Forex Instructor Mode",
    description: "Clear educational answers for Forex Anatomy, lessons, quizzes, and assignments.",
    focus: "Forex Anatomy, market structure, risk management, and certification materials"
  },
  {
    mode: "Institutional Trader Mode",
    label: "Institutional Trader Mode",
    description: "Market logic through liquidity, order flow, sessions, and institutional participation.",
    focus: "institutional orders, liquidity sweeps, order flow, sessions, and execution discipline"
  },
  {
    mode: "Civic Leadership Mode",
    label: "Civic Leadership Mode",
    description: "Leadership coaching for ethics, civic literacy, service, and moral responsibility.",
    focus: "civic literacy, moral responsibility, constitutional studies, ethics, and service leadership"
  },
  {
    mode: "Career Coach Mode",
    label: "Career Coach Mode",
    description: "Professional coaching for career readiness, credentials, interviews, and placement.",
    focus: "career readiness, resumes, certification proof, mentorship, and professional communication"
  }
];

const modePrefixes: Record<VoiceCoachMode, string> = {
  "Dr. Moricette Mode": "As Dr. Moricette Mode, respond with executive academy discipline and a professional leadership tone.",
  "Forex Instructor Mode": "As Forex Instructor Mode, teach the concept clearly using AFF curriculum language.",
  "Institutional Trader Mode": "As Institutional Trader Mode, explain the market through liquidity, order flow, sessions, and execution risk.",
  "Civic Leadership Mode": "As Civic Leadership Mode, connect the answer to moral responsibility, ethics, service, and civic formation.",
  "Career Coach Mode": "As Career Coach Mode, connect the answer to professional readiness, credentials, interviews, and career growth."
};

function modeFallback(question: string, mode: VoiceCoachMode, progressContext?: string): CoachAnswer {
  const progress = progressContext ? `\n\nProgress-aware guidance: ${progressContext}` : "";

  if (mode === "Civic Leadership Mode") {
    return {
      topic: "Civic Leadership",
      answer: `Civic leadership begins with responsibility, ethical judgment, service, and respect for institutions. For your question, focus on how knowledge becomes responsible action in the community.${progress}`,
      recommendations: []
    };
  }

  if (mode === "Career Coach Mode") {
    return {
      topic: "Career Coaching",
      answer: `Career growth at AFF connects certification, disciplined study, communication, and verifiable professional records. For your question, prepare a clear next step you can document in your student profile or portfolio.${progress}`,
      recommendations: []
    };
  }

  return answerForexCoachQuestion(question, progressContext);
}

export function answerVoiceCoachQuestion(question: string, mode: VoiceCoachMode, progressContext?: string, extraKnowledge: string[] = []) {
  const forexAnswer = mode === "Civic Leadership Mode" || mode === "Career Coach Mode"
    ? modeFallback(question, mode, progressContext)
    : answerForexCoachQuestion(question, progressContext, extraKnowledge);

  return {
    ...forexAnswer,
    mode,
    answer: `${modePrefixes[mode]}\n\n${forexAnswer.answer}`
  };
}
