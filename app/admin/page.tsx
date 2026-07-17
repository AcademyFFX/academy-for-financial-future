"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, BookOpen, Bot, ClipboardCheck, CreditCard, ExternalLink, FileCheck, FileX, GraduationCap, Megaphone, RadioTower, Save, Search, Send, ShieldCheck, TabletSmartphone, Trash2, Tv, UploadCloud, UserCheck, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { AdminRouteAudit } from "@/components/admin-route-audit";
import { AdminAICoachKnowledge } from "@/components/admin-ai-coach-knowledge";
import { AdminMessageCenter } from "@/components/admin-message-center";
import { AdminSimulatorReview } from "@/components/admin-simulator-review";
import { AdminSocialModeration } from "@/components/admin-social-moderation";
import { AdminTVStudio } from "@/components/admin-tv-studio";
import { AdminZoomSessionManager } from "@/components/admin-zoom-session-manager";
import { getClientAdminStatus } from "@/lib/admin-client";
import { buildActiveMembershipState, buildPendingPaymentState, membershipStateToDbPayload, normalizeMembershipPlan, normalizeMembershipState } from "@/lib/membership-state";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type Student = {
  id: string;
  authUserId: string;
  studentId: string;
  name: string;
  email: string;
  enrollmentDate: string;
  certificationLevel: string;
  selectedMembershipPlan: string;
  membershipPlan: string;
  membershipStatus: string;
  paymentStatus: string;
  status: string;
  profilePhotoUrl: string;
};

type StudentApplication = {
  id: string;
  authUserId: string;
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  programInterest: string;
  membershipPlan: string;
  goalStatement: string;
  applicationStatus: string;
  createdAt: string;
};

type Assignment = {
  id: string;
  studentId: string;
  title: string;
  courseModule: string;
  lessonTitle: string;
  fileUrl: string;
  submissionDate: string;
  status: string;
  grade: number | null;
  instructorFeedback: string;
  reviewedBy: string;
  reviewedAt: string;
  gradingHistory: GradingHistoryEntry[];
};

type GradingHistoryEntry = {
  status: string;
  grade: number | null;
  feedback: string;
  reviewedBy: string;
  reviewedAt: string;
};

type Exam = {
  id: string;
  studentId: string;
  studentName: string;
  examTitle: string;
  score: number;
  result: string;
  submittedAt: string;
  attemptNumber: number;
  durationSeconds: number;
  passingScore: number;
};

type Certificate = {
  id: string;
  certificateNumber: string;
  studentId: string;
  studentName: string;
  verificationCode: string;
  issueDate: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  published_at: string;
};

type ApprovalState = {
  loading: boolean;
  message: string;
};

