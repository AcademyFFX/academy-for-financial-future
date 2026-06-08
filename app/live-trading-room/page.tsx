"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  MessageSquare,
  PlayCircle,
  Radio,
  Send,
  Sparkles,
  TrendingUp,
  Video
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type CommentaryItem = {
  id: string;
  title: string;
  body: string;
  session: string;
  publishedAt: string;
};

type DiscussionMessage = {
  id: string;
  studentName: string;
  body: string;
  createdAt: string;
};

type TradeIdea = {
  id: string;
  studentName: string;
  symbol: string;
  direction: string;
  entryZone: string;
  stopLoss: string;
  takeProfit: string;
  rationale: string;
  status: string;
  publishedAt: string;
};

type Recording = {
  id: string;
  title: string;
  session: string;
  recordingUrl: string;
  recordedAt: string;
};

const fallbackCommentary: CommentaryItem[] = [
  {
    id: "london-prep",
    title: "London Session Preparation",
    body: "Review overnight highs and lows, mark liquidity above Asian range extremes, and wait for confirmation before entering.",
    session: "London",
    publishedAt: "2026-06-08T07:00:00.000Z"
  },
  {
    id: "ny-risk",
    title: "New York Risk Note",
    body: "Reduce size before major USD releases and avoid entering during the first reaction candle.",
    session: "New York",
    publishedAt: "2026-06-08T12:30:00.000Z"
  }
];

const fallbackRecordings: Recording[] = [
  {
    id: "orientation",
    title: "Live Trading Room Orientation",
    session: "Academy Onboarding",
    recordingUrl: "",
    recordedAt: "2026-06-08T14:00:00.000Z"
  }
];

const initialTradeIdea = {
  symbol: "EURUSD",
  direction: "Buy",
  entryZone: "",
  stopLoss: "",
  takeProfit: "",
  rationale: ""
};

function textValue(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim().length > 0) return String(value);
  }
  return fallback;
}

