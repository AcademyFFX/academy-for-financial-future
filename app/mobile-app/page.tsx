"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  Bot,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  IdCard,
  Mail,
  MessageSquare,
  PlaySquare,
  Save,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  UserCog,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";

const dashboardTiles = [
  { href: "/courses", label: "Courses", icon: BookOpenCheck },
  { href: "/certifications", label: "Certifications", icon: ShieldCheck },
  { href: "/degrees", label: "Degrees", icon: GraduationCap },
  { href: "/live-classroom", label: "Live Classes", icon: Video },
  { href: "/assignments", label: "Assignments", icon: ClipboardCheck },
  { href: "/messages", label: "Messages", icon: MessageSquare }
];

const tradingTiles = [
  { href: "/ai-coach", label: "AI Forex Coach", icon: Bot },
  { href: "/chart-analyst", label: "AI Chart Analyst", icon: BarChart3 },
  { href: "/journal", label: "Trading Journal", icon: FileText },
  { href: "/live-trading-room", label: "Live Trading Room", icon: PlaySquare }
];

const learningTiles = [
  { href: "/courses", label: "Videos", icon: PlaySquare },
  { href: "/research-institute", label: "PDFs", icon: FileText },
  { href: "/ai-center", label: "Flashcards", icon: Bot },
  { href: "/exams", label: "Quizzes", icon: ClipboardCheck }
];

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

