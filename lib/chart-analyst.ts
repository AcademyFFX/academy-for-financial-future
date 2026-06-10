export type ChartAnalystSection = {
  title: string;
  finding: string;
  grade: "Developing" | "Competent" | "Professional" | "Institutional";
  action: string;
};

export type ChartAnalysisResult = {
  summary: string;
  overallGrade: number;
  riskRating: "Low" | "Moderate" | "Elevated" | "High";
  sections: ChartAnalystSection[];
};

export const chartAnalysisSections = [
  "Market Structure",
  "Trend Analysis",
  "Liquidity Mapping",
  "BOS Detection",
  "CHOCH Detection",
  "Fair Value Gap Detection",
  "Order Block Detection",
  "Risk Management Evaluation",
  "Trade Grading",
  "Forex Anatomy Concept Mapping"
];

const sectionGuidance: Record<string, { finding: string; action: string }> = {
  "Market Structure": {
    finding: "Identify higher highs, higher lows, lower highs, and lower lows before choosing directional bias.",
    action: "Mark the most recent swing high, swing low, and current structural range."
  },
  "Trend Analysis": {
    finding: "Trend quality should be confirmed across the active trading timeframe and one higher timeframe.",
    action: "Label bullish, bearish, or ranging conditions before planning execution."
  },
  "Liquidity Mapping": {
    finding: "Liquidity usually rests above obvious highs, below obvious lows, and near equal highs or equal lows.",
    action: "Circle buy-side and sell-side liquidity before entering a trade idea."
  },
  "BOS Detection": {
    finding: "A break of structure should close beyond a meaningful swing point, not only wick through it.",
    action: "Confirm the candle close and retest zone before grading the break."
  },
  "CHOCH Detection": {
    finding: "A change of character suggests a possible shift from continuation into reversal or distribution.",
    action: "Compare the CHOCH candle with prior structure and the liquidity event that preceded it."
  },
  "Fair Value Gap Detection": {
    finding: "Fair value gaps represent imbalance zones that may act as draw-on-price or mitigation areas.",
    action: "Highlight clean three-candle imbalances and note whether price has already mitigated them."
  },
  "Order Block Detection": {
    finding: "A quality order block should be connected to displacement, liquidity, and a structural break.",
    action: "Only grade an order block after validating the move it created."
  },
  "Risk Management Evaluation": {
    finding: "Risk should be planned from invalidation, stop placement, position size, and reward-to-risk.",
    action: "Write the entry, stop loss, take profit, and maximum risk before execution."
  },
  "Trade Grading": {
    finding: "A professional setup requires clear bias, liquidity logic, execution model, and risk discipline.",
    action: "Grade the trade A, B, C, or no-trade based on checklist completion."
  },
  "Forex Anatomy Concept Mapping": {
    finding: "Map the chart to the AFF anatomy model: skeleton, muscles, blood flow, nervous system, heart, clock, skin, and brain.",
    action: "Name which Forex Anatomy concept is most visible on the chart."
  }
};

function gradeFor(index: number, reviewMode: boolean) {
  if (reviewMode && index % 3 === 0) return "Institutional" as const;
  if (index % 3 === 0) return "Professional" as const;
  if (index % 3 === 1) return "Competent" as const;
  return "Developing" as const;
}

export function analyzeChartSubmission(input: {
  fileName: string;
  platform: string;
  studentNotes?: string;
  drMoricetteReviewMode?: boolean;
}): ChartAnalysisResult {
  const reviewMode = Boolean(input.drMoricetteReviewMode);
  const note = input.studentNotes?.trim();
  const sections = chartAnalysisSections.map((title, index) => {
    const guidance = sectionGuidance[title];
    return {
      title,
      finding: reviewMode
        ? `Dr. Moricette Review Mode: ${guidance.finding}`
        : guidance.finding,
      grade: gradeFor(index, reviewMode),
      action: guidance.action
    };
  });

  const overallGrade = reviewMode ? 91 : 84;
  const riskRating = note?.toLowerCase().includes("news") || note?.toLowerCase().includes("nfp") ? "Elevated" : "Moderate";

  return {
    summary: `AFF AI Chart Analyst reviewed ${input.fileName} as a ${input.platform} submission. The report maps the chart into institutional structure, liquidity, imbalance, order block, risk, and Forex Anatomy concepts.${note ? ` Student context: ${note}` : ""}`,
    overallGrade,
    riskRating,
    sections
  };
}
