"use client";

import { useRouter } from "next/navigation";
import { Award, BookOpenCheck, CalendarCheck, Camera, ChartCandlestick, ClipboardCheck, CreditCard, Mail, ShieldCheck, Upload, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;
const enrollmentStatuses = ["Pending Review", "Active", "Suspended", "Graduated"] as const;

type StudentProfile = {
  id: string;
  authUserId: string;
  studentId: string;
  fullName: string;
  email: string;
  membershipLevel: string;
  membershipStatus: string;
  enrollmentDate: string;
  certificationLevel: string;
  certificationStatus: string;
  status: string;
  profilePhotoUrl: string;
};

function value(row: DbRow | null, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row?.[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function normalizeEnrollmentStatus(status: string) {
  return enrollmentStatuses.includes(status as (typeof enrollmentStatuses)[number]) ? status : "Pending Review";
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [certificationsEarned, setCertificationsEarned] = useState(0);
  const [courseProgress, setCourseProgress] = useState(0);
  const [journalEntries, setJournalEntries] = useState(0);
  const [attendanceHistory, setAttendanceHistory] = useState<DbRow[]>([]);
  const [assignmentsSubmitted, setAssignmentsSubmitted] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading student profile...");

  const loadProfile = useCallback(async () => {
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

      const email = user.email ?? "";
      const [studentResult, applicationResult, profileResult, certificatesResult, certificationsResult, progressResult, journalResult, lessonsResult, attendanceResult, assignmentsResult] = await Promise.all([
        supabase.from("students").select("*").or(`auth_user_id.eq.${user.id},email.eq.${email}`).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("student_applications").select("*").or(`auth_user_id.eq.${user.id},email.eq.${email}`).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("student_profiles").select("*").eq("auth_user_id", user.id).maybeSingle(),
        supabase.from("certificates").select("id").eq("student_id", user.id),
        supabase.from("certifications").select("id").eq("student_id", user.id),
        supabase.from("lesson_progress").select("id").eq("student_id", user.id),
        supabase.from("trading_journal").select("id").eq("student_id", user.id),
        supabase.from("lessons").select("id"),
        supabase.from("zoom_attendance").select("*").eq("student_id", user.id).order("joined_at", { ascending: false }).limit(8),
        supabase.from("assignments").select("id").eq("student_id", user.id)
      ]);

      if (studentResult.error) throw studentResult.error;

      const row = (studentResult.data ?? {}) as DbRow;
      const applicationRow = (applicationResult.data ?? {}) as DbRow;
      const profileRow = (profileResult.data ?? {}) as DbRow;
      const { data: membershipData } = await supabase.from("student_memberships").select("*").eq("student_id", user.id).maybeSingle();
      const membershipRow = (membershipData ?? {}) as DbRow;
      const internalStudentId = value(row, ["id"]);
      const enrollmentResult = internalStudentId
        ? await supabase.from("enrollments").select("*").eq("student_id", internalStudentId).order("enrolled_at", { ascending: false }).limit(1)
        : { data: [], error: null };
      const enrollmentRow = ((enrollmentResult.data ?? []) as DbRow[])[0] ?? {};
      const enrollmentStatus = normalizeEnrollmentStatus(value(row, ["status"], "Pending Review"));
      const earnedCredentialCount = (certificatesResult.data ?? []).length + (certificationsResult.data ?? []).length;
      const loadedProfile: StudentProfile = {
        id: value(row, ["id"]),
        authUserId: value(row, ["auth_user_id"], user.id),
        studentId: value(applicationRow, ["student_id"], value(row, ["student_id"], value(profileRow, ["student_id"], "Not assigned"))),
        fullName: value(row, ["full_name"], value(applicationRow, ["full_name"], value(profileRow, ["full_name"], user.user_metadata?.full_name as string | undefined ?? email))),
        email: value(profileRow, ["email"], value(row, ["email"], email)),
        membershipLevel: value(membershipRow, ["active_membership_plan", "membership_plan"], value(row, ["membership_plan"], value(profileRow, ["membership_level"], "Free Trial"))),
        membershipStatus: enrollmentStatus,
        enrollmentDate: value(row, ["enrollment_date"], value(enrollmentRow, ["enrolled_at"], value(row, ["created_at"]))),
        certificationLevel: value(applicationRow, ["program_interest"], value(row, ["certification_level"], value(profileRow, ["program_interest"], "Academy for Financial Future"))),
        certificationStatus: earnedCredentialCount > 0 ? "Certified" : "Not Started",
        status: enrollmentStatus,
        profilePhotoUrl: value(profileRow, ["profile_photo_url"], value(row, ["profile_photo_url"]))
      };

      setProfile(loadedProfile);
      setCertificationsEarned(earnedCredentialCount);
      setCourseProgress(percent((progressResult.data ?? []).length, Math.max((lessonsResult.data ?? []).length, 1)));
      setJournalEntries((journalResult.data ?? []).length);
      setAttendanceHistory((attendanceResult.data ?? []) as DbRow[]);
      setAssignmentsSubmitted((assignmentsResult.data ?? []).length);
      setMessage("Student profile synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load student profile.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function uploadPhoto() {
    if (!photoFile || !profile) return;

    try {
      setMessage("Uploading profile photo...");
      const supabase = createClient();
      const safeName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${profile.authUserId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("student-profile-photos").upload(path, photoFile, {
        cacheControl: "3600",
        upsert: true
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("student-profile-photos").getPublicUrl(path);
      await supabase
        .from("student_profiles")
        .upsert({
          auth_user_id: profile.authUserId,
          student_id: profile.studentId,
          full_name: profile.fullName,
          email: profile.email,
          membership_level: profile.membershipLevel,
          certification_status: profile.certificationStatus,
          enrollment_status: profile.status,
          profile_photo_url: data.publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: "auth_user_id" });

      setProfile({ ...profile, profilePhotoUrl: data.publicUrl });
      setPhotoFile(null);
      setMessage("Profile photo updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload profile photo.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Student Profile"
        title="Your Academy enrollment identity."
        text="Review your student ID, membership status, enrollment record, course progress, certifications, and trading activity."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="terminal-panel h-fit p-6">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full border border-gold-500/35 bg-navy-950">
                {profile?.profilePhotoUrl ? (
                  <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${profile.profilePhotoUrl})` }} aria-label={`${profile.fullName} profile photo`} />
                ) : (
                  <User className="text-gold-300" size={46} />
                )}
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{profile?.fullName ?? "Student"}</h2>
              <p className="mt-2 text-sm text-gold-300">{profile?.studentId ?? "Student ID pending"}</p>
            </div>
            <div className="mt-6 grid gap-3">
              <label className="grid gap-2 text-sm text-ink/74">
                Profile Photo
                <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white file:mr-4 file:border-0 file:bg-gold-500 file:px-4 file:py-2 file:font-bold file:text-navy-950" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} />
              </label>
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="button" disabled={!photoFile} onClick={uploadPhoto}>
                <Upload size={18} /> Upload Photo
              </button>
            </div>
            <p className="mt-5 text-sm leading-6 text-ink/68">{loading ? "Loading..." : message}</p>
          </aside>

          <main className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ProfileMetric icon={<CreditCard size={20} />} label="Membership Level" value={profile?.membershipLevel ?? "Pending"} />
              <ProfileMetric icon={<ShieldCheck size={20} />} label="Enrollment Status" value={profile?.status ?? "Pending Review"} />
              <ProfileMetric icon={<ShieldCheck size={20} />} label="Certification Status" value={profile?.certificationStatus ?? "Not Started"} />
              <ProfileMetric icon={<Award size={20} />} label="Certifications Earned" value={String(certificationsEarned)} />
              <ProfileMetric icon={<BookOpenCheck size={20} />} label="Course Progress" value={`${courseProgress}%`} />
              <ProfileMetric icon={<ChartCandlestick size={20} />} label="Trading Journal Entries" value={String(journalEntries)} />
              <ProfileMetric icon={<CalendarCheck size={20} />} label="Attendance History" value={String(attendanceHistory.length)} />
              <ProfileMetric icon={<ClipboardCheck size={20} />} label="Assignments Submitted" value={String(assignmentsSubmitted)} />
              <ProfileMetric icon={<Mail size={20} />} label="Email" value={profile?.email ?? "Pending"} />
            </section>

            <section className="terminal-panel p-6">
              <h2 className="text-2xl font-semibold text-white">Enrollment Record</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ProfileLine label="Full Name" value={profile?.fullName ?? "Pending"} />
                <ProfileLine label="Student ID" value={profile?.studentId ?? "Pending"} />
                <ProfileLine label="Enrollment Date" value={shortDate(profile?.enrollmentDate ?? "")} />
                <ProfileLine label="Program" value={profile?.certificationLevel ?? "Academy for Financial Future"} />
                <ProfileLine label="Certification Status" value={profile?.certificationStatus ?? "Not Started"} />
                <ProfileLine label="Account Status" value={profile?.status ?? "Pending Review"} />
                <ProfileLine label="Enrollment Status" value={profile?.status ?? "Pending Review"} />
              </div>
            </section>

            <section className="terminal-panel p-6">
              <h2 className="text-2xl font-semibold text-white">Attendance History</h2>
              <div className="mt-5 grid gap-3">
                {attendanceHistory.length === 0 ? (
                  <p className="text-sm text-ink/68">No live classroom attendance recorded yet.</p>
                ) : (
                  attendanceHistory.map((row) => (
                    <div key={value(row, ["id"], crypto.randomUUID())} className="border border-gold-500/18 bg-navy-950 p-4">
                      <p className="font-semibold text-white">Live Classroom Session</p>
                      <p className="mt-1 text-sm text-gold-300">{shortDate(value(row, ["joined_at", "created_at"]))}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>
        </SectionInner>
      </Section>
    </>
  );
}

function ProfileMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-xs uppercase tracking-[.18em] text-ink/58">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-white">{value}</p>
    </article>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 break-words font-semibold text-white">{value}</p>
    </div>
  );
}