async function safeSelect(supabase: ReturnType<typeof createClient>, table: string, query: (tableName: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  try {
    const { data, error } = await query(table);
    if (error) return [];
    return (data ?? []) as DbRow[];
  } catch {
    return [];
  }
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

export default function MobileAppPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AFF Mobile Super App Platform...");
  const [userEmail, setUserEmail] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [studentId, setStudentId] = useState("");
  const [membershipStatus, setMembershipStatus] = useState("Not recorded");
  const [certificates, setCertificates] = useState<DbRow[]>([]);
  const [transcripts, setTranscripts] = useState<DbRow[]>([]);
  const [notifications, setNotifications] = useState<DbRow[]>([]);
  const [downloads, setDownloads] = useState<DbRow[]>([]);
  const [messages, setMessages] = useState<DbRow[]>([]);
  const [classes, setClasses] = useState<DbRow[]>([]);
  const [assignments, setAssignments] = useState<DbRow[]>([]);
  const [adminDevices, setAdminDevices] = useState<DbRow[]>([]);
  const [adminSessions, setAdminSessions] = useState<DbRow[]>([]);
  const [notificationForm, setNotificationForm] = useState({
    title: "Upcoming AFF live class",
    body: "Your next Academy for Financial Future live class is ready in the mobile app.",
    type: "Zoom Reminder"
  });

  const isAdmin = userEmail.toLowerCase() === adminEmail;

  const loadMobileApp = useCallback(async () => {
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
      const profileRows = await safeSelect(supabase, "students", (table) =>
        supabase.from(table).select("*").eq("email", user.email ?? "").order("created_at", { ascending: false }).limit(1)
      );
      const profile = profileRows[0] ?? {};
      setStudentName(value(profile, ["full_name", "name"], user.user_metadata?.full_name ?? user.email ?? "Student"));
      setStudentId(value(profile, ["student_id"], user.id));
      setMembershipStatus(value(profile, ["membership_status", "status"], "Active"));

      const [
        certificateRows,
        digitalCertificateRows,
        transcriptRows,
        notificationRows,
        downloadRows,
        messageRows,
        classRows,
        assignmentRows,
        deviceRows,
        sessionRows
      ] = await Promise.all([
        safeSelect(supabase, "certificates", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("issue_date", { ascending: false })),
        safeSelect(supabase, "digital_certificates", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("issue_date", { ascending: false })),
        safeSelect(supabase, "academic_transcript_records", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("issued_at", { ascending: false })),
        safeSelect(supabase, "mobile_notifications", (table) => supabase.from(table).select("*").or(`student_id.eq.${user.id},student_id.is.null`).order("created_at", { ascending: false }).limit(30)),
        safeSelect(supabase, "mobile_downloads", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("created_at", { ascending: false })),
        safeSelect(supabase, "student_messages", (table) => supabase.from(table).select("*").eq("recipient_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(30)),
        safeSelect(supabase, "zoom_class_sessions", (table) => supabase.from(table).select("*").order("start_time", { ascending: true }).limit(4)),
        safeSelect(supabase, "assignments", (table) => supabase.from(table).select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(8)),
        admin ? safeSelect(supabase, "mobile_devices", (table) => supabase.from(table).select("*").order("last_seen_at", { ascending: false }).limit(100)) : Promise.resolve([]),
        admin ? safeSelect(supabase, "mobile_sessions", (table) => supabase.from(table).select("*").order("started_at", { ascending: false }).limit(100)) : Promise.resolve([])
      ]);

      setCertificates([...certificateRows, ...digitalCertificateRows]);
      setTranscripts(transcriptRows);
      setNotifications(notificationRows);
      setDownloads(downloadRows);
      setMessages(messageRows);
      setClasses(classRows);
      setAssignments(assignmentRows);
      setAdminDevices(deviceRows);
      setAdminSessions(sessionRows);

      await supabase.from("mobile_activity").insert({
        student_id: user.id,
        activity_type: "Mobile App Visit",
        activity_label: "Opened AFF Mobile Super App Platform",
        activity_metadata: { route: "/mobile-app", userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server" }
      });

      setMessage("AFF Mobile Super App Platform synchronized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the AFF Mobile Super App migration to enable mobile platform data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadMobileApp();
  }, [loadMobileApp]);

  const analytics = useMemo(() => {
    const unreadMessages = messages.filter((row) => !row.read_at).length;
    const unreadNotifications = notifications.filter((row) => !row.read_at && value(row, ["delivery_status"]) !== "Read").length;
    const offlineReady = downloads.filter((row) => ["Downloaded", "Available Offline"].includes(value(row, ["download_status"]))).length;
    return { unreadMessages, unreadNotifications, offlineReady };
  }, [downloads, messages, notifications]);

  async function queueOfflineDownload(assetTitle: string, assetType: string, sourceRoute: string) {
    setMessage("Adding content to offline learning downloads...");
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");
      const { error } = await supabase.from("mobile_downloads").insert({
        student_id: user.id,
        asset_type: assetType,
        asset_title: assetTitle,
        source_route: sourceRoute,
        download_status: "Queued"
      });
      if (error) throw error;
      setMessage("Offline download queued.");
      await loadMobileApp();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue offline download.");
    }
  }

  async function sendMobileNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Sending mobile notification...");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("mobile_notifications").insert({
        student_id: null,
        notification_title: notificationForm.title,
        notification_body: notificationForm.body,
        notification_type: notificationForm.type,
        delivery_status: "Sent",
        created_by: adminEmail
      });
      if (error) throw error;
      setMessage("Mobile notification sent to the platform feed.");
      await loadMobileApp();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send mobile notification.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Mobile Super App Platform"
        title="A mobile-first command center for Academy for Financial Future students."
        text="Access courses, certifications, degrees, live classes, assignments, messages, wallet credentials, trading tools, learning resources, offline downloads, and mobile administration."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <section className="terminal-panel overflow-hidden">
            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_340px] lg:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <Smartphone className="text-gold-300" size={30} />
                  <p className="text-xs uppercase tracking-[.24em] text-gold-300">Mobile Dashboard</p>
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-white">{studentName}</h1>
                <p className="mt-2 text-sm text-ink/68">{message}</p>
                <p className="mt-2 text-gold-300">{studentId} · Membership: {membershipStatus}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Mini label="Alerts" value={String(analytics.unreadNotifications)} />
                <Mini label="Messages" value={String(analytics.unreadMessages)} />
                <Mini label="Offline" value={String(analytics.offlineReady)} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {dashboardTiles.map((tile) => (
              <MobileTile key={tile.href} href={tile.href} icon={<tile.icon size={22} />} label={tile.label} />
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
            <Panel title="Student Mobile Wallet" icon={<IdCard size={22} />}>
              <div className="grid gap-3 md:grid-cols-2">
                <Mini label="Student ID" value={studentId} />
                <Mini label="Membership Status" value={membershipStatus} />
                <Mini label="Certificates" value={String(certificates.length)} />
                <Mini label="Transcripts" value={String(transcripts.length)} />
              </div>
              <div className="mt-4 grid gap-3">
                {certificates.slice(0, 3).map((certificate) => (
                  <Link key={value(certificate, ["id", "certificate_number"])} href="/certificates" className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="font-semibold text-white">{value(certificate, ["certificate_name", "course_name"], "AFF Certificate")}</p>
                    <p className="mt-1 text-xs text-gold-300">{value(certificate, ["certificate_number"], "Certificate number pending")}</p>
                  </Link>
                ))}
                {transcripts.slice(0, 2).map((transcript) => (
                  <Link key={value(transcript, ["id", "transcript_id"])} href="/transcripts" className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="font-semibold text-white">{value(transcript, ["degree_name"], "Academic Transcript")}</p>
                    <p className="mt-1 text-xs text-gold-300">{value(transcript, ["transcript_id"], "Transcript ID pending")}</p>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="Push Notification Center" icon={<Bell size={22} />}>
              <div className="grid gap-3">
                {notifications.length === 0 ? <p className="text-sm text-ink/68">No mobile notifications found.</p> : null}
                {notifications.slice(0, 6).map((notification) => (
                  <article key={value(notification, ["id", "notification_title"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(notification, ["notification_type"], "Announcement")}</p>
                    <h3 className="mt-2 font-semibold text-white">{value(notification, ["notification_title"])}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{value(notification, ["notification_body"])}</p>
                    <p className="mt-2 text-xs text-ink/50">{shortDate(value(notification, ["created_at"]))}</p>
                  </article>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Mobile Trading Workspace" icon={<BarChart3 size={22} />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {tradingTiles.map((tile) => <MobileTile key={tile.href} href={tile.href} icon={<tile.icon size={20} />} label={tile.label} />)}
              </div>
            </Panel>
            <Panel title="Mobile Learning Center" icon={<BookOpenCheck size={22} />}>
              <div className="grid gap-3 sm:grid-cols-2">
                {learningTiles.map((tile) => <MobileTile key={tile.href} href={tile.href} icon={<tile.icon size={20} />} label={tile.label} />)}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="Offline Learning Support" icon={<Download size={22} />}>
              <button className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => queueOfflineDownload("Forex Foundations Lesson Pack", "Lesson Pack", "/courses")}>
                Queue Forex Foundations Lesson Pack
              </button>
              <button className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => queueOfflineDownload("AFF Certificate Wallet Backup", "Certificate", "/certificates")}>
                Queue Certificate Wallet Backup
              </button>
              <button className="border border-gold-500/35 px-4 py-3 text-left text-sm font-semibold text-gold-300" type="button" onClick={() => queueOfflineDownload("Academic Transcript PDF", "Transcript", "/transcripts")}>
                Queue Transcript PDF
              </button>
            </Panel>

            <Panel title="Download Tracking" icon={<UploadCloud size={22} />}>
              <div className="grid gap-3 md:grid-cols-2">
                {downloads.length === 0 ? <p className="text-sm text-ink/68">No offline downloads queued yet.</p> : null}
                {downloads.slice(0, 6).map((download) => (
                  <div key={value(download, ["id", "asset_title"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="font-semibold text-white">{value(download, ["asset_title"])}</p>
                    <p className="mt-1 text-xs uppercase tracking-[.16em] text-gold-300">{value(download, ["asset_type"])} · {value(download, ["download_status"])}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Student Messaging Center" icon={<Mail size={22} />}>
              <Link href="/messages" className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950">
                <MessageSquare size={18} /> Message Instructor
              </Link>
              <div className="mt-4 grid gap-3">
                {messages.slice(0, 4).map((row) => (
                  <article key={value(row, ["id", "title"])} className="border border-gold-500/18 bg-navy-950 p-4">
                    <p className="font-semibold text-white">{value(row, ["title"], "Instructor Message")}</p>
                    <p className="mt-2 text-sm text-ink/68">{value(row, ["body"])}</p>
                  </article>
                ))}
              </div>
            </Panel>
            <Panel title="Live Classes and Homework" icon={<Video size={22} />}>
              <div className="grid gap-3">
                <Mini label="Upcoming Live Classes" value={String(classes.length)} />
                <Mini label="Assignments" value={String(assignments.length)} />
                <Link href="/live-classroom" className="border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300">Open Live Classroom</Link>
                <Link href="/homework-center" className="border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300">Open Homework Center</Link>
              </div>
            </Panel>
          </section>

          {isAdmin ? (
            <section className="terminal-panel p-6">
              <div className="flex items-center gap-3">
                <UserCog className="text-gold-300" size={24} />
                <h2 className="text-2xl font-semibold text-white">Mobile Admin Controls</h2>
              </div>
              <p className="mt-2 text-sm text-ink/68">Instructor and administrator controls for mobile notifications, devices, sessions, and app engagement.</p>
              <div className="mt-5 grid gap-6 xl:grid-cols-[420px_1fr]">
                <form className="grid gap-3 border border-gold-500/18 bg-navy-950 p-4" onSubmit={sendMobileNotification}>
                  <input className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={notificationForm.title} onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))} />
                  <textarea className="min-h-24 border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={notificationForm.body} onChange={(event) => setNotificationForm((current) => ({ ...current, body: event.target.value }))} />
                  <select className="border border-gold-500/25 bg-navy-900 px-4 py-3 text-white outline-none" value={notificationForm.type} onChange={(event) => setNotificationForm((current) => ({ ...current, type: event.target.value }))}>
                    <option>Push Notification</option>
                    <option>Homework Reminder</option>
                    <option>Certification Notice</option>
                    <option>Zoom Reminder</option>
                    <option>Course Update</option>
                    <option>Instructor Alert</option>
                  </select>
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950" type="submit">
                    <Save size={18} /> Send Notification
                  </button>
                </form>
                <div className="grid gap-4 md:grid-cols-3">
                  <Metric icon={<Smartphone size={22} />} label="Devices" value={String(adminDevices.length)} />
                  <Metric icon={<ShieldCheck size={22} />} label="Sessions" value={String(adminSessions.length)} />
                  <Metric icon={<Bell size={22} />} label="Notifications" value={String(notifications.length)} />
                </div>
              </div>
            </section>
          ) : null}
        </SectionInner>
      </Section>
    </>
  );
}

function MobileTile({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="terminal-panel flex min-h-28 flex-col justify-between p-4 transition hover:border-gold-400/60">
      <span className="text-gold-300">{icon}</span>
      <span className="font-semibold text-white">{label}</span>
    </Link>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="terminal-panel p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-gold-300">{icon}</span>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gold-500/18 bg-navy-950 p-4">
      <p className="text-[10px] uppercase tracking-[.18em] text-gold-300">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-white">{value || "0"}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </article>
  );
}
