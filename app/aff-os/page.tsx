"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartCandlestick,
  Database,
  Fingerprint,
  GraduationCap,
  HandHeart,
  KeyRound,
  Landmark,
  Library,
  LockKeyhole,
  MessageSquare,
  Mic,
  Network,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  ShoppingBag,
  Tv,
  Upload,
  UserRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";
const initialIdentity = {
  displayName: "",
  professionalTitle: "AFF Student",
  country: "",
  primaryDivision: "Academy for Financial Future",
  missionStatement: ""
};

const connectedSystems = [
  { href: "/university", label: "University", icon: GraduationCap },
  { href: "/ai-coach", label: "AI Coach", icon: Bot },
  { href: "/voice-coach", label: "Voice Coach", icon: Mic },
  { href: "/chart-analyst", label: "Chart Analyst", icon: Upload },
  { href: "/trading-floor", label: "Trading Floor", icon: ChartCandlestick },
  { href: "/research-institute", label: "Research Institute", icon: Library },
  { href: "/civic-leadership", label: "Civic Leadership", icon: Scale },
  { href: "/career-center", label: "Career Center", icon: BriefcaseBusiness },
  { href: "/tv-studio", label: "TV Studio", icon: Tv },
  { href: "/accreditation", label: "Accreditation", icon: ShieldCheck },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/campus-expansion", label: "Campus Expansion", icon: Building2 },
  { href: "/endowment-fund", label: "Endowment Fund", icon: Landmark },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/global-network", label: "Global Network", icon: Network },
  { href: "/executive-command-center", label: "Executive Command", icon: BarChart3 }
];

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
  return total ? Math.round((part / total) * 100) : 0;
}