function normalizeDate(raw: string) {
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export default function LiveTradingRoomPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading live trading room...");
  const [discussionBody, setDiscussionBody] = useState("");
  const [tradeIdea, setTradeIdea] = useState(initialTradeIdea);
  const [commentary, setCommentary] = useState<CommentaryItem[]>(fallbackCommentary);
  const [discussion, setDiscussion] = useState<DiscussionMessage[]>([]);
  const [tradeIdeas, setTradeIdeas] = useState<TradeIdea[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>(fallbackRecordings);

  const studentName = useMemo(() => {
    const metadataName = user?.user_metadata?.name;
    if (typeof metadataName === "string" && metadataName.trim().length > 0) return metadataName;
    return user?.email ?? "AFF Student";
  }, [user]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeCommentary(row: DbRow): CommentaryItem {
    return {
      id: textValue(row, ["id"], crypto.randomUUID()),
      title: textValue(row, ["title"], "Market Commentary"),
      body: textValue(row, ["body", "commentary"]),
      session: textValue(row, ["session"], "Live Room"),
      publishedAt: normalizeDate(textValue(row, ["published_at", "created_at"]))
    };
  }

  function normalizeDiscussion(row: DbRow): DiscussionMessage {
    return {
      id: textValue(row, ["id"], crypto.randomUUID()),
      studentName: textValue(row, ["student_name"], "AFF Student"),
      body: textValue(row, ["body", "message"]),
      createdAt: normalizeDate(textValue(row, ["created_at"]))
    };
  }

  function normalizeTradeIdea(row: DbRow): TradeIdea {
    return {
      id: textValue(row, ["id"], crypto.randomUUID()),
      studentName: textValue(row, ["student_name"], "AFF Student"),
      symbol: textValue(row, ["symbol"], "EURUSD"),
      direction: textValue(row, ["direction"], "Buy"),
      entryZone: textValue(row, ["entry_zone"]),
      stopLoss: textValue(row, ["stop_loss"]),
      takeProfit: textValue(row, ["take_profit"]),
      rationale: textValue(row, ["rationale"]),
      status: textValue(row, ["status"], "Published"),
      publishedAt: normalizeDate(textValue(row, ["published_at", "created_at"]))
    };
  }

  function normalizeRecording(row: DbRow): Recording {
    return {
      id: textValue(row, ["id"], crypto.randomUUID()),
      title: textValue(row, ["title"], "Session Recording"),
      session: textValue(row, ["session"], "Live Room"),
      recordingUrl: textValue(row, ["recording_url", "url"]),
      recordedAt: normalizeDate(textValue(row, ["recorded_at", "created_at"]))
    };
  }

  const loadRoom = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace(`/login?next=${encodeURIComponent("/live-trading-room")}`);
        return;
      }

      setUser(currentUser);

      const [commentaryResult, discussionResult, ideasResult, recordingsResult] = await Promise.all([
        supabase.from("live_market_commentary").select("*").order("published_at", { ascending: false }).limit(12),
        supabase.from("live_room_messages").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("live_trade_ideas").select("*").order("published_at", { ascending: false }).limit(12),
        supabase.from("live_session_recordings").select("*").order("recorded_at", { ascending: false }).limit(8)
      ]);

      if (!commentaryResult.error && commentaryResult.data?.length) {
        setCommentary((commentaryResult.data as DbRow[]).map(normalizeCommentary));
      }

      if (!discussionResult.error) {
        setDiscussion(((discussionResult.data ?? []) as DbRow[]).map(normalizeDiscussion));
      }

      if (!ideasResult.error) {
        setTradeIdeas(((ideasResult.data ?? []) as DbRow[]).map(normalizeTradeIdea));
      }

      if (!recordingsResult.error && recordingsResult.data?.length) {
        setRecordings((recordingsResult.data as DbRow[]).map(normalizeRecording));
      }

      const errors = [commentaryResult.error, discussionResult.error, ideasResult.error, recordingsResult.error].filter(Boolean);
      setMessage(errors.length ? "Live room loaded. Run the live trading room migration to enable all Supabase feeds." : "Live trading room ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load live trading room."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  async function publishDiscussion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || discussionBody.trim().length === 0) return;

    setMessage("Publishing discussion message...");

    try {
      const supabase = createClient();
      const payload = {
        student_id: user.id,
        student_name: studentName,
        body: discussionBody.trim()
      };
      const { data, error } = await supabase.from("live_room_messages").insert(payload).select("*").single();
      if (error) throw error;
      setDiscussion((current) => [normalizeDiscussion(data as DbRow), ...current]);
      setDiscussionBody("");
      setMessage("Discussion message published.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to publish discussion message."));
    }
  }

  async function publishTradeIdea(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setMessage("Publishing trade idea...");

    try {
      const supabase = createClient();
      const payload = {
        student_id: user.id,
        student_name: studentName,
        symbol: tradeIdea.symbol.trim().toUpperCase(),
        direction: tradeIdea.direction,
        entry_zone: tradeIdea.entryZone.trim(),
        stop_loss: tradeIdea.stopLoss.trim(),
        take_profit: tradeIdea.takeProfit.trim(),
        rationale: tradeIdea.rationale.trim(),
        status: "Published",
        published_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from("live_trade_ideas").insert(payload).select("*").single();
      if (error) throw error;
      setTradeIdeas((current) => [normalizeTradeIdea(data as DbRow), ...current]);
      setTradeIdea(initialTradeIdea);
      setMessage("Trade idea published.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to publish trade idea."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Live Trading Room"
        title="Institutional market room for active students."
        text="Review live charts, join instructor broadcasts, follow market commentary, discuss session plans, and publish structured trade ideas."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <div className="flex flex-col gap-3 text-sm text-ink/72 sm:flex-row sm:items-center sm:justify-between">
            <p>{message}</p>
            <div className="inline-flex w-fit items-center gap-2 border border-gold-500/30 px-3 py-2 text-xs uppercase tracking-[.18em] text-gold-300">
              <Radio size={15} /> {loading ? "Connecting" : "Student Access"}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="terminal-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-gold-500/20 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">TradingView Integration</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Live Forex Chart</h2>
                </div>
                <BarChart3 className="text-gold-300" size={24} />
              </div>
              <div className="h-[460px] bg-navy-950 sm:h-[620px]">
                <iframe
                  title="TradingView Forex Chart"
                  className="h-full w-full border-0"
                  src="https://www.tradingview.com/widgetembed/?frameElementId=aff-tradingview&symbol=FX%3AEURUSD&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=0b1220&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&locale=en"
                  allowFullScreen
                />
              </div>
            </section>

            <aside className="grid gap-6">
              <section className="terminal-panel p-5">
                <div className="flex items-center gap-3">
                  <Video className="text-gold-300" size={22} />
                  <h2 className="text-xl font-semibold text-white">Live Instructor Broadcast</h2>
                </div>
                <div className="mt-5 grid aspect-video place-items-center border border-gold-500/20 bg-navy-950 text-center">
                  <div className="px-5">
                    <PlayCircle className="mx-auto text-gold-300" size={42} />
                    <p className="mt-4 text-lg font-semibold text-white">Broadcast Standby</p>
                    <p className="mt-2 text-sm leading-6 text-ink/66">Dr. Jean Rene Moricette can connect YouTube, Vimeo, Zoom replay, or private stream URLs in the recordings table.</p>
                  </div>
                </div>
              </section>

              <section className="terminal-panel overflow-hidden">
                <div className="border-b border-gold-500/20 p-5">
                  <p className="text-xs uppercase tracking-[.22em] text-gold-300">Economic Calendar</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Macro Event Watch</h2>
                </div>
                <div className="h-[430px] bg-navy-950">
                  <iframe
                    title="TradingView Economic Calendar"
                    className="h-full w-full border-0"
                    src="https://www.tradingview.com/embed-widget/economic-calendar/?locale=en"
                  />
                </div>
              </section>
            </aside>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <p className="text-xs uppercase tracking-[.22em] text-gold-300">Instructor Desk</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Market Commentary Feed</h2>
              </div>
              <div className="grid gap-px bg-gold-500/14">
                {commentary.map((item) => (
                  <article key={item.id} className="bg-navy-950 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <span className="w-fit border border-gold-500/24 px-3 py-1 text-xs uppercase tracking-[.18em] text-gold-300">{item.session}</span>
                    </div>
                    <p className="mt-3 leading-7 text-ink/74">{item.body}</p>
                    <p className="mt-3 text-xs text-ink/48">{new Date(item.publishedAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <p className="text-xs uppercase tracking-[.22em] text-gold-300">Session Archive</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Recordings</h2>
              </div>
              <div className="grid gap-px bg-gold-500/14">
                {recordings.map((recording) => (
                  <article key={recording.id} className="bg-navy-950 p-5">
                    <p className="text-xs uppercase tracking-[.18em] text-gold-300">{recording.session}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{recording.title}</h3>
                    <p className="mt-2 text-sm text-ink/58">{new Date(recording.recordedAt).toLocaleDateString()}</p>
                    {recording.recordingUrl ? (
                      <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300" href={recording.recordingUrl} target="_blank" rel="noreferrer">
                        <PlayCircle size={16} /> Open Recording
                      </a>
                    ) : (
                      <p className="mt-4 text-sm text-ink/58">Recording link coming soon.</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <form onSubmit={publishTradeIdea} className="terminal-panel grid h-fit gap-4 p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Publish Trade Idea</h2>
              </div>
              <label className="grid gap-2 text-sm text-ink/74">
                Symbol
                <input
                  className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                  value={tradeIdea.symbol}
                  onChange={(event) => setTradeIdea((current) => ({ ...current, symbol: event.target.value }))}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-ink/74">
                Direction
                <select
                  className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                  value={tradeIdea.direction}
                  onChange={(event) => setTradeIdea((current) => ({ ...current, direction: event.target.value }))}
                >
                  <option>Buy</option>
                  <option>Sell</option>
                  <option>Watchlist</option>
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <label className="grid gap-2 text-sm text-ink/74">
                  Entry zone
                  <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={tradeIdea.entryZone} onChange={(event) => setTradeIdea((current) => ({ ...current, entryZone: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm text-ink/74">
                  Stop loss
                  <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={tradeIdea.stopLoss} onChange={(event) => setTradeIdea((current) => ({ ...current, stopLoss: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm text-ink/74">
                  Take profit
                  <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={tradeIdea.takeProfit} onChange={(event) => setTradeIdea((current) => ({ ...current, takeProfit: event.target.value }))} required />
                </label>
              </div>
              <label className="grid gap-2 text-sm text-ink/74">
                Rationale
                <textarea
                  className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                  value={tradeIdea.rationale}
                  onChange={(event) => setTradeIdea((current) => ({ ...current, rationale: event.target.value }))}
                  required
                />
              </label>
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <Sparkles size={18} /> Publish Idea
              </button>
            </form>

            <section className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <p className="text-xs uppercase tracking-[.22em] text-gold-300">Trade Desk</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Published Trade Ideas</h2>
              </div>
              {tradeIdeas.length === 0 ? (
                <p className="p-5 text-ink/68">No trade ideas published yet.</p>
              ) : (
                <div className="grid gap-px bg-gold-500/14">
                  {tradeIdeas.map((idea) => (
                    <article key={idea.id} className="bg-navy-950 p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[.2em] text-gold-300">{idea.symbol} - {idea.direction}</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{idea.studentName}</h3>
                        </div>
                        <span className="w-fit border border-gold-500/24 px-3 py-1 text-xs uppercase tracking-[.18em] text-gold-300">{idea.status}</span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-ink/72 sm:grid-cols-3">
                        <p>Entry: <span className="text-white">{idea.entryZone}</span></p>
                        <p>SL: <span className="text-white">{idea.stopLoss}</span></p>
                        <p>TP: <span className="text-white">{idea.takeProfit}</span></p>
                      </div>
                      <p className="mt-4 leading-7 text-ink/74">{idea.rationale}</p>
                      <p className="mt-3 text-xs text-ink/48">{new Date(idea.publishedAt).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-gold-300" size={22} />
                <h2 className="text-xl font-semibold text-white">Student Discussion Area</h2>
              </div>
            </div>
            <form onSubmit={publishDiscussion} className="grid gap-3 border-b border-gold-500/20 p-5 sm:grid-cols-[1fr_auto]">
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                placeholder="Ask a question or share a session observation"
                value={discussionBody}
                onChange={(event) => setDiscussionBody(event.target.value)}
                required
              />
              <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                <Send size={18} /> Send
              </button>
            </form>
            {discussion.length === 0 ? (
              <p className="p-5 text-ink/68">No discussion messages yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/14">
                {discussion.map((item) => (
                  <article key={item.id} className="bg-navy-950 p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-white">{item.studentName}</p>
                      <p className="text-xs text-ink/48">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-3 leading-7 text-ink/74">{item.body}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </SectionInner>
      </Section>
    </>
  );
}
