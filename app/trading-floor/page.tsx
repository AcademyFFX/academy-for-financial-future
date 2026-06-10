"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Bot,
  CalendarClock,
  ChartCandlestick,
  Clock3,
  Download,
  Megaphone,
  MessageSquare,
  Mic,
  RefreshCw,
  Send,
  ShieldCheck,
  Tv,
  Upload,
  Users
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

const adminEmail = "acafffx@gmail.com";
const marketWall = [
  { symbol: "EURUSD", status: "Bullish", note: "London continuation above prior liquidity" },
  { symbol: "GBPUSD", status: "Neutral", note: "Waiting for New York confirmation" },
  { symbol: "USDJPY", status: "Bearish", note: "Yield sensitivity and resistance rejection" },
  { symbol: "AUDUSD", status: "Neutral", note: "Range-bound during Asia handoff" },
  { symbol: "GOLD", status: "Bullish", note: "Liquidity resting above intraday highs" },
  { symbol: "NASDAQ", status: "Neutral", note: "FOMC-sensitive risk market" },
  { symbol: "DXY", status: "Bearish", note: "Dollar index below session midpoint" }
];

const economicEvents = [
  { title: "CPI", priority: "High", note: "Inflation volatility and USD repricing" },
  { title: "NFP", priority: "High", note: "Labor market shock risk" },
  { title: "FOMC", priority: "High", note: "Policy statement and press conference" },
  { title: "Interest Rate Decisions", priority: "High", note: "Central bank direction" },
  { title: "GDP", priority: "Medium", note: "Growth trend confirmation" },
  { title: "Retail Sales", priority: "Medium", note: "Consumer demand signal" }
];

const channels = ["#market-analysis", "#forex-anatomy", "#economic-data", "#risk-management", "#civic-leadership", "#general"];
const pairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "GOLD", "NASDAQ", "DXY"];
const directions = ["Buy", "Sell", "Watchlist"];

const initialTradeIdea = {
  pair: "EURUSD",
  direction: "Buy",
  entry: "",
  stopLoss: "",
  takeProfit: "",
  analysis: ""
};

const initialInstructor = {
  title: "",
  sessionName: "London Session",
  lessonAnnouncement: "",
  sessionNotes: "",
  dailyBias: "",
  tradeSetup: ""
};

const initialDesk = {
  watchlist: "EURUSD, GOLD, DXY",
  notes: "",
  dailyPlan: ""
};

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

function nextSessionInfo(now = new Date()) {
  const utcHour = now.getUTCHours();
  const sessions = [
    { name: "Sydney Session", start: 21, end: 6 },
    { name: "Tokyo Session", start: 0, end: 9 },
    { name: "London Session", start: 7, end: 16 },
    { name: "New York Session", start: 12, end: 21 }
  ];

  const active = sessions.filter((session) => session.start < session.end
    ? utcHour >= session.start && utcHour < session.end
    : utcHour >= session.start || utcHour < session.end);
  const next = sessions
    .map((session) => {
      const start = new Date(now);
      start.setUTCHours(session.start, 0, 0, 0);
      if (start <= now) start.setUTCDate(start.getUTCDate() + 1);
      return { ...session, startsAt: start, minutes: Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000)) };
    })
    .sort((left, right) => left.minutes - right.minutes)[0];

  return { sessions, activeNames: new Set(active.map((session) => session.name)), next };
}

function priorityClass(priority: string) {
  if (priority === "High") return "border-red-300/40 text-red-100";
  if (priority === "Medium") return "border-gold-500/45 text-gold-300";
  return "border-ink/20 text-ink/70";
}

