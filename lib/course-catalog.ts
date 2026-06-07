export type CourseLesson = {
  id: string;
  title: string;
  duration: string;
};

export type CourseDefinition = {
  id: string;
  title: string;
  level: string;
  summary: string;
  lessons: CourseLesson[];
};

export const courseCatalog: CourseDefinition[] = [
  {
    id: "forex-foundations",
    title: "Forex Foundations",
    level: "Core",
    summary: "Market structure, currency pairs, sessions, pips, order flow, and broker execution fundamentals.",
    lessons: [
      { id: "fx-market-map", title: "The Forex Market Map", duration: "18 min" },
      { id: "currency-pairs", title: "Currency Pairs and Quote Anatomy", duration: "22 min" },
      { id: "sessions-pips", title: "Sessions, Pips, Lots, and Spreads", duration: "26 min" },
      { id: "orders-execution", title: "Orders, Execution, and Broker Basics", duration: "24 min" }
    ]
  },
  {
    id: "technical-analysis-lab",
    title: "Technical Analysis Lab",
    level: "Applied",
    summary: "Candlestick reading, support and resistance, trend systems, multi-timeframe confirmation, and chart review.",
    lessons: [
      { id: "candlestick-structure", title: "Candlestick Structure and Context", duration: "20 min" },
      { id: "support-resistance", title: "Support, Resistance, and Liquidity Zones", duration: "28 min" },
      { id: "trend-confirmation", title: "Trend Systems and Confirmation", duration: "30 min" },
      { id: "multi-timeframe", title: "Multi-Timeframe Analysis Lab", duration: "34 min" }
    ]
  },
  {
    id: "risk-capital-protection",
    title: "Risk and Capital Protection",
    level: "Professional",
    summary: "Position sizing, drawdown control, trade invalidation, loss limits, and portfolio-level risk rules.",
    lessons: [
      { id: "position-sizing", title: "Position Sizing Frameworks", duration: "25 min" },
      { id: "drawdown-control", title: "Drawdown Control and Daily Loss Rules", duration: "27 min" },
      { id: "trade-invalidation", title: "Trade Invalidation and Stop Logic", duration: "24 min" },
      { id: "risk-review", title: "Risk Review and Capital Protection Plan", duration: "32 min" }
    ]
  },
  {
    id: "institutional-forex-strategy",
    title: "Institutional Forex Strategy",
    level: "Advanced",
    summary: "Liquidity concepts, macro catalysts, news discipline, and professional trade planning routines.",
    lessons: [
      { id: "liquidity-concepts", title: "Institutional Liquidity Concepts", duration: "31 min" },
      { id: "macro-catalysts", title: "Macro Catalysts and Currency Bias", duration: "29 min" },
      { id: "news-discipline", title: "News Discipline and Volatility Controls", duration: "23 min" },
      { id: "trade-planning", title: "Professional Trade Planning Routine", duration: "36 min" }
    ]
  }
];

export type CourseProgress = {
  enrolled: boolean;
  completedLessonIds: string[];
  resumeLessonId?: string;
};

export type CourseProgressMap = Record<string, CourseProgress>;

export const courseProgressStorageKey = "aff-course-progress";

export function getCourseProgressPercent(course: CourseDefinition, progress?: CourseProgress) {
  if (!progress?.enrolled || course.lessons.length === 0) return 0;
  return Math.round((progress.completedLessonIds.length / course.lessons.length) * 100);
}

export function getResumeLesson(course: CourseDefinition, progress?: CourseProgress) {
  if (!progress?.enrolled) return course.lessons[0];
  return course.lessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ?? course.lessons[course.lessons.length - 1];
}
