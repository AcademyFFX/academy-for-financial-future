import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  FileDown,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  NotebookPen,
  ShieldCheck,
  TrendingUp,
  Video
} from "lucide-react";

export const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Academy" },
  { href: "/courses", label: "Forex Courses" },
  { href: "/dashboard", label: "Student Dashboard" },
  { href: "/journal", label: "Trading Journal" },
  { href: "/assignments", label: "Assignments" },
  { href: "/exams", label: "Certification Exams" },
  { href: "/certificates", label: "Certificates" },
  { href: "/announcements", label: "Announcements" },
  { href: "/contact", label: "Contact" }
];

export const featureCards = [
  { icon: GraduationCap, title: "Student Registration", text: "Structured enrollment flows for new cohorts, mentor assignment, and onboarding requirements." },
  { icon: ShieldCheck, title: "Supabase Login", text: "Email and password authentication prepared for Supabase Auth and protected student routes." },
  { icon: TrendingUp, title: "Progress Tracking", text: "Course modules, completion states, quiz scores, and certificate readiness indicators." },
  { icon: Video, title: "Video Lessons", text: "Lecture modules designed for recorded forex strategy lessons and market review sessions." },
  { icon: FileDown, title: "PDF Downloads", text: "Downloadable playbooks, risk worksheets, journal templates, and exam prep packets." },
  { icon: ClipboardCheck, title: "Homework Submission", text: "Assignment upload workflows for trade plans, chart markups, and weekly reflections." },
  { icon: BookOpen, title: "Quiz System", text: "Scenario-based quizzes covering risk management, order types, analysis, and trade psychology." },
  { icon: Award, title: "Certificate Generation", text: "Completion certificates with student name, program, date, and administrator signature field." },
  { icon: LayoutDashboard, title: "Admin Dashboard", text: "Administrative view for Dr. Jean Rene Moricette to manage cohorts, submissions, and results." }
];

export const courses = [
  {
    title: "Forex Foundations",
    level: "Core",
    progress: 78,
    lessons: 14,
    summary: "Market structure, currency pairs, sessions, pips, order flow, and broker execution fundamentals."
  },
  {
    title: "Technical Analysis Lab",
    level: "Applied",
    progress: 54,
    lessons: 18,
    summary: "Candlestick reading, support and resistance, trend systems, multi-timeframe confirmation, and chart review."
  },
  {
    title: "Risk and Capital Protection",
    level: "Professional",
    progress: 41,
    lessons: 12,
    summary: "Position sizing, drawdown control, trade invalidation, loss limits, and portfolio-level risk rules."
  },
  {
    title: "Institutional Forex Strategy",
    level: "Advanced",
    progress: 22,
    lessons: 16,
    summary: "Liquidity concepts, macro catalysts, news discipline, and professional trade planning routines."
  }
];

export const announcements = [
  { title: "June Market Intensive Opens", date: "June 10, 2026", body: "Live London and New York session analysis begins for enrolled Forex Training Division students." },
  { title: "Certification Exam Window", date: "June 24, 2026", body: "Students who complete all core modules may schedule their proctored final assessment." },
  { title: "Risk Management Workshop", date: "July 2, 2026", body: "A practical workshop on capital protection, risk sizing, and journal-based accountability." }
];

export const journalRows = [
  ["EUR/USD", "London", "Long", "+42 pips", "Followed plan"],
  ["GBP/JPY", "New York", "Short", "-18 pips", "Exited at invalidation"],
  ["XAU/USD", "Overlap", "Long", "+31 pips", "Reduced size before news"]
];

export const metrics = [
  { label: "Active Students", value: "248", icon: BriefcaseBusiness },
  { label: "Course Completion", value: "71%", icon: TrendingUp },
  { label: "Assignments Submitted", value: "1,482", icon: NotebookPen },
  { label: "Exam Pass Rate", value: "84%", icon: Award }
];

export const assignments = [
  { title: "Trading Plan Blueprint", due: "June 8, 2026", status: "Ready to submit" },
  { title: "Risk Sizing Worksheet", due: "June 14, 2026", status: "In review" },
  { title: "Chart Markup Portfolio", due: "June 21, 2026", status: "Not started" }
];

export const examSections = [
  { title: "Market Mechanics", questions: 25, time: "35 min" },
  { title: "Risk Management", questions: 20, time: "30 min" },
  { title: "Trade Psychology", questions: 15, time: "20 min" },
  { title: "Applied Case Study", questions: 1, time: "45 min" }
];

export const downloads = [
  { title: "Forex Training Division Syllabus", href: "/downloads/forex-syllabus.pdf" },
  { title: "Professional Trading Journal Template", href: "/downloads/trading-journal-template.pdf" },
  { title: "Risk Management Worksheet", href: "/downloads/risk-management-worksheet.pdf" }
];
