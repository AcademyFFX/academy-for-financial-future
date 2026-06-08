"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, RotateCcw, Save, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { ProgressBar } from "@/components/progress";
import { createClient } from "@/lib/supabase";

const examConfig = {
  examId: "level-1-forex-anatomy",
  title: "Level 1 Forex Anatomy",
  courseName: "Forex Anatomy",
  passingScore: 80,
  timeLimitMinutes: 30,
  maxAttempts: 3,
  questionCount: 10
};

const questionBank = [
  {
    id: "structure-1",
    category: "Market Structure",
    question: "What does a higher high usually indicate inside an uptrend?",
    options: ["Buyers are pushing price beyond the prior swing high", "The market is closed", "Spreads are fixed", "The broker controls all candles"],
    answer: "Buyers are pushing price beyond the prior swing high"
  },
  {
    id: "structure-2",
    category: "Market Structure",
    question: "A lower low is most commonly used to identify:",
    options: ["Bearish continuation or weakness", "Guaranteed reversal", "No volatility", "A dividend payment"],
    answer: "Bearish continuation or weakness"
  },
  {
    id: "orders-1",
    category: "Institutional Orders",
    question: "Why do institutional orders matter in forex?",
    options: ["They can create large volume execution and directional pressure", "They remove all risk", "They make stops unnecessary", "They make every trade profitable"],
    answer: "They can create large volume execution and directional pressure"
  },
  {
    id: "orders-2",
    category: "Institutional Orders",
    question: "An order block is best described as:",
    options: ["A price area associated with prior institutional activity", "A broker password", "A fixed spread", "A weekend trading period"],
    answer: "A price area associated with prior institutional activity"
  },
  {
    id: "flow-1",
    category: "Order Flow",
    question: "Order flow studies the movement of:",
    options: ["Buying and selling pressure", "Company dividends", "Bond coupons", "Static account settings"],
    answer: "Buying and selling pressure"
  },
  {
    id: "flow-2",
    category: "Supply and Demand",
    question: "Demand zones are commonly associated with:",
    options: ["Buying interest", "No market participation", "Guaranteed losses", "Broker maintenance"],
    answer: "Buying interest"
  },
  {
    id: "data-1",
    category: "Economic Data",
    question: "Which data release measures employment change in the United States?",
    options: ["NFP", "RSI", "ATR", "MACD"],
    answer: "NFP"
  },
  {
    id: "data-2",
    category: "Economic Data",
    question: "Interest rate decisions can move forex markets because they affect:",
    options: ["Currency yield expectations", "Candle colors only", "Chart background themes", "PDF downloads"],
    answer: "Currency yield expectations"
  },
  {
    id: "liquidity-1",
    category: "Liquidity",
    question: "Liquidity pools are often found near:",
    options: ["Obvious highs, lows, and stop areas", "Random font sizes", "Website footers", "Course images"],
    answer: "Obvious highs, lows, and stop areas"
  },
  {
    id: "liquidity-2",
    category: "Liquidity",
    question: "A liquidity grab is commonly understood as:",
    options: ["Price reaching liquidity before moving away", "A student registration form", "A fixed exchange rate", "A certificate number"],
    answer: "Price reaching liquidity before moving away"
  },
  {
    id: "sessions-1",
    category: "Trading Sessions",
    question: "Which session overlap is known for high liquidity in major forex pairs?",
    options: ["London and New York", "Weekend close", "Bank holiday only", "No-market hours"],
    answer: "London and New York"
  },
  {
    id: "sessions-2",
    category: "Trading Sessions",
    question: "The Tokyo session is most closely associated with:",
    options: ["Asian market activity", "New York close only", "No currency trading", "US stock dividends"],
    answer: "Asian market activity"
  },
  {
    id: "broker-1",
    category: "Broker Interface",
    question: "MT4 and MT5 are examples of:",
    options: ["Trading platforms", "Central banks", "Economic releases", "Certificate portals"],
    answer: "Trading platforms"
  },
  {
    id: "broker-2",
    category: "Broker Interface",
    question: "Before order execution, a trader should confirm:",
    options: ["Pair, direction, size, stop loss, and take profit", "Only the chart color", "Only the app logo", "Nothing"],
    answer: "Pair, direction, size, stop loss, and take profit"
  },
  {
    id: "central-bank-1",
    category: "Central Banks",
    question: "Central banks influence currencies through:",
    options: ["Interest rates, inflation policy, and forward guidance", "Website navigation", "Assignment file names", "Certificate borders"],
    answer: "Interest rates, inflation policy, and forward guidance"
  },
  {
    id: "central-bank-2",
    category: "Central Banks",
    question: "Forward guidance refers to:",
    options: ["Communication about future policy direction", "A guaranteed trade signal", "A broker login field", "A PDF filename"],
    answer: "Communication about future policy direction"
  }
];

