import { courseCatalog, getLessonPath } from "@/lib/course-catalog";

export type CoachRecommendation = {
  courseTitle: string;
  lessonTitle: string;
  href: string;
  reason: string;
};

export type CoachAnswer = {
  answer: string;
  topic: string;
  recommendations: CoachRecommendation[];
};

type CoachKnowledge = {
  topic: string;
  keywords: string[];
  answer: string;
};

const academyKnowledge: CoachKnowledge[] = [
  {
    topic: "Market Structure",
    keywords: ["market structure", "higher high", "higher low", "lower high", "lower low", "trend structure"],
    answer:
      "Market Structure is the skeleton of the forex market. It allows traders to identify higher highs, higher lows, lower highs, and lower lows to determine trend direction."
  },
  {
    topic: "Liquidity Sweep",
    keywords: ["liquidity sweep", "sweep", "stop hunt", "liquidity grab", "stops"],
    answer:
      "A liquidity sweep occurs when price temporarily moves beyond a key high or low to trigger stop orders before reversing direction. In the AFF framework, traders study sweeps around liquidity pools and wait for confirmation instead of chasing the first move."
  },
  {
    topic: "NFP",
    keywords: ["nfp", "non farm", "non-farm", "payroll", "employment"],
    answer:
      "Non-Farm Payroll measures employment growth in the United States and is one of the most important economic indicators affecting USD volatility. NFP can create fast movement, spread expansion, and false first reactions, so AFF students plan risk before the release."
  },
  {
    topic: "Institutional Orders",
    keywords: ["institutional", "smart money", "order block", "large volume", "institutional orders"],
    answer:
      "Institutional Orders are large-volume decisions from banks, funds, and major participants. They can leave visible footprints such as order blocks, displacement, and strong reactions from key price zones."
  },
  {
    topic: "Order Flow",
    keywords: ["order flow", "buy orders", "sell orders", "supply", "demand"],
    answer:
      "Order Flow is the movement of buy and sell pressure through the market. It helps students understand whether demand is absorbing supply, whether sellers are dominating, and how pressure changes around important levels."
  },
  {
    topic: "Economic Data",
    keywords: ["economic data", "cpi", "interest rate", "gdp", "inflation", "news"],
    answer:
      "Economic Data is the nervous system of the forex market. Reports such as CPI, NFP, GDP, inflation, and interest rate decisions can quickly change expectations and create currency volatility."
  },
  {
    topic: "Liquidity",
    keywords: ["liquidity", "liquidity pool", "market efficiency", "equal highs", "equal lows"],
    answer:
      "Liquidity is where orders are available to be filled. Traders often watch highs, lows, equal highs, equal lows, and obvious stop areas because price may be drawn there before making its next meaningful move."
  },
  {
    topic: "Trading Sessions",
    keywords: ["session", "tokyo", "london", "new york", "overlap", "trading sessions"],
    answer:
      "Trading Sessions help students understand timing. Tokyo is often quieter, London can create strong directional movement, New York reacts heavily to USD data, and overlaps can produce higher liquidity and volatility."
  },
  {
    topic: "Broker Interface",
    keywords: ["broker", "mt4", "mt5", "tradingview", "execution", "buy sell", "buy/sell"],
    answer:
      "The Broker Interface is the visible execution layer where analysis becomes a trade. AFF students learn MT4, MT5, TradingView, buy/sell functions, order types, and execution controls before managing live risk."
  },
  {
    topic: "Risk Management",
    keywords: ["risk", "risk management", "drawdown", "position size", "stop loss", "capital"],
    answer:
      "Risk Management protects trading capital. Students define invalidation, use stop losses, control position size, limit drawdown, and avoid risking too much on one idea."
  },
  {
    topic: "Trading Psychology",
    keywords: ["psychology", "discipline", "fear", "greed", "revenge", "overtrade", "mindset"],
    answer:
      "Trading Psychology is the discipline of following a plan under pressure. AFF students work on patience, emotional control, avoiding revenge trades, and using journaling to improve decision quality."
  },
  {
    topic: "Certification",
    keywords: ["certification", "certificate", "exam", "passing score", "certification materials"],
    answer:
      "Certification requires completing required lessons, passing the certification exam, and receiving approval on assignments. Students should review Forex Anatomy, risk rules, economic data, and execution basics before the exam."
  }
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s/-]/g, " ").replace(/\s+/g, " ").trim();
}

function findKnowledge(question: string) {
  const normalized = normalize(question);
  return academyKnowledge.find((entry) => entry.keywords.some((keyword) => normalized.includes(keyword)));
}

function recommendationScore(question: string, text: string) {
  const words = new Set(normalize(question).split(" ").filter((word) => word.length > 2));
  return normalize(text)
    .split(" ")
    .filter((word) => words.has(word))
    .length;
}

export function getCoachRecommendations(question: string, topic?: string) {
  return courseCatalog
    .flatMap((course) =>
      course.lessons.map((lesson) => ({
        course,
        lesson,
        score: recommendationScore(`${question} ${topic ?? ""}`, `${course.title} ${course.summary} ${lesson.title} ${lesson.overview} ${lesson.summary} ${lesson.objectives.join(" ")}`)
      }))
    )
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      courseTitle: item.course.title,
      lessonTitle: item.lesson.title,
      href: getLessonPath(item.course.id, item.lesson.id),
      reason: `Review this lesson for ${topic ?? "the closest academy topic"}.`
    }));
}

export function answerForexCoachQuestion(question: string, progressContext?: string, extraKnowledge: string[] = []): CoachAnswer {
  const knowledge = findKnowledge(question);
  const topic = knowledge?.topic ?? "Academy Forex Coaching";
  const recommendations = getCoachRecommendations(question, topic);
  const extra = extraKnowledge.length ? `\n\nInstructor note: ${extraKnowledge.slice(0, 2).join(" ")}` : "";
  const progress = progressContext ? `\n\nProgress-aware guidance: ${progressContext}` : "";

  if (knowledge) {
    return {
      topic,
      answer: `${knowledge.answer}${progress}${extra}`,
      recommendations
    };
  }

  const fallbackLesson = recommendations[0];
  return {
    topic,
    answer: `I can help with Forex Anatomy, Market Structure, Institutional Orders, Order Flow, Economic Data, Liquidity, Trading Sessions, Broker Interface, Risk Management, Trading Psychology, and Certification materials. Ask about one of those topics, or review ${fallbackLesson?.lessonTitle ?? "the Forex Anatomy lessons"} to connect the question to the AFF curriculum.${progress}${extra}`,
    recommendations
  };
}
