"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Bot, Brain, FileQuestion, GraduationCap, Lightbulb, Mic, Search, ShieldCheck, Sparkles, Upload, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";

const modules = [
  {
    title: "AI Forex Coach",
    href: "/ai-coach",
    icon: Bot,
    body: "Ask trading questions, explain market structure, liquidity, risk management, and economic data.",
    actions: ["Ask trading questions", "Explain market structure", "Explain liquidity", "Explain risk management", "Explain economic data"]
  },
  {
    title: "AI Chart Analyst",
    href: "/chart-analyst",
    icon: BarChart3,
    body: "Upload chart screenshots and receive trend, support, resistance, liquidity, entry, and risk/reward analysis.",
    actions: ["Trend analysis", "Support and resistance", "Liquidity zones", "Entry ideas", "Risk/reward calculations"]
  },
  {
    title: "AI Voice Coach",
    href: "/voice-coach",
    icon: Mic,
    body: "Practice trading explanations and presentations while receiving communication feedback.",
    actions: ["Practice presentations", "Practice trading explanations", "Receive communication feedback"]
  },
  {
    title: "AI Study Assistant",
    href: "/courses",
    icon: FileQuestion,
    body: "Summarize lessons, generate flashcards, create quizzes, and recommend study plans.",
    actions: ["Summarize lessons", "Generate flashcards", "Create quizzes", "Recommend study plans"]
  },
  {
    title: "AI Academic Advisor",
    href: "/degrees",
    icon: GraduationCap,
    body: "Suggest certifications, degree pathways, course recommendations, and a graduation roadmap.",
    actions: ["Suggest certifications", "Map degree pathways", "Recommend courses", "Create graduation roadmap"]
  }
];

