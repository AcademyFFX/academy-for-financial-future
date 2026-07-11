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
  enrollmentStatus: string;
  membershipPlan: string;
  profilePhotoUrl: string;
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

function normalizeStudent(row: DbRow): DirectoryStudent {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    fullName: value(row, ["full_name"], "AFF Student"),
    studentId: value(row, ["auth_user_id"], "Pending"),
    certificationLevel: value(row, ["certification_level"], "Academy for Financial Future"),
    enrollmentStatus: normalizeEnrollmentStatus(value(row, ["status"], "Pending Review")),
    membershipPlan: value(row, ["membership_plan"], "Free Trial"),
    profilePhotoUrl: value(row, ["profile_photo_url"])
  };
}

export default function StudentDirectoryPage() {
  const router = useRouter();
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading student directory...");

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

      const { data, error } = await supabase
        .from("students")
        .select("id, auth_user_id, full_name, certification_level, status")
        .eq("status", "Active")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setStudents(((data ?? []) as DbRow[]).map(normalizeStudent));
      setMessage("Active student directory loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load student directory.");
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
              <label className="flex min-w-0 items-center gap-2 border border-gold-500/25 bg-navy-950 px-4 py-3 text-ink md:w-96">
                <Search className="shrink-0 text-gold-300" size={18} />
                <input className="min-w-0 flex-1 bg-transparent text-white outline-none" placeholder="Search students..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="terminal-panel p-6 text-ink/72">Loading directory...</div>
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
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    <DirectoryLine icon={<Award size={16} />} label="Certification Level" value={student.certificationLevel} />
                    <DirectoryLine icon={<ShieldCheck size={16} />} label="Enrollment Status" value={student.enrollmentStatus} />
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
