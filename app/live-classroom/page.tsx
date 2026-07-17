"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Download, ExternalLink, FileText, GraduationCap, NotebookPen, Radio, Save, Users, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { getClientAdminStatus } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type ClassroomSession = {
  id: string;
  title: string;
  description: string;
  sessionDate: string;
  durationMinutes: number;
  instructorName: string;
  meetingId: string;
  passcode: string;
  joinUrl: string;
  recordingUrl: string;
  status: string;
  classNotesTitle: string;
  classNotesUrl: string;
  homeworkTitle: string;
  homeworkInstructions: string;
  homeworkDueDate: string;
  homeworkUrl: string;
};

type AttendanceRow = {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  joinedAt: string;
};

const adminEmail = "acafffx@gmail.com";

const initialForm = {
  id: "",
  title: "",
  description: "",
  sessionDate: "",
  durationMinutes: "60",
  instructorName: "Dr. Jean Rene Moricette",
  meetingId: "",
  passcode: "",
  joinUrl: "",
  recordingUrl: "",
  status: "Scheduled",
  classNotesTitle: "",
  classNotesUrl: "",
  homeworkTitle: "",
  homeworkInstructions: "",
  homeworkDueDate: "",
  homeworkUrl: "/homework-center"
};

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function normalizeDate(raw: string) {
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

function toDateTimeInputValue(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function buildZoomJoinUrl(meetingId: string, passcode: string) {
  const cleanMeetingId = meetingId.replace(/\s+/g, "");
  if (!cleanMeetingId) return "";
  const url = new URL(`https://zoom.us/j/${cleanMeetingId}`);
  if (passcode.trim()) url.searchParams.set("pwd", passcode.trim());
  return url.toString();
}

function normalizeSession(row: DbRow): ClassroomSession {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    title: value(row, ["title"], "AFF Live Class"),
    description: value(row, ["description"]),
    sessionDate: normalizeDate(value(row, ["session_date"])),
    durationMinutes: Number(value(row, ["duration_minutes"], "60")),
    instructorName: value(row, ["instructor_name"], "Dr. Jean Rene Moricette"),
    meetingId: value(row, ["meeting_id"]),
    passcode: value(row, ["passcode"]),
    joinUrl: value(row, ["join_url"]),
    recordingUrl: value(row, ["recording_url"]),
    status: value(row, ["status"], "Scheduled"),
    classNotesTitle: value(row, ["class_notes_title"], "Class Notes"),
    classNotesUrl: value(row, ["class_notes_url"]),
    homeworkTitle: value(row, ["homework_title"], "Homework Assignment"),
    homeworkInstructions: value(row, ["homework_instructions"]),
    homeworkDueDate: value(row, ["homework_due_date"]),
    homeworkUrl: value(row, ["homework_url"], "/homework-center")
  };
}

function normalizeAttendance(row: DbRow): AttendanceRow {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    sessionId: value(row, ["session_id"]),
    studentId: value(row, ["student_id"]),
    studentName: value(row, ["student_name"], "AFF Student"),
    studentEmail: value(row, ["student_email"]),
    joinedAt: normalizeDate(value(row, ["joined_at"]))
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function getStudentName(row: DbRow | undefined, email: string) {
  return value(row ?? {}, ["full_name", "name"], email || "AFF Student");
}

export default function LiveClassroomPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AFF Live Classroom...");

  const attendedSessionIds = useMemo(() => new Set(attendance.filter((row) => row.studentId === userId).map((row) => row.sessionId)), [attendance, userId]);

  const attendanceCounts = useMemo(() => {
    return attendance.reduce<Record<string, number>>((counts, row) => {
      counts[row.sessionId] = (counts[row.sessionId] ?? 0) + 1;
      return counts;
    }, {});
  }, [attendance]);

  const upcomingClasses = useMemo(() => {
    const now = Date.now();
    return sessions.filter((session) => ["Scheduled", "Live"].includes(session.status) && new Date(session.sessionDate).getTime() >= now - 3_600_000);
  }, [sessions]);

  const recordings = useMemo(() => sessions.filter((session) => session.recordingUrl && ["Completed", "Live"].includes(session.status)), [sessions]);

  const loadClassroom = useCallback(async () => {
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
      const admin = await getClientAdminStatus();
      setUserId(user.id);
      setUserEmail(email);
      setStudentName(getStudentName(user.user_metadata, email));
      setIsAdmin(admin);

      const [sessionsResult, attendanceResult] = await Promise.all([
        supabase.from("zoom_class_sessions").select("*").order("session_date", { ascending: true }),
        admin ? supabase.from("zoom_attendance").select("*").order("joined_at", { ascending: false }) : supabase.from("zoom_attendance").select("*").eq("student_id", user.id)
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      setSessions(((sessionsResult.data ?? []) as DbRow[]).map(normalizeSession));
      setAttendance(((attendanceResult.data ?? []) as DbRow[]).map(normalizeAttendance));
      setMessage(admin ? "Instructor controls loaded." : "Live classroom schedule loaded.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load AFF Live Classroom. Run the Live Classroom migration in Supabase."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadClassroom();
  }, [loadClassroom]);

  function editSession(session: ClassroomSession) {
    setForm({
      id: session.id,
      title: session.title,
      description: session.description,
      sessionDate: toDateTimeInputValue(session.sessionDate),
      durationMinutes: String(session.durationMinutes),
      instructorName: session.instructorName,
      meetingId: session.meetingId,
      passcode: session.passcode,
      joinUrl: session.joinUrl,
      recordingUrl: session.recordingUrl,
      status: session.status,
      classNotesTitle: session.classNotesTitle,
      classNotesUrl: session.classNotesUrl,
      homeworkTitle: session.homeworkTitle,
      homeworkInstructions: session.homeworkInstructions,
      homeworkDueDate: session.homeworkDueDate,
      homeworkUrl: session.homeworkUrl
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    setMessage("Saving live classroom session...");

    try {
      const generatedJoinUrl = form.joinUrl.trim() || buildZoomJoinUrl(form.meetingId, form.passcode);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        session_date: new Date(form.sessionDate).toISOString(),
        duration_minutes: Number(form.durationMinutes),
        instructor_name: form.instructorName.trim() || "Dr. Jean Rene Moricette",
        meeting_id: form.meetingId.trim() || null,
        passcode: form.passcode.trim() || null,
        join_url: generatedJoinUrl || null,
        recording_url: form.recordingUrl.trim() || null,
        status: form.status,
        class_notes_title: form.classNotesTitle.trim() || null,
        class_notes_url: form.classNotesUrl.trim() || null,
        homework_title: form.homeworkTitle.trim() || null,
        homework_instructions: form.homeworkInstructions.trim() || null,
        homework_due_date: form.homeworkDueDate || null,
        homework_url: form.homeworkUrl.trim() || "/homework-center",
        created_by: adminEmail,
        updated_at: new Date().toISOString()
      };

      const supabase = createClient();
      const query = form.id
        ? supabase.from("zoom_class_sessions").update(payload).eq("id", form.id).select("*").single()
        : supabase.from("zoom_class_sessions").insert(payload).select("*").single();

      const { data, error } = await query;
      if (error) throw error;

      const saved = normalizeSession(data as DbRow);
      setSessions((current) => {
        const withoutSaved = current.filter((session) => session.id !== saved.id);
        return [...withoutSaved, saved].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
      });
      setForm(initialForm);
      setMessage("Live classroom session saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save live classroom session."));
    }
  }

  async function recordAttendance(session: ClassroomSession) {
    if (!userId) return;

    try {
      const supabase = createClient();
      const payload = {
        session_id: Number(session.id),
        student_id: userId,
        student_name: studentName,
        student_email: userEmail,
        attendance_status: "Joined",
        joined_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("zoom_attendance")
        .upsert(payload, { onConflict: "session_id,student_id" })
        .select("*")
        .single();

      if (error) throw error;

      setAttendance((current) => {
        const withoutCurrent = current.filter((row) => !(row.sessionId === session.id && row.studentId === userId));
        return [normalizeAttendance(data as DbRow), ...withoutCurrent];
      });
      setMessage("Attendance recorded.");
      if (session.joinUrl) window.open(session.joinUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to record attendance."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Live Classroom"
        title="Live instruction, attendance, notes, recordings, and homework."
        text="Join Academy for Financial Future live classes, access Zoom links, download class notes, review recordings, and complete assigned homework."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <div className="terminal-panel p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[.22em] text-gold-300">{isAdmin ? "Instructor Console" : "Student Classroom"}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Classroom Status</h2>
                <p className="mt-2 text-sm text-ink/68">{message}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric icon={<CalendarDays size={18} />} label="Upcoming" value={String(upcomingClasses.length)} />
                <Metric icon={<CheckCircle2 size={18} />} label="Attendance" value={String(attendance.filter((row) => row.studentId === userId).length)} />
                <Metric icon={<Radio size={18} />} label="Recordings" value={String(recordings.length)} />
              </div>
            </div>
          </div>

          {isAdmin ? (
            <form onSubmit={saveSession} className="terminal-panel grid gap-4 p-6">
              <div className="flex items-center gap-3">
                <Video className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">{form.id ? "Edit Live Class" : "Create Live Class"}</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Input label="Class title" value={form.title} required onChange={(next) => setForm((current) => ({ ...current, title: next }))} />
                <Input label="Instructor" value={form.instructorName} onChange={(next) => setForm((current) => ({ ...current, instructorName: next }))} />
              </div>
              <label className="grid gap-2 text-sm text-ink/74">
                Description
                <textarea className="min-h-24 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <Input label="Date and time" type="datetime-local" value={form.sessionDate} required onChange={(next) => setForm((current) => ({ ...current, sessionDate: next }))} />
                <Input label="Duration minutes" type="number" min="15" value={form.durationMinutes} onChange={(next) => setForm((current) => ({ ...current, durationMinutes: next }))} />
                <label className="grid gap-2 text-sm text-ink/74">
                  Status
                  <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                    <option>Scheduled</option>
                    <option>Live</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Meeting ID" value={form.meetingId} onChange={(next) => setForm((current) => ({ ...current, meetingId: next }))} />
                <Input label="Passcode" value={form.passcode} onChange={(next) => setForm((current) => ({ ...current, passcode: next }))} />
                <Input label="Zoom join URL" value={form.joinUrl} onChange={(next) => setForm((current) => ({ ...current, joinUrl: next }))} />
                <Input label="Recording URL" value={form.recordingUrl} onChange={(next) => setForm((current) => ({ ...current, recordingUrl: next }))} />
                <Input label="Class notes title" value={form.classNotesTitle} onChange={(next) => setForm((current) => ({ ...current, classNotesTitle: next }))} />
                <Input label="Class notes URL" value={form.classNotesUrl} onChange={(next) => setForm((current) => ({ ...current, classNotesUrl: next }))} />
                <Input label="Homework title" value={form.homeworkTitle} onChange={(next) => setForm((current) => ({ ...current, homeworkTitle: next }))} />
                <Input label="Homework due date" type="date" value={form.homeworkDueDate} onChange={(next) => setForm((current) => ({ ...current, homeworkDueDate: next }))} />
              </div>
              <label className="grid gap-2 text-sm text-ink/74">
                Homework instructions
                <textarea className="min-h-24 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.homeworkInstructions} onChange={(event) => setForm((current) => ({ ...current, homeworkInstructions: event.target.value }))} />
              </label>
              <Input label="Homework URL" value={form.homeworkUrl} onChange={(next) => setForm((current) => ({ ...current, homeworkUrl: next }))} />
              <button className="inline-flex w-fit items-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <Save size={18} /> Save Class
              </button>
            </form>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-6">
                <h2 className="text-2xl font-semibold text-white">Upcoming Classes</h2>
                <p className="mt-2 text-sm text-ink/68">Zoom links record attendance before opening the classroom.</p>
              </div>
              {loading ? (
                <p className="p-6 text-ink/72">Loading classes...</p>
              ) : upcomingClasses.length === 0 ? (
                <p className="p-6 text-ink/72">No upcoming live classes scheduled.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/16">
                  {upcomingClasses.map((session) => (
                    <ClassCard
                      key={session.id}
                      session={session}
                      attended={attendedSessionIds.has(session.id)}
                      attendanceCount={attendanceCounts[session.id] ?? 0}
                      admin={isAdmin}
                      onAttend={() => recordAttendance(session)}
                      onEdit={() => editSession(session)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-6">
              <Panel title="Session Recordings" icon={<Radio size={22} />}>
                {recordings.length === 0 ? (
                  <p className="text-sm text-ink/68">Recordings will appear after sessions are completed.</p>
                ) : (
                  <div className="grid gap-3">
                    {recordings.map((session) => (
                      <a key={session.id} href={session.recordingUrl} target="_blank" rel="noreferrer" className="border border-gold-500/18 bg-navy-950 p-4 transition hover:border-gold-400/60">
                        <p className="text-xs uppercase tracking-[.18em] text-gold-300">{shortDate(session.sessionDate)}</p>
                        <h3 className="mt-2 font-semibold text-white">{session.title}</h3>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm text-gold-300">Watch Recording <ExternalLink size={14} /></p>
                      </a>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Homework Assignments" icon={<NotebookPen size={22} />}>
                <div className="grid gap-3">
                  {sessions.filter((session) => session.homeworkTitle || session.homeworkInstructions).slice(0, 5).map((session) => (
                    <Link key={`${session.id}-homework`} href={session.homeworkUrl || "/homework-center"} className="border border-gold-500/18 bg-navy-950 p-4 transition hover:border-gold-400/60">
                      <p className="text-xs uppercase tracking-[.18em] text-gold-300">{session.homeworkDueDate ? `Due ${shortDate(session.homeworkDueDate)}` : "Homework"}</p>
                      <h3 className="mt-2 font-semibold text-white">{session.homeworkTitle || `${session.title} Homework`}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink/68">{session.homeworkInstructions || "Submit this assignment in the Homework Center."}</p>
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>
          </section>

          {isAdmin ? (
            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-6">
                <div className="flex items-center gap-3">
                  <Users className="text-gold-300" size={22} />
                  <h2 className="text-2xl font-semibold text-white">Attendance Tracking</h2>
                </div>
              </div>
              {attendance.length === 0 ? (
                <p className="p-6 text-ink/72">No attendance records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-separate border-spacing-y-1 text-left text-sm">
                    <thead className="text-xs uppercase tracking-[.18em] text-gold-300">
                      <tr>
                        <th className="p-4">Student</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Class</th>
                        <th className="p-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((row) => (
                        <tr key={row.id} className="bg-navy-950 text-ink/76">
                          <td className="p-4 text-white">{row.studentName}</td>
                          <td className="p-4">{row.studentEmail}</td>
                          <td className="p-4">{sessions.find((session) => session.id === row.sessionId)?.title ?? row.sessionId}</td>
                          <td className="p-4">{new Date(row.joinedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </SectionInner>
      </Section>
    </>
  );
}

function ClassCard({ session, attended, attendanceCount, admin, onAttend, onEdit }: { session: ClassroomSession; attended: boolean; attendanceCount: number; admin: boolean; onAttend: () => void; onEdit: () => void }) {
  return (
    <article className="bg-navy-950 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[.22em] text-gold-300">{session.status} - {new Date(session.sessionDate).toLocaleString()}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{session.title}</h3>
          <p className="mt-2 text-sm text-ink/62">{session.instructorName} - {session.durationMinutes} minutes</p>
          {session.description ? <p className="mt-4 max-w-3xl leading-7 text-ink/74">{session.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-55" type="button" disabled={!session.joinUrl} onClick={onAttend}>
            <ExternalLink size={16} /> Join Zoom
          </button>
          {admin ? (
            <button className="inline-flex items-center gap-2 border border-gold-500/40 px-4 py-3 text-sm font-semibold text-gold-300" type="button" onClick={onEdit}>
              Edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoTile icon={<CheckCircle2 size={17} />} label="Attendance" value={attended ? "Recorded" : admin ? `${attendanceCount} students` : "Not recorded"} />
        <InfoTile icon={<FileText size={17} />} label="Class Notes" value={session.classNotesUrl ? session.classNotesTitle : "Coming soon"} />
        <InfoTile icon={<GraduationCap size={17} />} label="Homework" value={session.homeworkDueDate ? `Due ${shortDate(session.homeworkDueDate)}` : "Assigned after class"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {session.classNotesUrl ? (
          <a className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300" href={session.classNotesUrl} target="_blank" rel="noreferrer">
            <Download size={15} /> Download Notes
          </a>
        ) : null}
        {session.homeworkTitle ? (
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300" href={session.homeworkUrl || "/homework-center"}>
            <NotebookPen size={15} /> Open Homework
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-3">
      <div className="flex items-center gap-2 text-gold-300">{icon}<span className="text-[10px] uppercase tracking-[.18em]">{label}</span></div>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
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

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border border-gold-500/16 bg-navy-900 p-3">
      <div className="flex items-center gap-2 text-gold-300">{icon}<span className="text-[10px] uppercase tracking-[.18em]">{label}</span></div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false, min }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string }) {
  return (
    <label className="grid gap-2 text-sm text-ink/74">
      {label}
      <input
        className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
        type={type}
        min={min}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
