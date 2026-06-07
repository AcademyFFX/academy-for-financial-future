export type CourseLesson = {
  id: string;
  title: string;
  duration: string;
  videoUrl: string;
  overview: string;
  summary: string;
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
        videoUrl: "",
        overview: "A foundational tour of participants, sessions, liquidity, and how currency markets move.",
        summary: "Students learn how banks, institutions, brokers, businesses, and traders interact inside the global currency market, then connect that map to professional trade preparation.",
        objectives: ["Identify the major forex market participants.", "Explain liquidity across the trading day.", "Map session behavior to planning routines."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "currency-pairs",
        title: "Currency Pairs and Quote Anatomy",
        duration: "22 min",
        videoUrl: "",
        overview: "Learn base and quote currencies, bid/ask pricing, spread mechanics, and pair classification.",
        summary: "This lesson breaks down how currency pairs are quoted and how price, spread, and pair category affect execution decisions.",
        objectives: ["Read base and quote currency structure.", "Compare majors, minors, and exotic pairs.", "Explain bid, ask, and spread costs."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "sessions-pips",
        title: "Sessions, Pips, Lots and Spreads",
        duration: "26 min",
        videoUrl: "",
        overview: "Understand the timing, measurement, and execution language traders use every day.",
        summary: "Students study the practical language of forex trading, including market sessions, pip measurement, lot sizing, and transaction costs.",
        objectives: ["Define pips, lots, and spreads.", "Compare London, New York, and Asian sessions.", "Connect session volatility to position planning."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "orders-execution",
        title: "Orders, Execution and Broker Basics",
        duration: "24 min",
        videoUrl: "",
        overview: "Review market, limit, stop, and protective order behavior under real market conditions.",
        summary: "This lesson introduces order types, broker interfaces, and the execution controls students need before placing or managing live trades.",
        objectives: ["Differentiate market, limit, stop, and stop-limit orders.", "Explain broker execution basics.", "Select protective orders for a trade plan."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      }
    ]
  },
  {
    id: "forex-anatomy",
    title: "Forex Anatomy",
    level: "Core",
    summary: "A structured anatomy of the forex market, from market structure and institutional orders to liquidity, sessions, data, and broker execution.",
    lessons: [
      {
        id: "market-structure-skeleton",
        title: "The Skeleton: Market Structure",
        duration: "24 min",
        videoUrl: "",
        overview: "Study market structure as the framework that gives price movement its readable form.",
        summary: "Students learn how swing highs, swing lows, trends, ranges, and structural breaks create the foundation for professional forex analysis.",
        objectives: ["Define market structure in practical chart terms.", "Identify swing points and structural breaks.", "Distinguish trending and ranging conditions."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "institutional-orders-muscles",
        title: "The Muscles: Institutional Orders",
        duration: "27 min",
        videoUrl: "",
        overview: "Explore how institutional order activity creates force behind visible market movement.",
        summary: "This lesson explains why large orders matter, how accumulation and distribution can appear on charts, and why retail traders must think beyond single candles.",
        objectives: ["Explain the role of institutional order size.", "Recognize accumulation and distribution behavior.", "Connect order pressure to market movement."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "order-flow-blood",
        title: "The Blood Flow: Order Flow",
        duration: "26 min",
        videoUrl: "",
        overview: "Learn order flow as the movement of buying and selling pressure through the market.",
        summary: "Students connect price movement to active participation, momentum shifts, and the flow of orders across important levels.",
        objectives: ["Define order flow in simple trading language.", "Read shifts in buying and selling pressure.", "Use order flow context around key levels."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "economic-data-nervous-system",
        title: "The Nervous System: Economic Data",
        duration: "25 min",
        videoUrl: "",
        overview: "Understand economic data as the signal system that can trigger volatility and reshape currency expectations.",
        summary: "This lesson introduces high-impact economic releases, central bank expectations, and the discipline required around news-driven markets.",
        objectives: ["Identify high-impact economic events.", "Explain how data can affect currency bias.", "Prepare a trading plan around news risk."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "liquidity-heart",
        title: "The Heart: Liquidity",
        duration: "29 min",
        videoUrl: "",
        overview: "Study liquidity as the core condition that allows orders to be filled and markets to move.",
        summary: "Students learn where liquidity tends to rest, why it attracts price, and how liquidity awareness improves trade planning.",
        objectives: ["Define liquidity and why it matters.", "Identify common liquidity pools.", "Use liquidity context to plan entries and exits."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "trading-sessions-clock",
        title: "The Clock: Trading Sessions",
        duration: "23 min",
        videoUrl: "",
        overview: "Use trading sessions to understand when liquidity, volatility, and opportunity tend to appear.",
        summary: "This lesson compares the Asian, London, and New York sessions and shows students how timing affects execution quality.",
        objectives: ["Compare major forex trading sessions.", "Recognize session overlap behavior.", "Match trading plans to session conditions."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "broker-interface-skin",
        title: "The Skin: Broker Interface",
        duration: "22 min",
        videoUrl: "",
        overview: "Review the broker interface as the visible layer where analysis becomes execution.",
        summary: "Students learn how platform layout, order tickets, margin displays, and account controls shape the final step between analysis and trade management.",
        objectives: ["Navigate common broker interface elements.", "Read order tickets and margin information.", "Confirm trade details before execution."],
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
        videoUrl: "",
        overview: "Study wick, body, range, and candle context without treating patterns as isolated signals.",
        summary: "Students learn to read candlesticks through context, structure, and range instead of memorizing isolated pattern names.",
        objectives: ["Read candle range, wick, and body structure.", "Evaluate candle context inside a trend.", "Avoid isolated pattern interpretation."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "support-resistance",
        title: "Support, Resistance, and Liquidity Zones",
        duration: "28 min",
        videoUrl: "",
        overview: "Identify decision areas where price reacts, pauses, or hunts liquidity.",
        summary: "This lesson teaches support and resistance as decision zones that must be validated by repeated price behavior and liquidity context.",
        objectives: ["Mark support and resistance with evidence.", "Recognize liquidity resting near levels.", "Separate reaction zones from prediction lines."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "trend-confirmation",
        title: "Trend Systems and Confirmation",
        duration: "30 min",
        videoUrl: "",
        overview: "Build a repeatable approach to trend identification and confirmation.",
        summary: "Students build a trend confirmation process that balances market structure, timing, and clear rules for participation.",
        objectives: ["Define trend structure with higher highs and lows.", "Use confirmation without overloading indicators.", "Create a repeatable trend checklist."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "multi-timeframe",
        title: "Multi-Timeframe Analysis Lab",
        duration: "34 min",
        videoUrl: "",
        overview: "Combine higher-timeframe bias with lower-timeframe execution planning.",
        summary: "This lesson shows how to align broad directional context with precise execution timing using multiple timeframes.",
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
        videoUrl: "",
        overview: "Translate risk percentage into trade size with practical sizing discipline.",
        summary: "Students learn how to calculate trade size from account equity, stop distance, and defined risk limits.",
        objectives: ["Calculate trade risk from account equity.", "Translate stop distance into position size.", "Apply consistent risk percentage rules."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "drawdown-control",
        title: "Drawdown Control and Daily Loss Rules",
        duration: "27 min",
        videoUrl: "",
        overview: "Design daily and weekly controls that protect capital before emotions take over.",
        summary: "This lesson helps students create capital protection rules that limit damage during losing periods and emotional trading conditions.",
        objectives: ["Set daily and weekly loss limits.", "Recognize drawdown escalation patterns.", "Create capital protection stop rules."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "trade-invalidation",
        title: "Trade Invalidation and Stop Logic",
        duration: "24 min",
        videoUrl: "",
        overview: "Define when your idea is wrong and how to exit without negotiation.",
        summary: "Students learn to define trade invalidation before entry so exits are controlled by the plan instead of emotion.",
        objectives: ["Define invalidation before entry.", "Place stops around market structure.", "Separate trade thesis failure from normal fluctuation."],
        pdfs: [{ title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" }]
      },
      {
        id: "risk-review",
        title: "Risk Review and Capital Protection Plan",
        duration: "32 min",
        videoUrl: "",
        overview: "Audit your risk behavior and build an enforceable capital protection plan.",
        summary: "This lesson guides students through a structured review of risk behavior and the creation of a written capital protection plan.",
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
        videoUrl: "",
        overview: "Study how resting orders, liquidity pools, and execution incentives shape movement.",
        summary: "Students examine liquidity behavior from an institutional perspective and learn how resting orders can influence price movement.",
        objectives: ["Identify common liquidity pools.", "Explain how stops can fuel price movement.", "Build liquidity context into planning."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "macro-catalysts",
        title: "Macro Catalysts and Currency Bias",
        duration: "29 min",
        videoUrl: "",
        overview: "Use macro events, rates, and risk sentiment to frame currency bias.",
        summary: "This lesson connects macro catalysts, interest-rate expectations, and market sentiment to practical currency bias formation.",
        objectives: ["Connect rate expectations to currency bias.", "Track macro catalysts before trading.", "Use risk sentiment as market context."],
        pdfs: [{ title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" }]
      },
      {
        id: "news-discipline",
        title: "News Discipline and Volatility Controls",
        duration: "23 min",
        videoUrl: "",
        overview: "Prepare for news events without abandoning risk rules or execution standards.",
        summary: "Students learn how to prepare for high-volatility news conditions while preserving execution discipline and risk control.",
        objectives: ["Create a news event preparation routine.", "Use volatility controls during catalysts.", "Avoid reactive entries around high-impact events."],
        pdfs: [{ title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }]
      },
      {
        id: "trade-planning",
        title: "Professional Trade Planning Routine",
        duration: "36 min",
        videoUrl: "",
        overview: "Build a repeatable pre-market and pre-trade workflow for institutional discipline.",
        summary: "This lesson brings analysis, risk, timing, and execution checks into a repeatable professional trade planning routine.",
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
