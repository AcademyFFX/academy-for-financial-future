"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Bell,
  BookOpenCheck,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  ChartCandlestick,
  Download,
  FileText,
  Globe2,
  GraduationCap,
  HeartPulse,
  Library,
  MessageSquare,
  Mic,
  MonitorSmartphone,
  Podcast,
  Radio,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sprout,
  TabletSmartphone,
  Trophy,
  Tv,
  UserCheck,
  WifiOff
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const appSections = [
  {
    title: "Student Features",
    icon: GraduationCap,
    items: [
      ["Student Dashboard", "/student-dashboard"],
      ["Missions", "/student-dashboard"],
      ["Streaks", "/student-dashboard"],
      ["Certifications", "/certificates"],
      ["Degree Progress", "/university"],
      ["Transcript", "/university"],
      ["Journal", "/journal"],
      ["Scholarship Tracker", "/endowment-fund"]
    ]
  },
  {
    title: "Trading Features",
    icon: ChartCandlestick,
    items: [
      ["Trading Floor", "/trading-floor"],
      ["Live Trading Room", "/live-trading-room"],
      ["Chart Analyst", "/chart-analyst"],
      ["Voice Coach", "/voice-coach"],
      ["AI Forex Coach", "/ai-coach"],
      ["Trading Simulator", "/trading-simulator"]
    ]
  },
  {
    title: "University Features",
    icon: BookOpenText,
    items: [
      ["Courses", "/courses"],
      ["Research Institute", "/research-institute"],
      ["Digital Library", "/research-institute"],
      ["Accreditation Records", "/accreditation"],
      ["Faculty Portal Access", "/admin"]
    ]
  },
  {
    title: "Leadership Features",
    icon: Scale,
    items: [
      ["Civic Leadership", "/civic-leadership"],
      ["Digital Civilization", "/digital-civilization"],
      ["Human Flourishing", "/human-flourishing"],
      ["Community Service Tracking", "/civic-leadership"]
    ]
  },
  {
    title: "Media Features",
    icon: Tv,
    items: [
      ["AFF TV Studio", "/tv-studio"],
      ["Events", "/events"],
      ["Podcasts", "/tv-studio"],
      ["Video Library", "/tv-studio"],
      ["Livestreams", "/live-trading-room"]
    ]
  },
  {
    title: "Global Features",
    icon: Globe2,
    items: [
      ["Global Network", "/global-network"],
      ["Campus Directory", "/campus-expansion"],
      ["International Events", "/events"],
      ["Career Center", "/career-center"]
    ]
  }
];

const offlineAssets = [
  { label: "Download Lessons", type: "Lesson Pack", icon: BookOpenCheck },
  { label: "Download PDFs", type: "PDF Resource", icon: FileText },
  { label: "Download Certifications", type: "Certificate", icon: Award }
];

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function shortDate(raw: string) {
  if (!raw) return "Pending";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}

async function safeQuery(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  try {
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as DbRow[];
  } catch {
    return [];
  }
}

