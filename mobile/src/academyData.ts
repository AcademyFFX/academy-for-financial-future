export type MobileRoute =
  | "Dashboard"
  | "Courses"
  | "Journal"
  | "Assignments"
  | "Live Room"
  | "Exams"
  | "Certificates"
  | "Messages";

export const mobileRoutes: MobileRoute[] = [
  "Dashboard",
  "Courses",
  "Journal",
  "Assignments",
  "Live Room",
  "Exams",
  "Certificates",
  "Messages"
];

export const studentProfile = {
  name: "AFF Student",
  email: "student@academyfinancialfuture.com",
  membership: "Premium Mentorship",
  unreadMessages: 4,
  certificates: 1
};

export const courseProgress = [
  {
    title: "Forex Foundations",
    progress: 82,
    lessons: "4 of 4 lessons",
    next: "Technical Analysis Lab"
  },
  {
    title: "Forex Anatomy",
    progress: 63,
    lessons: "5 of 8 lessons",
    next: "The Heart: Liquidity"
  },
  {
    title: "Risk and Capital Protection",
    progress: 38,
    lessons: "3 of 8 lessons",
    next: "Drawdown Protocol"
  }
];

export const journalEntries = [
  {
    pair: "EUR/USD",
    direction: "Buy",
    risk: "1.0%",
    result: "Planned",
    notes: "London liquidity sweep with confirmation candle."
  },
  {
    pair: "GBP/JPY",
    direction: "Sell",
    risk: "0.5%",
    result: "Review",
    notes: "Waited for New York overlap before entry."
  }
];

export const assignments = [
  {
    title: "Market Structure Markup",
    course: "Forex Anatomy",
    status: "Approved",
    grade: "92%"
  },
  {
    title: "Liquidity Case Study",
    course: "Forex Anatomy",
    status: "Submitted",
    grade: "Pending"
  }
];

export const liveRoomItems = [
  {
    title: "London Session Briefing",
    time: "Today 7:00 AM",
    status: "Replay available"
  },
  {
    title: "New York Live Desk",
    time: "Today 9:30 AM",
    status: "Join link ready"
  }
];

export const examStatus = [
  {
    title: "Level 1 Forex Anatomy",
    score: "86%",
    status: "Passed"
  },
  {
    title: "Risk Management Assessment",
    score: "Not attempted",
    status: "Locked"
  }
];

export const certificates = [
  {
    number: "AFF-2026-00001",
    course: "Forex Training Division",
    status: "Verified"
  }
];

export const messages = [
  {
    title: "Zoom Class Reminder",
    body: "Your Forex Anatomy live review starts tomorrow.",
    unread: true
  },
  {
    title: "Homework Feedback Posted",
    body: "Your Market Structure Markup assignment has instructor feedback.",
    unread: true
  },
  {
    title: "Certification Progress",
    body: "Complete three remaining lessons to unlock final certification review.",
    unread: false
  }
];