export default function TradingFloorPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("AFF Student");
  const [studentEmail, setStudentEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeChannel, setActiveChannel] = useState("#market-analysis");
  const [chatBody, setChatBody] = useState("");
  const [tradeIdea, setTradeIdea] = useState(initialTradeIdea);
  const [instructorForm, setInstructorForm] = useState(initialInstructor);
  const [deskForm, setDeskForm] = useState(initialDesk);
  const [tables, setTables] = useState<Record<string, DbRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading AFF Virtual Trading Floor...");
  const [clock, setClock] = useState(() => nextSessionInfo());

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadFloor = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login?next=/trading-floor");
        return;
      }

      const admin = user.email?.toLowerCase() === adminEmail;
      const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? "AFF Student";
      setStudentId(user.id);
      setStudentEmail(user.email ?? "");
      setStudentName(name);
      setIsAdmin(admin);

      const [
        sessionsResult,
        messagesResult,
        ideasResult,
        commentaryResult,
        watchlistResult,
        biasResult,
        leaderboardResult,
        tvResult,
        simulatorResult,
        voiceResult,
        chartResult
      ] = await Promise.all([
        supabase.from("trading_floor_sessions").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("trading_floor_messages").select("*").order("created_at", { ascending: false }).limit(80),
        supabase.from("trade_ideas").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("market_commentary").select("*").order("published_at", { ascending: false }).limit(20),
        supabase.from("student_watchlists").select("*").eq("student_id", user.id).order("updated_at", { ascending: false }).limit(1),
        supabase.from("daily_bias_reports").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("leaderboard_scores").select("*").order("total_score", { ascending: false }).limit(20),
        supabase.from("tv_broadcasts").select("*").in("status", ["Live", "Scheduled", "Replay", "Published"]).order("scheduled_at", { ascending: true }).limit(10),
        supabase.from("simulator_accounts").select("*").limit(200),
        supabase.from("voice_coach_usage_events").select("*").limit(200),
        supabase.from("chart_analyst_usage_events").select("*").limit(200)
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (messagesResult.error) throw messagesResult.error;
      if (ideasResult.error) throw ideasResult.error;

      const desk = (watchlistResult.data ?? [])[0] as DbRow | undefined;
      if (desk) {
        setDeskForm({
          watchlist: value(desk, ["watchlist"], initialDesk.watchlist),
          notes: value(desk, ["notes"]),
          dailyPlan: value(desk, ["daily_plan"])
        });
      }

      setTables({
        sessions: (sessionsResult.data ?? []) as DbRow[],
        messages: (messagesResult.data ?? []) as DbRow[],
        ideas: (ideasResult.data ?? []) as DbRow[],
        commentary: (commentaryResult.data ?? []) as DbRow[],
        watchlists: (watchlistResult.data ?? []) as DbRow[],
        bias: (biasResult.data ?? []) as DbRow[],
        leaderboard: (leaderboardResult.data ?? []) as DbRow[],
        tv: (tvResult.data ?? []) as DbRow[],
        simulator: (simulatorResult.data ?? []) as DbRow[],
        voice: (voiceResult.data ?? []) as DbRow[],
        chart: (chartResult.data ?? []) as DbRow[]
      });
      setMessage("AFF Virtual Trading Floor synchronized.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the Trading Floor migration to enable institutional floor records."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadFloor();
  }, [loadFloor]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(nextSessionInfo()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const analytics = useMemo(() => {
    const ideas = tables.ideas ?? [];
    const messages = tables.messages ?? [];
    const leaderboard = tables.leaderboard ?? [];
    const activeTraders = new Set([...ideas, ...messages].map((row) => value(row, ["student_id"])).filter(Boolean)).size;
    return {
      activeTraders,
      ideas: ideas.length,
      messages: messages.length,
      broadcasts: (tables.tv ?? []).length,
      simulator: (tables.simulator ?? []).length,
      aiInteractions: (tables.voice ?? []).length + (tables.chart ?? []).length,
      leaderboard: leaderboard.length
    };
  }, [tables]);

  async function saveDesk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving student trading desk...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("student_watchlists").upsert({
        student_id: studentId,
        student_name: studentName,
        student_email: studentEmail,
        watchlist: deskForm.watchlist,
        notes: deskForm.notes,
        daily_plan: deskForm.dailyPlan,
        updated_at: new Date().toISOString()
      }, { onConflict: "student_id" }).select("*").single();
      if (error) throw error;
      setTables((current) => ({ ...current, watchlists: [data as DbRow] }));
      setMessage("Student trading desk saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save trading desk."));
    }
  }

  async function submitTradeIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Publishing trade idea to the floor...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("trade_ideas").insert({
        student_id: studentId,
        student_name: studentName,
        pair: tradeIdea.pair,
        direction: tradeIdea.direction,
        entry: tradeIdea.entry,
        stop_loss: tradeIdea.stopLoss,
        take_profit: tradeIdea.takeProfit,
        analysis: tradeIdea.analysis,
        status: "Published"
      }).select("*").single();
      if (error) throw error;
      setTables((current) => ({ ...current, ideas: [data as DbRow, ...(current.ideas ?? [])] }));
      setTradeIdea(initialTradeIdea);
      setMessage("Trade idea published.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to publish trade idea."));
    }
  }

  async function sendChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatBody.trim()) return;
    setMessage("Sending trading floor message...");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("trading_floor_messages").insert({
        student_id: studentId,
        student_name: studentName,
        channel: activeChannel,
        body: chatBody.trim()
      }).select("*").single();
      if (error) throw error;
      setTables((current) => ({ ...current, messages: [data as DbRow, ...(current.messages ?? [])] }));
      setChatBody("");
      setMessage("Trading floor message sent.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to send message."));
    }
  }

  async function publishInstructorDesk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;
    setMessage("Publishing instructor desk update...");
    try {
      const supabase = createClient();
      const [sessionResult, biasResult, commentaryResult] = await Promise.all([
        supabase.from("trading_floor_sessions").insert({
          title: instructorForm.title || `${instructorForm.sessionName} Instructor Desk`,
          session_name: instructorForm.sessionName,
          lesson_announcement: instructorForm.lessonAnnouncement,
          session_notes: instructorForm.sessionNotes,
          trade_setup: instructorForm.tradeSetup,
          published_by: "Dr. Jean Rene Moricette"
        }).select("*").single(),
        supabase.from("daily_bias_reports").insert({
          session_name: instructorForm.sessionName,
          bias_title: instructorForm.title || "Daily Bias Report",
          bias_body: instructorForm.dailyBias,
          trade_setup: instructorForm.tradeSetup,
          published_by: "Dr. Jean Rene Moricette"
        }).select("*").single(),
        supabase.from("market_commentary").insert({
          title: instructorForm.title || "Instructor Market Commentary",
          body: instructorForm.sessionNotes || instructorForm.dailyBias,
          priority: "High",
          published_by: "Dr. Jean Rene Moricette"
        }).select("*").single()
      ]);
      if (sessionResult.error) throw sessionResult.error;
      if (biasResult.error) throw biasResult.error;
      if (commentaryResult.error) throw commentaryResult.error;
      setTables((current) => ({
        ...current,
        sessions: [sessionResult.data as DbRow, ...(current.sessions ?? [])],
        bias: [biasResult.data as DbRow, ...(current.bias ?? [])],
        commentary: [commentaryResult.data as DbRow, ...(current.commentary ?? [])]
      }));
      setInstructorForm(initialInstructor);
      setMessage("Instructor desk update published.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to publish instructor update."));
    }
  }

  const filteredMessages = (tables.messages ?? []).filter((row) => value(row, ["channel"], "#general") === activeChannel).slice(0, 12);

  return (
    <>
      <PageHeader
        eyebrow="AFF Virtual Trading Floor"
        title="Institutional market operations for students, instructors, AI systems, and live data."
        text="Monitor market status, sessions, economic events, instructor bias, student desks, trade ideas, AI tools, TV Studio broadcasts, chat channels, and leaderboard performance in one protected command room."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <div className="terminal-panel flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Trading Floor Sync</p>
              <p className="mt-2 text-sm text-ink/72">{message}</p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={loadFloor}>
              <RefreshCw size={16} /> Refresh Floor
            </button>
          </div>

          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Metric icon={<Users size={20} />} label="Active Traders" value={String(analytics.activeTraders)} />
            <Metric icon={<ChartCandlestick size={20} />} label="Trade Ideas" value={String(analytics.ideas)} />
            <Metric icon={<Bot size={20} />} label="AI Interactions" value={String(analytics.aiInteractions)} />
            <Metric icon={<Tv size={20} />} label="TV Signals" value={String(analytics.broadcasts)} />
            <Metric icon={<BarChart3 size={20} />} label="Simulator" value={String(analytics.simulator)} />
            <Metric icon={<Award size={20} />} label="Leaderboard" value={String(analytics.leaderboard)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <Panel title="Live Market Wall" icon={<ChartCandlestick size={22} />}>
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2 xl:grid-cols-4">
                {marketWall.map((market) => (
                  <div key={market.symbol} className="bg-navy-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-semibold text-white">{market.symbol}</p>
                      <span className={`border px-2 py-1 text-xs font-semibold ${market.status === "Bullish" ? "border-emerald-300/40 text-emerald-200" : market.status === "Bearish" ? "border-red-300/40 text-red-100" : "border-gold-500/40 text-gold-300"}`}>{market.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink/64">{market.note}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Global Session Clock" icon={<Clock3 size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {clock.sessions.map((session) => (
                  <div key={session.name} className={`flex items-center justify-between gap-3 p-4 ${clock.activeNames.has(session.name) ? "bg-gold-500 text-navy-950" : "bg-navy-950 text-ink/72"}`}>
                    <span className="font-semibold">{session.name}</span>
                    <span className="text-sm">{clock.activeNames.has(session.name) ? "Active" : `${session.start}:00-${session.end}:00 UTC`}</span>
                  </div>
                ))}
                <div className="bg-navy-950 p-4">
                  <p className="text-xs uppercase tracking-[.18em] text-gold-300">Next Session</p>
                  <p className="mt-2 font-semibold text-white">{clock.next.name}</p>
                  <p className="mt-1 text-sm text-ink/64">{clock.next.minutes} minutes to open</p>
                </div>
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Panel title="Economic Command Center" icon={<CalendarClock size={22} />}>
              <div className="grid gap-px bg-gold-500/14">
                {economicEvents.map((event) => (
                  <div key={event.title} className="bg-navy-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{event.title}</p>
                      <span className={`border px-2 py-1 text-xs font-semibold ${priorityClass(event.priority)}`}>{event.priority}</span>
                    </div>
                    <p className="mt-2 text-sm text-ink/64">{event.note}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="AI Trading Assistant" icon={<Bot size={22} />}>
              <div className="grid gap-3 bg-navy-950 p-5">
                {["Analyze EURUSD", "Explain CPI", "Map liquidity", "Review my setup"].map((prompt) => (
                  <Link key={prompt} className="border border-gold-500/24 px-4 py-3 text-sm font-semibold text-gold-300 hover:border-gold-400" href={`/ai-coach?prompt=${encodeURIComponent(prompt)}`}>
                    {prompt}
                  </Link>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  <Link className="grid place-items-center border border-gold-500/24 p-3 text-gold-300" href="/ai-coach" aria-label="AI Coach"><Bot size={20} /></Link>
                  <Link className="grid place-items-center border border-gold-500/24 p-3 text-gold-300" href="/voice-coach" aria-label="Voice Coach"><Mic size={20} /></Link>
                  <Link className="grid place-items-center border border-gold-500/24 p-3 text-gold-300" href="/chart-analyst" aria-label="Chart Analyst"><Upload size={20} /></Link>
                </div>
              </div>
            </Panel>

            <Panel title="AFF TV Studio Integration" icon={<Tv size={22} />}>
              <RecordList rows={tables.tv ?? []} empty="No TV Studio broadcasts found." primary={["title"]} secondary={["status", "show_name", "scheduled_at"]} />
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
            <Panel title="Student Trading Desks" icon={<ShieldCheck size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={saveDesk}>
                <Input label="Watchlist" value={deskForm.watchlist} onChange={(value) => setDeskForm((current) => ({ ...current, watchlist: value }))} />
                <Textarea label="Notes" value={deskForm.notes} onChange={(value) => setDeskForm((current) => ({ ...current, notes: value }))} />
                <Textarea label="Daily plan" value={deskForm.dailyPlan} onChange={(value) => setDeskForm((current) => ({ ...current, dailyPlan: value }))} />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Link className="border border-gold-500/30 px-3 py-2 text-center text-sm font-semibold text-gold-300" href="/journal">Journal</Link>
                  <Link className="border border-gold-500/30 px-3 py-2 text-center text-sm font-semibold text-gold-300" href="/ai-coach">AI Coach</Link>
                  <Link className="border border-gold-500/30 px-3 py-2 text-center text-sm font-semibold text-gold-300" href="/chart-analyst">Chart Analyst</Link>
                </div>
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Download size={16} /> Save Desk
                </button>
              </form>
            </Panel>

            <Panel title="Live Trade Idea Feed" icon={<Megaphone size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={submitTradeIdea}>
                <div className="grid gap-4 md:grid-cols-3">
                  <Select label="Pair" value={tradeIdea.pair} options={pairs} onChange={(value) => setTradeIdea((current) => ({ ...current, pair: value }))} />
                  <Select label="Direction" value={tradeIdea.direction} options={directions} onChange={(value) => setTradeIdea((current) => ({ ...current, direction: value }))} />
                  <Input label="Entry" value={tradeIdea.entry} onChange={(value) => setTradeIdea((current) => ({ ...current, entry: value }))} required />
                  <Input label="Stop Loss" value={tradeIdea.stopLoss} onChange={(value) => setTradeIdea((current) => ({ ...current, stopLoss: value }))} required />
                  <Input label="Take Profit" value={tradeIdea.takeProfit} onChange={(value) => setTradeIdea((current) => ({ ...current, takeProfit: value }))} required />
                </div>
                <Textarea label="Analysis" value={tradeIdea.analysis} onChange={(value) => setTradeIdea((current) => ({ ...current, analysis: value }))} required />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Publish Trade Idea
                </button>
              </form>
              <RecordList rows={tables.ideas ?? []} empty="No public trade ideas posted yet." primary={["pair"]} secondary={["direction", "entry", "stop_loss", "take_profit", "instructor_comment"]} />
            </Panel>
          </section>

          {isAdmin ? (
            <Panel title="Instructor Desk" icon={<Megaphone size={22} />}>
              <form className="grid gap-4 bg-navy-950 p-5" onSubmit={publishInstructorDesk}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Title" value={instructorForm.title} onChange={(value) => setInstructorForm((current) => ({ ...current, title: value }))} />
                  <Input label="Session" value={instructorForm.sessionName} onChange={(value) => setInstructorForm((current) => ({ ...current, sessionName: value }))} />
                </div>
                <Textarea label="Live lesson announcement" value={instructorForm.lessonAnnouncement} onChange={(value) => setInstructorForm((current) => ({ ...current, lessonAnnouncement: value }))} />
                <Textarea label="Session notes" value={instructorForm.sessionNotes} onChange={(value) => setInstructorForm((current) => ({ ...current, sessionNotes: value }))} />
                <Textarea label="Daily bias publication" value={instructorForm.dailyBias} onChange={(value) => setInstructorForm((current) => ({ ...current, dailyBias: value }))} />
                <Textarea label="Trade setup publication" value={instructorForm.tradeSetup} onChange={(value) => setInstructorForm((current) => ({ ...current, tradeSetup: value }))} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Publish Instructor Update
                </button>
              </form>
            </Panel>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="Trading Floor Chat" icon={<MessageSquare size={22} />}>
              <div className="flex flex-wrap gap-2 bg-navy-950 p-4">
                {channels.map((channel) => (
                  <button key={channel} className={`px-3 py-2 text-sm font-semibold ${activeChannel === channel ? "bg-gold-500 text-navy-950" : "border border-gold-500/24 text-gold-300"}`} type="button" onClick={() => setActiveChannel(channel)}>
                    {channel}
                  </button>
                ))}
              </div>
              <div className="grid gap-px bg-gold-500/14">
                {filteredMessages.length === 0 ? <p className="bg-navy-950 p-5 text-sm text-ink/68">No messages in {activeChannel} yet.</p> : null}
                {filteredMessages.map((row) => (
                  <div key={value(row, ["id"])} className="bg-navy-950 p-4">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{value(row, ["student_name"], "AFF Student")}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/74">{value(row, ["body"])}</p>
                  </div>
                ))}
              </div>
              <form className="grid gap-3 bg-navy-950 p-5 sm:grid-cols-[1fr_auto]" onSubmit={sendChat}>
                <input className="border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" value={chatBody} onChange={(event) => setChatBody(event.target.value)} placeholder={`Message ${activeChannel}`} />
                <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-4 py-3 font-bold text-navy-950" type="submit">
                  <Send size={16} /> Send
                </button>
              </form>
            </Panel>

            <Panel title="Leaderboard" icon={<Award size={22} />}>
              <RecordList rows={tables.leaderboard ?? []} empty="No leaderboard scores yet." primary={["student_name"]} secondary={["total_score", "certification_points", "simulator_performance", "journal_completion", "community_contribution", "civic_leadership"]} />
            </Panel>
          </section>

          <section className="terminal-panel p-5">
            <p className="text-xs uppercase tracking-[.22em] text-gold-300">Future Ready Architecture</p>
            <p className="mt-3 leading-7 text-ink/72">
              The Trading Floor is structured for OpenAI Realtime Voice, OpenAI Vision, live TradingView widgets, and Bloomberg-style market panels. Current production data is powered by Supabase tables, AFF AI Coach routes, Voice Coach, Chart Analyst, TV Studio, simulator activity, and protected student authentication.
            </p>
          </section>

          {loading ? <p className="text-sm text-ink/60">Loading trading floor data...</p> : null}
        </SectionInner>
      </Section>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-xs uppercase tracking-[.18em] text-ink/54">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
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

function Input({ label, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <input {...props} className="border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <textarea className="min-h-24 border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function Select({ label, value: selected, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink/72">
      {label}
      <select className="border border-gold-500/24 bg-navy-900 px-3 py-3 text-white outline-none focus:border-gold-400" value={selected} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function RecordList({ rows, empty, primary, secondary }: { rows: DbRow[]; empty: string; primary: string[]; secondary: string[] }) {
  if (rows.length === 0) return <p className="bg-navy-950 p-5 text-sm text-ink/68">{empty}</p>;

  return (
    <div className="grid gap-px bg-gold-500/14">
      {rows.slice(0, 8).map((row, index) => (
        <div key={value(row, ["id"], String(index))} className="bg-navy-950 p-4">
          <p className="font-semibold text-white">{value(row, primary, "Trading floor record")}</p>
          <p className="mt-2 text-sm leading-6 text-ink/64">{secondary.map((key) => value(row, [key])).filter(Boolean).join(" | ")}</p>
        </div>
      ))}
    </div>
  );
}
