export type CourseLesson = {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  overview: string;
  objectives: string[];
  pdfs: { title: string; href: string }[];
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
      {
        id: "fx-market-map",
        title: "The Forex Market Map",
        duration: "18 min",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        overview: "A foundational tour of participants, sessions, liquidity, and how currency markets move.",
        objectives: ["Identify the major forex market participants.", "Explain liquidity across the trading day.", "Map session behavior to planning routines."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "currency-pairs",
        title: "Currency Pairs and Quote Anatomy",
        duration: "22 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Learn base and quote currencies, bid/ask pricing, spread mechanics, and pair classification.",
        objectives: ["Read base and quote currency structure.", "Compare majors, minors, and exotic pairs.", "Explain bid, ask, and spread costs."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "sessions-pips",
        title: "Sessions, Pips, Lots, and Spreads",
        duration: "26 min",
        videoUrl: "/videos/aff-sessions-pips-lots.mp4",
        overview: "Understand the timing, measurement, and execution language traders use every day.",
        objectives: ["Define pips, lots, and spreads.", "Compare London, New York, and Asian sessions.", "Connect session volatility to position planning."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "orders-execution",
        title: "Orders, Execution, and Broker Basics",
        duration: "24 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Review market, limit, stop, and protective order behavior under real market conditions.",
        objectives: ["Differentiate market, limit, stop, and stop-limit orders.", "Explain broker execution basics.", "Select protective orders for a trade plan."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      }
    ]
  },
  {
    id: "technical-analysis-lab",
    title: "Technical Analysis Lab",
    level: "Applied",
    summary: "Candlestick reading, support and resistance, trend systems, multi-timeframe confirmation, and chart review.",
    lessons: [
      {
        id: "candlestick-structure",
        title: "Candlestick Structure and Context",
        duration: "20 min",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        overview: "Study wick, body, range, and candle context without treating patterns as isolated signals.",
        objectives: ["Read candle range, wick, and body structure.", "Evaluate candle context inside a trend.", "Avoid isolated pattern interpretation."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "support-resistance",
        title: "Support, Resistance, and Liquidity Zones",
        duration: "28 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Identify decision areas where price reacts, pauses, or hunts liquidity.",
        objectives: ["Mark support and resistance with evidence.", "Recognize liquidity resting near levels.", "Separate reaction zones from prediction lines."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "trend-confirmation",
        title: "Trend Systems and Confirmation",
        duration: "30 min",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        overview: "Build a repeatable approach to trend identification and confirmation.",
        objectives: ["Define trend structure with higher highs and lows.", "Use confirmation without overloading indicators.", "Create a repeatable trend checklist."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "multi-timeframe",
        title: "Multi-Timeframe Analysis Lab",
        duration: "34 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Combine higher-timeframe bias with lower-timeframe execution planning.",
        objectives: ["Set higher-timeframe directional bias.", "Use lower timeframes for execution timing.", "Document alignment before entry."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      }
    ]
  },
  {
    id: "risk-capital-protection",
    title: "Risk and Capital Protection",
    level: "Professional",
    summary: "Position sizing, drawdown control, trade invalidation, loss limits, and portfolio-level risk rules.",
    lessons: [
      {
        id: "position-sizing",
        title: "Position Sizing Frameworks",
        duration: "25 min",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        overview: "Translate risk percentage into trade size with practical sizing discipline.",
        objectives: ["Calculate trade risk from account equity.", "Translate stop distance into position size.", "Apply consistent risk percentage rules."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "drawdown-control",
        title: "Drawdown Control and Daily Loss Rules",
        duration: "27 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Design daily and weekly controls that protect capital before emotions take over.",
        objectives: ["Set daily and weekly loss limits.", "Recognize drawdown escalation patterns.", "Create capital protection stop rules."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "trade-invalidation",
        title: "Trade Invalidation and Stop Logic",
        duration: "24 min",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        overview: "Define when your idea is wrong and how to exit without negotiation.",
        objectives: ["Define invalidation before entry.", "Place stops around market structure.", "Separate trade thesis failure from normal fluctuation."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "risk-review",
        title: "Risk Review and Capital Protection Plan",
        duration: "32 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Audit your risk behavior and build an enforceable capital protection plan.",
        objectives: ["Review risk behavior from prior trades.", "Identify repeat loss patterns.", "Write an enforceable protection plan."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      }
    ]
  },
  {
    id: "institutional-forex-strategy",
    title: "Institutional Forex Strategy",
    level: "Advanced",
    summary: "Liquidity concepts, macro catalysts, news discipline, and professional trade planning routines.",
    lessons: [
      {
        id: "liquidity-concepts",
        title: "Institutional Liquidity Concepts",
        duration: "31 min",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        overview: "Study how resting orders, liquidity pools, and execution incentives shape movement.",
        objectives: ["Identify common liquidity pools.", "Explain how stops can fuel price movement.", "Build liquidity context into planning."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "macro-catalysts",
        title: "Macro Catalysts and Currency Bias",
        duration: "29 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Use macro events, rates, and risk sentiment to frame currency bias.",
        objectives: ["Connect rate expectations to currency bias.", "Track macro catalysts before trading.", "Use risk sentiment as market context."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "news-discipline",
        title: "News Discipline and Volatility Controls",
        duration: "23 min",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        overview: "Prepare for news events without abandoning risk rules or execution standards.",
        objectives: ["Create a news event preparation routine.", "Use volatility controls during catalysts.", "Avoid reactive entries around high-impact events."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "trade-planning",
        title: "Professional Trade Planning Routine",
        duration: "36 min",
        videoUrl: "https://vimeo.com/76979871",
        overview: "Build a repeatable pre-market and pre-trade workflow for institutional discipline.",
        objectives: ["Build a pre-market review structure.", "Document trade thesis and invalidation.", "Use a final execution checklist."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      }
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
export const lessonNotesStorageKey = "aff-lesson-notes";

export function getCourseProgressPercent(course: CourseDefinition, progress?: CourseProgress) {
  if (!progress?.enrolled || course.lessons.length === 0) return 0;
  return Math.round((progress.completedLessonIds.length / course.lessons.length) * 100);
}

export function getResumeLesson(course: CourseDefinition, progress?: CourseProgress) {
  if (!progress?.enrolled) return course.lessons[0];
  return course.lessons.find((lesson) => !progress.completedLessonIds.includes(lesson.id)) ?? course.lessons[course.lessons.length - 1];
}

export function getCourseById(courseId: string) {
  return courseCatalog.find((course) => course.id === courseId);
}

export function getLessonPath(courseId: string, lessonId: string) {
  return `/courses/${courseId}/${lessonId}`;
}

export function getVideoEmbedUrl(videoUrl: string) {
  const url = new URL(videoUrl, "https://academyforfinancialfuture.local");
  if (url.hostname.includes("youtube.com")) {
    return `https://www.youtube.com/embed/${url.searchParams.get("v") ?? ""}`;
  }
  if (url.hostname.includes("youtu.be")) {
    return `https://www.youtube.com/embed/${url.pathname.replace("/", "")}`;
  }
  if (url.hostname.includes("vimeo.com")) {
    return `https://player.vimeo.com/video/${url.pathname.replace("/", "")}`;
  }
  return videoUrl;
}

export function isMp4Video(videoUrl: string) {
  return videoUrl.toLowerCase().split("?")[0].endsWith(".mp4");
}
