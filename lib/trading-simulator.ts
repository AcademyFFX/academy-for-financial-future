export type SimulatorChoice = {
  id: string;
  label: string;
  direction: "Buy" | "Sell" | "No Trade";
  riskPercent: number;
  outcomePips: number;
  points: number;
  badge?: string;
  feedback: string;
};

export type SimulatorScenario = {
  id: string;
  category: string;
  title: string;
  pair: string;
  setup: string;
  objective: string;
  institutionalClue: string;
  choices: SimulatorChoice[];
};

export const initialSimulatorBalance = 100000;

export const simulatorScenarios: SimulatorScenario[] = [
  {
    id: "market-structure-trend",
    category: "Market Structure Exercise",
    title: "The Skeleton: Trend Continuation",
    pair: "EUR/USD",
    setup: "Price has printed a higher high, pulled back into a higher low, and is holding above the previous swing low during London session.",
    objective: "Identify whether the structure supports trend continuation or a defensive no-trade decision.",
    institutionalClue: "The pullback respects prior demand and rejects below the last impulse midpoint.",
    choices: [
      {
        id: "buy-hl",
        label: "Buy after higher-low confirmation",
        direction: "Buy",
        riskPercent: 1,
        outcomePips: 42,
        points: 120,
        badge: "Structure Analyst",
        feedback: "Correct. You aligned with higher-high and higher-low structure after confirmation."
      },
      {
        id: "sell-trend",
        label: "Sell because price is high",
        direction: "Sell",
        riskPercent: 1.5,
        outcomePips: -28,
        points: 20,
        feedback: "Selling only because price is high ignores bullish structure and confirmation."
      },
      {
        id: "no-trade",
        label: "No trade until New York session",
        direction: "No Trade",
        riskPercent: 0,
        outcomePips: 0,
        points: 60,
        feedback: "Acceptable defensive choice, but the London structure gave a valid continuation plan."
      }
    ]
  },
  {
    id: "liquidity-sweep-reversal",
    category: "Liquidity Sweep Simulation",
    title: "The Heart: Stop Hunt Reversal",
    pair: "GBP/USD",
    setup: "Price sweeps equal lows, spikes below the Asian range, then quickly closes back above the swept low with strong rejection.",
    objective: "Practice identifying a liquidity sweep before planning a reversal entry.",
    institutionalClue: "Stops below equal lows were triggered before price reclaimed the range.",
    choices: [
      {
        id: "buy-reclaim",
        label: "Buy after reclaim and risk below sweep low",
        direction: "Buy",
        riskPercent: 0.75,
        outcomePips: 55,
        points: 150,
        badge: "Liquidity Specialist",
        feedback: "Correct. You waited for the sweep and reclaim before planning risk."
      },
      {
        id: "sell-breakout",
        label: "Sell the low break immediately",
        direction: "Sell",
        riskPercent: 1,
        outcomePips: -35,
        points: 10,
        feedback: "This chases liquidity after stops are triggered and exposes you to reversal risk."
      },
      {
        id: "no-trade-volatility",
        label: "No trade because the move is too volatile",
        direction: "No Trade",
        riskPercent: 0,
        outcomePips: 0,
        points: 70,
        feedback: "Reasonable if your plan requires calmer conditions, but the reclaim gave a structured setup."
      }
    ]
  },
  {
    id: "order-flow-news-risk",
    category: "Institutional Order Flow Scenario",
    title: "The Nervous System: NFP Order Flow",
    pair: "USD/JPY",
    setup: "NFP releases stronger than expected. The first candle spikes up, spreads widen, and price pulls back into the release range.",
    objective: "Practice risk discipline around economic data and institutional order flow.",
    institutionalClue: "The first reaction candle is fast and expensive; confirmation matters more than impulse."
  ,
    choices: [
      {
        id: "no-trade-news",
        label: "No trade during the first reaction candle",
        direction: "No Trade",
        riskPercent: 0,
        outcomePips: 0,
        points: 130,
        badge: "News Risk Defender",
        feedback: "Correct. You avoided spread expansion and waited for post-news structure."
      },
      {
        id: "buy-spike",
        label: "Buy immediately on the spike",
        direction: "Buy",
        riskPercent: 2,
        outcomePips: -48,
        points: 0,
        feedback: "This violates news risk discipline and exposes the account to slippage."
      },
      {
        id: "sell-fade",
        label: "Sell immediately against the spike",
        direction: "Sell",
        riskPercent: 1,
        outcomePips: -22,
        points: 25,
        feedback: "Fading the first move without confirmation is speculative around major data."
      }
    ]
  },
  {
    id: "risk-management-challenge",
    category: "Risk Management Challenge",
    title: "Capital Protection: Drawdown Protocol",
    pair: "XAU/USD",
    setup: "You have lost two trades in a row. A new setup appears, but it requires wide stops during volatile New York conditions.",
    objective: "Protect demo capital and choose the correct risk response.",
    institutionalClue: "The setup may be valid, but capital protection overrides emotional recovery trading.",
    choices: [
      {
        id: "reduce-risk",
        label: "Reduce risk to 0.25% and only trade after confirmation",
        direction: "Buy",
        riskPercent: 0.25,
        outcomePips: 18,
        points: 140,
        badge: "Capital Protector",
        feedback: "Correct. Reduced risk after drawdown protects the account while allowing disciplined participation."
      },
      {
        id: "double-risk",
        label: "Double risk to recover the losses",
        direction: "Buy",
        riskPercent: 3,
        outcomePips: -60,
        points: 0,
        feedback: "Doubling risk after losses is revenge-trading behavior and damages long-term performance."
      },
      {
        id: "stop-session",
        label: "Stop trading for the session",
        direction: "No Trade",
        riskPercent: 0,
        outcomePips: 0,
        points: 100,
        feedback: "Strong defensive decision. Stopping after drawdown is often the best professional response."
      }
    ]
  }
];

export function calculateSimulatorResult(balance: number, choice: SimulatorChoice) {
  const riskAmount = balance * (choice.riskPercent / 100);
  const pipValue = choice.riskPercent > 0 ? riskAmount / 30 : 0;
  const profitLoss = Math.round(choice.outcomePips * pipValue);
  const nextBalance = Math.max(0, balance + profitLoss);
  const certificationCredits = choice.points >= 100 ? 1 : 0;

  return {
    riskAmount,
    profitLoss,
    nextBalance,
    certificationCredits
  };
}
