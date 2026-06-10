"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  ClipboardCheck,
  Download,
  GraduationCap,
  Handshake,
  Mic2,
  QrCode,
  RefreshCw,
  Send,
  Ticket,
  UserCheck,
  Users,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  description: string | null;
  event_location: string | null;
  start_at: string;
  end_at: string | null;
  registration_status: string;
  ce_credit_hours: number | null;
};

type Registration = {
  id: string;
  event_id: string;
  event_title: string;
  attendee_name: string;
  registration_type: string;
  registration_status: string;
  qr_pass_code: string;
  created_at: string;
};

type Speaker = {
  id: string;
  speaker_name: string;
  speaker_title: string;
  topic: string;
  speaker_status: string;
};

type Sponsor = {
  id: string;
  sponsor_name: string;
  sponsor_level: string;
  sponsor_status: string;
};

type VideoArchive = {
  id: string;
  event_title: string;
  recording_title: string;
  recording_url: string | null;
  access_level: string;
};

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";
const eventTypes = ["All", "Global Conference", "Workshop", "Instructor Session", "Continuing Education", "Student Summit"];

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function makePassCode(eventId: string, studentId: string) {
  return `AFF-EVENT-${String(eventId).padStart(4, "0")}-${studentId.slice(0, 8).toUpperCase()}`;
}

