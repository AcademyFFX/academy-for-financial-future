"use client";

import { CalendarDays, ExternalLink, Radio, Save, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getClientAdminStatus } from "@/lib/admin-client";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type ZoomSession = {
  id: string;
  title: string;
  description: string;
  sessionDate: string;
  durationMinutes: number;
  meetingId: string;
  passcode: string;
  joinUrl: string;
  recordingUrl: string;
  status: string;
};

type AttendanceRow = {
  id: string;
  sessionId: string;
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
  meetingId: "",
  passcode: "",
  joinUrl: "",
  recordingUrl: "",
  status: "Scheduled"
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

function normalizeSession(row: DbRow): ZoomSession {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    title: value(row, ["title"], "AFF Live Class"),
    description: value(row, ["description"]),
    sessionDate: normalizeDate(value(row, ["session_date"])),
    durationMinutes: Number(value(row, ["duration_minutes"], "60")),
    meetingId: value(row, ["meeting_id"]),
    passcode: value(row, ["passcode"]),
    joinUrl: value(row, ["join_url"]),
    recordingUrl: value(row, ["recording_url"]),
    status: value(row, ["status"], "Scheduled")
  };
}

function normalizeAttendance(row: DbRow): AttendanceRow {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    sessionId: value(row, ["session_id"]),
    studentName: value(row, ["student_name"], "Student"),
    studentEmail: value(row, ["student_email"]),
    joinedAt: normalizeDate(value(row, ["joined_at"]))
  };
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

