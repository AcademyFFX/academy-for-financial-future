"use client";

import { useRouter } from "next/navigation";
import { Award, BadgeCheck, BarChart3, BookOpenCheck, Coins, NotebookPen, Play, ShieldCheck, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";
import {
  calculateSimulatorResult,
  initialSimulatorBalance,
  simulatorScenarios,
  type SimulatorChoice,
  type SimulatorScenario
} from "@/lib/trading-simulator";

type AttemptRow = {
  id: string;
  scenario_id: string;
  scenario_title: string;
  category: string;
  pair: string;
  direction: string;
  risk_percent: number;
  outcome_pips: number;
  profit_loss: number;
  points: number;
  badge_awarded: string | null;
  certification_credits: number;
  journal_notes: string | null;
  instructor_feedback: string | null;
  review_status: string;
  created_at: string;
};

type SimulatorAccount = {
  demo_balance: number;
  total_points: number;
  total_badges: number;
  certification_credits: number;
};

const fallbackAccount: SimulatorAccount = {
  demo_balance: initialSimulatorBalance,
  total_points: 0,
  total_badges: 0,
  certification_credits: 0
};

export default function TradingSimulatorPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [account, setAccount] = useState<SimulatorAccount>(fallbackAccount);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [activeScenario, setActiveScenario] = useState<SimulatorScenario>(simulatorScenarios[0]);
  const [selectedChoiceId, setSelectedChoiceId] = useState("");
  const [journalNotes, setJournalNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Loading institutional trading simulator...");

  const selectedChoice = activeScenario.choices.find((choice) => choice.id === selectedChoiceId);

  const analytics = useMemo(() => {
    const completed = attempts.length;
    const wins = attempts.filter((attempt) => attempt.profit_loss > 0).length;
    const losses = attempts.filter((attempt) => attempt.profit_loss < 0).length;
    const noTrades = attempts.filter((attempt) => attempt.direction === "No Trade").length;
    const averagePoints = completed ? Math.round(attempts.reduce((total, attempt) => total + attempt.points, 0) / completed) : 0;
    const winRate = completed ? Math.round((wins / completed) * 100) : 0;

    return { completed, wins, losses, noTrades, averagePoints, winRate };
  }, [attempts]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadSimulator = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setStudentId(user.id);

      const [accountResult, attemptsResult] = await Promise.all([
        supabase.from("simulator_accounts").select("*").eq("student_id", user.id).maybeSingle(),
        supabase.from("simulator_attempts").select("*").eq("student_id", user.id).order("created_at", { ascending: false })
      ]);

      if (accountResult.error) throw accountResult.error;
      if (attemptsResult.error) throw attemptsResult.error;

      if (accountResult.data) {
        setAccount({
          demo_balance: Number(accountResult.data.demo_balance ?? initialSimulatorBalance),
          total_points: Number(accountResult.data.total_points ?? 0),
          total_badges: Number(accountResult.data.total_badges ?? 0),
          certification_credits: Number(accountResult.data.certification_credits ?? 0)
        });
      }
      setAttempts((attemptsResult.data ?? []) as AttemptRow[]);
      setMessage("Simulator ready. Choose a scenario and submit your trade decision.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the simulator migration to enable saved accounts, attempts, and instructor review."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSimulator();
  }, [loadSimulator]);

  function selectScenario(scenario: SimulatorScenario) {
    setActiveScenario(scenario);
    setSelectedChoiceId("");
    setJournalNotes("");
  }

  async function submitScenario() {
    if (!studentId || !selectedChoice) {
      setMessage("Select a simulator decision before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("Submitting simulator trade decision...");

    try {
      const result = calculateSimulatorResult(account.demo_balance, selectedChoice);
      const badgeCount = selectedChoice.badge ? 1 : 0;
      const nextAccount = {
        demo_balance: result.nextBalance,
        total_points: account.total_points + selectedChoice.points,
        total_badges: account.total_badges + badgeCount,
        certification_credits: account.certification_credits + result.certificationCredits
      };
      const supabase = createClient();

      const attemptPayload = {
        student_id: studentId,
        scenario_id: activeScenario.id,
        scenario_title: activeScenario.title,
        category: activeScenario.category,
        pair: activeScenario.pair,
        decision_label: selectedChoice.label,
        direction: selectedChoice.direction,
        risk_percent: selectedChoice.riskPercent,
        outcome_pips: selectedChoice.outcomePips,
        profit_loss: result.profitLoss,
        points: selectedChoice.points,
        badge_awarded: selectedChoice.badge ?? null,
        certification_credits: result.certificationCredits,
        journal_notes: journalNotes.trim() || null,
        simulator_feedback: selectedChoice.feedback,
        review_status: "Submitted"
      };

      const [accountResult, attemptResult] = await Promise.all([
        supabase.from("simulator_accounts").upsert({
          student_id: studentId,
          ...nextAccount,
          updated_at: new Date().toISOString()
        }, { onConflict: "student_id" }),
        supabase.from("simulator_attempts").insert(attemptPayload).select("*").single()
      ]);

      if (accountResult.error) throw accountResult.error;
      if (attemptResult.error) throw attemptResult.error;

      setAccount(nextAccount);
      setAttempts((current) => [attemptResult.data as AttemptRow, ...current]);
      setSelectedChoiceId("");
      setJournalNotes("");
      setMessage(selectedChoice.badge ? `Scenario complete. Badge earned: ${selectedChoice.badge}.` : "Scenario complete. Attempt submitted for instructor review.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit simulator attempt."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Institutional Trading Simulator"
        title="Practice forex decisions without risking real money."
        text="Train market structure, liquidity sweeps, institutional order flow, news risk, capital protection, trade journaling, analytics, badges, and certification credits."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <p className="text-sm text-ink/72">{message}</p>

          <section className="grid gap-4 md:grid-cols-4">
            <Metric icon={<Coins size={20} />} label="Demo Balance" value={`$${Math.round(account.demo_balance).toLocaleString()}`} />
            <Metric icon={<Trophy size={20} />} label="Points" value={String(account.total_points)} />
            <Metric icon={<BadgeCheck size={20} />} label="Badges" value={String(account.total_badges)} />
            <Metric icon={<Award size={20} />} label="Certification Credits" value={String(account.certification_credits)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="terminal-panel h-fit overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <h2 className="text-xl font-semibold text-white">Simulator Scenarios</h2>
              </div>
              <div className="grid gap-px bg-gold-500/14">
                {simulatorScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    className={`bg-navy-950 p-4 text-left transition hover:bg-navy-900 ${activeScenario.id === scenario.id ? "outline outline-1 outline-gold-500" : ""}`}
                    type="button"
                    onClick={() => selectScenario(scenario)}
                  >
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{scenario.category}</p>
                    <h3 className="mt-2 font-semibold text-white">{scenario.title}</h3>
                    <p className="mt-1 text-sm text-ink/58">{scenario.pair}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="terminal-panel p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">{activeScenario.category}</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{activeScenario.title}</h2>
                  <p className="mt-2 text-sm text-gold-300">{activeScenario.pair}</p>
                </div>
                <ShieldCheck className="text-gold-300" size={28} />
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <InfoPanel title="Setup" text={activeScenario.setup} />
                <InfoPanel title="Objective" text={activeScenario.objective} />
                <InfoPanel title="Institutional Clue" text={activeScenario.institutionalClue} />
              </div>

              <div className="mt-6 grid gap-3">
                <h3 className="text-xl font-semibold text-white">Choose Your Decision</h3>
                {activeScenario.choices.map((choice) => (
                  <label key={choice.id} className={`block border p-4 ${selectedChoiceId === choice.id ? "border-gold-500 bg-navy-800" : "border-gold-500/18 bg-navy-950"}`}>
                    <div className="flex gap-3">
                      <input type="radio" name="choice" value={choice.id} checked={selectedChoiceId === choice.id} onChange={() => setSelectedChoiceId(choice.id)} />
                      <div>
                        <p className="font-semibold text-white">{choice.label}</p>
                        <p className="mt-1 text-sm text-ink/62">{choice.direction} - Risk {choice.riskPercent}% - Potential outcome {choice.outcomePips} pips</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {selectedChoice ? (
                <div className="mt-6 border border-gold-500/20 bg-navy-950 p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">Projected Simulator Result</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <p className="text-ink/72">P/L: <span className={selectedChoice.outcomePips >= 0 ? "text-emerald-200" : "text-red-200"}>{calculateSimulatorResult(account.demo_balance, selectedChoice).profitLoss.toLocaleString()}</span></p>
                    <p className="text-ink/72">Points: <span className="text-gold-300">{selectedChoice.points}</span></p>
                    <p className="text-ink/72">Credits: <span className="text-gold-300">{calculateSimulatorResult(account.demo_balance, selectedChoice).certificationCredits}</span></p>
                    <p className="text-ink/72">Badge: <span className="text-gold-300">{selectedChoice.badge ?? "None"}</span></p>
                  </div>
                </div>
              ) : null}

              <label className="mt-6 grid gap-2 text-sm text-ink/74">
                Trade journal notes
                <textarea
                  className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                  value={journalNotes}
                  onChange={(event) => setJournalNotes(event.target.value)}
                  placeholder="Explain your structure read, liquidity logic, order flow clue, and risk decision."
                />
              </label>

              <button className="mt-5 inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="button" onClick={submitScenario} disabled={submitting}>
                <Play size={18} /> Submit Simulation
              </button>
            </section>
          </section>

          <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <section className="terminal-panel p-5">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Performance Analytics</h2>
              </div>
              <div className="mt-5 grid gap-3">
                <StatLine label="Completed" value={String(analytics.completed)} />
                <StatLine label="Win Rate" value={`${analytics.winRate}%`} />
                <StatLine label="Wins / Losses" value={`${analytics.wins} / ${analytics.losses}`} />
                <StatLine label="No Trade Decisions" value={String(analytics.noTrades)} />
                <StatLine label="Average Points" value={String(analytics.averagePoints)} />
              </div>
            </section>

            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <NotebookPen className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Simulator Journal and Review History</h2>
                </div>
              </div>
              {loading ? (
                <p className="p-5 text-ink/68">Loading simulator history...</p>
              ) : attempts.length === 0 ? (
                <p className="p-5 text-ink/68">No simulator attempts yet.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/14">
                  {attempts.map((attempt) => (
                    <article key={attempt.id} className="bg-navy-950 p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[.2em] text-gold-300">{attempt.category} - {attempt.review_status}</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{attempt.scenario_title}</h3>
                          <p className="mt-2 text-sm text-ink/58">{new Date(attempt.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-sm text-ink/72 sm:text-right">
                          <p>{attempt.direction} - {attempt.outcome_pips} pips</p>
                          <p className={attempt.profit_loss >= 0 ? "text-emerald-200" : "text-red-200"}>{attempt.profit_loss >= 0 ? "+" : ""}{attempt.profit_loss.toLocaleString()}</p>
                          <p className="text-gold-300">{attempt.points} pts</p>
                        </div>
                      </div>
                      {attempt.journal_notes ? <p className="mt-4 leading-7 text-ink/74">{attempt.journal_notes}</p> : null}
                      {attempt.badge_awarded ? <p className="mt-3 inline-flex border border-gold-500/25 px-3 py-1 text-sm text-gold-300"><BadgeCheck size={16} className="mr-2" /> {attempt.badge_awarded}</p> : null}
                      {attempt.instructor_feedback ? (
                        <div className="mt-4 border-t border-gold-500/15 pt-4">
                          <p className="text-sm font-semibold text-white">Instructor Feedback</p>
                          <p className="mt-2 leading-7 text-ink/72">{attempt.instructor_feedback}</p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="terminal-panel p-5">
            <div className="flex items-center gap-3">
              <BookOpenCheck className="text-gold-300" size={22} />
              <h2 className="text-xl font-semibold text-white">Certification Credit Rules</h2>
            </div>
            <p className="mt-3 leading-7 text-ink/72">
              Students earn one simulator certification credit for each successful scenario scoring 100 points or more. Credits support instructor review and certification readiness but do not replace required lessons, exams, or approved assignments.
            </p>
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{title}</p>
      <p className="mt-3 leading-7 text-ink/72">{text}</p>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-gold-500/16 bg-navy-950 p-3">
      <span className="text-ink/64">{label}</span>
      <span className="font-semibold text-gold-300">{value}</span>
    </div>
  );
}
