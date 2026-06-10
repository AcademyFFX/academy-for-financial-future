"use client";

import { useRouter } from "next/navigation";
import {
  Activity,
  Award,
  BarChart3,
  BookOpenCheck,
  Brain,
  CalendarClock,
  ChartCandlestick,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  Mic,
  Network,
  Radio,
  ShieldCheck,
  Star,
  TrendingUp,
  Tv,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
type QueryResult = { table: string; data: DbRow[]; error?: string };
type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent: string;
};

const adminEmail = "acafffx@gmail.com";

const tables = [
  "students",
  "courses",
  "lessons",
  "lesson_progress",
  "assignments",
  "exams",
  "certificates",
  "simulator_accounts",
  "simulator_attempts",
  "social_posts",
  "social_post_replies",
  "social_post_likes",
  "tv_broadcasts",
  "tv_subscriptions",
  "tv_viewership_events",
  "student_memberships",
  "billing_history",
  "student_messages",
  "zoom_class_sessions",
  "zoom_attendance",
  "live_market_commentary",
  "live_room_messages",
  "live_trade_ideas",
  "research_publications",
  "research_submissions",
  "research_analyst_profiles",
  "research_citations",
  "event_calendar",
  "event_registrations",
  "event_speakers",
  "event_sponsors",
  "event_certificates",
  "event_video_archive",
  "campus_directory",
  "campus_franchise_applications",
  "campus_revenue_reports",
  "campus_territories",
  "endowment_donors",
  "endowment_scholarship_funds",
  "endowment_investment_portfolio",
  "endowment_research_grant_allocations",
  "foundation_programs",
  "foundation_humanitarian_campaigns",
  "foundation_grant_distributions",
  "foundation_impact_reports",
  "civic_programs",
  "civic_service_hours",
  "civic_student_journals",
  "civic_policy_forums",
  "civic_research_publications",
  "civic_outreach_projects",
  "civic_ethics_certifications",
  "civic_leadership_exams",
  "voice_coach_conversations",
  "voice_coach_usage_events",
  "chart_analyst_reports",
  "chart_analyst_usage_events",
  "trading_floor_sessions",
  "trading_floor_messages",
  "trade_ideas",
  "market_commentary",
  "student_watchlists",
  "daily_bias_reports",
  "leaderboard_scores",
  "university_colleges",
  "university_programs",
  "university_transcripts",
  "university_degrees",
  "student_degree_progress",
  "university_honors",
  "global_regional_directors",
  "global_country_directors",
  "global_campus_directory",
  "global_student_recruitment",
  "global_franchise_applications",
  "global_partner_universities",
  "global_language_localization",
  "global_international_events",
  "global_certification_standards",
  "global_instructor_registry",
  "global_campus_performance",
  "aff_identity_profiles",
  "aff_passports",
  "aff_achievements",
  "aff_mentor_network",
  "aff_knowledge_graph",
  "aff_legacy_vault",
  "aff_os_activity"
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
  return Math.round((part / total) * 100);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function dateWithinDays(raw: string, days: number) {
  if (!raw) return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function uniqueCount(rows: DbRow[], keys: string[]) {
  return new Set(rows.map((row) => value(row, keys)).filter(Boolean)).size;
}

export default function ExecutiveCommandCenterPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading executive intelligence...");
  const [datasets, setDatasets] = useState<Record<string, DbRow[]>>({});
  const [tableErrors, setTableErrors] = useState<string[]>([]);

  const loadAnalytics = useCallback(async () => {
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

      if (user.email?.toLowerCase() !== adminEmail) {
        setAuthorized(false);
        setMessage("Executive analytics are restricted to the Academy administrator account.");
        return;
      }

      setAuthorized(true);

      const results = await Promise.all(
        tables.map(async (table): Promise<QueryResult> => {
          const { data, error } = await supabase.from(table).select("*").limit(1000);
          return {
            table,
            data: (data ?? []) as DbRow[],
            error: error?.message
          };
        })
      );

      setDatasets(Object.fromEntries(results.map((result) => [result.table, result.data])));
      setTableErrors(results.filter((result) => result.error).map((result) => `${result.table}: ${result.error}`));
      setMessage("Executive Command Center synchronized with live academy data.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load executive analytics.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAnalytics();
    const timer = window.setInterval(loadAnalytics, 60_000);
    return () => window.clearInterval(timer);
  }, [loadAnalytics]);

  const analytics = useMemo(() => {
    const students = datasets.students ?? [];
    const courses = datasets.courses ?? [];
    const lessons = datasets.lessons ?? [];
    const progress = datasets.lesson_progress ?? [];
    const assignments = datasets.assignments ?? [];
    const exams = datasets.exams ?? [];
    const certificates = datasets.certificates ?? [];
    const simulatorAccounts = datasets.simulator_accounts ?? [];
    const simulatorAttempts = datasets.simulator_attempts ?? [];
    const socialPosts = datasets.social_posts ?? [];
    const socialReplies = datasets.social_post_replies ?? [];
    const socialLikes = datasets.social_post_likes ?? [];
    const broadcasts = datasets.tv_broadcasts ?? [];
    const tvSubscriptions = datasets.tv_subscriptions ?? [];
    const tvViewership = datasets.tv_viewership_events ?? [];
    const memberships = datasets.student_memberships ?? [];
    const billingHistory = datasets.billing_history ?? [];
    const messages = datasets.student_messages ?? [];
    const zoomSessions = datasets.zoom_class_sessions ?? [];
    const zoomAttendance = datasets.zoom_attendance ?? [];
    const commentary = datasets.live_market_commentary ?? [];
    const liveMessages = datasets.live_room_messages ?? [];
    const tradeIdeas = datasets.live_trade_ideas ?? [];
    const researchPublications = datasets.research_publications ?? [];
    const researchSubmissions = datasets.research_submissions ?? [];
    const researchAnalysts = datasets.research_analyst_profiles ?? [];
    const researchCitations = datasets.research_citations ?? [];
    const eventCalendar = datasets.event_calendar ?? [];
    const eventRegistrations = datasets.event_registrations ?? [];
    const eventSpeakers = datasets.event_speakers ?? [];
    const eventSponsors = datasets.event_sponsors ?? [];
    const eventCertificates = datasets.event_certificates ?? [];
    const eventVideos = datasets.event_video_archive ?? [];
    const campusDirectory = datasets.campus_directory ?? [];
    const campusApplications = datasets.campus_franchise_applications ?? [];
    const campusRevenue = datasets.campus_revenue_reports ?? [];
    const campusTerritories = datasets.campus_territories ?? [];
    const endowmentDonors = datasets.endowment_donors ?? [];
    const scholarshipFunds = datasets.endowment_scholarship_funds ?? [];
    const endowmentPortfolio = datasets.endowment_investment_portfolio ?? [];
    const researchGrantAllocations = datasets.endowment_research_grant_allocations ?? [];
    const foundationPrograms = datasets.foundation_programs ?? [];
    const foundationCampaigns = datasets.foundation_humanitarian_campaigns ?? [];
    const foundationGrants = datasets.foundation_grant_distributions ?? [];
    const foundationReports = datasets.foundation_impact_reports ?? [];
    const civicPrograms = datasets.civic_programs ?? [];
    const civicServiceHours = datasets.civic_service_hours ?? [];
    const civicJournals = datasets.civic_student_journals ?? [];
    const civicForums = datasets.civic_policy_forums ?? [];
    const civicPublications = datasets.civic_research_publications ?? [];
    const civicOutreach = datasets.civic_outreach_projects ?? [];
    const civicCertifications = datasets.civic_ethics_certifications ?? [];
    const civicExams = datasets.civic_leadership_exams ?? [];
    const voiceCoachConversations = datasets.voice_coach_conversations ?? [];
    const voiceCoachUsage = datasets.voice_coach_usage_events ?? [];
    const chartAnalystReports = datasets.chart_analyst_reports ?? [];
    const chartAnalystUsage = datasets.chart_analyst_usage_events ?? [];
    const tradingFloorSessions = datasets.trading_floor_sessions ?? [];
    const tradingFloorMessages = datasets.trading_floor_messages ?? [];
    const tradingFloorTradeIdeas = datasets.trade_ideas ?? [];
    const tradingFloorCommentary = datasets.market_commentary ?? [];
    const studentWatchlists = datasets.student_watchlists ?? [];
    const dailyBiasReports = datasets.daily_bias_reports ?? [];
    const leaderboardScores = datasets.leaderboard_scores ?? [];
    const universityColleges = datasets.university_colleges ?? [];
    const universityPrograms = datasets.university_programs ?? [];
    const universityTranscripts = datasets.university_transcripts ?? [];
    const universityDegrees = datasets.university_degrees ?? [];
    const universityProgress = datasets.student_degree_progress ?? [];
    const universityHonors = datasets.university_honors ?? [];
    const globalRegionalDirectors = datasets.global_regional_directors ?? [];
    const globalCountryDirectors = datasets.global_country_directors ?? [];
    const globalCampuses = datasets.global_campus_directory ?? [];
    const globalRecruitment = datasets.global_student_recruitment ?? [];
    const globalFranchises = datasets.global_franchise_applications ?? [];
    const globalPartners = datasets.global_partner_universities ?? [];
    const globalLanguages = datasets.global_language_localization ?? [];
    const globalEvents = datasets.global_international_events ?? [];
    const globalStandards = datasets.global_certification_standards ?? [];
    const globalInstructors = datasets.global_instructor_registry ?? [];
    const globalPerformance = datasets.global_campus_performance ?? [];
    const affIdentities = datasets.aff_identity_profiles ?? [];
    const affPassports = datasets.aff_passports ?? [];
    const affAchievements = datasets.aff_achievements ?? [];
    const affMentors = datasets.aff_mentor_network ?? [];
    const affKnowledgeGraph = datasets.aff_knowledge_graph ?? [];
    const affLegacyVault = datasets.aff_legacy_vault ?? [];
    const affOSActivity = datasets.aff_os_activity ?? [];

    const totalStudents = students.length || uniqueCount(memberships, ["student_id"]) || uniqueCount(progress, ["student_id"]);
    const activeStudents = memberships.filter((row) => ["Active", "Trial"].includes(value(row, ["account_status"]))).length;
    const newStudents30 = students.filter((row) => dateWithinDays(value(row, ["enrollment_date", "created_at"]), 30)).length;
    const totalLessonSeats = Math.max(totalStudents * Math.max(lessons.length, 1), 1);
    const completionRate = percent(progress.length, totalLessonSeats);
    const examPasses = exams.filter((row) => value(row, ["result", "status"]).toLowerCase() === "pass" || value(row, ["passed"]) === "true" || numberValue(row, ["score"]) >= numberValue(row, ["passing_score"], 80)).length;
    const examAverage = exams.length ? Math.round(exams.reduce((total, row) => total + numberValue(row, ["score"]), 0) / exams.length) : 0;
    const gradedAssignments = assignments.filter((row) => value(row, ["status"]).toLowerCase() !== "submitted" || row.grade !== null && row.grade !== undefined);
    const approvedAssignments = assignments.filter((row) => value(row, ["status"]).toLowerCase() === "approved").length;
    const averageGrade = gradedAssignments.length ? Math.round(gradedAssignments.reduce((total, row) => total + numberValue(row, ["grade"]), 0) / gradedAssignments.length) : 0;
    const simulatorPoints = simulatorAccounts.reduce((total, row) => total + numberValue(row, ["total_points"]), 0);
    const simulatorAvgPoints = simulatorAccounts.length ? Math.round(simulatorPoints / simulatorAccounts.length) : 0;
    const communityActions = socialPosts.length + socialReplies.length + socialLikes.length + liveMessages.length + tradeIdeas.length;
    const tvViews = tvViewership.length;
    const tvUniqueViewers = uniqueCount(tvViewership, ["student_id"]);
    const revenue = billingHistory.reduce((total, row) => total + numberValue(row, ["amount"]), 0);
    const instructorActions =
      broadcasts.filter((row) => value(row, ["created_by", "host_name"]).length > 0).length +
      messages.filter((row) => value(row, ["sender_email"]) === adminEmail).length +
      zoomSessions.length +
      commentary.length +
      assignments.filter((row) => value(row, ["reviewed_by"]).length > 0).length;

    const courseCompletion = courses.map((course) => {
      const courseId = value(course, ["id"]);
      const courseLessons = lessons.filter((lesson) => value(lesson, ["course_id"]) === courseId);
      const courseProgress = progress.filter((row) => value(row, ["course_id"]) === courseId);
      return {
        name: value(course, ["course_name", "title"], "Academy Course"),
        completed: courseProgress.length,
        total: Math.max(totalStudents * Math.max(courseLessons.length, 1), 1),
        rate: percent(courseProgress.length, Math.max(totalStudents * Math.max(courseLessons.length, 1), 1))
      };
    });

    const revenueByPlan = memberships.reduce<Record<string, number>>((accumulator, row) => {
      const plan = value(row, ["membership_plan"], "Unassigned");
      accumulator[plan] = (accumulator[plan] ?? 0) + 1;
      return accumulator;
    }, {});

    const recentActivity = [
      ...students.map((row) => ({ type: "Enrollment", label: value(row, ["full_name", "name", "email"], "New student"), date: value(row, ["enrollment_date", "created_at"]) })),
      ...certificates.map((row) => ({ type: "Certificate", label: value(row, ["student_name", "certificate_number"], "Certificate issued"), date: value(row, ["issue_date", "created_at"]) })),
      ...assignments.map((row) => ({ type: "Assignment", label: value(row, ["title", "assignment_title"], "Assignment submitted"), date: value(row, ["submission_date", "created_at"]) })),
      ...exams.map((row) => ({ type: "Exam", label: `${value(row, ["exam_title"], "Exam")} - ${numberValue(row, ["score"])}%`, date: value(row, ["submitted_at", "created_at"]) })),
      ...tvViewership.map((row) => ({ type: "TV View", label: `Broadcast ${value(row, ["broadcast_id"], "viewed")}`, date: value(row, ["watched_at", "created_at"]) })),
      ...civicJournals.map((row) => ({ type: "Leadership Journal", label: value(row, ["journal_title"], "Civic journal submitted"), date: value(row, ["created_at"]) })),
      ...civicExams.map((row) => ({ type: "Civic Exam", label: `${value(row, ["exam_title"], "Leadership exam")} - ${value(row, ["result"], "In Progress")}`, date: value(row, ["submitted_at"]) })),
      ...voiceCoachUsage.map((row) => ({ type: "Voice Coach", label: value(row, ["coach_mode"], "Voice coaching session"), date: value(row, ["created_at"]) })),
      ...chartAnalystReports.map((row) => ({ type: "Chart Analyst", label: `${value(row, ["platform"], "Chart")} - ${numberValue(row, ["overall_grade"])}%`, date: value(row, ["created_at"]) })),
      ...tradingFloorTradeIdeas.map((row) => ({ type: "Trading Floor", label: `${value(row, ["pair"], "Idea")} ${value(row, ["direction"], "")}`, date: value(row, ["created_at"]) })),
      ...universityTranscripts.map((row) => ({ type: "University Transcript", label: value(row, ["course_title"], "Academic record"), date: value(row, ["created_at", "completed_at"]) })),
      ...globalRecruitment.map((row) => ({ type: "Global Recruitment", label: `${value(row, ["country"], "International")} - ${value(row, ["program_interest"], "AFF Program")}`, date: value(row, ["created_at"]) })),
      ...affOSActivity.map((row) => ({ type: "AFF OS", label: value(row, ["activity_summary"], "Operating system activity"), date: value(row, ["created_at"]) }))
    ]
      .filter((item) => item.date)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 8);

    return {
      totalStudents,
      activeStudents,
      newStudents30,
      courses: courses.length,
      lessons: lessons.length,
      completionRate,
      progressRows: progress.length,
      exams: exams.length,
      examPassRate: percent(examPasses, exams.length),
      examAverage,
      certificates: certificates.length,
      certificateRate: percent(certificates.length, totalStudents),
      assignments: assignments.length,
      gradedAssignments: gradedAssignments.length,
      approvedAssignments,
      averageGrade,
      simulatorAttempts: simulatorAttempts.length,
      simulatorAvgPoints,
      simulatorCredits: simulatorAccounts.reduce((total, row) => total + numberValue(row, ["certification_credits"]), 0),
      communityActions,
      socialPosts: socialPosts.length,
      tvBroadcasts: broadcasts.length,
      tvLive: broadcasts.filter((row) => value(row, ["status"]) === "Live").length,
      tvViews,
      tvUniqueViewers,
      tvSubscriptions: tvSubscriptions.length,
      memberships: memberships.length,
      activeMembershipRate: percent(activeStudents, Math.max(memberships.length, 1)),
      revenue,
      instructorActions,
      researchPublications: researchPublications.length,
      researchSubmissions: researchSubmissions.length,
      researchAnalysts: researchAnalysts.length,
      researchCitations: researchCitations.length,
      researchDownloads: researchPublications.filter((row) => value(row, ["pdf_url"]).length > 0).length,
      events: eventCalendar.length,
      eventRegistrations: eventRegistrations.length,
      eventSpeakers: eventSpeakers.length,
      eventSponsors: eventSponsors.length,
      eventCertificates: eventCertificates.length,
      eventVideos: eventVideos.length,
      campuses: campusDirectory.length,
      campusApplications: campusApplications.length,
      campusRevenue: campusRevenue.reduce((total, row) => total + numberValue(row, ["gross_revenue"]), 0),
      campusTerritories: campusTerritories.length,
      endowmentDonors: endowmentDonors.length,
      endowmentValue: endowmentPortfolio.reduce((total, row) => total + numberValue(row, ["current_value"]), 0),
      scholarshipFunds: scholarshipFunds.reduce((total, row) => total + numberValue(row, ["fund_balance"]), 0),
      researchGrantAllocations: researchGrantAllocations.length,
      foundationPrograms: foundationPrograms.length,
      foundationBeneficiaries: foundationPrograms.reduce((total, row) => total + numberValue(row, ["beneficiaries_count"]), 0),
      foundationGrants: foundationGrants.reduce((total, row) => total + numberValue(row, ["distribution_amount"]), 0),
      foundationCampaigns: foundationCampaigns.length,
      foundationReports: foundationReports.length,
      civicPrograms: civicPrograms.length,
      civicServiceHours: civicServiceHours.reduce((total, row) => total + numberValue(row, ["hours"]), 0),
      civicJournals: civicJournals.length,
      civicForums: civicForums.length,
      civicPublications: civicPublications.length,
      civicOutreachProjects: civicOutreach.length,
      civicImpactScore: civicOutreach.reduce((total, row) => total + numberValue(row, ["impact_score"]), 0),
      civicCertifications: civicCertifications.length,
      civicExams: civicExams.length,
      voiceCoachMessages: voiceCoachConversations.length,
      voiceCoachExchanges: voiceCoachUsage.length,
      voiceCoachSeconds: voiceCoachUsage.reduce((total, row) => total + numberValue(row, ["audio_duration_seconds"]), 0),
      chartAnalystReports: chartAnalystReports.length,
      chartAnalystUsage: chartAnalystUsage.length,
      chartAnalystAverage: chartAnalystReports.length ? Math.round(chartAnalystReports.reduce((total, row) => total + numberValue(row, ["overall_grade"]), 0) / chartAnalystReports.length) : 0,
      chartAnalystReviewMode: chartAnalystReports.filter((row) => value(row, ["dr_moricette_review_mode"]) === "true").length,
      tradingFloorSessions: tradingFloorSessions.length,
      tradingFloorMessages: tradingFloorMessages.length,
      tradingFloorTradeIdeas: tradingFloorTradeIdeas.length,
      tradingFloorCommentary: tradingFloorCommentary.length,
      tradingFloorWatchlists: studentWatchlists.length,
      tradingFloorBiasReports: dailyBiasReports.length,
      tradingFloorLeaderboard: leaderboardScores.length,
      tradingFloorActiveTraders: uniqueCount([...tradingFloorMessages, ...tradingFloorTradeIdeas, ...studentWatchlists], ["student_id"]),
      tradingFloorAIInteractions: voiceCoachUsage.length + chartAnalystUsage.length,
      tradingFloorSessionAttendance: tradingFloorMessages.length + studentWatchlists.length,
      tradingFloorSimulatorActivity: simulatorAttempts.length + simulatorAccounts.length,
      universityColleges: universityColleges.length,
      universityPrograms: universityPrograms.length,
      universityDegrees: universityDegrees.length,
      universityTranscripts: universityTranscripts.length,
      universityCredits: universityTranscripts.reduce((total, row) => total + numberValue(row, ["credit_hours"]), 0),
      universityAvgProgress: universityProgress.length ? Math.round(universityProgress.reduce((total, row) => total + numberValue(row, ["completion_percentage"]), 0) / universityProgress.length) : 0,
      universityHonors: universityHonors.length,
      globalRegionalDirectors: globalRegionalDirectors.length,
      globalCountryDirectors: globalCountryDirectors.length,
      globalCampuses: globalCampuses.length,
      globalRecruitment: globalRecruitment.length,
      globalFranchises: globalFranchises.length,
      globalPartners: globalPartners.length,
      globalLanguages: globalLanguages.length,
      globalEvents: globalEvents.length,
      globalStandards: globalStandards.length,
      globalInstructors: globalInstructors.length,
      globalEnrollment: globalPerformance.reduce((total, row) => total + numberValue(row, ["active_students"]), 0),
      affIdentities: affIdentities.length,
      affPassports: affPassports.length,
      affAchievements: affAchievements.length,
      affMentors: affMentors.length,
      affKnowledgeGraph: affKnowledgeGraph.length,
      affLegacyVault: affLegacyVault.length,
      affOSActivity: affOSActivity.length,
      zoomAttendance: zoomAttendance.length,
      courseCompletion,
      revenueByPlan,
      recentActivity
    };
  }, [datasets]);

  const headlineMetrics: Metric[] = [
    { label: "Total Students", value: String(analytics.totalStudents), detail: `${analytics.newStudents30} new in 30 days`, icon: <Users size={22} />, accent: "Enrollment" },
    { label: "Course Completion", value: `${analytics.completionRate}%`, detail: `${analytics.progressRows} completed lesson records`, icon: <BookOpenCheck size={22} />, accent: "Academic Progress" },
    { label: "Certificates Issued", value: String(analytics.certificates), detail: `${analytics.certificateRate}% student certification rate`, icon: <Award size={22} />, accent: "Credentialing" },
    { label: "Membership Revenue", value: money(analytics.revenue), detail: `${analytics.activeMembershipRate}% active membership base`, icon: <CircleDollarSign size={22} />, accent: "Financial Growth" }
  ];

  if (!authorized && !loading) {
    return (
      <>
        <PageHeader eyebrow="Executive Access" title="Academy command intelligence is restricted." text={message} />
        <Section>
          <SectionInner>
            <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950" type="button" onClick={() => router.replace("/login")}>
              Return to Login
            </button>
          </SectionInner>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Executive Analytics"
        title="Academy for Financial Future Command Center."
        text="A real-time executive operating dashboard for enrollment, academic progress, certification performance, media engagement, community activity, revenue, and instructor execution."
      />

      <Section>
        <SectionInner className="grid gap-6">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Live Sync</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadAnalytics}>
              <Activity size={16} /> Refresh Intelligence
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {headlineMetrics.map((metric) => (
              <ExecutiveMetric key={metric.label} metric={metric} />
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <LineChart className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Academy Growth Analytics</h2>
                </div>
              </div>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-3">
                <Signal label="Active Students" value={analytics.activeStudents} denominator={Math.max(analytics.totalStudents, 1)} suffix=" enrolled" />
                <Signal label="Exam Pass Rate" value={analytics.examPassRate} denominator={100} suffix="%" />
                <Signal label="Assignment Approval" value={percent(analytics.approvedAssignments, analytics.assignments)} denominator={100} suffix="%" />
                <Signal label="Simulator Attempts" value={analytics.simulatorAttempts} denominator={Math.max(analytics.totalStudents * 4, 1)} suffix=" decisions" />
                <Signal label="Community Actions" value={analytics.communityActions} denominator={Math.max(analytics.totalStudents * 8, 1)} suffix=" actions" />
                <Signal label="TV Unique Viewers" value={analytics.tvUniqueViewers} denominator={Math.max(analytics.totalStudents, 1)} suffix=" viewers" />
              </div>
            </div>

            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <CalendarClock className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Recent Executive Activity</h2>
                </div>
              </div>
              <div className="grid gap-px bg-gold-500/14">
                {analytics.recentActivity.length === 0 ? (
                  <p className="bg-navy-950 p-5 text-ink/68">No recent academy activity found yet.</p>
                ) : (
                  analytics.recentActivity.map((item, index) => (
                    <div key={`${item.type}-${index}`} className="bg-navy-950 p-4">
                      <p className="text-xs uppercase tracking-[.2em] text-gold-300">{item.type}</p>
                      <p className="mt-2 font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-ink/58">{new Date(item.date).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Academic Operations" icon={<GraduationCap size={22} />}>
              <StatLine label="Courses" value={String(analytics.courses)} />
              <StatLine label="Lessons" value={String(analytics.lessons)} />
              <StatLine label="Exam Attempts" value={String(analytics.exams)} />
              <StatLine label="Average Exam Score" value={`${analytics.examAverage}%`} />
              <StatLine label="Assignments Submitted" value={String(analytics.assignments)} />
              <StatLine label="Assignments Graded" value={String(analytics.gradedAssignments)} />
              <StatLine label="Average Assignment Grade" value={`${analytics.averageGrade}%`} />
            </Panel>

            <Panel title="Media, Community, and Live Learning" icon={<Tv size={22} />}>
              <StatLine label="TV Broadcasts" value={String(analytics.tvBroadcasts)} />
              <StatLine label="Live Broadcasts" value={String(analytics.tvLive)} />
              <StatLine label="TV View Events" value={String(analytics.tvViews)} />
              <StatLine label="TV Subscriptions" value={String(analytics.tvSubscriptions)} />
              <StatLine label="Community Posts" value={String(analytics.socialPosts)} />
              <StatLine label="Zoom Attendance Records" value={String(analytics.zoomAttendance)} />
              <StatLine label="Instructor Activity" value={String(analytics.instructorActions)} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Course Completion Intelligence</h2>
                </div>
              </div>
              <div className="grid gap-px bg-gold-500/14">
                {analytics.courseCompletion.length === 0 ? (
                  <p className="bg-navy-950 p-5 text-ink/68">Run the course seed migration to display course completion intelligence.</p>
                ) : (
                  analytics.courseCompletion.map((course) => (
                    <ProgressRow key={course.name} label={course.name} value={course.rate} detail={`${course.completed}/${course.total} expected lesson completions`} />
                  ))
                )}
              </div>
            </div>

            <Panel title="Revenue by Membership Plan" icon={<ShieldCheck size={22} />}>
              {Object.entries(analytics.revenueByPlan).length === 0 ? (
                <p className="text-sm text-ink/68">No membership records yet.</p>
              ) : (
                Object.entries(analytics.revenueByPlan).map(([plan, count]) => (
                  <ProgressRow key={plan} label={plan} value={percent(count, Math.max(analytics.memberships, 1))} detail={`${count} student account${count === 1 ? "" : "s"}`} compact />
                ))
              )}
            </Panel>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveTile icon={<ClipboardCheck size={20} />} label="Grading Metrics" value={`${analytics.gradedAssignments}/${analytics.assignments}`} detail="graded submissions" />
            <ExecutiveTile icon={<Brain size={20} />} label="Simulator Performance" value={`${analytics.simulatorAvgPoints} pts`} detail={`${analytics.simulatorCredits} certification credits`} />
            <ExecutiveTile icon={<Radio size={20} />} label="TV Studio Viewership" value={`${analytics.tvUniqueViewers}`} detail={`${analytics.tvViews} total watch events`} />
            <ExecutiveTile icon={<BookOpenCheck size={20} />} label="Research Institute" value={`${analytics.researchPublications}`} detail={`${analytics.researchSubmissions} submissions, ${analytics.researchDownloads} PDFs`} />
            <ExecutiveTile icon={<CalendarClock size={20} />} label="Events Division" value={`${analytics.events}`} detail={`${analytics.eventRegistrations} registrations, ${analytics.eventCertificates} certificates`} />
            <ExecutiveTile icon={<GraduationCap size={20} />} label="Campus Expansion" value={`${analytics.campuses}`} detail={`${analytics.campusApplications} applications, ${money(analytics.campusRevenue)} revenue`} />
            <ExecutiveTile icon={<CircleDollarSign size={20} />} label="Endowment Fund" value={money(analytics.endowmentValue)} detail={`${analytics.endowmentDonors} donors, ${money(analytics.scholarshipFunds)} scholarships`} />
            <ExecutiveTile icon={<Award size={20} />} label="Foundation Impact" value={`${analytics.foundationBeneficiaries}`} detail={`${analytics.foundationPrograms} programs, ${money(analytics.foundationGrants)} grants`} />
            <ExecutiveTile icon={<ShieldCheck size={20} />} label="Civic Leadership" value={`${analytics.civicPrograms}`} detail={`${analytics.civicServiceHours} service hours, ${analytics.civicCertifications} ethics certifications`} />
            <ExecutiveTile icon={<Mic size={20} />} label="AI Voice Coach" value={`${analytics.voiceCoachExchanges}`} detail={`${analytics.voiceCoachMessages} messages, ${analytics.voiceCoachSeconds} recorded seconds`} />
            <ExecutiveTile icon={<BarChart3 size={20} />} label="AI Chart Analyst" value={`${analytics.chartAnalystReports}`} detail={`${analytics.chartAnalystAverage}% avg grade, ${analytics.chartAnalystReviewMode} Dr. reviews`} />
            <ExecutiveTile icon={<ChartCandlestick size={20} />} label="Virtual Trading Floor" value={`${analytics.tradingFloorActiveTraders}`} detail={`${analytics.tradingFloorTradeIdeas} ideas, ${analytics.tradingFloorAIInteractions} AI interactions`} />
            <ExecutiveTile icon={<GraduationCap size={20} />} label="Global University" value={`${analytics.universityColleges}`} detail={`${analytics.universityDegrees} degrees, ${analytics.universityTranscripts} transcripts`} />
            <ExecutiveTile icon={<TrendingUp size={20} />} label="Global Network" value={`${analytics.globalCampuses}`} detail={`${analytics.globalCountryDirectors} country directors, ${analytics.globalEnrollment} students`} />
            <ExecutiveTile icon={<Network size={20} />} label="AFF OS" value={`${analytics.affIdentities}`} detail={`${analytics.affPassports} passports, ${analytics.affAchievements} achievements`} />
            <ExecutiveTile icon={<Star size={20} />} label="Academy Growth" value={`${analytics.newStudents30}`} detail="new enrollments in 30 days" />
          </section>

          {tableErrors.length > 0 ? (
            <details className="terminal-panel p-5 text-sm text-ink/68">
              <summary className="cursor-pointer text-gold-300">Optional data sources needing migration or RLS access</summary>
              <ul className="mt-4 grid gap-2">
                {tableErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </SectionInner>
      </Section>
    </>
  );
}

function ExecutiveMetric({ metric }: { metric: Metric }) {
  return (
    <article className="terminal-panel p-5 shadow-gold">
      <div className="flex items-center justify-between gap-3">
        <div className="text-gold-300">{metric.icon}</div>
        <span className="border border-gold-500/30 px-2 py-1 text-[11px] uppercase tracking-[.18em] text-gold-300">{metric.accent}</span>
      </div>
      <p className="mt-6 text-sm uppercase tracking-[.22em] text-ink/54">{metric.label}</p>
      <p className="mt-2 font-serif text-4xl font-semibold text-white">{metric.value}</p>
      <p className="mt-3 text-sm text-ink/64">{metric.detail}</p>
    </article>
  );
}

function Signal({ label, value, denominator, suffix }: { label: string; value: number; denominator: number; suffix: string }) {
  const fill = Math.min(100, Math.max(0, suffix === "%" ? value : percent(value, denominator)));
  return (
    <div className="bg-navy-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink/68">{label}</p>
        <CheckCircle2 className="text-gold-300" size={18} />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}{suffix === "%" ? "%" : ""}</p>
      <div className="mt-4 h-2 bg-navy-800">
        <div className="h-full bg-gold-500" style={{ width: `${fill}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink/50">{suffix === "%" ? "performance ratio" : suffix}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-gold-500/20 p-5">
        <div className="flex items-center gap-3">
          <span className="text-gold-300">{icon}</span>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="grid gap-px bg-gold-500/14">{children}</div>
    </section>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function ProgressRow({ label, value, detail, compact = false }: { label: string; value: number; detail: string; compact?: boolean }) {
  return (
    <div className={`bg-navy-950 ${compact ? "p-0" : "p-5"}`}>
      <div className={compact ? "py-3" : ""}>
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold text-white">{label}</p>
          <p className="text-sm font-semibold text-gold-300">{value}%</p>
        </div>
        <div className="mt-3 h-2 bg-navy-800">
          <div className="h-full bg-gold-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink/54">{detail}</p>
      </div>
    </div>
  );
}

function ExecutiveTile({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-sm uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-ink/62">{detail}</p>
    </article>
  );
}