export function AdminZoomSessionManager() {
  const [sessions, setSessions] = useState<ZoomSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("Create Zoom class sessions and manage attendance.");

  const attendanceCounts = useMemo(() => {
    return attendance.reduce<Record<string, number>>((counts, row) => {
      counts[row.sessionId] = (counts[row.sessionId] ?? 0) + 1;
      return counts;
    }, {});
  }, [attendance]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadZoomData = useCallback(async () => {
    try {
      const supabase = createClient();
      if (!(await getClientAdminStatus())) {
        setMessage("Administrator access required. Your account must be active in aff_admin_users.");
        return;
      }
      const [sessionsResult, attendanceResult] = await Promise.all([
        supabase.from("zoom_class_sessions").select("*").order("session_date", { ascending: true }),
        supabase.from("zoom_attendance").select("*").order("joined_at", { ascending: false })
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      setSessions(((sessionsResult.data ?? []) as DbRow[]).map(normalizeSession));
      setAttendance(((attendanceResult.data ?? []) as DbRow[]).map(normalizeAttendance));
      setMessage("Zoom class center ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Zoom integration migration to enable class session management."));
    }
  }, []);

  useEffect(() => {
    loadZoomData();
  }, [loadZoomData]);

  function updateField(name: keyof typeof initialForm, fieldValue: string) {
    setForm((current) => ({ ...current, [name]: fieldValue }));
  }

  async function saveSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving Zoom class session...");

    try {
      const generatedJoinUrl = form.joinUrl.trim() || buildZoomJoinUrl(form.meetingId, form.passcode);
      if (!(await getClientAdminStatus())) throw new Error("Administrator access required to manage Zoom sessions.");
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        session_date: new Date(form.sessionDate).toISOString(),
        duration_minutes: Number(form.durationMinutes),
        meeting_id: form.meetingId.trim() || null,
        passcode: form.passcode.trim() || null,
        join_url: generatedJoinUrl || null,
        recording_url: form.recordingUrl.trim() || null,
        status: form.status,
        created_by: adminEmail
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
      setMessage(generatedJoinUrl ? "Zoom session saved with join link." : "Zoom session saved. Add a meeting ID or join URL when ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save Zoom session."));
    }
  }

  async function deleteSession(id: string) {
    setMessage("Deleting Zoom session...");

    try {
      const supabase = createClient();
      if (!(await getClientAdminStatus())) throw new Error("Administrator access required to delete Zoom sessions.");
      const { error } = await supabase.from("zoom_class_sessions").delete().eq("id", id);
      if (error) throw error;
      setSessions((current) => current.filter((session) => session.id !== id));
      setMessage("Zoom session deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete Zoom session."));
    }
  }

  function editSession(session: ZoomSession) {
    setForm({
      id: session.id,
      title: session.title,
      description: session.description,
      sessionDate: toDateTimeInputValue(session.sessionDate),
      durationMinutes: String(session.durationMinutes),
      meetingId: session.meetingId,
      passcode: session.passcode,
      joinUrl: session.joinUrl,
      recordingUrl: session.recordingUrl,
      status: session.status
    });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={saveSession} className="terminal-panel grid h-fit gap-4 p-6">
        <div className="flex items-center gap-3">
          <Video className="text-gold-300" size={22} />
          <h2 className="text-xl font-semibold text-white">{form.id ? "Edit Zoom Class" : "Create Zoom Class"}</h2>
        </div>
        <p className="text-sm text-ink/68">{message}</p>
        <label className="grid gap-2 text-sm text-ink/74">
          Class title
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Class description
          <textarea className="min-h-24 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-ink/74">
            Date and time
            <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" type="datetime-local" value={form.sessionDate} onChange={(event) => updateField("sessionDate", event.target.value)} required />
          </label>
          <label className="grid gap-2 text-sm text-ink/74">
            Duration
            <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" type="number" min="15" value={form.durationMinutes} onChange={(event) => updateField("durationMinutes", event.target.value)} required />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-ink/74">
            Meeting ID
            <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.meetingId} onChange={(event) => updateField("meetingId", event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-ink/74">
            Passcode
            <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.passcode} onChange={(event) => updateField("passcode", event.target.value)} />
          </label>
        </div>
        <label className="grid gap-2 text-sm text-ink/74">
          Join URL
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.joinUrl} onChange={(event) => updateField("joinUrl", event.target.value)} placeholder="Auto-generated from Meeting ID if blank" />
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Recording URL
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.recordingUrl} onChange={(event) => updateField("recordingUrl", event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Status
          <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
            <option>Scheduled</option>
            <option>Live</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </label>
        <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
          <Save size={18} /> Save Zoom Class
        </button>
      </form>

      <div className="grid gap-6">
        <section className="terminal-panel overflow-hidden">
          <div className="border-b border-gold-500/20 p-5">
            <div className="flex items-center gap-3">
              <CalendarDays className="text-gold-300" size={22} />
              <h2 className="text-xl font-semibold text-white">Zoom Class Sessions</h2>
            </div>
          </div>
          {sessions.length === 0 ? (
            <p className="p-5 text-ink/68">No Zoom classes created yet.</p>
          ) : (
            <div className="grid gap-px bg-gold-500/14">
              {sessions.map((session) => (
                <article key={session.id} className="bg-navy-950 p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[.2em] text-gold-300">{session.status}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{session.title}</h3>
                      <p className="mt-2 text-sm text-ink/64">{new Date(session.sessionDate).toLocaleString()} - {session.durationMinutes} min</p>
                      {session.description ? <p className="mt-3 leading-7 text-ink/74">{session.description}</p> : null}
                      <p className="mt-3 text-sm text-ink/62">Attendance: {attendanceCounts[session.id] ?? 0} students</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {session.joinUrl ? (
                        <a className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-sm text-gold-300" href={session.joinUrl} target="_blank" rel="noreferrer">
                          <ExternalLink size={15} /> Join Link
                        </a>
                      ) : null}
                      <button className="border border-gold-500/40 px-3 py-2 text-sm text-gold-300" type="button" onClick={() => editSession(session)}>
                        Edit
                      </button>
                      <button className="inline-flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200" type="button" onClick={() => deleteSession(session.id)}>
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </div>
                  {session.recordingUrl ? (
                    <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300" href={session.recordingUrl} target="_blank" rel="noreferrer">
                      <Radio size={15} /> Open Recording
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="terminal-panel overflow-hidden">
          <div className="border-b border-gold-500/20 p-5">
            <h2 className="text-xl font-semibold text-white">Attendance Log</h2>
          </div>
          {attendance.length === 0 ? (
            <p className="p-5 text-ink/68">No attendance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-navy-800">
                    {["Student", "Email", "Class", "Joined"].map((header) => (
                      <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row) => (
                    <tr key={row.id} className="bg-navy-950">
                      <td className="p-4 text-ink/76">{row.studentName}</td>
                      <td className="p-4 text-ink/76">{row.studentEmail}</td>
                      <td className="p-4 text-ink/76">{sessions.find((session) => session.id === row.sessionId)?.title ?? "Zoom Class"}</td>
                      <td className="p-4 text-ink/76">{new Date(row.joinedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
