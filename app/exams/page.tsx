"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

const examTitle = "Level 1 Forex Anatomy";
const passingScore = 80;

const questions = [
  {
    question: "What does a forex currency pair represent?",
    options: ["The value of one currency compared with another", "A stock index", "A central bank balance sheet", "A fixed bond yield"],
    answer: "The value of one currency compared with another"
  },
  {
    question: "In EUR/USD, which currency is the base currency?",
    options: ["EUR", "USD", "Both", "Neither"],
    answer: "EUR"
  },
  {
    question: "What is a stop loss designed to do?",
    options: ["Limit downside risk", "Guarantee profit", "Increase leverage", "Remove spreads"],
    answer: "Limit downside risk"
  },
  {
    question: "What does risk percentage usually measure?",
    options: ["Capital risked on a trade", "Broker commission only", "Daily interest paid", "The spread in pips"],
    answer: "Capital risked on a trade"
  },
  {
    question: "A buy trade profits when price generally:",
    options: ["Rises", "Falls", "Stays frozen", "Ignores liquidity"],
    answer: "Rises"
  },
  {
    question: "A sell trade profits when price generally:",
    options: ["Falls", "Rises", "Has no spread", "Moves sideways forever"],
    answer: "Falls"
  },
  {
    question: "Which session overlap is known for high liquidity in major forex pairs?",
    options: ["London and New York", "Weekend close", "Bank holiday only", "No-market hours"],
    answer: "London and New York"
  },
  {
    question: "What is a pip commonly used to measure?",
    options: ["Price movement", "Company ownership", "Dividend yield", "Bond maturity"],
    answer: "Price movement"
  },
  {
    question: "Why should a trader journal trades?",
    options: ["To review decisions and improve discipline", "To avoid having a plan", "To hide losing trades", "To replace risk management"],
    answer: "To review decisions and improve discipline"
  },
  {
    question: "What should come before entering a professional trade?",
    options: ["A defined trade plan", "Random impulse", "Maximum leverage", "Ignoring invalidation"],
    answer: "A defined trade plan"
  }
];

type ExamResult = {
  id: string;
  exam_title: string;
  score: number;
  result: "Pass" | "Fail";
  submitted_at: string;
};

type ExamRow = Partial<ExamResult>;

export default function ExamsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Complete all 10 questions to submit your Level 1 exam.");

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeResult(row: ExamRow): ExamResult {
    return {
      id: String(row.id ?? crypto.randomUUID()),
      exam_title: String(row.exam_title ?? examTitle),
      score: Number(row.score ?? 0),
      result: row.result === "Pass" ? "Pass" : "Fail",
      submitted_at: row.submitted_at ?? new Date().toISOString()
    };
  }

  useEffect(() => {
    async function loadResults() {
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

        const { data, error } = await supabase
          .from("exams")
          .select("*")
          .eq("student_id", user.id)
          .order("submitted_at", { ascending: false });

        if (error) throw error;
        setResults(((data ?? []) as ExamRow[]).map(normalizeResult));
      } catch (error) {
        setMessage(getErrorMessage(error, "Unable to load exam results."));
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [router]);

  async function submitExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentId) {
      router.replace("/login");
      return;
    }

    if (answeredCount !== questions.length) {
      setMessage("Please answer all 10 questions before submitting.");
      return;
    }

    const correctCount = questions.reduce((total, question, index) => {
      return total + (answers[index] === question.answer ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / questions.length) * 100);
    const result = score >= passingScore ? "Pass" : "Fail";

    setSaving(true);
    setMessage("Saving exam result...");

    try {
      const supabase = createClient();
      const payload = {
        student_id: studentId,
        exam_title: examTitle,
        answers,
        score,
        result,
        submitted_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("exams")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setResults((current) => [normalizeResult(data as ExamRow), ...current]);
      setAnswers({});
      setMessage(`Exam submitted. Score: ${score}%. Result: ${result}.`);
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save exam result."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Certification Exams"
        title="Level 1 Forex Anatomy"
        text="Complete the foundational certification exam. Passing score is 80%."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <form onSubmit={submitExam} className="grid gap-4">
            {questions.map((question, index) => (
              <fieldset key={question.question} className="terminal-panel p-6">
                <legend className="text-lg font-semibold text-white">
                  {index + 1}. {question.question}
                </legend>
                <div className="mt-4 grid gap-3">
                  {question.options.map((option) => (
                    <label key={option} className="flex gap-3 border border-gold-500/20 bg-navy-950 px-4 py-3 text-sm text-ink/78">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option}
                        checked={answers[index] === option}
                        onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}
                        required
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="terminal-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink/72">
                Answered {answeredCount} of {questions.length} questions.
              </p>
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={saving}>
                <Save size={18} /> {saving ? "Submitting..." : "Submit Exam"}
              </button>
            </div>
            <p className="text-sm text-ink/70">{message}</p>
          </form>

          <aside className="terminal-panel h-fit overflow-hidden">
            <div className="border-b border-gold-500/20 p-6">
              <h2 className="text-2xl font-semibold text-white">Submitted Results</h2>
              <p className="mt-2 text-sm text-ink/68">Only your authenticated exam results are shown.</p>
            </div>
            {loading ? (
              <p className="p-6 text-ink/72">Loading exam results...</p>
            ) : results.length === 0 ? (
              <p className="p-6 text-ink/72">No exam submissions yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/18">
                {results.map((result) => (
                  <article key={result.id} className="bg-navy-950 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[.22em] text-gold-300">
                          {new Date(result.submitted_at).toLocaleDateString()}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{result.exam_title}</h3>
                      </div>
                      {result.result === "Pass" ? <CheckCircle2 className="text-gold-300" size={22} /> : <XCircle className="text-red-300" size={22} />}
                    </div>
                    <p className="mt-4 text-3xl font-semibold text-white">{result.score}%</p>
                    <p className="mt-1 text-sm text-ink/72">{result.result}</p>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}
