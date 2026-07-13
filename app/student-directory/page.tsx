"use client";

import { useRouter } from "next/navigation";
import { Award, Search, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
const enrollmentStatuses = ["Pending Review", "Active", "Suspended", "Graduated"] as const;

type DirectoryStudent = {
  id: string;
  fullName: string;
  studentId: string;
  certificationLevel: string;
  enrollmentDate: string;
  enrollmentStatus: string;
  membershipPlan: string;
  membershipStatus: string;
  profilePhotoUrl: string;
  email: string;
};

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function normalizeEnrollmentStatus(status: string) {
  return enrollmentStatuses.includes(status as (typeof enrollmentStatuses)[number]) ? status : "Pending Review";
}

function formatDate(raw: string) {
  if (!raw || raw === "Not recorded") return "Not recorded";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function normalizeStudent(row: DbRow): DirectoryStudent {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    fullName: value(row, ["full_name"], "AFF Student"),
    studentId: value(row, ["aff_student_id", "student_id"], "Pending"),
    certificationLevel: value(row, ["certification_level"], "Academy for Financial Future"),
    enrollmentDate: value(row, ["enrollment_date"], "Not recorded"),
    enrollmentStatus: normalizeEnrollmentStatus(value(row, ["enrollment_status", "status"], "Pending Review")),
    membershipPlan: value(row, ["active_membership_plan"], "Free Trial"),
    membershipStatus: value(row, ["membership_status"], "Pending Payment"),
    profilePhotoUrl: value(row, ["profile_photo_url"]),
    email: value(row, ["email"])
  };
}

function formatSupabaseError(error: unknown) {
  if (!error || typeof error !== "object") return "Unable to load student directory.";
  const row = error as { code?: string; message?: string; details?: string; hint?: string };
  return [
    row.code ? `Code: ${row.code}` : "",
    row.message ? `Message: ${row.message}` : "",
    row.details ? `Details: ${row.details}` : "",
    row.hint ? `Hint: ${row.hint}` : ""
  ].filter(Boolean).join(" | ") || "Unable to load student directory.";
}

export default function StudentDirectoryPage() {
  const router = useRouter();
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading student directory...");
  const [loadError, setLoadError] = useState("");

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [student.fullName, student.studentId, student.certificationLevel, student.enrollmentStatus, student.membershipPlan]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [query, students]);

  const loadDirectory = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const studentsResult = await supabase.rpc("get_aff_student_directory");

      if (studentsResult.error) {
        setStudents([]);
        const formattedError = formatSupabaseError(studentsResult.error);
        setLoadError(formattedError);
        setMessage(`Unable to load student directory: ${formattedError}`);
        return;
      }
      const sortedStudents = ((studentsResult.data ?? []) as DbRow[])
        .map(normalizeStudent)
        .sort((first, second) => first.fullName.localeCompare(second.fullName));
      setStudents(sortedStudents);
      setLoadError("");
      setMessage("Active student directory loaded.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : formatSupabaseError(error);
      setLoadError(errorMessage);
      setMessage(`Unable to load student directory: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  return (
    <>
      <PageHeader
        eyebrow="Student Directory"
        title="Active Academy student directory."
        text="Review active students, certification levels, and membership standing across the Academy for Financial Future."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <div className="terminal-panel p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Active Students</h2>
                <p className="mt-2 text-sm text-ink/68">{message}</p>
              </div>
              {loadError ? (
                <button className="border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300" type="button" onClick={loadDirectory}>
                  Retry
                </button>
              ) : null}
              <label className="flex min-w-0 items-center gap-2 border border-gold-500/25 bg-navy-950 px-4 py-3 text-ink md:w-96">
                <Search className="shrink-0 text-gold-300" size={18} />
                <input className="min-w-0 flex-1 bg-transparent text-white outline-none" placeholder="Search students..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="terminal-panel p-6 text-ink/72">Loading directory...</div>
          ) : loadError ? (
            <div className="terminal-panel p-6 text-red-200">Directory query failed: {loadError}</div>
          ) : filteredStudents.length === 0 ? (
            <div className="terminal-panel p-6 text-ink/72">No active students found.</div>
          ) : (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredStudents.map((student) => (
                <article key={student.id} className="terminal-panel p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-gold-500/30 bg-navy-950">
                      {student.profilePhotoUrl ? (
                        <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${student.profilePhotoUrl})` }} aria-label={`${student.fullName} profile photo`} />
                      ) : (
                        <UserRound className="text-gold-300" size={26} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-semibold text-white">{student.fullName}</h3>
                      <p className="mt-1 text-sm text-gold-300">{student.studentId}</p>
                      <p className="mt-1 break-words text-xs text-ink/58">{student.email}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <DirectoryLine icon={<Award size={16} />} label="Certification Level" value={student.certificationLevel} />
                    <DirectoryLine icon={<ShieldCheck size={16} />} label="Enrollment Date" value={formatDate(student.enrollmentDate)} />
                    <DirectoryLine icon={<ShieldCheck size={16} />} label="Enrollment Status" value={student.enrollmentStatus} />
                    <DirectoryLine icon={<ShieldCheck size={16} />} label="Current Plan" value={student.membershipPlan} />
                    <DirectoryLine icon={<ShieldCheck size={16} />} label="Membership Status" value={student.membershipStatus} />
                  </div>
                </article>
              ))}
            </section>
          )}
        </SectionInner>
      </Section>
    </>
  );
}

function DirectoryLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-gold-500/16 bg-navy-950 p-3">
      <div className="flex items-center gap-2 text-gold-300">
        {icon}
        <p className="text-[10px] uppercase tracking-[.18em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
