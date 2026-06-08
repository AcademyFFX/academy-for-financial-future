"use client";

import { CalendarDays, ExternalLink, Radio, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type ZoomSession = {
  id: string;
  title: string;
  description: string;
  sessionDate: string;
  durationMinutes: number;
  joinUrl: string;
  recordingUrl: string;
  status: string;
};

type AttendanceRow = {
  sessionId: string;
  joinedAt: string;
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
    joinUrl: value(row, ["join_url"]),
    recordingUrl: value(row, ["recording_url"]),
    status: value(row, ["status"], "Scheduled")
  };
}

function normalizeAttendance(row: DbRow): AttendanceRow {
  return {
    sessionId: value(row, ["session_id"]),
    joinedAt: normalizeDate(value(row, ["joined_at"]))
  };
}

export function ZoomClassesPanel({ user }: { user: User | null }) {
  const [sessions, setSessions] = useState<ZoomSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [message, setMessage] = useState("Upcoming live classes will appear here.");

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return sessions
      .filter((session) => ["Scheduled", "Live"].includes(session.status) && new Date(session.sessionDate).getTime() >= now - 3_600_000)
      .slice(0, 4);
  }, [sessions]);

  const recordings = useMemo(() => {
    return sessions.filter((session) => session.recordingUrl && session.status === "Completed").slice(0, 4);
  }, [sessions]);

  const attendedSessionIds = useMemo(() => new Set(attendance.map((row) => row.sessionId)), [attendance]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  useEffect(() => {
    async function loadZoomClasses() {
      if (!user) return;

      try {
        const supabase = createClient();
        const [sessionsResult, attendanceResult] = await Promise.all([
          supabase.from("zoom_class_sessions").select("*").neq("status", "Cancelled").order("session_date", { ascending: true }),
          supabase.from("zoom_attendance").select("*").eq("student_id", user.id)
        ]);

        if (sessionsResult.error) throw sessionsResult.error;
        if (attendanceResult.error) throw attendanceResult.error;

        setSessions(((sessionsResult.data ?? []) as DbRow[]).map(normalizeSession));
        setAttendance(((attendanceResult.data ?? []) as DbRow[]).map(normalizeAttendance));
        setMessage("Live class schedule loaded.");
      } catch (error) {
        setMessage(getErrorMessage(error, "Run the Zoom integration migration to enable live classes."));
      }
    }

    loadZoomClasses();
  }, [user]);

  async function joinClass(session: ZoomSession) {
    if (!user) return;

    try {
      const supabase = createClient();
      const studentName =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
          ? user.user_metadata.name
          : user.email ?? "AFF Student";

      const payload = {
        session_id: Number(session.id),
        student_id: user.id,
        student_name: studentName,
        student_email: user.email ?? "",
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
        const withoutCurrent = current.filter((row) => row.sessionId !== session.id);
        return [normalizeAttendance(data as DbRow), ...withoutCurrent];
      });
      setMessage("Attendance recorded. Opening Zoom class...");
      if (session.joinUrl) window.open(session.joinUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to record attendance before joining."));
    }
  }

  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-gold-500/20 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[.22em] text-gold-300">Zoom Integration</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Upcoming Live Classes</h2>
          </div>
          <Video className="text-gold-300" size={26} />
        </div>
        <p className="mt-3 text-sm text-ink/68">{message}</p>
      </div>

      <div className="grid gap-px bg-gold-500/14 lg:grid-cols-2">
        <div className="grid gap-px bg-gold-500/14">
          {upcomingSessions.length === 0 ? (
            <p className="bg-navy-950 p-5 text-ink/68">No upcoming Zoom classes scheduled yet.</p>
          ) : (
            upcomingSessions.map((session) => (
              <article key={session.id} className="bg-navy-950 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-gold-300">{session.status}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{session.title}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-ink/64">
                      <CalendarDays size={15} className="text-gold-300" /> {new Date(session.sessionDate).toLocaleString()} - {session.durationMinutes} min
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 disabled:opacity-60"
                    type="button"
                    disabled={!session.joinUrl}
                    onClick={() => joinClass(session)}
                  >
                    <ExternalLink size={16} /> Join Class
                  </button>
                </div>
                {session.description ? <p className="mt-4 leading-7 text-ink/74">{session.description}</p> : null}
                {attendedSessionIds.has(session.id) ? <p className="mt-4 text-sm font-semibold text-gold-300">Attendance recorded.</p> : null}
              </article>
            ))
          )}
        </div>

        <div className="grid gap-px bg-gold-500/14">
          <div className="bg-navy-950 p-5">
            <div className="flex items-center gap-3">
              <Radio className="text-gold-300" size={20} />
              <h3 className="text-xl font-semibold text-white">Session Recordings</h3>
            </div>
          </div>
          {recordings.length === 0 ? (
            <p className="bg-navy-950 p-5 text-ink/68">Archived Zoom recordings will appear after completed classes.</p>
          ) : (
            recordings.map((session) => (
              <article key={session.id} className="bg-navy-950 p-5">
                <p className="text-xs uppercase tracking-[.2em] text-gold-300">Completed</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{session.title}</h3>
                <p className="mt-2 text-sm text-ink/58">{new Date(session.sessionDate).toLocaleDateString()}</p>
                <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300" href={session.recordingUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} /> Watch Recording
                </a>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
