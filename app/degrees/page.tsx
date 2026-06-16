"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, BookOpenCheck, FileCheck2, GraduationCap, Landmark, Save, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";

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

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

export default function DegreesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AFF degree programs...");
  const [userEmail, setUserEmail] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [studentId, setStudentId] = useState("");
  const [degrees, setDegrees] = useState<DbRow[]>([]);
  const [requirements, setRequirements] = useState<DbRow[]>([]);
  const [credits, setCredits] = useState<DbRow[]>([]);
  const [approvals, setApprovals] = useState<DbRow[]>([]);
  const [students, setStudents] = useState<DbRow[]>([]);
  const [adminCreditForm, setAdminCreditForm] = useState({
    studentAuthId: "",
    studentName: "",
    affStudentId: "",
    courseTitle: "Forex Foundations",
    creditsEarned: "3",
    grade: "A",
    completionStatus: "Completed"
  });

  const isAdmin = userEmail.toLowerCase() === adminEmail;

  const loadDegrees = useCallback(async () => {
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
      const [studentResult, degreeResult, requirementResult, creditResult, approvalResult, studentsResult] = await Promise.all([
        supabase.from("students").select("*").eq("email", user.email ?? "").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("academic_degree_programs").select("*").order("credits_required", { ascending: true }),
        supabase.from("degree_requirements").select("*").order("display_order", { ascending: true }),
        admin ? supabase.from("student_credits").select("*").order("created_at", { ascending: false }).limit(300) : supabase.from("student_credits").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        admin ? supabase.from("graduation_approvals").select("*").order("created_at", { ascending: false }).limit(200) : supabase.from("graduation_approvals").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        admin ? supabase.from("students").select("*").order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null })
      ]);

      for (const result of [degreeResult, requirementResult, creditResult, approvalResult, studentsResult]) {
        if (result.error) throw result.error;
      }

      const student = (studentResult.data ?? {}) as DbRow;
      const resolvedName = value(student, ["full_name", "name"], user.user_metadata?.full_name ?? user.email ?? "Student");
      const resolvedStudentId = value(student, ["student_id"], user.id);
      setStudentName(resolvedName);
      setStudentId(resolvedStudentId);
      setDegrees((degreeResult.data ?? []) as DbRow[]);
      setRequirements((requirementResult.data ?? []) as DbRow[]);
      setCredits((creditResult.data ?? []) as DbRow[]);
      setApprovals((approvalResult.data ?? []) as DbRow[]);
      setStudents((studentsResult.data ?? []) as DbRow[]);
      setMessage("Degree programs and academic credits synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the AFF academic degree migration to enable this page.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDegrees();
  }, [loadDegrees]);

  const creditsCompleted = useMemo(() => {
    return credits
      .filter((row) => value(row, ["completion_status"]) === "Completed")
      .reduce((total, row) => total + numberValue(row, ["credits_earned", "credits"]), 0);
  }, [credits]);

  async function requestGraduationReview(degree: DbRow) {
    setMessage("Submitting graduation review request...");
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");
      const required = numberValue(degree, ["credits_required"]);
      const { error } = await supabase.from("graduation_approvals").insert({
        student_id: user.id,
        student_name: studentName,
        aff_student_id: studentId,
        degree_program_id: value(degree, ["id"]),
        degree_name: value(degree, ["degree_name"]),
        credits_required: required,
        credits_completed: creditsCompleted,
        approval_status: creditsCompleted >= required ? "Pending Review" : "Pending Review",
        comments: creditsCompleted >= required ? "Student meets credit threshold for academic office review." : "Student requested early graduation readiness review."
      });
      if (error) throw error;
      setMessage("Graduation review request submitted to the Academic Office.");
      await loadDegrees();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit graduation review.");
    }
  }

  async function saveStudentCredit() {
    setMessage("Saving student credit record...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("student_credits").insert({
        student_id: adminCreditForm.studentAuthId,
        student_name: adminCreditForm.studentName,
        aff_student_id: adminCreditForm.affStudentId,
        course_title: adminCreditForm.courseTitle,
        credits_earned: Number(adminCreditForm.creditsEarned),
        grade: adminCreditForm.grade,
        completion_status: adminCreditForm.completionStatus,
        completed_at: adminCreditForm.completionStatus === "Completed" ? new Date().toISOString().slice(0, 10) : null
      });
      if (error) throw error;
      setMessage("Student credit record saved.");
      await loadDegrees();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save student credit.");
    }
  }

  async function approveGraduation(row: DbRow, status: "Approved" | "Rejected") {
    setMessage("Updating graduation approval...");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("graduation_approvals")
        .update({
          approval_status: status,
          approved_by: adminEmail,
          approved_at: new Date().toISOString(),
          comments: status === "Approved" ? "Graduation approved by AFF Academic Office." : "Graduation request returned for additional requirements."
        })
        .eq("id", value(row, ["id"]));
      if (error) throw error;
      setMessage(`Graduation ${status.toLowerCase()}.`);
      await loadDegrees();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update graduation approval.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Degree Programs"
        title="Academic degree framework and graduation tracking."
        text="Track credits required, credits completed, remaining credits, graduation readiness, and Academic Office approval for AFF degree programs."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-ink/70">{message}</p>
              <p className="mt-2 text-xs uppercase tracking-[.18em] text-gold-300">{studentName} · {studentId}</p>
            </div>
            <Link href="/transcripts" className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-3 text-sm font-semibold text-gold-300">
              <FileCheck2 size={18} /> Open Transcript
            </Link>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<GraduationCap size={22} />} label="Degree Programs" value={String(degrees.length)} />
            <Metric icon={<BookOpenCheck size={22} />} label="Credits Completed" value={String(creditsCompleted)} />
            <Metric icon={<ShieldCheck size={22} />} label="Graduation Reviews" value={String(approvals.length)} />
            <Metric icon={<Award size={22} />} label="Academic Standing" value={creditsCompleted > 0 ? "Active" : "Pending"} />
          </section>

          <section className="grid gap-5">
            {degrees.map((degree) => {
              const required = numberValue(degree, ["credits_required"]);
              const remaining = Math.max(0, required - creditsCompleted);
              const progress = percent(creditsCompleted, required);
              const degreeRequirements = requirements.filter((row) => value(row, ["degree_program_id"]) === value(degree, ["id"]));
              return (
                <article key={value(degree, ["id"])} className="terminal-panel p-6">
                  <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                    <div>
                      <p className="text-xs uppercase tracking-[.22em] text-gold-300">{value(degree, ["degree_level"])} · {value(degree, ["degree_id"])}</p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">{value(degree, ["degree_name"])}</h2>
                      <p className="mt-3 leading-7 text-ink/70">{value(degree, ["description"])}</p>
                      <div className="mt-5 h-2 bg-navy-800">
                        <div className="h-full bg-gold-500" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <Mini label="Credits Required" value={String(required)} />
                        <Mini label="Credits Completed" value={String(creditsCompleted)} />
                        <Mini label="Remaining Credits" value={String(remaining)} />
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <Mini label="Graduation Eligibility" value={remaining === 0 ? "Eligible for Review" : "In Progress"} />
                      <Mini label="Completion Percentage" value={`${progress}%`} />
                      <button className="bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-60" disabled={loading} type="button" onClick={() => requestGraduationReview(degree)}>
                        Request Graduation Review
                      </button>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {degreeRequirements.map((requirement) => (
                      <Mini key={value(requirement, ["id"])} label={value(requirement, ["requirement_category"])} value={`${value(requirement, ["requirement_name"])} · ${value(requirement, ["credits_required"])} credits`} />
                    ))}
                  </div>
                </article>
              );
            })}
          </section>

          {isAdmin ? (
            <section className="terminal-panel p-6">
              <div className="flex items-center gap-3">
                <Landmark className="text-gold-300" size={24} />
                <h2 className="text-2xl font-semibold text-white">Admin Academic Office</h2>
              </div>
              <p className="mt-2 text-sm text-ink/68">Manage degrees, credits, student academic records, and graduation approval.</p>
              <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
                <div className="grid gap-3 border border-gold-500/20 bg-navy-950 p-4">
                  <select
                    className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none"
                    value={adminCreditForm.studentAuthId}
                    onChange={(event) => {
                      const student = students.find((row) => value(row, ["auth_user_id"]) === event.target.value);
                      setAdminCreditForm((current) => ({
                        ...current,
                        studentAuthId: event.target.value,
                        studentName: value(student ?? {}, ["full_name", "name"]),
                        affStudentId: value(student ?? {}, ["student_id"])
                      }));
                    }}
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={value(student, ["id"])} value={value(student, ["auth_user_id"])}>{value(student, ["full_name", "name"])} · {value(student, ["student_id"])}</option>
                    ))}
                  </select>
                  <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={adminCreditForm.courseTitle} onChange={(event) => setAdminCreditForm((current) => ({ ...current, courseTitle: event.target.value }))} placeholder="Course title" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={adminCreditForm.creditsEarned} onChange={(event) => setAdminCreditForm((current) => ({ ...current, creditsEarned: event.target.value }))} placeholder="Credits" />
                    <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={adminCreditForm.grade} onChange={(event) => setAdminCreditForm((current) => ({ ...current, grade: event.target.value }))} placeholder="Grade" />
                  </div>
                  <select className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={adminCreditForm.completionStatus} onChange={(event) => setAdminCreditForm((current) => ({ ...current, completionStatus: event.target.value }))}>
                    <option>Completed</option>
                    <option>In Progress</option>
                    <option>Transferred</option>
                    <option>Not Started</option>
                  </select>
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950" type="button" onClick={saveStudentCredit}>
                    <Save size={18} /> Save Credit
                  </button>
                </div>

                <div className="grid gap-3">
                  {approvals.length === 0 ? (
                    <p className="border border-gold-500/18 bg-navy-950 p-4 text-sm text-ink/68">No graduation reviews yet.</p>
                  ) : approvals.map((approval) => (
                    <article key={value(approval, ["id"])} className="border border-gold-500/20 bg-navy-950 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(approval, ["approval_status"])}</p>
                          <h3 className="mt-2 font-semibold text-white">{value(approval, ["student_name"])} · {value(approval, ["degree_name"])}</h3>
                          <p className="mt-1 text-sm text-ink/64">{value(approval, ["credits_completed"])} / {value(approval, ["credits_required"])} credits · {shortDate(value(approval, ["created_at"]))}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="border border-emerald-300/45 px-3 py-2 text-xs font-semibold text-emerald-200" type="button" onClick={() => approveGraduation(approval, "Approved")}>Approve</button>
                          <button className="border border-red-300/45 px-3 py-2 text-xs font-semibold text-red-200" type="button" onClick={() => approveGraduation(approval, "Rejected")}>Reject</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
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
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-[10px] uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value || "Not recorded"}</p>
    </div>
  );
}
