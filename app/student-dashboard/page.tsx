"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BarChart3,
  Bot,
  BookOpenCheck,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartCandlestick,
  ClipboardCheck,
  CreditCard,
  Flame,
  Gamepad2,
  Globe2,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Landmark,
  Lightbulb,
  Mail,
  MessageSquare,
  Mic,
  Network,
  NotebookPen,
  Radio,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  TabletSmartphone,
  Target,
  Trophy,
  Tv,
  User,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { DashboardCourseSummary } from "@/components/dashboard-course-summary";
import { ZoomClassesPanel } from "@/components/zoom-classes-panel";

type DbRow = Record<string, unknown>;
type DatasetKey =
  | "missions"
  | "streaks"
  | "badges"
  | "journal"
  | "recommendations"
  | "mentors"
  | "goals"
  | "messages"
  | "certificates"
  | "exams"
  | "degreeProgress"
  | "civicService"
  | "researchSubmissions"
  | "tradeIdeas"
  | "chartReports"
  | "voiceUsage"
  | "eventRegistrations"
  | "events"
  | "careerProfiles"
  | "careerApplications"
  | "careerOpportunities";

const dashboardLinks = [
  { href: "/aff-os", label: "AFF Operating System", icon: Network },
  { href: "/mobile-super-app", label: "AFF Mobile Super App", icon: TabletSmartphone },
  { href: "/alumni-network", label: "AFF Global Alumni Network", icon: Trophy },
  { href: "/publishing-house", label: "AFF Publishing & Media House", icon: BookOpenText },
  { href: "/university", label: "AFF Global University", icon: GraduationCap },
  { href: "/billing", label: "Membership Billing", icon: CreditCard },
  { href: "/marketplace", label: "AFF Marketplace", icon: ShoppingBag },
  { href: "/career-center", label: "Career Center", icon: BriefcaseBusiness },
  { href: "/research-institute", label: "Research Institute", icon: BookOpenText },
  { href: "/events", label: "Events Division", icon: CalendarDays },
  { href: "/global-network", label: "Global Network", icon: Globe2 },
  { href: "/campus-expansion", label: "Campus Expansion", icon: Building2 },
  { href: "/endowment-fund", label: "Endowment Fund", icon: Landmark },
  { href: "/foundation", label: "Foundation", icon: HandHeart },
  { href: "/civic-leadership", label: "Civic Leadership", icon: Scale },
  { href: "/digital-civilization", label: "Digital Civilization", icon: Sprout },
  { href: "/human-flourishing", label: "Human Flourishing", icon: HeartPulse },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/ai-coach", label: "AI Forex Coach", icon: Bot },
  { href: "/voice-coach", label: "AI Voice Coach", icon: Mic },
  { href: "/chart-analyst", label: "AI Chart Analyst", icon: BarChart3 },
  { href: "/trading-simulator", label: "Trading Simulator", icon: Gamepad2 },
  { href: "/trading-floor", label: "AFF Virtual Trading Floor", icon: ChartCandlestick },
  { href: "/social-network", label: "Social Learning", icon: Users },
  { href: "/tv-studio", label: "AFF TV Studio", icon: Tv },
  { href: "/live-trading-room", label: "Live Trading Room", icon: Radio },
  { href: "/journal", label: "Trading Journal", icon: NotebookPen },
  { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
  { href: "/exams", label: "Certification Exams", icon: ShieldCheck },
  { href: "/certificates", label: "Certificates", icon: Award }
];

const emptyDatasets: Record<DatasetKey, DbRow[]> = {
  missions: [],
  streaks: [],
  badges: [],
  journal: [],
  recommendations: [],
  mentors: [],
  goals: [],
  messages: [],
  certificates: [],
  exams: [],
  degreeProgress: [],
  civicService: [],
  researchSubmissions: [],
  tradeIdeas: [],
  chartReports: [],
  voiceUsage: [],
  eventRegistrations: [],
  events: [],
  careerProfiles: [],
  careerApplications: [],
  careerOpportunities: []
};

const starterMissions = [
  {
    mission_title: "Complete one Forex Anatomy learning block",
    mission_category: "Learning Path",
    mission_status: "Assigned",
    points: 25
  },
  {
    mission_title: "Record one insight in your personal journal",
    mission_category: "Reflection",
    mission_status: "Assigned",
    points: 15
  },
  {
    mission_title: "Review one trading setup with AI Chart Analyst",
    mission_category: "Trading Performance",
    mission_status: "Assigned",
    points: 20
  }
];

const starterRecommendations = [
  {
    recommendation_title: "Resume Forex Anatomy before your next live class",
    recommendation_type: "Learning Path",
    recommendation_body: "Focus on market structure, liquidity, and central bank decision-making before moving into exam preparation.",
    target_href: "/courses/forex-anatomy",
    priority: "High",
    recommendation_status: "Active"
  },
  {
    recommendation_title: "Ask the AI Coach to explain today's strongest concept",
    recommendation_type: "AI Coach",
    recommendation_body: "Use a short question such as: Explain liquidity sweeps in the Forex Anatomy framework.",
    target_href: "/ai-coach",
    priority: "Medium",
    recommendation_status: "Active"
  }
];

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) {
      return String(current);
    }
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

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
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

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [datasets, setDatasets] = useState<Record<DatasetKey, DbRow[]>>(emptyDatasets);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Synchronizing Student Experience 2.0...");
  const [journalTitle, setJournalTitle] = useState("");
  const [journalEntry, setJournalEntry] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("Learning Path");

  const studentName =
    typeof user?.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
      ? user.user_metadata.name
      : typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
        ? user.user_metadata.full_name
        : user?.email?.split("@")[0] ?? "Student";

  const loadExperience = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setUser(currentUser);
      const name =
        typeof currentUser.user_metadata?.name === "string" && currentUser.user_metadata.name.trim().length > 0
          ? currentUser.user_metadata.name
          : typeof currentUser.user_metadata?.full_name === "string" && currentUser.user_metadata.full_name.trim().length > 0
            ? currentUser.user_metadata.full_name
            : currentUser.email?.split("@")[0] ?? "Student";

      const [
        missions,
        streaks,
        badges,
        journal,
        recommendations,
        mentors,
        goals,
        messages,
        certificates,
        exams,
        degreeProgress,
        civicService,
        researchSubmissions,
        tradeIdeas,
        chartReports,
        voiceUsage,
        eventRegistrations,
        events,
        careerProfiles,
        careerApplications,
        careerOpportunities
      ] = await Promise.all([
        safeSelect(supabase, "student_missions", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false })),
        safeSelect(supabase, "student_streaks", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).limit(1)),
        safeSelect(supabase, "student_badges", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("awarded_at", { ascending: false })),
        safeSelect(supabase, "student_journal", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false }).limit(5)),
        safeSelect(supabase, "student_recommendations", (table) => supabase.from(table).select("*").or(`student_id.eq.${currentUser.id},student_id.is.null`).eq("recommendation_status", "Active").order("created_at", { ascending: false }).limit(6)),
        safeSelect(supabase, "student_mentors", (table) => supabase.from(table).select("*").or(`student_id.eq.${currentUser.id},student_id.is.null`).order("assigned_at", { ascending: false }).limit(2)),
        safeSelect(supabase, "student_goals", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false }).limit(5)),
        safeSelect(supabase, "student_messages", (table) => supabase.from(table).select("*").eq("recipient_id", currentUser.id).is("deleted_at", null).limit(100)),
        safeSelect(supabase, "certificates", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("issue_date", { ascending: false })),
        safeSelect(supabase, "exams", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("submitted_at", { ascending: false })),
        safeSelect(supabase, "student_degree_progress", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("updated_at", { ascending: false })),
        safeSelect(supabase, "civic_service_hours", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("service_date", { ascending: false })),
        safeSelect(supabase, "research_submissions", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("submitted_at", { ascending: false })),
        safeSelect(supabase, "trade_ideas", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false })),
        safeSelect(supabase, "chart_analyst_reports", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false })),
        safeSelect(supabase, "voice_coach_usage_events", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false })),
        safeSelect(supabase, "event_registrations", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("created_at", { ascending: false })),
        safeSelect(supabase, "event_calendar", (table) => supabase.from(table).select("*").gte("start_at", new Date().toISOString()).order("start_at", { ascending: true }).limit(3)),
        safeSelect(supabase, "career_profiles", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).limit(1)),
        safeSelect(supabase, "career_applications", (table) => supabase.from(table).select("*").eq("student_id", currentUser.id).order("submitted_at", { ascending: false })),
        safeSelect(supabase, "career_opportunities", (table) => supabase.from(table).select("*").eq("status", "Open").order("posted_at", { ascending: false }).limit(4))
      ]);

      let hydratedMissions = missions;
      let hydratedStreaks = streaks;
      let hydratedRecommendations = recommendations;
      let hydratedMentors = mentors;

      if (missions.length === 0) {
        const { data } = await supabase
          .from("student_missions")
          .insert(starterMissions.map((mission) => ({ ...mission, student_id: currentUser.id })))
          .select("*");
        hydratedMissions = (data ?? []) as DbRow[];
      }

      if (streaks.length === 0) {
        const { data } = await supabase
          .from("student_streaks")
          .insert({ student_id: currentUser.id, current_streak: 1, longest_streak: 1, last_activity_date: new Date().toISOString().slice(0, 10), streak_status: "Active" })
          .select("*");
        hydratedStreaks = (data ?? []) as DbRow[];
      }

      if (recommendations.length === 0) {
        const { data } = await supabase
          .from("student_recommendations")
          .insert(starterRecommendations.map((item) => ({ ...item, student_id: currentUser.id })))
          .select("*");
        hydratedRecommendations = (data ?? []) as DbRow[];
      }

      if (mentors.length === 0) {
        const { data } = await supabase
          .from("student_mentors")
          .insert({
            student_id: currentUser.id,
            mentor_name: "AFF Mentor Desk",
            mentor_role: "Forex Training Division Advisor",
            mentor_email: "acafffx@gmail.com",
            mentor_status: "Assigned"
          })
          .select("*");
        hydratedMentors = (data ?? []) as DbRow[];
      }

      const unread = messages.filter((row) => !row.read_at).length;
      setUnreadCount(unread);
      setDatasets({
        missions: hydratedMissions,
        streaks: hydratedStreaks,
        badges,
        journal,
        recommendations: hydratedRecommendations,
        mentors: hydratedMentors,
        goals,
        messages,
        certificates,
        exams,
        degreeProgress,
        civicService,
        researchSubmissions,
        tradeIdeas,
        chartReports,
        voiceUsage,
        eventRegistrations,
        events,
        careerProfiles,
        careerApplications,
        careerOpportunities
      });
      setMessage(`Welcome back, ${name}. Your AFF operating hub is synchronized.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load Student Experience 2.0.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadExperience();
  }, [loadExperience]);

  const metrics = useMemo(() => {
    const completedMissions = datasets.missions.filter((row) => value(row, ["mission_status"]).toLowerCase() === "completed").length;
    const currentStreak = datasets.streaks.length ? numberValue(datasets.streaks[0], ["current_streak"]) : 0;
    const longestStreak = datasets.streaks.length ? numberValue(datasets.streaks[0], ["longest_streak"]) : 0;
    const passingExams = datasets.exams.filter((row) => value(row, ["result", "status"]).toLowerCase() === "pass" || numberValue(row, ["score"]) >= 80).length;
    const certificationProgress = datasets.certificates.length > 0 ? 100 : percent(passingExams, 1);
    const degreeProgress = datasets.degreeProgress.length
      ? Math.round(datasets.degreeProgress.reduce((total, row) => total + numberValue(row, ["completion_percentage"]), 0) / datasets.degreeProgress.length)
      : 0;
    const civicHours = datasets.civicService.reduce((total, row) => total + numberValue(row, ["hours"]), 0);
    const researchCount = datasets.researchSubmissions.length;
    const tradePerformance = datasets.tradeIdeas.length + datasets.chartReports.length;
    const scholarshipScore = Math.min(100, Math.round(certificationProgress * 0.35 + degreeProgress * 0.25 + Math.min(civicHours, 40) + researchCount * 5));
    const internshipCount = datasets.careerOpportunities.filter((row) => value(row, ["opportunity_type"]) === "Internship").length;
    const careerApplications = datasets.careerApplications.length;

    return {
      completedMissions,
      missionProgress: percent(completedMissions, Math.max(datasets.missions.length, 1)),
      currentStreak,
      longestStreak,
      certificationProgress,
      degreeProgress,
      civicHours,
      researchCount,
      tradePerformance,
      scholarshipScore,
      internshipCount,
      careerApplications
    };
  }, [datasets]);

  async function completeMission(mission: DbRow) {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("student_missions")
      .update({ mission_status: "Completed", completed_at: new Date().toISOString() })
      .eq("id", value(mission, ["id"]))
      .eq("student_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadExperience();
  }

  async function saveJournal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !journalEntry.trim()) return;

    const supabase = createClient();
    const { error } = await supabase.from("student_journal").insert({
      student_id: user.id,
      student_name: studentName,
      journal_title: journalTitle.trim() || "Student Reflection",
      journal_entry: journalEntry.trim(),
      mood: "Focused"
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setJournalTitle("");
    setJournalEntry("");
    await loadExperience();
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !goalTitle.trim()) return;

    const supabase = createClient();
    const { error } = await supabase.from("student_goals").insert({
      student_id: user.id,
      goal_title: goalTitle.trim(),
      goal_category: goalCategory,
      goal_status: "Active",
      progress_percentage: 0
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setGoalTitle("");
    await loadExperience();
  }

  return (
    <section className="market-grid min-h-[calc(100vh-155px)] border-b border-gold-500/20 bg-navy-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[390px_1fr]">
          <aside className="terminal-panel h-fit p-6 shadow-gold">
            <p className="text-xs font-semibold uppercase tracking-[.28em] text-gold-300">AFF Student Experience 2.0</p>
            <h1 className="mt-4 font-serif text-4xl font-semibold text-white">Your academy operating hub.</h1>
            <p className="mt-4 leading-7 text-ink/72">{message}</p>

            {loading ? (
              <p className="mt-6 text-ink/72">Loading student account...</p>
            ) : (
              <div className="mt-6 grid gap-4">
                <p className="flex items-center gap-3 text-white">
                  <User className="text-gold-300" size={20} />
                  <span>{studentName}</span>
                </p>
                <p className="flex items-center gap-3 text-ink/76">
                  <Mail className="text-gold-300" size={20} />
                  <span>{user?.email}</span>
                </p>
                <Link href="/messages" className="flex items-center justify-between border border-gold-500/25 px-4 py-3 text-sm font-semibold text-gold-300">
                  <span>Unread Messages</span>
                  <span>{unreadCount}</span>
                </Link>
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <ProgressMeter label="Certification Progress" value={metrics.certificationProgress} />
              <ProgressMeter label="Degree Progress" value={metrics.degreeProgress} />
              <ProgressMeter label="Daily Mission Completion" value={metrics.missionProgress} />
            </div>
          </aside>

          <main className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <HubMetric icon={<Flame size={22} />} label="Student Streak" value={`${metrics.currentStreak} days`} detail={`Best streak: ${metrics.longestStreak} days`} />
              <HubMetric icon={<Trophy size={22} />} label="Achievement Badges" value={String(datasets.badges.length)} detail="Badges earned across AFF divisions" />
              <HubMetric icon={<Scale size={22} />} label="Civic Credits" value={`${metrics.civicHours}`} detail="Community service hours tracked" />
              <HubMetric icon={<ChartCandlestick size={22} />} label="Trading Performance" value={String(metrics.tradePerformance)} detail="Trade ideas and chart reviews" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
              <Panel title="Personalized Learning Path" icon={<BookOpenCheck size={22} />}>
                <div className="grid gap-4">
                  {datasets.recommendations.length === 0 ? (
                    <p className="text-sm text-ink/68">Learning recommendations will appear after the Student Experience migration is applied.</p>
                  ) : (
                    datasets.recommendations.map((item) => (
                      <Link key={value(item, ["id", "recommendation_title"])} href={value(item, ["target_href"], "/courses")} className="border border-gold-500/20 bg-navy-950 p-4 transition hover:border-gold-400/60">
                        <p className="text-xs uppercase tracking-[.2em] text-gold-300">{value(item, ["recommendation_type"], "Recommendation")}</p>
                        <h3 className="mt-2 font-semibold text-white">{value(item, ["recommendation_title"], "Next academy action")}</h3>
                        <p className="mt-2 text-sm leading-6 text-ink/68">{value(item, ["recommendation_body"], "Continue your AFF learning path.")}</p>
                      </Link>
                    ))
                  )}
                </div>
              </Panel>

              <Panel title="Daily Mission System" icon={<Target size={22} />}>
                <div className="grid gap-3">
                  {datasets.missions.map((mission) => {
                    const completed = value(mission, ["mission_status"]).toLowerCase() === "completed";
                    return (
                      <div key={value(mission, ["id", "mission_title"])} className="border border-gold-500/20 bg-navy-950 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(mission, ["mission_category"], "Mission")}</p>
                            <h3 className="mt-2 font-semibold text-white">{value(mission, ["mission_title"], "Daily mission")}</h3>
                            <p className="mt-1 text-sm text-ink/60">{numberValue(mission, ["points"])} certification points</p>
                          </div>
                          <button
                            className="border border-gold-500/45 px-3 py-2 text-xs font-semibold text-gold-300 disabled:opacity-50"
                            disabled={completed}
                            type="button"
                            onClick={() => completeMission(mission)}
                          >
                            {completed ? "Complete" : "Mark Complete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <ProgressPanel title="Certification Tracker" icon={<ShieldCheck size={20} />} value={metrics.certificationProgress} detail={`${datasets.exams.length} exam attempts, ${datasets.certificates.length} certificates`} href="/certificates" />
              <ProgressPanel title="Degree Progress" icon={<GraduationCap size={20} />} value={metrics.degreeProgress} detail={`${datasets.degreeProgress.length} university progress records`} href="/university" />
              <ProgressPanel title="Scholarship Eligibility" icon={<Sparkles size={20} />} value={metrics.scholarshipScore} detail="Calculated from certification, degree, service, and research activity" href="/endowment-fund" />
              <ProgressPanel title="Research Contribution" icon={<BookOpenText size={20} />} value={Math.min(100, metrics.researchCount * 25)} detail={`${metrics.researchCount} research submissions`} href="/research-institute" />
              <ProgressPanel title="Career Placement" icon={<BriefcaseBusiness size={20} />} value={Math.min(100, metrics.careerApplications * 25 + datasets.careerProfiles.length * 30)} detail={`${metrics.careerApplications} applications submitted`} href="/career-center" />
              <ProgressPanel title="Internship Tracker" icon={<BadgeCheck size={20} />} value={Math.min(100, metrics.internshipCount * 20)} detail={`${metrics.internshipCount} open internship opportunities`} href="/career-center" />
            </section>

            <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
              <Panel title="Mentor Assignment" icon={<Users size={22} />}>
                {datasets.mentors.length === 0 ? (
                  <p className="text-sm text-ink/68">Mentor assignment pending.</p>
                ) : (
                  datasets.mentors.map((mentor) => (
                    <div key={value(mentor, ["id", "mentor_name"])} className="border border-gold-500/20 bg-navy-950 p-4">
                      <h3 className="font-semibold text-white">{value(mentor, ["mentor_name"], "AFF Mentor Desk")}</h3>
                      <p className="mt-2 text-sm text-gold-300">{value(mentor, ["mentor_role"], "Academy Advisor")}</p>
                      <p className="mt-1 text-sm text-ink/64">{value(mentor, ["mentor_email"], "acafffx@gmail.com")}</p>
                    </div>
                  ))
                )}
              </Panel>

              <Panel title="AI Learning Recommendations" icon={<Lightbulb size={22} />}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <QuickAction href="/ai-coach" icon={<Bot size={18} />} label="AI Coach" detail="Ask curriculum questions" />
                  <QuickAction href="/voice-coach" icon={<Mic size={18} />} label="Voice Coach" detail="Practice out loud" />
                  <QuickAction href="/chart-analyst" icon={<BarChart3 size={18} />} label="Chart Analyst" detail="Review screenshots" />
                </div>
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Panel title="Personal Journal" icon={<NotebookPen size={22} />}>
                <form className="grid gap-3" onSubmit={saveJournal}>
                  <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Journal title" value={journalTitle} onChange={(event) => setJournalTitle(event.target.value)} />
                  <textarea className="min-h-28 border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="What did you learn, practice, or notice today?" value={journalEntry} onChange={(event) => setJournalEntry(event.target.value)} />
                  <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">Save Reflection</button>
                </form>
                <div className="mt-5 grid gap-3">
                  {datasets.journal.map((entry) => (
                    <div key={value(entry, ["id", "journal_title"])} className="border border-gold-500/20 bg-navy-950 p-4">
                      <p className="font-semibold text-white">{value(entry, ["journal_title"], "Student Reflection")}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/68">{value(entry, ["journal_entry"], "")}</p>
                      <p className="mt-2 text-xs text-ink/48">{shortDate(value(entry, ["created_at"]))}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Student Goals" icon={<Target size={22} />}>
                <form className="grid gap-3" onSubmit={saveGoal}>
                  <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Add a goal" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} />
                  <select className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={goalCategory} onChange={(event) => setGoalCategory(event.target.value)}>
                    <option>Learning Path</option>
                    <option>Certification</option>
                    <option>Trading Performance</option>
                    <option>Civic Leadership</option>
                    <option>Career Placement</option>
                  </select>
                  <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">Create Goal</button>
                </form>
                <div className="mt-5 grid gap-3">
                  {datasets.goals.map((goal) => (
                    <ProgressRow key={value(goal, ["id", "goal_title"])} label={value(goal, ["goal_title"], "Student goal")} value={numberValue(goal, ["progress_percentage"])} detail={`${value(goal, ["goal_category"], "Goal")} - ${value(goal, ["goal_status"], "Active")}`} />
                  ))}
                </div>
              </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="terminal-panel p-5">
                <div className="mb-4 flex items-center gap-3">
                  <CalendarDays className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Upcoming Events</h2>
                </div>
                <div className="grid gap-3">
                  {datasets.events.length === 0 ? (
                    <p className="text-sm text-ink/68">No upcoming events found.</p>
                  ) : (
                    datasets.events.map((event) => (
                      <Link key={value(event, ["id", "title"])} href="/events" className="border border-gold-500/20 bg-navy-950 p-4">
                        <p className="font-semibold text-white">{value(event, ["title"], "AFF Event")}</p>
                        <p className="mt-1 text-sm text-gold-300">{shortDate(value(event, ["start_at"]))}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
              <ZoomClassesPanel user={user} />
            </section>

            <DashboardCourseSummary />

            <section className="terminal-panel p-5">
              <div className="flex items-center gap-3">
                <Network className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">AFF Operating Workspaces</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {dashboardLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="border border-gold-500/20 bg-navy-950 p-4 transition hover:border-gold-400/60">
                    <div className="flex items-center justify-between gap-3">
                      <item.icon className="text-gold-300" size={24} />
                      {item.href === "/messages" && unreadCount > 0 ? (
                        <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-navy-950">{unreadCount} unread</span>
                      ) : null}
                    </div>
                    <h3 className="mt-4 font-semibold text-white">{item.label}</h3>
                  </Link>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </section>
  );
}

function HubMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-xs uppercase tracking-[.2em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-ink/64">{detail}</p>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="terminal-panel p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-gold-300">{icon}</span>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ProgressMeter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-ink/68">{label}</span>
        <span className="font-semibold text-gold-300">{value}%</span>
      </div>
      <div className="mt-2 h-2 bg-navy-800">
        <div className="h-full bg-gold-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProgressPanel({ title, icon, value, detail, href }: { title: string; icon: ReactNode; value: number; detail: string; href: string }) {
  return (
    <Link href={href} className="terminal-panel p-5 transition hover:border-gold-400/60">
      <div className="flex items-center justify-between gap-3">
        <span className="text-gold-300">{icon}</span>
        <span className="text-sm font-semibold text-gold-300">{value}%</span>
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <div className="mt-3 h-2 bg-navy-800">
        <div className="h-full bg-gold-500" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/64">{detail}</p>
    </Link>
  );
}

function QuickAction({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail: string }) {
  return (
    <Link href={href} className="border border-gold-500/20 bg-navy-950 p-4 transition hover:border-gold-400/60">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-3 font-semibold text-white">{label}</p>
      <p className="mt-1 text-xs text-ink/58">{detail}</p>
    </Link>
  );
}

function ProgressRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border border-gold-500/20 bg-navy-950 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm font-semibold text-gold-300">{value}%</p>
      </div>
      <div className="mt-3 h-2 bg-navy-800">
        <div className="h-full bg-gold-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink/54">{detail}</p>
    </div>
  );
}
