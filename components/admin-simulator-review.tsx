"use client";

import { BadgeCheck, Save, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type SimulatorAttempt = {
  id: string;
  student_id: string;
  scenario_title: string;
  category: string;
  pair: string;
  decision_label: string;
  direction: string;
  risk_percent: number;
  outcome_pips: number;
  profit_loss: number;
  points: number;
  badge_awarded: string | null;
  certification_credits: number;
  journal_notes: string | null;
  simulator_feedback: string | null;
  instructor_feedback: string | null;
  review_status: string;
  created_at: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
};

type ReviewForm = {
  reviewStatus: string;
  instructorFeedback: string;
};

function value(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

export function AdminSimulatorReview() {
  const [attempts, setAttempts] = useState<SimulatorAttempt[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewForm>>({});
  const [message, setMessage] = useState("Review simulator attempts, journals, badges, and certification credits.");

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const pendingCount = useMemo(() => attempts.filter((attempt) => attempt.review_status === "Submitted").length, [attempts]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadAttempts = useCallback(async () => {
    try {
      const supabase = createClient();
      const [attemptsResult, studentsResult] = await Promise.all([
        supabase.from("simulator_attempts").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("students").select("*")
      ]);

      if (attemptsResult.error) throw attemptsResult.error;
      if (studentsResult.error) throw studentsResult.error;

      const normalizedStudents = ((studentsResult.data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: value(row, ["id", "student_id"]),
        name: value(row, ["full_name", "name", "student_name"], "Student"),
        email: value(row, ["email", "student_email"], "Not recorded")
      }));
      const normalizedAttempts = (attemptsResult.data ?? []) as SimulatorAttempt[];

      setStudents(normalizedStudents);
      setAttempts(normalizedAttempts);
      setReviews(Object.fromEntries(normalizedAttempts.map((attempt) => [
        attempt.id,
        {
          reviewStatus: attempt.review_status,
          instructorFeedback: attempt.instructor_feedback ?? ""
        }
      ])));
      setMessage("Simulator review center ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the simulator migration to enable instructor review."));
    }
  }, []);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  async function saveReview(attemptId: string) {
    const review = reviews[attemptId];
    if (!review) return;

    setMessage("Saving simulator review...");

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("simulator_attempts")
        .update({
          review_status: review.reviewStatus,
          instructor_feedback: review.instructorFeedback.trim() || null,
          reviewed_by: "acafffx@gmail.com",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", attemptId)
        .select("*")
        .single();

      if (error) throw error;
      setAttempts((current) => current.map((attempt) => (attempt.id === attemptId ? data as SimulatorAttempt : attempt)));
      setMessage("Simulator review saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save simulator review."));
    }
  }

  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-gold-500/20 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.22em] text-gold-300">Institutional Trading Simulator</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Instructor Review Tools</h2>
            <p className="mt-2 text-sm text-ink/68">{message}</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 border border-gold-500/30 px-3 py-2 text-xs uppercase tracking-[.18em] text-gold-300">
            <ShieldCheck size={15} /> {pendingCount} Pending
          </span>
        </div>
      </div>

      {attempts.length === 0 ? (
        <p className="p-5 text-ink/68">No simulator attempts submitted yet.</p>
      ) : (
        <div className="grid gap-px bg-gold-500/14">
          {attempts.map((attempt) => (
            <article key={attempt.id} className="bg-navy-950 p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <p className="text-xs uppercase tracking-[.2em] text-gold-300">{attempt.category} - {attempt.review_status}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{attempt.scenario_title}</h3>
                  <p className="mt-2 text-sm text-ink/58">
                    {studentMap.get(attempt.student_id)?.name ?? "Student"} - {new Date(attempt.created_at).toLocaleString()}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-ink/72 sm:grid-cols-4">
                    <p>{attempt.pair}</p>
                    <p>{attempt.direction}</p>
                    <p>{attempt.outcome_pips} pips</p>
                    <p className={attempt.profit_loss >= 0 ? "text-emerald-200" : "text-red-200"}>{attempt.profit_loss >= 0 ? "+" : ""}{attempt.profit_loss.toLocaleString()}</p>
                  </div>
                  <p className="mt-3 text-sm text-gold-300">{attempt.points} points - {attempt.certification_credits} certification credit(s)</p>
                  {attempt.badge_awarded ? (
                    <p className="mt-3 inline-flex border border-gold-500/25 px-3 py-1 text-sm text-gold-300">
                      <BadgeCheck size={16} className="mr-2" /> {attempt.badge_awarded}
                    </p>
                  ) : null}
                  {attempt.journal_notes ? <p className="mt-4 leading-7 text-ink/74">{attempt.journal_notes}</p> : null}
                  {attempt.simulator_feedback ? <p className="mt-3 text-sm leading-6 text-ink/58">Simulator feedback: {attempt.simulator_feedback}</p> : null}
                </div>

                <div className="grid gap-3">
                  <select
                    className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                    value={reviews[attempt.id]?.reviewStatus ?? attempt.review_status}
                    onChange={(event) => setReviews((current) => ({
                      ...current,
                      [attempt.id]: { ...(current[attempt.id] ?? { instructorFeedback: "" }), reviewStatus: event.target.value }
                    }))}
                  >
                    <option>Submitted</option>
                    <option>Reviewed</option>
                    <option>Needs Revision</option>
                    <option>Excellent</option>
                  </select>
                  <textarea
                    className="min-h-28 border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                    placeholder="Instructor simulator feedback"
                    value={reviews[attempt.id]?.instructorFeedback ?? ""}
                    onChange={(event) => setReviews((current) => ({
                      ...current,
                      [attempt.id]: { ...(current[attempt.id] ?? { reviewStatus: attempt.review_status }), instructorFeedback: event.target.value }
                    }))}
                  />
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" type="button" onClick={() => saveReview(attempt.id)}>
                    <Save size={16} /> Save Review
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