const adminEmail = "acafffx@gmail.com";
const initialAnnouncement = { id: "", title: "", body: "" };
const studentStatuses = ["Pending Review", "Active", "Suspended", "Graduated"] as const;
const adminDestinations = [
  { href: "/admin/course-management", label: "Course Management", detail: "Courses, modules, lessons, quizzes", icon: BookOpen },
  { href: "/admin/course-management/upload-center", label: "Upload Center", detail: "Video, PDF, PowerPoint, assignments", icon: UploadCloud },
  { href: "/admin/enrollment", label: "Enrollment", detail: "Applications and student status", icon: UserCheck },
  { href: "/admin/certifications", label: "Certifications", detail: "Exams, grading, and credentials", icon: ShieldCheck },
  { href: "/admin/live-classroom", label: "Live Classroom", detail: "Classes, attendance, and recordings", icon: RadioTower },
  { href: "/admin/profile", label: "Admin Profile", detail: "Administrator identity and permissions", icon: UserCheck },
  { href: "/admin/command-center", label: "Command Center", detail: "Executive analytics and intelligence", icon: Bot }
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
  const raw = value(row, keys);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(raw: string) {
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeEnrollmentStatus(status: string) {
  return studentStatuses.includes(status as (typeof studentStatuses)[number]) ? status : "Pending Review";
}

function applicationToStudentStatus(status: "Approved" | "Rejected" | "Suspended") {
  if (status === "Approved") return "Active";
  if (status === "Suspended") return "Suspended";
  return "Suspended";
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading admin dashboard...");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncement);
  const [assignmentReviews, setAssignmentReviews] = useState<Record<string, { status: string; grade: string; instructorFeedback: string }>>({});
  const [studentSearch, setStudentSearch] = useState("");
  const [membershipDrafts, setMembershipDrafts] = useState<Record<string, string>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [mentorDrafts, setMentorDrafts] = useState<Record<string, string>>({});
  const [approvalStates, setApprovalStates] = useState<Record<string, ApprovalState>>({});

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const pendingApplications = useMemo(() => applications.filter((application) => application.applicationStatus === "Pending Review"), [applications]);
  const approvedApplications = useMemo(
    () => applications.filter((application) => ["Approved", "Active"].includes(application.applicationStatus) && studentIsActiveForApplication(application, students)),
    [applications, students]
  );

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [student.name, student.email, student.studentId, student.certificationLevel, student.membershipPlan, student.membershipStatus, student.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [studentSearch, students]);

  const cards = [
    { label: "Total Students", value: students.length, icon: Users },
    { label: "Pending Applicants", value: pendingApplications.length, icon: ClipboardCheck },
    { label: "Total Assignments Submitted", value: assignments.length, icon: ClipboardCheck },
    { label: "Total Exam Attempts", value: exams.length, icon: ShieldCheck },
    { label: "Total Certificates Issued", value: certificates.length, icon: Award }
  ];

  const examStats = useMemo(() => {
    const attempts = exams.length;
    const passed = exams.filter((exam) => exam.result === "Pass").length;
    const averageScore = attempts ? Math.round(exams.reduce((total, exam) => total + exam.score, 0) / attempts) : 0;
    const highestScore = attempts ? Math.max(...exams.map((exam) => exam.score)) : 0;
    const passRate = attempts ? Math.round((passed / attempts) * 100) : 0;
    return { attempts, passed, averageScore, highestScore, passRate };
  }, [exams]);

  const gradingStats = useMemo(() => {
    const approved = assignments.filter((assignment) => assignment.status === "Approved").length;
    const rejected = assignments.filter((assignment) => assignment.status === "Rejected").length;
    const pending = assignments.filter((assignment) => !["Approved", "Rejected"].includes(assignment.status)).length;
    const gradedAssignments = assignments.filter((assignment) => assignment.grade !== null);
    const averageGrade = gradedAssignments.length
      ? Math.round(gradedAssignments.reduce((total, assignment) => total + (assignment.grade ?? 0), 0) / gradedAssignments.length)
      : 0;

    return { approved, rejected, pending, averageGrade };
  }, [assignments]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeStudent(row: DbRow, membershipRow?: DbRow): Student {
    const studentStatus = normalizeEnrollmentStatus(value(row, ["status"], "Pending Review"));
    const membershipState = normalizeMembershipState({
      selected_membership_plan: value(membershipRow ?? {}, ["selected_membership_plan"], value(row, ["membership_plan"], "Free Trial")),
      active_membership_plan: value(membershipRow ?? {}, ["active_membership_plan", "membership_plan"], value(row, ["membership_plan"], "Free Trial")),
      membership_plan: value(membershipRow ?? {}, ["membership_plan"], value(row, ["membership_plan"], "Free Trial")),
      payment_status: value(membershipRow ?? {}, ["payment_status"], "Pending"),
      membership_status: value(membershipRow ?? {}, ["membership_status"], "Pending Payment"),
      account_status: value(membershipRow ?? {}, ["account_status"], "Restricted")
    });
    return {
      id: value(row, ["id", "student_id"]),
      authUserId: value(row, ["auth_user_id"]),
      studentId: value(row, ["student_id"], "Pending"),
      name: value(row, ["name", "full_name", "student_name"], "Student"),
      email: value(row, ["email", "student_email"], "Not recorded"),
      enrollmentDate: normalizeDate(value(row, ["enrollment_date", "created_at", "date_enrolled"])),
      certificationLevel: value(row, ["certification_level", "level", "course_name"], "Academy for Financial Future"),
      selectedMembershipPlan: membershipState.selectedPlan,
      membershipPlan: membershipState.currentPlan,
      membershipStatus: membershipState.membershipStatus,
      paymentStatus: membershipState.paymentStatus,
      status: studentStatus,
      profilePhotoUrl: value(row, ["profile_photo_url"])
    };
  }

  function normalizeApplication(row: DbRow): StudentApplication {
    return {
      id: value(row, ["id"], crypto.randomUUID()),
      authUserId: value(row, ["auth_user_id"]),
      studentId: value(row, ["student_id"], "Pending"),
      fullName: value(row, ["full_name"], "Applicant"),
      email: value(row, ["email"]),
      phone: value(row, ["phone"]),
      country: value(row, ["country"]),
      programInterest: value(row, ["program_interest"], "Academy for Financial Future"),
      membershipPlan: value(row, ["membership_plan"], "Free Trial"),
      goalStatement: value(row, ["goal_statement"]),
      applicationStatus: value(row, ["application_status"], "Pending Review"),
      createdAt: normalizeDate(value(row, ["created_at"]))
    };
  }

  async function updateMatchingStudentStatus(supabase: ReturnType<typeof createClient>, application: StudentApplication, status: string) {
    const payload = {
      status,
      enrollment_date: new Date().toISOString().slice(0, 10),
      student_id: application.studentId && application.studentId !== "Pending" ? application.studentId : undefined,
      membership_plan: "Free Trial",
      certification_level: application.programInterest || undefined
    };
    if (application.authUserId) {
      const result = await supabase.from("students").update(payload).eq("auth_user_id", application.authUserId).select("*");
      if (result.error || (result.data ?? []).length > 0) return { data: (result.data ?? []) as DbRow[], error: result.error };
    }

    if (application.email) {
      const result = await supabase.from("students").update(payload).ilike("email", application.email).select("*");
      if (result.error || (result.data ?? []).length > 0) return { data: (result.data ?? []) as DbRow[], error: result.error };
    }

    return { data: [] as DbRow[], error: null };
  }

  async function upsertProgramEnrollment(supabase: ReturnType<typeof createClient>, application: StudentApplication, studentRow: DbRow) {
    const internalStudentId = value(studentRow, ["id"]);
    if (!internalStudentId) {
      return { data: null as DbRow | null, error: new Error("Cannot create enrollment because the matching public.students.id is missing.") };
    }

    const now = new Date().toISOString();
    const courseName = application.programInterest || "Academy for Financial Future";
    const existingResult = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", internalStudentId)
      .eq("course_name", courseName)
      .limit(1)
      .maybeSingle();

    if (existingResult.error) {
      return { data: null as DbRow | null, error: existingResult.error };
    }

    const payload = {
      student_id: Number(internalStudentId),
      course_id: null,
      course_name: courseName,
      enrolled_at: now,
      enrollment_status: "Active",
      progress_percentage: 0,
      updated_at: now
    };

    if (existingResult.data) {
      const updateResult = await supabase
        .from("enrollments")
        .update(payload)
        .eq("id", value(existingResult.data as DbRow, ["id"]))
        .select("*")
        .single();
      return { data: (updateResult.data ?? null) as DbRow | null, error: updateResult.error };
    }

    const insertResult = await supabase
      .from("enrollments")
      .insert(payload)
      .select("*")
      .single();

    return { data: (insertResult.data ?? null) as DbRow | null, error: insertResult.error };
  }

  function studentIsActiveForApplication(application: StudentApplication, studentRows: Student[]) {
    return studentRows.some((student) => {
      const authMatch = application.authUserId && student.authUserId === application.authUserId;
      const emailMatch = application.email && student.email.toLowerCase() === application.email.toLowerCase();
      return (authMatch || emailMatch) && student.status === "Active";
    });
  }

  function normalizeAssignment(row: DbRow): Assignment {
    return {
      id: value(row, ["id"], crypto.randomUUID()),
      studentId: value(row, ["student_id"]),
      title: value(row, ["title", "assignment_title"], "Assignment"),
      courseModule: value(row, ["course_module", "module", "course"], "Module"),
      lessonTitle: value(row, ["lesson_title"], "Lesson"),
      fileUrl: value(row, ["file_url", "url", "submission_url"]),
      submissionDate: normalizeDate(value(row, ["submission_date", "submitted_at", "created_at", "date"])),
      status: value(row, ["status"], "Submitted"),
      grade: row.grade === null || row.grade === undefined ? null : Number(row.grade),
      instructorFeedback: value(row, ["instructor_feedback"]),
      reviewedBy: value(row, ["reviewed_by"]),
      reviewedAt: normalizeDate(value(row, ["reviewed_at"])),
      gradingHistory: normalizeGradingHistory(row.grading_history)
    };
  }

  function normalizeGradingHistory(raw: unknown): GradingHistoryEntry[] {
    const parsed = typeof raw === "string" ? safeParseJson(raw) : raw;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as DbRow;
        return {
          status: value(row, ["status"], "Submitted"),
          grade: row.grade === null || row.grade === undefined ? null : Number(row.grade),
          feedback: value(row, ["feedback"]),
          reviewedBy: value(row, ["reviewedBy", "reviewed_by"], adminEmail),
          reviewedAt: normalizeDate(value(row, ["reviewedAt", "reviewed_at"]))
        };
      })
      .filter((entry): entry is GradingHistoryEntry => entry !== null);
  }

  function safeParseJson(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function normalizeExam(row: DbRow): Exam {
    return {
      id: value(row, ["id"], crypto.randomUUID()),
      studentId: value(row, ["student_id"]),
      studentName: value(row, ["student_name", "name"], "Student"),
      examTitle: value(row, ["exam_title", "title"], "Certification Exam"),
      score: numberValue(row, ["score"]),
      result: value(row, ["result", "status"], numberValue(row, ["score"]) >= 80 ? "Pass" : "Fail"),
      submittedAt: normalizeDate(value(row, ["submitted_at", "exam_date", "created_at", "date"])),
      attemptNumber: numberValue(row, ["attempt_number"], 1),
      durationSeconds: numberValue(row, ["duration_seconds"], 0),
      passingScore: numberValue(row, ["passing_score"], 80)
    };
  }

  function normalizeCertificate(row: DbRow): Certificate {
    return {
      id: value(row, ["id"], crypto.randomUUID()),
      certificateNumber: value(row, ["certificate_number"]),
      studentId: value(row, ["student_id"]),
      studentName: value(row, ["student_name", "name"], "Student"),
      verificationCode: value(row, ["verification_code"]),
      issueDate: normalizeDate(value(row, ["issue_date", "created_at", "date"]))
    };
  }

  const loadAdminData = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/admin");
        return;
      }

      if (!(await getClientAdminStatus())) {
        setAuthorized(false);
        setMessage("Admin access only. Your account is not active in aff_admin_users.");
        return;
      }

      setAuthorized(true);

      const [studentsResult, membershipsResult, applicationsResult, assignmentsResult, examsResult, certificatesResult, announcementsResult] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("student_memberships").select("*"),
        supabase.from("student_applications").select("*").order("created_at", { ascending: false }),
        supabase.from("assignments").select("*"),
        supabase.from("exams").select("*"),
        supabase.from("certificates").select("*"),
        supabase.from("announcements").select("*").order("published_at", { ascending: false })
      ]);

      const queryFailures = [
        ["students", studentsResult.error],
        ["student memberships", membershipsResult.error],
        ["student applications", applicationsResult.error],
        ["assignments", assignmentsResult.error],
        ["exams", examsResult.error],
        ["certificates", certificatesResult.error],
        ["announcements", announcementsResult.error]
      ].filter((entry) => entry[1]);

      if (queryFailures.length === 7) throw queryFailures[0][1];

      const membershipRows = (membershipsResult.data ?? []) as DbRow[];
      const normalizedStudents = ((studentsResult.data ?? []) as DbRow[]).map((studentRow) => {
        const studentAuthId = value(studentRow, ["auth_user_id"]);
        const studentEmail = value(studentRow, ["email"]).toLowerCase();
        const membershipRow = membershipRows.find((row) => {
          const membershipStudentId = value(row, ["student_id"]);
          const membershipEmail = value(row, ["student_email"]).toLowerCase();
          return (studentAuthId && membershipStudentId === studentAuthId) || (studentEmail && membershipEmail === studentEmail);
        });
        return normalizeStudent(studentRow, membershipRow);
      });
      const normalizedApplications = ((applicationsResult.data ?? []) as DbRow[]).map(normalizeApplication);
      const normalizedAssignments = ((assignmentsResult.data ?? []) as DbRow[])
        .map(normalizeAssignment)
        .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
      const normalizedExams = ((examsResult.data ?? []) as DbRow[])
        .map(normalizeExam)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      const normalizedCertificates = ((certificatesResult.data ?? []) as DbRow[])
        .map(normalizeCertificate)
        .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

      setStudents(normalizedStudents);
      setApplications(normalizedApplications);
      setMembershipDrafts(Object.fromEntries(normalizedStudents.map((student) => [student.id, student.membershipPlan])));
      setMessageDrafts(Object.fromEntries(normalizedStudents.map((student) => [student.id, ""])));
      setMentorDrafts(Object.fromEntries(normalizedApplications.map((application) => [application.id, "Dr. Jean Rene Moricette"])));
      setAssignments(normalizedAssignments);
      setAssignmentReviews(Object.fromEntries(normalizedAssignments.map((assignment) => [
        assignment.id,
        {
          status: assignment.status,
          grade: assignment.grade === null ? "" : String(assignment.grade),
          instructorFeedback: assignment.instructorFeedback
        }
      ])));
      setExams(normalizedExams);
      setCertificates(normalizedCertificates);
      setAnnouncements((announcementsResult.data ?? []) as Announcement[]);
      setMessage(queryFailures.length
        ? `Admin dashboard loaded. Unavailable data: ${queryFailures.map(([name]) => name).join(", ")}.`
        : "Admin dashboard ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load admin dashboard."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function saveAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving announcement...");

    try {
      const supabase = createClient();
      const payload = {
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        published_at: new Date().toISOString()
      };

      const query = announcementForm.id
        ? supabase.from("announcements").update(payload).eq("id", announcementForm.id).select("*").single()
        : supabase.from("announcements").insert(payload).select("*").single();

      const { data, error } = await query;
      if (error) throw error;

      const saved = data as Announcement;
      setAnnouncements((current) => {
        const withoutCurrent = current.filter((announcement) => announcement.id !== saved.id);
        return [saved, ...withoutCurrent];
      });
      setAnnouncementForm(initialAnnouncement);
      setMessage("Announcement saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save announcement."));
    }
  }

  async function saveAssignmentReview(assignmentId: string) {
    const review = assignmentReviews[assignmentId];
    if (!review) return;

    setMessage("Saving assignment review...");

    try {
      const assignment = assignments.find((item) => item.id === assignmentId);
      const grade = review.grade.trim().length > 0 ? Number(review.grade) : null;

      if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 100)) {
        setMessage("Grade must be a number from 0 to 100.");
        return;
      }

      const supabase = createClient();
      const reviewedAt = new Date().toISOString();
      const historyEntry: GradingHistoryEntry = {
        status: review.status,
        grade,
        feedback: review.instructorFeedback.trim(),
        reviewedBy: adminEmail,
        reviewedAt
      };

      const payload = {
        status: review.status,
        grade,
        instructor_feedback: review.instructorFeedback.trim() || null,
        reviewed_by: adminEmail,
        reviewed_at: reviewedAt,
        grading_history: [...(assignment?.gradingHistory ?? []), historyEntry]
      };

      const { data, error } = await supabase
        .from("assignments")
        .update(payload)
        .eq("id", assignmentId)
        .select("*")
        .single();

      if (error) throw error;

      setAssignments((current) => current.map((assignment) => (assignment.id === assignmentId ? normalizeAssignment(data as DbRow) : assignment)));
      setMessage(review.status === "Approved" ? "Assignment approved. Certification requirements updated." : "Assignment review saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save assignment review."));
    }
  }

  async function updateStudentStatus(student: Student, nextStatus: string) {
    setMessage(`Updating ${student.name}...`);

    try {
      const supabase = createClient();
      const normalizedStatus = normalizeEnrollmentStatus(nextStatus);
      const { data, error } = await supabase
        .from("students")
        .update({
          status: normalizedStatus
        })
        .eq("id", student.id)
        .select("*")
        .single();

      if (error) throw error;

      await supabase.from("student_profiles").update({
        enrollment_status: normalizedStatus,
        certification_status: normalizedStatus,
        updated_at: new Date().toISOString()
      }).eq("auth_user_id", student.authUserId);

      await supabase.from("student_status_history").insert({
        auth_user_id: student.authUserId || null,
        student_id: student.studentId,
        previous_status: student.status,
        new_status: normalizedStatus,
        changed_by: adminEmail,
        note: `Admin changed student status to ${nextStatus}.`
      });

      if (student.authUserId) {
        const restoredState = student.paymentStatus === "Paid" && student.membershipPlan !== "Free Trial"
          ? buildActiveMembershipState(student.membershipPlan)
          : buildPendingPaymentState(student.selectedMembershipPlan);
        const membershipPayload = nextStatus === "Suspended"
          ? { membership_status: "Suspended", account_status: "Suspended", suspended_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : { ...membershipStateToDbPayload(restoredState), updated_at: new Date().toISOString() };
        await supabase.from("student_memberships").update(membershipPayload).eq("student_id", student.authUserId);
      }

      setStudents((current) => current.map((item) => (item.id === student.id ? normalizeStudent(data as DbRow) : item)));
      setMessage(`Student ${normalizedStatus.toLowerCase()} status saved.`);
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update student status."));
    }
  }

  async function reviewApplication(application: StudentApplication, nextStatus: "Approved" | "Rejected" | "Suspended") {
    setMessage(`Saving ${nextStatus.toLowerCase()} review for ${application.fullName}...`);
    setApprovalStates((current) => ({
      ...current,
      [application.id]: { loading: nextStatus === "Approved", message: nextStatus === "Approved" ? "Approving..." : `Saving ${nextStatus.toLowerCase()}...` }
    }));

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const authenticatedAdminEmail = user?.email ?? adminEmail;
      if (!(await getClientAdminStatus())) {
        throw new Error("Admin approval requires an active aff_admin_users administrator session.");
      }

      const reviewedAt = new Date().toISOString();
      const welcomeBody = "Welcome to Academy for Financial Future.";
      const mentorName = mentorDrafts[application.id]?.trim() || "Dr. Jean Rene Moricette";
      const unifiedStatus = applicationToStudentStatus(nextStatus);
      console.info("AFF enrollment approval selected application", {
        applicationId: application.id,
        auth_user_id: application.authUserId,
        email: application.email
      });

      const applicationResult = await supabase.from("student_applications").update({
          application_status: nextStatus,
          reviewed_by: authenticatedAdminEmail,
          reviewed_at: reviewedAt,
          review_notes: nextStatus === "Approved" ? welcomeBody : `Application marked ${nextStatus}.`,
          updated_at: reviewedAt
        }).eq("id", application.id).select("*").single();
      console.info("AFF enrollment approval student_applications update", {
        applicationId: application.id,
        error: applicationResult.error,
        data: applicationResult.data
      });
      if (applicationResult.error) throw applicationResult.error;

      const studentResult = await updateMatchingStudentStatus(supabase, application, unifiedStatus);
      console.info("AFF enrollment approval students update", {
        applicationId: application.id,
        auth_user_id: application.authUserId,
        email: application.email,
        result: studentResult
      });
      if (studentResult.error) throw studentResult.error;
      if (!studentResult.data.length) {
        throw new Error("Application approved, but no matching student account was activated.");
      }

      if (nextStatus === "Approved") {
        const enrollmentResult = await upsertProgramEnrollment(supabase, application, studentResult.data[0]);
        console.info("AFF enrollment approval enrollments upsert", {
          applicationId: application.id,
          auth_user_id: application.authUserId,
          student_id: value(studentResult.data[0], ["id"]),
          email: application.email,
          result: enrollmentResult
        });
        if (enrollmentResult.error) {
          throw new Error(`Student activated, but enrollment record could not be created: ${enrollmentResult.error.message}`);
        }
      }

      const [profileResult, membershipResult, historyResult] = await Promise.all([
        application.authUserId
          ? supabase.from("student_profiles").upsert({
              auth_user_id: application.authUserId,
              student_id: application.studentId,
              full_name: application.fullName,
              email: application.email,
              phone: application.phone,
              country: application.country,
              program_interest: application.programInterest,
              membership_level: application.membershipPlan,
              enrollment_status: unifiedStatus,
              updated_at: reviewedAt
            }, { onConflict: "auth_user_id" }).select("*").single()
          : Promise.resolve({ data: null, error: null }),
        application.authUserId && nextStatus === "Approved"
          ? supabase.from("student_memberships").upsert({
              student_id: application.authUserId,
              student_email: application.email,
              ...membershipStateToDbPayload(buildPendingPaymentState(application.membershipPlan)),
              updated_at: reviewedAt
            }, { onConflict: "student_id" })
          : Promise.resolve({ data: null, error: null }),
        supabase.from("student_status_history").insert({
          auth_user_id: application.authUserId || null,
          student_id: application.studentId,
          previous_status: application.applicationStatus,
          new_status: unifiedStatus,
          changed_by: authenticatedAdminEmail,
          note: nextStatus === "Approved" ? welcomeBody : `Application review: ${nextStatus}.`
        })
      ]);

      for (const result of [applicationResult, studentResult, profileResult, membershipResult, historyResult]) {
        if (result.error) throw result.error;
      }

      if (nextStatus === "Approved" && application.authUserId) {
        await Promise.all([
          supabase.from("student_mentor_assignments").insert({
            auth_user_id: application.authUserId,
            student_id: application.studentId,
            mentor_name: mentorName,
            mentor_email: authenticatedAdminEmail,
            assigned_by: authenticatedAdminEmail
          }),
          supabase.from("student_messages").insert({
            recipient_id: application.authUserId,
            recipient_name: application.fullName,
            recipient_email: application.email,
            sender_name: "Dr. Jean Rene Moricette",
            sender_email: authenticatedAdminEmail,
            category: "Direct Message",
            priority: "Important",
            title: "Welcome to Academy for Financial Future",
            body: welcomeBody,
            action_url: "/student-dashboard"
          })
        ]);
      }

      setApplications((current) => current.map((item) => (item.id === application.id ? normalizeApplication(applicationResult.data as DbRow) : item)));
      setStudents((current) => {
        const updated = studentResult.data.map((row) => normalizeStudent(row));
        return current.map((item) => updated.find((student) => student.id === item.id) ?? item);
      });
      setApprovalStates((current) => ({
        ...current,
        [application.id]: { loading: false, message: nextStatus === "Approved" ? "Student approved and enrolled successfully" : `Application ${nextStatus.toLowerCase()}.` }
      }));
      setMessage(nextStatus === "Approved" ? "Student approved and enrolled successfully" : `Application ${nextStatus.toLowerCase()}.`);
      await loadAdminData();
    } catch (error) {
      const failureMessage = getErrorMessage(error, "Unable to review application.");
      setApprovalStates((current) => ({
        ...current,
        [application.id]: { loading: false, message: `Approval failed: ${failureMessage}` }
      }));
      setMessage(nextStatus === "Approved" ? `Approval failed: ${failureMessage}` : failureMessage);
    }
  }

  async function upgradeMembership(student: Student) {
    const nextPlan = membershipDrafts[student.id] ?? student.selectedMembershipPlan;
    setMessage(`Updating selected membership for ${student.name}...`);

    try {
      if (!student.authUserId) throw new Error("Student is missing auth_user_id; selected membership cannot be updated.");
      if (nextPlan === "Free Trial" && student.membershipPlan !== "Free Trial") {
        throw new Error("Use Cancel Membership to downgrade an active paid account to Free Trial.");
      }
      const nextState = student.paymentStatus === "Paid" && student.membershipStatus === "Active Membership"
        ? buildActiveMembershipState(nextPlan)
        : buildPendingPaymentState(nextPlan);
      const supabase = createClient();
      const result = await supabase
        .from("student_memberships")
        .update({
          ...membershipStateToDbPayload(nextState),
          updated_at: new Date().toISOString()
        })
        .eq("student_id", student.authUserId)
        .select("*");

      if (result.error) throw result.error;
      if (!result.data?.length) {
        throw new Error("No existing membership row was updated.");
      }

      setStudents((current) => current.map((item) => (item.id === student.id ? {
        ...item,
        selectedMembershipPlan: nextState.selectedPlan,
        membershipPlan: nextState.currentPlan,
        paymentStatus: nextState.paymentStatus,
        membershipStatus: nextState.membershipStatus
      } : item)));
      setMessage(`Selected membership updated for ${student.name}. Payment status is ${nextState.paymentStatus}.`);
    } catch (error) {
      setMessage(`Save Selected Plan failed: ${getErrorMessage(error, "Unable to update selected membership.")}`);
    }
  }

  async function updateMembershipWorkflow(student: Student, action: "mark-paid" | "activate" | "suspend" | "cancel") {
    const selectedPlan = membershipDrafts[student.id] ?? student.selectedMembershipPlan ?? student.membershipPlan ?? "Free Trial";
    const labels = {
      "mark-paid": "Mark Paid",
      activate: "Activate Membership",
      suspend: "Suspend Membership",
      cancel: "Cancel Membership"
    };
    setMessage(`${labels[action]} started for ${student.name}...`);

    try {
      if (!student.authUserId) throw new Error("Student is missing auth_user_id; membership cannot be updated.");
      if (action === "activate" && selectedPlan !== "Free Trial" && student.paymentStatus !== "Paid") {
        throw new Error("Paid plans require payment_status = Paid before activation.");
      }

      const now = new Date().toISOString();
      const workflowState = action === "cancel"
        ? buildPendingPaymentState("Free Trial")
        : action === "suspend"
          ? {
              selectedPlan: normalizeMembershipPlan(selectedPlan),
              currentPlan: normalizeMembershipPlan(student.membershipPlan),
              paymentStatus: student.paymentStatus === "Paid" ? "Paid" : "Pending",
              membershipStatus: "Suspended",
              accountStatus: "Suspended"
            } as const
          : action === "mark-paid" || action === "activate"
            ? buildActiveMembershipState(selectedPlan)
            : buildPendingPaymentState(selectedPlan);

      const payload: Record<string, string> = {
        ...membershipStateToDbPayload(workflowState),
        updated_at: now
      };
      if (action === "mark-paid" || action === "activate") payload.paid_at = now;
      if (action === "mark-paid" || action === "activate") payload.activated_at = now;
      if (action === "suspend") payload.suspended_at = now;
      if (action === "cancel") payload.cancelled_at = now;

      const supabase = createClient();
      const membershipResult = await supabase
        .from("student_memberships")
        .update(payload)
        .eq("student_id", student.authUserId)
        .select("*");

      if (membershipResult.error) throw membershipResult.error;
      if (!membershipResult.data?.length) throw new Error("No existing membership row was updated.");

      if (action === "activate" || action === "cancel" || action === "mark-paid") {
        const studentResult = await supabase
          .from("students")
          .update({ membership_plan: workflowState.currentPlan })
          .eq("id", student.id);
        if (studentResult.error) throw studentResult.error;
      }

      setStudents((current) => current.map((item) => (item.id === student.id ? {
        ...item,
        selectedMembershipPlan: workflowState.selectedPlan,
        membershipPlan: workflowState.currentPlan,
        paymentStatus: payload.payment_status,
        membershipStatus: payload.membership_status
      } : item)));

      const successMessages = {
        "mark-paid": `Payment marked Paid for ${student.name}. Membership is active.`,
        activate: `Membership activated for ${student.name}. Paid course access is unlocked.`,
        suspend: `Membership suspended for ${student.name}. Paid course access is restricted.`,
        cancel: `Membership cancelled for ${student.name}. Active plan reset to Free Trial.`
      };
      setMessage(successMessages[action]);
    } catch (error) {
      const errorMessages = {
        "mark-paid": "Mark Paid failed",
        activate: "Activate Membership failed",
        suspend: "Suspend Membership failed",
        cancel: "Cancel Membership failed"
      };
      setMessage(`${errorMessages[action]}: ${getErrorMessage(error, "Unable to update membership workflow.")}`);
    }
  }

  async function sendStudentMessage(student: Student) {
    const body = messageDrafts[student.id]?.trim();
    if (!body) {
      setMessage("Enter a message before sending.");
      return;
    }

    if (!student.authUserId) {
      setMessage("This student is missing an auth user ID. Ask the student to log in once or update the profile manually.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("student_messages").insert({
        recipient_id: student.authUserId,
        recipient_name: student.name,
        recipient_email: student.email,
        sender_name: "Dr. Jean Rene Moricette",
        sender_email: adminEmail,
        category: "Direct Message",
        priority: "Important",
        title: "Message from AFF Administration",
        body,
        action_url: "/messages"
      });

      if (error) throw error;

      setMessageDrafts((current) => ({ ...current, [student.id]: "" }));
      setMessage("Student message sent.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to send student message."));
    }
  }

  async function deleteAnnouncement(id: string) {
    setMessage("Deleting announcement...");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
      setMessage("Announcement deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete announcement."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Instructor Admin"
        title="Instructor command center."
        text="Monitor students, submissions, exams, certificates, trading activity, and official academy announcements."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <AdminRouteAudit routeName="/admin" />
          <p className="text-sm text-ink/72">{message}</p>

          {loading ? (
            <div className="terminal-panel p-6 text-ink/76">Verifying administrator access...</div>
          ) : !authorized ? (
            <div className="terminal-panel p-6 text-ink/76">Admin login only.</div>
          ) : (
            <>
              <nav aria-label="Admin operations" className="terminal-panel p-5">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[.22em] text-gold-300">Admin Operations</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Management centers</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {adminDestinations.map((destination) => (
                    <Link key={destination.href} href={destination.href} className="border border-gold-500/25 bg-navy-950 p-4 transition hover:border-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300">
                      <destination.icon className="text-gold-300" size={21} aria-hidden="true" />
                      <p className="mt-3 font-semibold text-white">{destination.label}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/62">{destination.detail}</p>
                    </Link>
                  ))}
                </div>
              </nav>

              <Link href="/admin/command-center" className="terminal-panel flex flex-col gap-3 p-5 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Executive Analytics</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Open AFF Command Center</h2>
                  <p className="mt-2 text-sm text-ink/68">Review enrollment, completion, certification, revenue, media, community, and instructor activity intelligence.</p>
                </div>
                <ExternalLink className="text-gold-300" size={24} />
              </Link>

              <Link href="/certifications" className="terminal-panel flex flex-col gap-3 p-5 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Admin Certification Center</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Manage exams, questions, certificates, and grading queue</h2>
                  <p className="mt-2 text-sm text-ink/68">Open the AFF Certification and Examination Center to review essays, chart analysis responses, automatic scores, pass/fail status, and digital certificate issuance.</p>
                </div>
                <ShieldCheck className="text-gold-300" size={24} />
              </Link>

              <Link href="/degrees" className="terminal-panel flex flex-col gap-3 p-5 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Admin Academic Office</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Manage degrees, credits, transcripts, and graduation approval</h2>
                  <p className="mt-2 text-sm text-ink/68">Open the AFF Degree System to award course credits, review graduation readiness, and approve degree completion.</p>
                </div>
                <GraduationCap className="text-gold-300" size={24} />
              </Link>

              <Link href="/ai-center" className="terminal-panel flex flex-col gap-3 p-5 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">AI Institutional Intelligence</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Review AI engagement, completion, certification, and attendance intelligence</h2>
                  <p className="mt-2 text-sm text-ink/68">Open the AI Center to monitor student learning insights, weakness analysis, progress predictions, and admin analytics.</p>
                </div>
                <Bot className="text-gold-300" size={24} />
              </Link>

              <Link href="/admin/course-management" className="terminal-panel flex flex-col gap-3 p-5 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">AFF Course Management System</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Create courses, modules, lessons, homework, quizzes, and resources</h2>
                  <p className="mt-2 text-sm text-ink/68">Publish managed learning experiences with progress tracking and course completion certificates.</p>
                </div>
                <BookOpen className="text-gold-300" size={24} />
              </Link>

              <Link href="/mobile-app" className="terminal-panel flex flex-col gap-3 p-5 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Mobile Super App Platform</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Manage mobile wallet, notifications, downloads, and app sessions</h2>
                  <p className="mt-2 text-sm text-ink/68">Open the mobile platform to send push-style alerts, review devices, monitor sessions, and support offline learning access.</p>
                </div>
                <TabletSmartphone className="text-gold-300" size={24} />
              </Link>

              <Link href="/broadcast-network" className="terminal-panel flex flex-col gap-3 p-5 transition hover:border-gold-400/60 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Global Broadcasting Network</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Manage media divisions, student submissions, archives, AI show assets, and analytics</h2>
                  <p className="mt-2 text-sm text-ink/68">Open the AFF Global Broadcasting Network for AFF TV Studio, Community Awareness TV, Destiny Alignment TV, Financial Future Network, and Student Media Center.</p>
                </div>
                <Tv className="text-gold-300" size={24} />
              </Link>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {cards.map((card) => (
                  <div key={card.label} className="terminal-panel p-5">
                    <card.icon className="text-gold-300" size={22} />
                    <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
                    <p className="mt-1 text-sm text-ink/66">{card.label}</p>
                  </div>
                ))}
              </div>

              <section id="enrollment-review" className="terminal-panel scroll-mt-28 overflow-hidden">
                <div className="border-b border-gold-500/20 p-5">
                  <h2 className="text-xl font-semibold text-white">Admin Enrollment Review</h2>
                  <p className="mt-2 text-sm text-ink/68">Review new applicants, approve or reject enrollment, assign mentors, suspend access, and send the welcome message.</p>
                </div>
                {pendingApplications.length === 0 ? (
                  <p className="p-5 text-ink/68">No pending enrollment applications found.</p>
                ) : (
                  <div className="grid gap-px bg-gold-500/16">
                    {pendingApplications.map((application) => {
                      const approvalState = approvalStates[application.id];
                      const approving = Boolean(approvalState?.loading);

                      return (
                      <article key={application.id} className="bg-navy-950 p-5">
                        <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
                          <div>
                            <p className="text-xs uppercase tracking-[.2em] text-gold-300">{application.applicationStatus}</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">{application.fullName}</h3>
                            <p className="mt-2 text-sm text-ink/64">{application.email} - {application.phone} - {application.country}</p>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <Metric label="Student ID" value={application.studentId} />
                              <Metric label="Program" value={application.programInterest} />
                              <Metric label="Membership" value={application.membershipPlan} />
                            </div>
                            {application.goalStatement ? <p className="mt-4 leading-7 text-ink/74">{application.goalStatement}</p> : null}
                          </div>
                          <div className="grid gap-3">
                            <label className="grid gap-2 text-sm text-ink/74">
                              Mentor assignment
                              <input
                                className="border border-gold-500/24 bg-navy-900 px-4 py-3 text-white outline-none focus:border-gold-400"
                                value={mentorDrafts[application.id] ?? ""}
                                onChange={(event) => setMentorDrafts((current) => ({ ...current, [application.id]: event.target.value }))}
                              />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-3 py-3 text-xs font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => reviewApplication(application, "Approved")} disabled={approving}>
                                <FileCheck size={15} /> {approving ? "Approving..." : "Approve"}
                              </button>
                              <button className="inline-flex items-center justify-center gap-2 border border-red-300/45 px-3 py-3 text-xs font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => reviewApplication(application, "Rejected")} disabled={approving}>
                                <FileX size={15} /> Reject
                              </button>
                              <button className="inline-flex items-center justify-center gap-2 border border-gold-500/35 px-3 py-3 text-xs font-semibold text-gold-300 disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => reviewApplication(application, "Suspended")} disabled={approving}>
                                Suspend
                              </button>
                            </div>
                            {approvalState?.message ? (
                              <p className={`border px-3 py-2 text-sm ${approvalState.message.startsWith("Approval failed") ? "border-red-300/40 text-red-200" : "border-gold-500/25 text-gold-300"}`}>
                                {approvalState.message}
                              </p>
                            ) : null}
                            <div className="border border-gold-500/18 bg-navy-900 p-4">
                              <p className="text-xs uppercase tracking-[.18em] text-gold-300">Email-ready welcome message</p>
                              <p className="mt-2 text-sm font-semibold text-white">Welcome to Academy for Financial Future.</p>
                            </div>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="terminal-panel scroll-mt-28 overflow-hidden">
                <div className="border-b border-gold-500/20 p-5">
                  <h2 className="text-xl font-semibold text-white">Approved / Active Students</h2>
                  <p className="mt-2 text-sm text-ink/68">Recently approved applicants are moved here after their enrollment account becomes active.</p>
                </div>
                {approvedApplications.length === 0 ? (
                  <p className="p-5 text-ink/68">No approved enrollment applications found.</p>
                ) : (
                  <div className="grid gap-px bg-gold-500/16 md:grid-cols-2">
                    {approvedApplications.map((application) => (
                      <article key={application.id} className="bg-navy-950 p-5">
                        <p className="text-xs uppercase tracking-[.2em] text-gold-300">{application.applicationStatus}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{application.fullName}</h3>
                        <p className="mt-2 text-sm text-ink/64">{application.email}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Metric label="Student ID" value={application.studentId} />
                          <Metric label="Program" value={application.programInterest} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="terminal-panel overflow-hidden">
                <div className="border-b border-gold-500/20 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Admin Student Management Panel</h2>
                      <p className="mt-2 text-sm text-ink/68">View students, search records, suspend access, upgrade memberships, review progress, and send direct messages.</p>
                    </div>
                    <label className="flex min-w-0 items-center gap-2 border border-gold-500/24 bg-navy-950 px-4 py-3 text-ink xl:w-96">
                      <Search className="shrink-0 text-gold-300" size={18} />
                      <input className="min-w-0 flex-1 bg-transparent text-white outline-none" placeholder="Search students..." value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} />
                    </label>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] border-separate border-spacing-y-1 text-sm">
                    <thead>
                      <tr className="bg-navy-800 text-left text-xs uppercase tracking-[.16em] text-gold-300">
                        <th className="p-4">Student</th>
                        <th className="p-4">Enrollment</th>
                        <th className="p-4">Membership</th>
                        <th className="p-4">Progress</th>
                        <th className="p-4">Actions</th>
                        <th className="p-4">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => {
                        const studentAssignments = assignments.filter((assignment) => assignment.studentId === student.authUserId || assignment.studentId === student.id).length;
                        const studentExams = exams.filter((exam) => exam.studentId === student.authUserId || exam.studentId === student.id).length;
                        const studentCertificates = certificates.filter((certificate) => certificate.studentId === student.authUserId || certificate.studentId === student.id).length;

                        return (
                          <tr key={student.id} className="bg-navy-950 align-top">
                            <td className="p-4">
                              <p className="font-semibold text-white">{student.name}</p>
                              <p className="mt-1 text-xs text-gold-300">{student.studentId}</p>
                              <p className="mt-1 text-xs text-ink/58">{student.email}</p>
                            </td>
                            <td className="p-4 text-ink/76">
                              <p>{new Date(student.enrollmentDate).toLocaleDateString()}</p>
                              <p className="mt-1 text-xs text-ink/58">{student.certificationLevel}</p>
                              <p className="mt-2 inline-flex border border-gold-500/25 px-2 py-1 text-xs text-gold-300">{student.status}</p>
                            </td>
                            <td className="p-4">
                              <div className="grid gap-2">
                                <select
                                  className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                                  value={membershipDrafts[student.id] ?? student.selectedMembershipPlan}
                                  onChange={(event) => setMembershipDrafts((current) => ({ ...current, [student.id]: event.target.value }))}
                                >
                                  <option>Free Trial</option>
                                  <option>Monthly Membership</option>
                                  <option>Annual Membership</option>
                                  <option>Premium Mentorship</option>
                                  <option>Certification Fee</option>
                                </select>
                                <p className="text-xs text-ink/58">Selected Plan: {student.selectedMembershipPlan}</p>
                                <p className="text-xs text-ink/58">Current Plan: {student.membershipPlan}</p>
                                <p className="text-xs text-ink/58">Payment Status: {student.paymentStatus}</p>
                                <p className="text-xs text-ink/58">Membership Status: {student.membershipStatus}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="grid gap-2 text-xs text-ink/76">
                                <span>{studentAssignments} assignments</span>
                                <span>{studentExams} exam attempts</span>
                                <span>{studentCertificates} certificates</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="grid gap-2">
                                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-3 py-2 text-xs font-bold text-navy-950" type="button" onClick={() => upgradeMembership(student)}>
                                  <CreditCard size={14} /> Save Selected Plan
                                </button>
                                <button className="border border-gold-500/35 px-3 py-2 text-xs font-semibold text-gold-300" type="button" onClick={() => updateMembershipWorkflow(student, "mark-paid")}>
                                  Mark Paid
                                </button>
                                <button className="border border-green-300/45 px-3 py-2 text-xs font-semibold text-green-200" type="button" onClick={() => updateMembershipWorkflow(student, "activate")}>
                                  Activate Membership
                                </button>
                                <button className="border border-amber-300/45 px-3 py-2 text-xs font-semibold text-amber-200" type="button" onClick={() => updateMembershipWorkflow(student, "suspend")}>
                                  Suspend Membership
                                </button>
                                <button className="border border-red-300/45 px-3 py-2 text-xs font-semibold text-red-200" type="button" onClick={() => updateMembershipWorkflow(student, "cancel")}>
                                  Cancel Membership
                                </button>
                                <button className="border border-gold-500/35 px-3 py-2 text-xs font-semibold text-gold-300" type="button" onClick={() => updateStudentStatus(student, student.status === "Suspended" ? "Active" : "Suspended")}>
                                  {student.status === "Suspended" ? "Reactivate" : "Suspend"}
                                </button>
                              </div>
                            </td>
                            <td className="min-w-[280px] p-4">
                              <div className="grid gap-2">
                                <textarea
                                  className="min-h-20 border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                                  placeholder="Send direct message..."
                                  value={messageDrafts[student.id] ?? ""}
                                  onChange={(event) => setMessageDrafts((current) => ({ ...current, [student.id]: event.target.value }))}
                                />
                                <button className="inline-flex items-center justify-center gap-2 border border-gold-500/40 px-3 py-2 text-xs font-semibold text-gold-300" type="button" onClick={() => sendStudentMessage(student)}>
                                  <Send size={14} /> Send
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="terminal-panel p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Instructor Grading Center</h2>
                    <p className="mt-2 text-sm text-ink/68">Approved assignments count toward certification unlock requirements.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 border border-gold-500/30 px-3 py-2 text-xs uppercase tracking-[.18em] text-gold-300">
                    <ShieldCheck size={15} /> Admin Review
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <Metric label="Pending Review" value={String(gradingStats.pending)} />
                  <Metric label="Approved" value={String(gradingStats.approved)} />
                  <Metric label="Rejected" value={String(gradingStats.rejected)} />
                  <Metric label="Average Grade" value={`${gradingStats.averageGrade}%`} />
                </div>
              </section>

              <AdminTable title="Assignments" headers={["Student", "Assignment", "Course/Module", "Lesson", "Date", "File", "Review"]}>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="bg-navy-950">
                    <td className="p-4 text-ink/76">{studentMap.get(assignment.studentId)?.name ?? "Student"}</td>
                    <td className="p-4 text-ink/76">{assignment.title}</td>
                    <td className="p-4 text-ink/76">{assignment.courseModule}</td>
                    <td className="p-4 text-ink/76">{assignment.lessonTitle}</td>
                    <td className="p-4 text-ink/76">{new Date(assignment.submissionDate).toLocaleDateString()}</td>
                    <td className="p-4">
                      {assignment.fileUrl ? (
                        <a className="inline-flex items-center gap-2 text-gold-300" href={assignment.fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink size={15} /> Open File
                        </a>
                      ) : (
                        <span className="text-ink/50">No file</span>
                      )}
                    </td>
                    <td className="min-w-[320px] p-4">
                      <div className="grid gap-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
                          <select
                            className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                            value={assignmentReviews[assignment.id]?.status ?? assignment.status}
                            onChange={(event) => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { grade: "", instructorFeedback: "" }), status: event.target.value }
                            }))}
                          >
                            <option>Submitted</option>
                            <option>In Review</option>
                            <option>Needs Revision</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                          </select>
                          <input
                            className="border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Grade"
                            value={assignmentReviews[assignment.id]?.grade ?? ""}
                            onChange={(event) => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { status: assignment.status, instructorFeedback: "" }), grade: event.target.value }
                            }))}
                          />
                        </div>
                        <textarea
                          className="min-h-20 border border-gold-500/24 bg-navy-900 px-3 py-2 text-ink outline-none"
                          placeholder="Instructor feedback"
                          value={assignmentReviews[assignment.id]?.instructorFeedback ?? ""}
                          onChange={(event) => setAssignmentReviews((current) => ({
                            ...current,
                            [assignment.id]: { ...(current[assignment.id] ?? { status: assignment.status, grade: "" }), instructorFeedback: event.target.value }
                          }))}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            className="inline-flex items-center justify-center gap-2 border border-emerald-300/45 px-3 py-2 text-xs font-semibold text-emerald-200"
                            type="button"
                            onClick={() => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { grade: "", instructorFeedback: "" }), status: "Approved" }
                            }))}
                          >
                            <FileCheck size={15} /> Approve
                          </button>
                          <button
                            className="inline-flex items-center justify-center gap-2 border border-red-300/45 px-3 py-2 text-xs font-semibold text-red-200"
                            type="button"
                            onClick={() => setAssignmentReviews((current) => ({
                              ...current,
                              [assignment.id]: { ...(current[assignment.id] ?? { grade: "", instructorFeedback: "" }), status: "Rejected" }
                            }))}
                          >
                            <FileX size={15} /> Reject
                          </button>
                        </div>
                        <button className="bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" type="button" onClick={() => saveAssignmentReview(assignment.id)}>
                          Save Review
                        </button>
                        <div className="border-t border-gold-500/15 pt-3">
                          <p className="text-xs uppercase tracking-[.18em] text-gold-300">Grading History</p>
                          {assignment.gradingHistory.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                              {assignment.gradingHistory.slice().reverse().map((entry, index) => (
                                <div key={`${assignment.id}-${entry.reviewedAt}-${index}`} className="border border-gold-500/14 bg-navy-900 p-3">
                                  <p className="text-xs text-white">
                                    {entry.status} {entry.grade !== null ? `- ${entry.grade}%` : ""}
                                  </p>
                                  <p className="mt-1 text-xs text-ink/58">
                                    {new Date(entry.reviewedAt).toLocaleString()} by {entry.reviewedBy}
                                  </p>
                                  {entry.feedback ? <p className="mt-2 text-xs leading-5 text-ink/70">{entry.feedback}</p> : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-ink/52">No review history yet.</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>

              <section className="terminal-panel p-5">
                <h2 className="text-xl font-semibold text-white">Exam Completion Statistics</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-5">
                  <Metric label="Attempts" value={String(examStats.attempts)} />
                  <Metric label="Passed" value={String(examStats.passed)} />
                  <Metric label="Pass Rate" value={`${examStats.passRate}%`} />
                  <Metric label="Average Score" value={`${examStats.averageScore}%`} />
                  <Metric label="Highest Score" value={`${examStats.highestScore}%`} />
                </div>
              </section>

              <AdminTable title="Exams" headers={["Student", "Exam", "Attempt", "Score", "Pass/Fail", "Time", "Date"]}>
                {exams.map((exam) => (
                  <TableRow key={exam.id} cells={[
                    studentMap.get(exam.studentId)?.name ?? exam.studentName,
                    exam.examTitle,
                    String(exam.attemptNumber),
                    `${exam.score}%`,
                    exam.result,
                    `${Math.round(exam.durationSeconds / 60)} min`,
                    new Date(exam.submittedAt).toLocaleDateString()
                  ]} />
                ))}
              </AdminTable>

              <AdminTable title="Certificates" headers={["Certificate Number", "Student Name", "Verification Code", "Issue Date"]}>
                {certificates.map((certificate) => (
                  <TableRow key={certificate.id} cells={[
                    certificate.certificateNumber,
                    certificate.studentName,
                    certificate.verificationCode,
                    new Date(certificate.issueDate).toLocaleDateString()
                  ]} />
                ))}
              </AdminTable>

              <AdminZoomSessionManager />

              <AdminMessageCenter />

              <AdminAICoachKnowledge />

              <AdminSimulatorReview />

              <AdminSocialModeration />

              <AdminTVStudio />

              <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form onSubmit={saveAnnouncement} className="terminal-panel grid h-fit gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <Megaphone className="text-gold-300" size={22} />
                    <h2 className="text-xl font-semibold text-white">{announcementForm.id ? "Edit Announcement" : "Create Announcement"}</h2>
                  </div>
                  <label className="grid gap-2 text-sm text-ink/74">
                    Title
                    <input
                      className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                      value={announcementForm.title}
                      onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-ink/74">
                    Body
                    <textarea
                      className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                      value={announcementForm.body}
                      onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))}
                      required
                    />
                  </label>
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                    <Save size={18} /> Save Announcement
                  </button>
                </form>

                <div className="grid gap-3">
                  {announcements.map((announcement) => (
                    <article key={announcement.id} className="terminal-panel p-5">
                      <p className="text-xs uppercase tracking-[.22em] text-gold-300">{new Date(announcement.published_at).toLocaleDateString()}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{announcement.title}</h3>
                      <p className="mt-3 leading-7 text-ink/72">{announcement.body}</p>
                      <div className="mt-4 flex gap-3">
                        <button className="border border-gold-500/45 px-4 py-2 text-sm text-gold-300" type="button" onClick={() => setAnnouncementForm(announcement)}>
                          Edit
                        </button>
                        <button className="inline-flex items-center gap-2 border border-red-300/45 px-4 py-2 text-sm text-red-200" type="button" onClick={() => deleteAnnouncement(announcement.id)}>
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </SectionInner>
      </Section>
    </>
  );
}

function AdminTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <section className="terminal-panel overflow-x-auto">
      <div className="border-b border-gold-500/20 p-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-navy-800">
            {headers.map((header) => (
              <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

function TableRow({ cells }: { cells: string[] }) {
  return (
    <tr className="bg-navy-950">
      {cells.map((cell, index) => (
        <td key={`${cell}-${index}`} className="p-4 text-ink/76">{cell}</td>
      ))}
    </tr>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/20 bg-navy-950 p-4">
      <p className="text-2xl font-semibold text-gold-300">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[.18em] text-ink/60">{label}</p>
    </div>
  );
}