type ExamResult = {
  id: string;
  exam_title: string;
  score: number;
  result: "Pass" | "Fail";
  submitted_at: string;
  attempt_number: number;
  time_limit_minutes: number;
  duration_seconds: number;
  passed: boolean;
};

type ExamRow = Partial<ExamResult>;

export default function ExamsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ExamResult[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(examConfig.timeLimitMinutes * 60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Start the timed exam when you are ready.");

  const latestPass = results.find((result) => result.passed || result.result === "Pass");
  const attemptsUsed = results.length;
  const attemptsRemaining = Math.max(examConfig.maxAttempts - attemptsUsed, 0);
  const examLocked = Boolean(latestPass) || attemptsRemaining === 0;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const activeQuestions = useMemo(() => questionBank.slice(0, examConfig.questionCount), []);
  const answerPercent = Math.round((answeredCount / activeQuestions.length) * 100);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeResult(row: ExamRow): ExamResult {
    const score = Number(row.score ?? 0);
    const result = row.result === "Pass" || row.passed || score >= examConfig.passingScore ? "Pass" : "Fail";
    return {
      id: String(row.id ?? crypto.randomUUID()),
      exam_title: String(row.exam_title ?? examConfig.title),
      score,
      result,
      submitted_at: row.submitted_at ?? new Date().toISOString(),
      attempt_number: Number(row.attempt_number ?? 1),
      time_limit_minutes: Number(row.time_limit_minutes ?? examConfig.timeLimitMinutes),
      duration_seconds: Number(row.duration_seconds ?? 0),
      passed: result === "Pass"
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
          .eq("exam_title", examConfig.title)
          .order("submitted_at", { ascending: false });

        if (error) throw error;
        setResults(((data ?? []) as ExamRow[]).map(normalizeResult));
      } catch (error) {
        setMessage(getErrorMessage(error, "Unable to load exam history."));
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [router]);

  useEffect(() => {
    if (!startedAt || saving || examLocked) return;
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const nextRemaining = Math.max(examConfig.timeLimitMinutes * 60 - elapsed, 0);
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0) {
        window.clearInterval(timer);
        void submitExam();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  // Timer expiry intentionally submits the active attempt with the current answer state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, saving, examLocked]);

  function startExam() {
    if (examLocked) {
      setMessage(latestPass ? "Exam already passed. Certification requirement is complete." : "Retake limit reached. Contact your instructor.");
      return;
    }
    setAnswers({});
    setStartedAt(new Date());
    setRemainingSeconds(examConfig.timeLimitMinutes * 60);
    setMessage(`Attempt ${attemptsUsed + 1} started. Timer is running.`);
  }

  async function submitExam(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!studentId) {
      router.replace("/login");
      return;
    }

    if (!startedAt) {
      setMessage("Start the exam before submitting.");
      return;
    }

    if (examLocked) {
      setMessage("This exam is locked by pass status or retake policy.");
      return;
    }

    const correctCount = activeQuestions.reduce((total, question) => {
      return total + (answers[question.id] === question.answer ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / activeQuestions.length) * 100);
    const result = score >= examConfig.passingScore ? "Pass" : "Fail";
    const durationSeconds = Math.min(Math.floor((Date.now() - startedAt.getTime()) / 1000), examConfig.timeLimitMinutes * 60);
    const attemptNumber = attemptsUsed + 1;

    setSaving(true);
    setMessage("Saving exam attempt...");

    try {
      const supabase = createClient();
      const payload = {
        student_id: studentId,
        exam_title: examConfig.title,
        exam_id: examConfig.examId,
        question_bank: activeQuestions.map(({ id, category, question }) => ({ id, category, question })),
        answers,
        score,
        result,
        passed: result === "Pass",
        passing_score: examConfig.passingScore,
        attempt_number: attemptNumber,
        max_attempts: examConfig.maxAttempts,
        time_limit_minutes: examConfig.timeLimitMinutes,
        duration_seconds: durationSeconds,
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
      setStartedAt(null);
      setRemainingSeconds(examConfig.timeLimitMinutes * 60);
      setMessage(`Exam submitted. Score: ${score}%. Result: ${result}.`);
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save exam attempt."));
    } finally {
      setSaving(false);
    }
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <>
      <PageHeader
        eyebrow="Certification Exams"
        title="Academy exam engine."
        text="Timed certification attempts with automatic grading, retake controls, question banks, score tracking, and exam history."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <form onSubmit={submitExam} className="grid gap-4">
            <div className="terminal-panel p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.24em] text-gold-300">{examConfig.courseName}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{examConfig.title}</h2>
                  <p className="mt-3 text-sm text-ink/72">Passing score: {examConfig.passingScore}%. Retake policy: {examConfig.maxAttempts} attempts maximum.</p>
                </div>
                <div className="border border-gold-500/30 px-4 py-3 text-right">
                  <p className="inline-flex items-center gap-2 text-sm text-gold-300"><Clock size={16} /> {minutes}:{seconds}</p>
                  <p className="mt-1 text-xs text-ink/60">Time remaining</p>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-sm text-ink/72">
                  <span>{answeredCount} of {activeQuestions.length} answered</span>
                  <span className="text-gold-300">{answerPercent}%</span>
                </div>
                <ProgressBar value={answerPercent} />
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="button" onClick={startExam} disabled={Boolean(startedAt) || examLocked}>
                  <ShieldCheck size={18} /> {startedAt ? "Exam In Progress" : "Start Exam"}
                </button>
                <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-5 py-3 font-semibold text-gold-300 disabled:opacity-60" type="button" onClick={() => setAnswers({})} disabled={!startedAt || saving}>
                  <RotateCcw size={18} /> Clear Answers
                </button>
              </div>
            </div>

            {activeQuestions.map((question, index) => (
              <fieldset key={question.id} className="terminal-panel p-6 opacity-100 disabled:opacity-50" disabled={!startedAt || saving || examLocked}>
                <p className="mb-2 text-xs uppercase tracking-[.22em] text-gold-300">{question.category}</p>
                <legend className="text-lg font-semibold text-white">
                  {index + 1}. {question.question}
                </legend>
                <div className="mt-4 grid gap-3">
                  {question.options.map((option) => (
                    <label key={option} className="flex gap-3 border border-gold-500/20 bg-navy-950 px-4 py-3 text-sm text-ink/78">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="terminal-panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink/72">Attempt {attemptsUsed + (startedAt ? 1 : 0)} of {examConfig.maxAttempts}.</p>
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={!startedAt || saving || examLocked}>
                <Save size={18} /> {saving ? "Submitting..." : "Submit Attempt"}
              </button>
            </div>
            <p className="text-sm text-ink/70">{message}</p>
          </form>

          <aside className="grid h-fit gap-6">
            <div className="terminal-panel p-6">
              <h2 className="text-2xl font-semibold text-white">Exam Policy</h2>
              <div className="mt-5 grid gap-3 text-sm text-ink/72">
                <p><span className="text-gold-300">Question bank:</span> {questionBank.length} questions</p>
                <p><span className="text-gold-300">Timed exam:</span> {examConfig.timeLimitMinutes} minutes</p>
                <p><span className="text-gold-300">Pass threshold:</span> {examConfig.passingScore}%</p>
                <p><span className="text-gold-300">Attempts remaining:</span> {attemptsRemaining}</p>
                <p><span className="text-gold-300">Certification:</span> {latestPass ? "Exam requirement complete" : "Pass required before unlock"}</p>
              </div>
            </div>

            <div className="terminal-panel h-fit overflow-hidden">
              <div className="border-b border-gold-500/20 p-6">
                <h2 className="text-2xl font-semibold text-white">Exam History</h2>
                <p className="mt-2 text-sm text-ink/68">All attempts for the authenticated student.</p>
              </div>
              {loading ? (
                <p className="p-6 text-ink/72">Loading exam history...</p>
              ) : results.length === 0 ? (
                <p className="p-6 text-ink/72">No exam attempts yet.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/18">
                  {results.map((result) => (
                    <article key={result.id} className="bg-navy-950 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[.22em] text-gold-300">Attempt {result.attempt_number}</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{result.exam_title}</h3>
                          <p className="mt-1 text-xs text-ink/60">{new Date(result.submitted_at).toLocaleDateString()} · {Math.round(result.duration_seconds / 60)} min</p>
                        </div>
                        {result.result === "Pass" ? <CheckCircle2 className="text-gold-300" size={22} /> : <XCircle className="text-red-300" size={22} />}
                      </div>
                      <p className="mt-4 text-3xl font-semibold text-white">{result.score}%</p>
                      <p className="mt-1 text-sm text-ink/72">{result.result}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </SectionInner>
      </Section>
    </>
  );
}