export default function AFFOSPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [isAdmin, setIsAdmin] = useState(false);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [identityForm, setIdentityForm] = useState(initialIdentity);
  const [legacyEntry, setLegacyEntry] = useState("");
  const [message, setMessage] = useState("Loading AFF Operating System...");
  const [loading, setLoading] = useState(true);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadOS = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/aff-os");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "AFF Student";
      setStudentId(user.id);
      setStudentEmail(user.email ?? "");
      setStudentName(name);
      setIsAdmin(admin);
      setIdentityForm((current) => ({ ...current, displayName: current.displayName || name }));

      const [
        identityResult,
        passportResult,
        achievementsResult,
        mentorsResult,
        graphResult,
        vaultResult,
        activityResult,
        universityResult,
        certificatesResult,
        voiceResult,
        chartResult,
        tradingFloorResult,
        researchResult,
        civicResult,
        careerResult,
        marketplaceResult,
        globalResult
      ] = await Promise.all([
        supabase.from("aff_identity_profiles").select("*").eq("student_id", user.id).order("updated_at", { ascending: false }).limit(1),
        supabase.from("aff_passports").select("*").eq("student_id", user.id).order("issued_at", { ascending: false }).limit(1),
        admin ? supabase.from("aff_achievements").select("*").order("created_at", { ascending: false }).limit(200) : supabase.from("aff_achievements").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(80),
        supabase.from("aff_mentor_network").select("*").order("mentor_name", { ascending: true }).limit(100),
        supabase.from("aff_knowledge_graph").select("*").order("division_name", { ascending: true }).limit(200),
        admin ? supabase.from("aff_legacy_vault").select("*").order("created_at", { ascending: false }).limit(200) : supabase.from("aff_legacy_vault").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(50),
        admin ? supabase.from("aff_os_activity").select("*").order("created_at", { ascending: false }).limit(200) : supabase.from("aff_os_activity").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(80),
        supabase.from("student_degree_progress").select("*").eq("student_id", user.id).limit(100),
        supabase.from("certificates").select("*").eq("student_id", user.id).limit(100),
        supabase.from("voice_coach_usage_events").select("*").eq("student_id", user.id).limit(100),
        supabase.from("chart_analyst_reports").select("*").eq("student_id", user.id).limit(100),
        supabase.from("trade_ideas").select("*").eq("student_id", user.id).limit(100),
        supabase.from("research_submissions").select("*").eq("student_id", user.id).limit(100),
        supabase.from("civic_service_hours").select("*").eq("student_id", user.id).limit(100),
        supabase.from("career_profiles").select("*").eq("student_id", user.id).limit(1),
        supabase.from("marketplace_orders").select("*").eq("student_id", user.id).limit(100),
        supabase.from("global_student_recruitment").select("*").eq("student_id", user.id).limit(100)
      ]);

      if (identityResult.error) throw identityResult.error;
      if (passportResult.error) throw passportResult.error;
      if (achievementsResult.error) throw achievementsResult.error;

      const identity = (identityResult.data ?? [])[0] as DbRow | undefined;
      if (identity) {
        setIdentityForm({
          displayName: value(identity, ["display_name"], name),
          professionalTitle: value(identity, ["professional_title"], "AFF Student"),
          country: value(identity, ["country"]),
          primaryDivision: value(identity, ["primary_division"], "Academy for Financial Future"),
          missionStatement: value(identity, ["mission_statement"])
        });
      }

      setTables({
        identity: (identityResult.data ?? []) as DbRow[],
        passports: (passportResult.data ?? []) as DbRow[],
        achievements: (achievementsResult.data ?? []) as DbRow[],
        mentors: (mentorsResult.data ?? []) as DbRow[],
        graph: (graphResult.data ?? []) as DbRow[],
        vault: (vaultResult.data ?? []) as DbRow[],
        activity: (activityResult.data ?? []) as DbRow[],
        university: (universityResult.data ?? []) as DbRow[],
        certificates: (certificatesResult.data ?? []) as DbRow[],
        voice: (voiceResult.data ?? []) as DbRow[],
        chart: (chartResult.data ?? []) as DbRow[],
        tradingFloor: (tradingFloorResult.data ?? []) as DbRow[],
        research: (researchResult.data ?? []) as DbRow[],
        civic: (civicResult.data ?? []) as DbRow[],
        career: (careerResult.data ?? []) as DbRow[],
        marketplace: (marketplaceResult.data ?? []) as DbRow[],
        global: (globalResult.data ?? []) as DbRow[]
      });
      setMessage("AFF Operating System synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the AFF OS migration to enable lifelong operating records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOS();
  }, [loadOS]);

  const analytics = useMemo(() => {
    const divisionRows = [
      tables.university,
      tables.certificates,
      tables.voice,
      tables.chart,
      tables.tradingFloor,
      tables.research,
      tables.civic,
      tables.career,
      tables.marketplace,
      tables.global
    ];
    const activeDivisions = divisionRows.filter((rows) => (rows ?? []).length > 0).length;
    const civicHours = (tables.civic ?? []).reduce((total, row) => total + numberValue(row, ["hours"]), 0);
    const progress = percent(activeDivisions, 10);

    return {
      activeDivisions,
      progress,
      achievements: (tables.achievements ?? []).length,
      mentors: (tables.mentors ?? []).length,
      graph: (tables.graph ?? []).length,
      vault: (tables.vault ?? []).length,
      activity: (tables.activity ?? []).length,
      certificates: (tables.certificates ?? []).length,
      aiInteractions: (tables.voice ?? []).length + (tables.chart ?? []).length,
      civicHours
    };
  }, [tables]);

  async function saveIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving AFF Identity Profile...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("aff_identity_profiles").upsert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        display_name: identityForm.displayName.trim() || studentName,
        professional_title: identityForm.professionalTitle,
        country: identityForm.country.trim() || null,
        primary_division: identityForm.primaryDivision,
        mission_statement: identityForm.missionStatement.trim() || null,
        updated_at: new Date().toISOString()
      }, { onConflict: "student_id" }).select("*").single();
      if (error) throw error;

      await supabase.from("aff_passports").upsert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        passport_number: `AFF-OS-${studentId.slice(0, 8).toUpperCase()}`,
        passport_status: "Active",
        primary_division: identityForm.primaryDivision,
        lifelong_record_status: "Open"
      }, { onConflict: "student_id" });

      await supabase.from("aff_os_activity").insert({
        student_id: studentId,
        student_name: studentName,
        activity_type: "Identity Updated",
        division_name: "AFF Operating System",
        activity_summary: "Updated AFF Identity Profile"
      });

      setTables((current) => ({ ...current, identity: [data as DbRow] }));
      setMessage("AFF Identity Profile saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save identity profile."));
    }
  }

  async function addLegacyEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!legacyEntry.trim()) return;
    setMessage("Saving Legacy Vault entry...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("aff_legacy_vault").insert({
        student_id: studentId,
        student_name: studentName,
        vault_title: "Student Legacy Reflection",
        vault_category: "Lifelong Record",
        vault_entry: legacyEntry.trim(),
        visibility: "Private"
      }).select("*").single();
      if (error) throw error;
      setTables((current) => ({ ...current, vault: [data as DbRow, ...(current.vault ?? [])] }));
      setLegacyEntry("");
      setMessage("Legacy Vault entry saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save Legacy Vault entry."));
    }
  }

  const passport = (tables.passports ?? [])[0];

  return (
    <>
      <PageHeader
        eyebrow="AFF Operating System"
        title="The lifelong identity, passport, achievement, mentor, knowledge, and legacy layer for Academy for Financial Future."
        text="Unify AFF identity, digital passport records, achievements, mentor relationships, executive assistance, knowledge graph, legacy vault, lifelong student records, and cross-division progress tracking."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <div className="terminal-panel flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Operating Layer</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadOS}>
              <RefreshCw size={16} /> Refresh AFF OS
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Fingerprint size={22} />} label="Identity Progress" value={`${analytics.progress}%`} detail={`${analytics.activeDivisions}/10 tracked divisions active`} />
            <Metric icon={<Award size={22} />} label="Achievements" value={String(analytics.achievements)} detail={`${analytics.certificates} certificates in lifelong record`} />
            <Metric icon={<Bot size={22} />} label="AI Signals" value={String(analytics.aiInteractions)} detail="voice and chart intelligence records" />
            <Metric icon={<Database size={22} />} label="Legacy Vault" value={String(analytics.vault)} detail={`${analytics.activity} OS activity records`} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="AFF Identity Profile" icon={<UserRound size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={saveIdentity}>
                <Input label="Display name" value={identityForm.displayName} onChange={(next) => setIdentityForm((current) => ({ ...current, displayName: next }))} />
                <Input label="Professional title" value={identityForm.professionalTitle} onChange={(next) => setIdentityForm((current) => ({ ...current, professionalTitle: next }))} />
                <Input label="Country" value={identityForm.country} onChange={(next) => setIdentityForm((current) => ({ ...current, country: next }))} />
                <Input label="Primary division" value={identityForm.primaryDivision} onChange={(next) => setIdentityForm((current) => ({ ...current, primaryDivision: next }))} />
                <Textarea label="Mission statement" value={identityForm.missionStatement} onChange={(next) => setIdentityForm((current) => ({ ...current, missionStatement: next }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Save Identity
                </button>
              </form>
            </Panel>

            <Panel title="AFF Digital Passport" icon={<KeyRound size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                <StatLine label="Passport Number" value={value(passport ?? {}, ["passport_number"], "Pending AFF-OS issue")} />
                <StatLine label="Passport Status" value={value(passport ?? {}, ["passport_status"], "Ready")} />
                <StatLine label="Student Email" value={studentEmail || "Pending"} />
                <StatLine label="Primary Division" value={identityForm.primaryDivision} />
                <StatLine label="Lifelong Record" value={`${analytics.activeDivisions} divisions connected`} />
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Achievement Engine" icon={<Award size={22} />}>
              <RecordList rows={tables.achievements ?? []} empty="No AFF achievements yet." primary={["achievement_title"]} secondary={["division_name", "achievement_level", "points"]} />
            </Panel>
            <Panel title="Mentor Network" icon={<MessageSquare size={22} />}>
              <RecordList rows={tables.mentors ?? []} empty="No mentor records found." primary={["mentor_name"]} secondary={["mentor_role", "division_name", "mentor_status"]} />
            </Panel>
            <Panel title="Knowledge Graph" icon={<Network size={22} />}>
              <RecordList rows={tables.graph ?? []} empty="No knowledge graph nodes found." primary={["node_title"]} secondary={["division_name", "node_type", "relationship_count"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Panel title="AI Executive Assistant" icon={<Bot size={22} />}>
              <div className="grid gap-3 bg-navy-950 p-5">
                <p className="text-sm leading-7 text-ink/70">Use AFF AI systems to brief your academic, trading, career, civic, and executive progress.</p>
                <LinkButton href="/ai-coach" label="Ask AI Coach" icon={<Bot size={18} />} />
                <LinkButton href="/voice-coach" label="Open Voice Coach" icon={<Mic size={18} />} />
                <LinkButton href="/chart-analyst" label="Review Chart Evidence" icon={<Upload size={18} />} />
                <LinkButton href="/executive-command-center" label="Chancellor Dashboard" icon={<BarChart3 size={18} />} />
              </div>
            </Panel>

            <Panel title="Cross-Division Progress Tracking" icon={<BarChart3 size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2">
                <ProgressTile label="University" count={(tables.university ?? []).length} href="/university" />
                <ProgressTile label="Certificates" count={(tables.certificates ?? []).length} href="/certificates" />
                <ProgressTile label="Trading Floor" count={(tables.tradingFloor ?? []).length} href="/trading-floor" />
                <ProgressTile label="Research" count={(tables.research ?? []).length} href="/research-institute" />
                <ProgressTile label="Civic Leadership" count={(tables.civic ?? []).length} href="/civic-leadership" />
                <ProgressTile label="Global Network" count={(tables.global ?? []).length} href="/global-network" />
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Legacy Vault" icon={<LockKeyhole size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={addLegacyEntry}>
                <Textarea label="Legacy reflection" value={legacyEntry} onChange={setLegacyEntry} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Save Legacy Entry
                </button>
              </form>
              <RecordList rows={tables.vault ?? []} empty="No Legacy Vault entries yet." primary={["vault_title"]} secondary={["vault_category", "visibility", "created_at"]} />
            </Panel>

            <Panel title="Chancellor Dashboard" icon={<ShieldCheck size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                <StatLine label="Administrator" value="Dr. Jean Rene Moricette" />
                <StatLine label="Admin Mode" value={isAdmin ? "Enabled" : "Student View"} />
                <StatLine label="Mentor Network" value={`${analytics.mentors} mentors`} />
                <StatLine label="Knowledge Graph Nodes" value={`${analytics.graph} nodes`} />
                <StatLine label="Civic Service Hours" value={`${analytics.civicHours}`} />
              </div>
            </Panel>
          </section>

          <Panel title="AFF OS Connected Divisions" icon={<Network size={22} />}>
            <div className="grid gap-px bg-gold-500/14 sm:grid-cols-2 lg:grid-cols-4">
              {connectedSystems.map((item) => (
                <Link key={item.href} href={item.href} className="bg-navy-950 p-5 transition hover:bg-navy-900">
                  <item.icon className="text-gold-300" size={20} />
                  <p className="mt-3 font-semibold text-white">{item.label}</p>
                </Link>
              ))}
            </div>
          </Panel>

          {loading ? <p className="text-sm text-ink/60">Loading AFF OS records...</p> : null}
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="terminal-panel p-5 shadow-gold">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-5 text-sm uppercase tracking-[.18em] text-ink/54">{label}</p>
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
      {children}
    </section>
  );
}

function StatLine({ label, value: text }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-navy-950 p-4">
      <span className="text-sm text-ink/68">{label}</span>
      <span className="text-right font-semibold text-white">{text}</span>
    </div>
  );
}

function Input({ label, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <input {...props} className="border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value: text, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <textarea className="min-h-24 border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" value={text} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function LinkButton({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link className="inline-flex items-center justify-center gap-2 border border-gold-500/35 px-4 py-3 text-sm font-semibold text-gold-300 hover:border-gold-400" href={href}>
      {icon} {label}
    </Link>
  );
}

function ProgressTile({ label, count, href }: { label: string; count: number; href: string }) {
  return (
    <Link href={href} className="bg-navy-950 p-5 transition hover:bg-navy-900">
      <p className="text-sm uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{count}</p>
      <p className="mt-2 text-xs text-gold-300">Open division</p>
    </Link>
  );
}

function RecordList({ rows, empty, primary, secondary }: { rows: DbRow[]; empty: string; primary: string[]; secondary: string[] }) {
  if (rows.length === 0) return <p className="bg-navy-950 p-5 text-sm text-ink/68">{empty}</p>;

  return (
    <div className="grid gap-px bg-gold-500/14">
      {rows.slice(0, 8).map((row, index) => (
        <div key={value(row, ["id"], String(index))} className="bg-navy-950 p-4">
          <p className="font-semibold text-white">{value(row, primary, "AFF OS record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/64">{secondary.map((key) => value(row, [key])).filter(Boolean).join(" | ")}</p>
        </div>
      ))}
    </div>
  );
}