export default function MobileSuperAppPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [studentEmail, setStudentEmail] = useState("");
  const [notifications, setNotifications] = useState<DbRow[]>([]);
  const [downloads, setDownloads] = useState<DbRow[]>([]);
  const [activity, setActivity] = useState<DbRow[]>([]);
  const [message, setMessage] = useState("Loading AFF Mobile Super App...");
  const [loading, setLoading] = useState(true);

  const loadMobileApp = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/mobile-super-app");
        return;
      }

      const name =
        typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim().length > 0
          ? user.user_metadata.name
          : typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
            ? user.user_metadata.full_name
            : user.email?.split("@")[0] ?? "AFF Student";

      setStudentId(user.id);
      setStudentName(name);
      setStudentEmail(user.email ?? "");

      const platform = typeof navigator === "undefined" ? "Web" : navigator.userAgent.includes("Android") ? "Android" : /iPhone|iPad|iPod/.test(navigator.userAgent) ? "iOS" : "Web";
      await supabase.from("mobile_sessions").insert({
        student_id: user.id,
        platform,
        session_status: "Active",
        app_version: "1.0.0-web-shell"
      });
      await supabase.from("mobile_devices").upsert(
        {
          student_id: user.id,
          device_label: `${platform} Mobile Super App`,
          platform,
          device_status: "Active",
          last_seen_at: new Date().toISOString()
        },
        { onConflict: "student_id,device_label" }
      );
      await supabase.from("mobile_activity").insert({
        student_id: user.id,
        activity_type: "Mobile App Opened",
        activity_label: "AFF Mobile Super App",
        activity_metadata: { platform }
      });

      const [notificationRows, downloadRows, activityRows] = await Promise.all([
        safeQuery(supabase.from("mobile_notifications").select("*").or(`student_id.eq.${user.id},student_id.is.null`).order("created_at", { ascending: false }).limit(8)),
        safeQuery(supabase.from("mobile_downloads").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(6)),
        safeQuery(supabase.from("mobile_activity").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(8))
      ]);

      setNotifications(notificationRows);
      setDownloads(downloadRows);
      setActivity(activityRows);
      setMessage("AFF Mobile Super App synchronized across iPhone, Android, tablet, and web.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Run the Mobile Super App migration to enable native mobile records.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadMobileApp();
  }, [loadMobileApp]);

  const unreadNotifications = useMemo(() => notifications.filter((row) => !row.read_at).length, [notifications]);

  async function recordDownload(assetType: string) {
    if (!studentId) return;
    const supabase = createClient();
    const { error } = await supabase.from("mobile_downloads").insert({
      student_id: studentId,
      asset_type: assetType,
      asset_title: `AFF ${assetType}`,
      source_route: "/mobile-super-app",
      download_status: "Queued"
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadMobileApp();
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Mobile Super App"
        title="A native-ready student operating system for iPhone, Android, tablet, and web."
        text="Mobile-first access to learning, trading, university, leadership, media, global network, messaging, push notifications, announcements, alerts, and offline downloads."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">App Store Ready Architecture</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
              <p className="mt-2 text-sm text-ink/58">{loading ? "Loading mobile profile..." : `${studentName} - ${studentEmail}`}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadMobileApp}>
              <MonitorSmartphone size={16} /> Sync Mobile App
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Smartphone size={22} />} label="iPhone" value="Native UX" detail="Safe-area aware mobile shell" />
            <Metric icon={<TabletSmartphone size={22} />} label="Android and Tablet" value="Responsive" detail="Adaptive tablet and phone layouts" />
            <Metric icon={<Bell size={22} />} label="Notifications" value={String(unreadNotifications)} detail="unread mobile alerts" />
            <Metric icon={<WifiOff size={22} />} label="Offline Mode" value={String(downloads.length)} detail="lesson, PDF, and certificate downloads" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="mx-auto w-full max-w-[320px] rounded-[34px] border border-gold-500/35 bg-navy-950 p-3 shadow-gold">
                  <div className="rounded-[26px] border border-gold-500/20 bg-navy-900 p-4">
                    <div className="mx-auto mb-4 h-1.5 w-20 rounded-full bg-gold-500/70" />
                    <p className="text-xs uppercase tracking-[.22em] text-gold-300">AFF Super App</p>
                    <h2 className="mt-3 font-serif text-3xl font-semibold text-white">Mobile command center</h2>
                    <div className="mt-5 grid gap-3">
                      <PhoneTile icon={<GraduationCap size={18} />} label="Dashboard" value="Missions, streaks, goals" />
                      <PhoneTile icon={<ChartCandlestick size={18} />} label="Trading" value="Floor, simulator, AI tools" />
                      <PhoneTile icon={<Tv size={18} />} label="Media" value="TV Studio and livestreams" />
                      <PhoneTile icon={<Globe2 size={18} />} label="Global" value="Network and campuses" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-px bg-gold-500/14">
                <StatusRow label="Student Identity" value="Authenticated by Supabase" />
                <StatusRow label="Push Architecture" value="mobile_notifications ready" />
                <StatusRow label="Offline Sync" value="mobile_downloads ready" />
                <StatusRow label="Analytics" value="mobile_activity ready" />
              </div>
            </div>

            <div className="grid gap-6">
              <section className="grid gap-4 md:grid-cols-2">
                {appSections.map((section) => (
                  <FeaturePanel key={section.title} title={section.title} icon={<section.icon size={22} />}>
                    <div className="grid gap-2">
                      {section.items.map(([label, href]) => (
                        <Link key={`${section.title}-${label}`} href={href} className="flex items-center justify-between gap-3 border border-gold-500/18 bg-navy-950 px-4 py-3 text-sm transition hover:border-gold-400/60">
                          <span className="font-semibold text-white">{label}</span>
                          <span className="text-gold-300">Open</span>
                        </Link>
                      ))}
                    </div>
                  </FeaturePanel>
                ))}
              </section>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <FeaturePanel title="Communication Hub" icon={<MessageSquare size={22} />}>
              <div className="grid gap-3">
                <CommunicationLink href="/messages" icon={<MessageSquare size={18} />} label="Messages" />
                <CommunicationLink href="/announcements" icon={<Bell size={18} />} label="Announcements" />
                <CommunicationLink href="/events" icon={<CalendarDays size={18} />} label="Instructor Alerts" />
                <CommunicationLink href="/live-trading-room" icon={<Radio size={18} />} label="Live Room Alerts" />
              </div>
            </FeaturePanel>

            <FeaturePanel title="Offline Mode" icon={<Download size={22} />}>
              <div className="grid gap-3">
                {offlineAssets.map((asset) => (
                  <button key={asset.type} className="flex items-center justify-between gap-3 border border-gold-500/18 bg-navy-950 px-4 py-3 text-left text-sm transition hover:border-gold-400/60" type="button" onClick={() => recordDownload(asset.type)}>
                    <span className="flex items-center gap-3 font-semibold text-white">
                      <asset.icon className="text-gold-300" size={18} />
                      {asset.label}
                    </span>
                    <span className="text-gold-300">Queue</span>
                  </button>
                ))}
              </div>
            </FeaturePanel>

            <FeaturePanel title="Native Build Pipeline" icon={<Sparkles size={22} />}>
              <div className="grid gap-3 text-sm text-ink/68">
                <StatusRow label="Framework" value="Expo / React Native ready" />
                <StatusRow label="Auth" value="Supabase session bridge" />
                <StatusRow label="Stores" value="EAS Build and Submit path" />
                <StatusRow label="Brand" value="AFF navy-gold design tokens" />
              </div>
            </FeaturePanel>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <FeaturePanel title="Push Notifications and Alerts" icon={<Bell size={22} />}>
              <RecordList rows={notifications} empty="No mobile notifications found yet." primary={["notification_title"]} secondary={["notification_type", "delivery_status", "created_at"]} />
            </FeaturePanel>
            <FeaturePanel title="Mobile Activity and Downloads" icon={<Download size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                <RecordList rows={activity} empty="No mobile activity found yet." primary={["activity_label", "activity_type"]} secondary={["activity_type", "created_at"]} />
                <RecordList rows={downloads} empty="No offline downloads queued yet." primary={["asset_title"]} secondary={["asset_type", "download_status", "created_at"]} />
              </div>
            </FeaturePanel>
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
      <p className="mt-4 text-xs uppercase tracking-[.2em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-ink/64">{detail}</p>
    </article>
  );
}

function FeaturePanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
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

function PhoneTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gold-500/20 bg-navy-950 p-3">
      <div className="flex items-center gap-3">
        <span className="text-gold-300">{icon}</span>
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="text-xs text-ink/58">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="text-right text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function CommunicationLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 border border-gold-500/18 bg-navy-950 px-4 py-3 text-sm transition hover:border-gold-400/60">
      <span className="flex items-center gap-3 font-semibold text-white">
        <span className="text-gold-300">{icon}</span>
        {label}
      </span>
      <span className="text-gold-300">Open</span>
    </Link>
  );
}

function RecordList({ rows, empty, primary, secondary }: { rows: DbRow[]; empty: string; primary: string[]; secondary: string[] }) {
  if (rows.length === 0) return <p className="bg-navy-950 p-4 text-sm text-ink/68">{empty}</p>;

  return (
    <div className="grid gap-px bg-gold-500/14">
      {rows.map((row, index) => (
        <div key={`${value(row, primary, "record")}-${index}`} className="bg-navy-950 p-4">
          <p className="font-semibold text-white">{value(row, primary, "AFF mobile record")}</p>
          <p className="mt-2 text-sm text-ink/62">
            {secondary.map((key) => key.includes("_at") || key.includes("date") ? shortDate(value(row, [key])) : value(row, [key])).filter(Boolean).join(" - ")}
          </p>
        </div>
      ))}
    </div>
  );
}