const flashcards = [
  { front: "Market Structure", back: "The sequence of higher highs, higher lows, lower highs, and lower lows that reveals trend direction." },
  { front: "Liquidity Sweep", back: "A move beyond a key high or low that triggers orders before price often reverses or expands." },
  { front: "NFP", back: "Non-Farm Payroll measures U.S. employment growth and can create major USD volatility." }
];

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function numberValue(row: DbRow, keys: string[], fallback = 0) {
  const parsed = Number(value(row, keys));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

async function safeSelect(supabase: ReturnType<typeof createClient>, table: string, query: (tableName: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  try {
    const { data, error } = await query(table);
    if (error) return [];
    return (data ?? []) as DbRow[];
  } catch {
    return [];
  }
}

export default function AICenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AFF AI Institutional Intelligence Center...");
  const [userEmail, setUserEmail] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [recommendations, setRecommendations] = useState<DbRow[]>([]);
  const [studyPlans, setStudyPlans] = useState<DbRow[]>([]);
  const [coachMessages, setCoachMessages] = useState<DbRow[]>([]);
  const [chartReports, setChartReports] = useState<DbRow[]>([]);
  const [voiceMessages, setVoiceMessages] = useState<DbRow[]>([]);
  const [attempts, setAttempts] = useState<DbRow[]>([]);
  const [attendance, setAttendance] = useState<DbRow[]>([]);
  const [students, setStudents] = useState<DbRow[]>([]);
  const [adminAttempts, setAdminAttempts] = useState<DbRow[]>([]);
  const [adminAttendance, setAdminAttendance] = useState<DbRow[]>([]);
  const [adminAiEvents, setAdminAiEvents] = useState<DbRow[]>([]);

  const isAdmin = userEmail.toLowerCase() === adminEmail;

  const loadCenter = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? "");
      const admin = user.email?.toLowerCase() === adminEmail;
      const profile = await safeSelect(supabase, "students", (table) =>
        supabase.from(table).select("full_name, student_id, email").eq("email", user.email ?? "").order("created_at", { ascending: false }).limit(1)
      );
      setStudentName(value(profile[0] ?? {}, ["full_name"], user.user_metadata?.full_name ?? user.email ?? "Student"));

      const [
        recRows,
        studyRows,
        coachRows,
        chartRows,
        voiceRows,
        attemptRows,
        attendanceRows,
        studentRows,
        adminAttemptRows,
        adminAttendanceRows,
        adminEventRows
      ] = await Promise.all([
        safeSelect(supabase, "ai_center_recommendations", (table) => supabase.from(table).select("*").or(`student_id.eq.${user.id},student_id.is.null`).eq("status", "Active").order("created_at", { ascending: false })),
        safeSelect(supabase, "ai_center_study_plans", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("created_at", { ascending: false })),
        safeSelect(supabase, "ai_coach_chat_messages", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(80)),
        safeSelect(supabase, "chart_analyst_reports", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(40)),
        safeSelect(supabase, "voice_coach_conversations", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(80)),
        safeSelect(supabase, "certification_exam_attempts", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("submitted_at", { ascending: false })),
        safeSelect(supabase, "class_attendance", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("created_at", { ascending: false })),
        admin ? safeSelect(supabase, "students", (table) => supabase.from(table).select("*").limit(500)) : Promise.resolve([]),
        admin ? safeSelect(supabase, "certification_exam_attempts", (table) => supabase.from(table).select("*").limit(500)) : Promise.resolve([]),
        admin ? safeSelect(supabase, "class_attendance", (table) => supabase.from(table).select("*").limit(500)) : Promise.resolve([]),
        admin ? safeSelect(supabase, "ai_center_usage_events", (table) => supabase.from(table).select("*").order("created_at", { ascending: false }).limit(500)) : Promise.resolve([])
      ]);

      setRecommendations(recRows);
      setStudyPlans(studyRows);
      setCoachMessages(coachRows);
      setChartReports(chartRows);
      setVoiceMessages(voiceRows);
      setAttempts(attemptRows);
      setAttendance(attendanceRows);
      setStudents(studentRows);
      setAdminAttempts(adminAttemptRows);
      setAdminAttendance(adminAttendanceRows);
      setAdminAiEvents(adminEventRows);
      setMessage("AFF AI Institutional Intelligence Center synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load AI Center.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCenter();
  }, [loadCenter]);

  const studentInsights = useMemo(() => {
    const aiInteractions = coachMessages.length + chartReports.length + voiceMessages.length;
    const passed = attempts.filter((row) => value(row, ["result", "pass_fail", "status"]).toLowerCase() === "pass" || numberValue(row, ["score"]) >= 80).length;
    const present = attendance.filter((row) => value(row, ["attendance_status", "status"]).toLowerCase() === "present").length;
    const attendanceRate = percent(present, attendance.length);
    const chartAvg = chartReports.length ? Math.round(chartReports.reduce((total, row) => total + numberValue(row, ["overall_grade"]), 0) / chartReports.length) : 0;
    const weakness = chartAvg && chartAvg < 80 ? "Chart risk/reward discipline" : passed === 0 ? "Certification readiness" : aiInteractions < 3 ? "AI practice consistency" : "Advanced institutional refinement";
    return {
      aiInteractions,
      passed,
      attendanceRate,
      chartAvg,
      weakness,
      prediction: passed > 0 && attendanceRate >= 70 ? "On track for certification progress" : "Increase AI study reps and classroom attendance this week"
    };
  }, [attendance, attempts, chartReports, coachMessages.length, voiceMessages.length]);

  const adminAnalytics = useMemo(() => {
    const passed = adminAttempts.filter((row) => value(row, ["result", "pass_fail", "status"]).toLowerCase() === "pass" || numberValue(row, ["score"]) >= 80).length;
    const completionRate = percent(passed, adminAttempts.length);
    const present = adminAttendance.filter((row) => value(row, ["attendance_status", "status"]).toLowerCase() === "present").length;
    return {
      engagement: adminAiEvents.length + coachMessages.length + chartReports.length + voiceMessages.length,
      completionRate,
      certificationTrends: `${passed}/${adminAttempts.length} passing exam outcomes`,
      attendancePattern: `${percent(present, adminAttendance.length)}% attendance`
    };
  }, [adminAiEvents.length, adminAttempts, adminAttendance, chartReports.length, coachMessages.length, voiceMessages.length]);

  return (
    <>
      <PageHeader
        eyebrow="AFF AI Institutional Intelligence Center"
        title="One command center for AI coaching, chart analysis, voice practice, study support, and academic guidance."
        text="Students receive learning insights, weakness analysis, and progress predictions while administrators monitor engagement, completion, certification, and attendance intelligence."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <section className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-xs uppercase tracking-[.18em] text-gold-300">{studentName} · Institutional AI Workspace</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 text-sm font-semibold text-gold-300" type="button" onClick={loadCenter} disabled={loading}>
              <Sparkles size={18} /> Refresh Intelligence
            </button>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Brain size={22} />} label="AI Interactions" value={String(studentInsights.aiInteractions)} />
            <Metric icon={<ShieldCheck size={22} />} label="Exams Passed" value={String(studentInsights.passed)} />
            <Metric icon={<BarChart3 size={22} />} label="Chart Grade Avg" value={studentInsights.chartAvg ? `${studentInsights.chartAvg}%` : "Pending"} />
            <Metric icon={<Lightbulb size={22} />} label="Attendance Pattern" value={`${studentInsights.attendanceRate}%`} />
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {modules.map((module) => (
              <Link key={module.title} href={module.href} className="terminal-panel p-5 transition hover:border-gold-400/60">
                <module.icon className="text-gold-300" size={26} />
                <h2 className="mt-4 text-xl font-semibold text-white">{module.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink/68">{module.body}</p>
                <div className="mt-4 grid gap-2">
                  {module.actions.map((action) => (
                    <span key={action} className="border border-gold-500/16 bg-navy-950 px-3 py-2 text-xs text-ink/70">{action}</span>
                  ))}
                </div>
              </Link>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="terminal-panel p-5">
              <div className="flex items-center gap-3">
                <Wand2 className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">AI Study Assistant</h2>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <Insight title="Lesson Summary" body="Forex Anatomy frames the market as a living system: structure, institutional orders, order flow, economic data, liquidity, sessions, broker interface, and central banks." />
                <Insight title="Quiz Generator" body="Try: define market structure, identify liquidity zones, explain NFP, calculate risk percentage, and describe broker execution." />
                <Insight title="Study Plan" body={studyPlans[0] ? value(studyPlans[0], ["recommended_action"]) : "Complete one AI Coach question, one chart review, and one voice explanation before your next exam attempt."} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {flashcards.map((card) => (
                  <div key={card.front} className="border border-gold-500/20 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">Flashcard</p>
                    <h3 className="mt-2 font-semibold text-white">{card.front}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{card.back}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <Panel title="AI Recommendations" icon={<Sparkles size={22} />}>
                {recommendations.length === 0 ? <p className="text-sm text-ink/68">No AI recommendations found. Run the AI Center migration to seed recommendations.</p> : null}
                {recommendations.slice(0, 5).map((row) => (
                  <Link key={value(row, ["id", "title"])} href={value(row, ["target_href"], "/ai-center")} className="border border-gold-500/20 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(row, ["recommendation_type"])} · {value(row, ["priority"])}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(row, ["title"])}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{value(row, ["body"])}</p>
                  </Link>
                ))}
              </Panel>
              <Panel title="Learning Insights" icon={<Search size={22} />}>
                <Mini label="Weakness Analysis" value={studentInsights.weakness} />
                <Mini label="Progress Prediction" value={studentInsights.prediction} />
                <Mini label="Academic Advisor" value={studentInsights.passed > 0 ? "Continue degree pathway and certification stacking." : "Begin with Forex Foundations Certificate readiness."} />
              </Panel>
            </div>
          </section>

          <section className="terminal-panel p-5">
            <div className="flex items-center gap-3">
              <Upload className="text-gold-300" size={22} />
              <h2 className="text-xl font-semibold text-white">AI Chart Analyst Intake</h2>
            </div>
            <p className="mt-3 leading-7 text-ink/70">Upload TradingView, MT4, MT5, PNG, JPG, or PDF screenshots inside the dedicated AI Chart Analyst. The center tracks trend analysis, support and resistance, liquidity zones, entry ideas, and risk/reward calculations from your saved reports.</p>
            <Link href="/chart-analyst" className="mt-5 inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950">
              <BarChart3 size={18} /> Open Chart Analyst
            </Link>
          </section>

          {isAdmin ? (
            <section className="terminal-panel p-5">
              <h2 className="text-2xl font-semibold text-white">Admin AI Analytics</h2>
              <p className="mt-2 text-sm text-ink/68">Student engagement, completion rates, certification trends, and attendance patterns.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric icon={<Brain size={20} />} label="Student Engagement" value={String(adminAnalytics.engagement)} />
                <Metric icon={<ShieldCheck size={20} />} label="Completion Rate" value={`${adminAnalytics.completionRate}%`} />
                <Metric icon={<GraduationCap size={20} />} label="Certification Trends" value={adminAnalytics.certificationTrends} />
                <Metric icon={<Lightbulb size={20} />} label="Attendance Patterns" value={adminAnalytics.attendancePattern} />
              </div>
              <p className="mt-4 text-xs uppercase tracking-[.18em] text-gold-300">{students.length} student records available to admin analytics</p>
            </section>
          ) : null}
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="terminal-panel p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-gold-300">{icon}</span>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Insight({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-gold-500/20 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{title}</p>
      <p className="mt-3 text-sm leading-6 text-ink/72">{body}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value || "Not recorded"}</p>
    </div>
  );
}