export default function EventsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [videos, setVideos] = useState<VideoArchive[]>([]);
  const [adminTables, setAdminTables] = useState<Record<string, DbRow[]>>({});
  const [activeType, setActiveType] = useState("All");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [message, setMessage] = useState("Loading Global Conference and Events Division...");
  const [loading, setLoading] = useState(true);

  const filteredEvents = useMemo(() => {
    return activeType === "All" ? events : events.filter((event) => event.event_type === activeType);
  }, [activeType, events]);

  const analytics = useMemo(() => {
    const attendance = adminTables.attendance ?? [];
    const certificates = adminTables.certificates ?? [];
    const credits = adminTables.credits ?? [];
    const checkedIn = attendance.filter((row) => value(row, ["attendance_status"]) === "Checked In").length;
    return {
      events: events.length,
      registrations: registrations.length,
      attendance: attendance.length,
      attendanceRate: percent(checkedIn, attendance.length),
      speakers: speakers.length,
      sponsors: sponsors.length,
      certificates: certificates.length,
      credits: credits.reduce((total, row) => total + Number(value(row, ["credit_hours"], "0")), 0),
      videos: videos.length
    };
  }, [adminTables, events.length, registrations.length, speakers.length, sponsors.length, videos.length]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadEvents = useCallback(async () => {
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

      const admin = user.email?.toLowerCase() === adminEmail;
      setStudentId(user.id);
      setStudentEmail(user.email ?? "");
      setStudentName(typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "Student");
      setIsAdmin(admin);

      const [
        eventsResult,
        registrationsResult,
        speakersResult,
        sponsorsResult,
        videosResult,
        attendanceResult,
        certificatesResult,
        creditsResult,
        schedulingResult
      ] = await Promise.all([
        supabase.from("event_calendar").select("*").in("registration_status", ["Open", "Invite Only"]).order("start_at", { ascending: true }).limit(100),
        admin
          ? supabase.from("event_registrations").select("*").order("created_at", { ascending: false }).limit(200)
          : supabase.from("event_registrations").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("event_speakers").select("*").order("speaker_name", { ascending: true }).limit(100),
        supabase.from("event_sponsors").select("*").order("sponsor_level", { ascending: true }).limit(100),
        supabase.from("event_video_archive").select("*").order("recorded_at", { ascending: false }).limit(100),
        admin ? supabase.from("event_attendance").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("event_certificates").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("event_ce_credits").select("*").limit(300) : Promise.resolve({ data: [], error: null }),
        admin ? supabase.from("event_instructor_schedule").select("*").limit(200) : Promise.resolve({ data: [], error: null })
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (registrationsResult.error) throw registrationsResult.error;
      if (speakersResult.error) throw speakersResult.error;
      if (sponsorsResult.error) throw sponsorsResult.error;
      if (videosResult.error) throw videosResult.error;

      setEvents((eventsResult.data ?? []) as EventRow[]);
      setRegistrations((registrationsResult.data ?? []) as Registration[]);
      setSpeakers((speakersResult.data ?? []) as Speaker[]);
      setSponsors((sponsorsResult.data ?? []) as Sponsor[]);
      setVideos((videosResult.data ?? []) as VideoArchive[]);
      setAdminTables({
        attendance: (attendanceResult.data ?? []) as DbRow[],
        certificates: (certificatesResult.data ?? []) as DbRow[],
        credits: (creditsResult.data ?? []) as DbRow[],
        schedule: (schedulingResult.data ?? []) as DbRow[]
      });
      setMessage("Events Division synchronized with live conference data.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the events migration to enable conference operations."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function registerForEvent(event: EventRow, registrationType = "Conference Registration") {
    setMessage("Creating event registration and QR pass...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("event_registrations").insert({
        event_id: Number(event.id),
        event_title: event.title,
        student_id: studentId,
        attendee_name: studentName,
        attendee_email: studentEmail,
        registration_type: registrationType,
        registration_status: "Registered",
        qr_pass_code: makePassCode(event.id, studentId)
      }).select("*").single();

      if (error) throw error;
      setRegistrations((current) => [data as Registration, ...current]);
      setSelectedEventId(event.id);
      setMessage("Registration complete. Your QR event pass is ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to register for event."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Global Conference and Events Division"
        title="Executive event operations for AFF conferences, workshops, speakers, sponsors, and continuing education."
        text="Register for conferences and workshops, manage QR event passes, track attendance, archive event video, issue event certificates, award continuing education credits, and monitor global event analytics."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Event Command</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadEvents}>
              <RefreshCw size={16} /> Refresh Events
            </button>
          </div>

          {isAdmin ? (
            <section className="grid gap-4 md:grid-cols-4">
              <Metric icon={<CalendarDays size={22} />} label="Events" value={String(analytics.events)} detail="calendar programs active" />
              <Metric icon={<Ticket size={22} />} label="Registrations" value={String(analytics.registrations)} detail="conference and workshop registrations" />
              <Metric icon={<UserCheck size={22} />} label="Attendance Rate" value={`${analytics.attendanceRate}%`} detail={`${analytics.attendance} attendance records`} />
              <Metric icon={<Award size={22} />} label="Event Certificates" value={String(analytics.certificates)} detail={`${analytics.credits} CE credit hours tracked`} />
            </section>
          ) : null}

          <section className="terminal-panel p-4">
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((type) => (
                <button key={type} className={`px-4 py-2 text-sm font-semibold ${activeType === type ? "bg-gold-500 text-navy-950" : "border border-gold-500/24 text-gold-300"}`} type="button" onClick={() => setActiveType(type)}>
                  {type}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Event Calendar and Conference Registration</h2>
                </div>
              </div>
              {loading ? (
                <p className="p-5 text-ink/68">Loading event calendar...</p>
              ) : filteredEvents.length === 0 ? (
                <p className="p-5 text-ink/68">No open events found.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                  {filteredEvents.map((event) => (
                    <article key={event.id} className="bg-navy-950 p-5">
                      <p className="text-xs uppercase tracking-[.2em] text-gold-300">{event.event_type}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{event.title}</h3>
                      <p className="mt-2 text-sm text-ink/58">{event.event_location ?? "Virtual"} - {new Date(event.start_at).toLocaleString()}</p>
                      <p className="mt-3 line-clamp-4 leading-7 text-ink/72">{event.description ?? "AFF event details coming soon."}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className="inline-flex items-center gap-2 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 disabled:opacity-60" type="button" disabled={selectedEventId === event.id} onClick={() => registerForEvent(event)}>
                          <Send size={16} /> {selectedEventId === event.id ? "Registered" : "Register"}
                        </button>
                        {event.event_type === "Workshop" ? (
                          <button className="inline-flex items-center gap-2 border border-gold-500/35 px-4 py-2 text-sm text-gold-300" type="button" onClick={() => registerForEvent(event, "Workshop Registration")}>
                            <ClipboardCheck size={16} /> Workshop
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <Panel title="QR Event Passes" icon={<QrCode size={22} />}>
              {registrations.length === 0 ? <p className="bg-navy-950 p-5 text-ink/68">No event passes yet.</p> : null}
              {registrations.slice(0, 5).map((registration) => (
                <div key={registration.id} className="bg-navy-950 p-5">
                  <QrCode className="text-gold-300" size={36} />
                  <p className="mt-3 font-semibold text-white">{registration.event_title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[.16em] text-gold-300">{registration.registration_status}</p>
                  <p className="mt-3 break-all text-sm text-ink/68">{registration.qr_pass_code}</p>
                </div>
              ))}
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Speaker Management and Instructor Scheduling" icon={<Mic2 size={22} />}>
              {speakers.length === 0 ? <p className="bg-navy-950 p-5 text-ink/68">No speakers found.</p> : null}
              {speakers.map((speaker) => <StatLine key={speaker.id} label={`${speaker.speaker_name} - ${speaker.topic}`} value={speaker.speaker_status} />)}
              {(adminTables.schedule ?? []).slice(0, 5).map((row) => <StatLine key={`schedule-${value(row, ["id"])}`} label={`${value(row, ["instructor_name"])} - ${value(row, ["session_title"])}`} value={value(row, ["schedule_status"])} />)}
            </Panel>

            <Panel title="Sponsor Management" icon={<Handshake size={22} />}>
              {sponsors.length === 0 ? <p className="bg-navy-950 p-5 text-ink/68">No sponsors found.</p> : null}
              {sponsors.map((sponsor) => <StatLine key={sponsor.id} label={sponsor.sponsor_name} value={`${sponsor.sponsor_level} - ${sponsor.sponsor_status}`} />)}
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <RecordTable
              title="Student Attendance Tracking"
              icon={<Users size={22} />}
              headers={["Student", "Event", "Status", "Checked In"]}
              rows={(adminTables.attendance ?? []).map((row) => [
                value(row, ["attendee_name"]),
                value(row, ["event_title"]),
                value(row, ["attendance_status"]),
                value(row, ["checked_in_at"]) ? new Date(value(row, ["checked_in_at"])).toLocaleDateString() : "Pending"
              ])}
            />
            <RecordTable
              title="Event Certificates and CE Credits"
              icon={<GraduationCap size={22} />}
              headers={["Student", "Event", "Certificate", "Credits"]}
              rows={(adminTables.certificates ?? []).map((row) => [
                value(row, ["student_name"]),
                value(row, ["event_title"]),
                value(row, ["certificate_number"]),
                value(row, ["ce_credit_hours"], "0")
              ])}
            />
          </section>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <div className="flex items-center gap-3">
                <Clapperboard className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Event Video Archive</h2>
              </div>
            </div>
            {videos.length === 0 ? (
              <p className="p-5 text-ink/68">No event recordings archived yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-3">
                {videos.map((video) => (
                  <article key={video.id} className="bg-navy-950 p-5">
                    <Video className="text-gold-300" size={24} />
                    <h3 className="mt-3 text-xl font-semibold text-white">{video.recording_title}</h3>
                    <p className="mt-2 text-sm text-ink/58">{video.event_title} - {video.access_level}</p>
                    {video.recording_url ? <a className="mt-4 inline-flex items-center gap-2 text-gold-300" href={video.recording_url}><Download size={16} /> Watch Replay</a> : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-4">
            <ExecutiveTile icon={<BadgeCheck size={20} />} label="Event Analytics" value={`${analytics.registrations}`} detail="registrations tracked" />
            <ExecutiveTile icon={<Mic2 size={20} />} label="Speakers" value={String(analytics.speakers)} detail="approved speaker profiles" />
            <ExecutiveTile icon={<Handshake size={20} />} label="Sponsors" value={String(analytics.sponsors)} detail="active sponsor records" />
            <ExecutiveTile icon={<BarChart3 size={20} />} label="CE Credits" value={String(analytics.credits)} detail="continuing education hours" />
          </section>
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5 shadow-gold">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-5 text-sm uppercase tracking-[.2em] text-ink/54">{label}</p>
      <p className="mt-2 font-serif text-4xl font-semibold text-white">{value}</p>
      <p className="mt-3 text-sm text-ink/64">{detail}</p>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-gold-500/20 p-5">
        <div className="flex items-center gap-3">
          <span className="text-gold-300">{icon}</span>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="grid gap-px bg-gold-500/14">{children}</div>
    </section>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function RecordTable({ title, icon, headers, rows }: { title: string; icon: ReactNode; headers: string[]; rows: string[][] }) {
  return (
    <section className="terminal-panel overflow-hidden">
      <div className="border-b border-gold-500/20 p-5">
        <div className="flex items-center gap-3">
          <span className="text-gold-300">{icon}</span>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="p-5 text-ink/68">No records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-navy-800">
                {headers.map((header) => <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="bg-navy-950">
                  {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="p-4 text-ink/76">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ExecutiveTile({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-sm uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-ink/62">{detail}</p>
    </article>
  );
}
