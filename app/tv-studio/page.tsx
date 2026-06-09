"use client";

import { useRouter } from "next/navigation";
import { Bell, CalendarDays, Clapperboard, PlayCircle, Radio, Star, Tv, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type Broadcast = {
  id: string;
  title: string;
  show_name: string;
  category: string;
  description: string | null;
  stream_url: string | null;
  replay_url: string | null;
  thumbnail_url: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  host_name: string;
  status: string;
  access_level: string;
  created_at: string;
};

type Subscription = {
  id: string;
  channel_name: string;
};

const showCategories = [
  "All",
  "Live Broadcast",
  "Recorded Masterclass",
  "Student Interview",
  "Market Outlook Show",
  "Community Awareness TV",
  "Destiny Alignment TV",
  "Educational VOD"
];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

export default function TVStudioPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const [message, setMessage] = useState("Loading AFF TV Studio...");
  const [loading, setLoading] = useState(true);

  const liveShows = useMemo(() => broadcasts.filter((show) => show.status === "Live"), [broadcasts]);
  const upcomingShows = useMemo(() => broadcasts.filter((show) => show.status === "Scheduled"), [broadcasts]);
  const replayShows = useMemo(() => broadcasts.filter((show) => ["Replay", "Published"].includes(show.status)), [broadcasts]);
  const filteredBroadcasts = useMemo(() => {
    return activeCategory === "All" ? broadcasts : broadcasts.filter((show) => show.category === activeCategory);
  }, [activeCategory, broadcasts]);
  const subscribedChannels = useMemo(() => new Set(subscriptions.map((subscription) => subscription.channel_name)), [subscriptions]);

  const loadStudio = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setStudentId(user.id);

      const [broadcastsResult, subscriptionsResult] = await Promise.all([
        supabase.from("tv_broadcasts").select("*").in("status", ["Live", "Scheduled", "Replay", "Published"]).order("scheduled_at", { ascending: true }),
        supabase.from("tv_subscriptions").select("*").eq("student_id", user.id)
      ]);

      if (broadcastsResult.error) throw broadcastsResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;

      const loadedBroadcasts = (broadcastsResult.data ?? []) as Broadcast[];
      setBroadcasts(loadedBroadcasts);
      setSubscriptions((subscriptionsResult.data ?? []) as Subscription[]);
      setActiveBroadcast(loadedBroadcasts.find((show) => show.status === "Live") ?? loadedBroadcasts[0] ?? null);
      setMessage("AFF TV Studio ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the TV Studio migration to enable broadcasts and subscriptions."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStudio();
  }, [loadStudio]);

  async function toggleSubscription(channelName: string) {
    if (!studentId) return;

    try {
      const supabase = createClient();
      const existing = subscriptions.find((subscription) => subscription.channel_name === channelName);

      if (existing) {
        const { error } = await supabase.from("tv_subscriptions").delete().eq("id", existing.id);
        if (error) throw error;
        setSubscriptions((current) => current.filter((subscription) => subscription.id !== existing.id));
      } else {
        const { data, error } = await supabase.from("tv_subscriptions").insert({
          student_id: studentId,
          channel_name: channelName
        }).select("*").single();
        if (error) throw error;
        setSubscriptions((current) => [data as Subscription, ...current]);
      }
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update TV subscription."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF TV Studio"
        title="Media Broadcasting Center for live and on-demand academy programming."
        text="Watch live broadcasts, masterclasses, student interviews, market outlook shows, Community Awareness TV, Destiny Alignment TV, and educational video-on-demand content."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <p className="text-sm text-ink/72">{message}</p>

          <section className="grid gap-4 md:grid-cols-4">
            <Metric icon={<Radio size={20} />} label="Live Now" value={String(liveShows.length)} />
            <Metric icon={<CalendarDays size={20} />} label="Scheduled" value={String(upcomingShows.length)} />
            <Metric icon={<Clapperboard size={20} />} label="Replays" value={String(replayShows.length)} />
            <Metric icon={<Bell size={20} />} label="Subscriptions" value={String(subscriptions.length)} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="terminal-panel overflow-hidden">
              <div className="border-b border-gold-500/20 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.22em] text-gold-300">{activeBroadcast?.category ?? "AFF Broadcast"}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{activeBroadcast?.title ?? "Broadcast Player"}</h2>
                  </div>
                  <Tv className="text-gold-300" size={28} />
                </div>
              </div>
              <div className="aspect-video bg-navy-950">
                {activeBroadcast?.stream_url || activeBroadcast?.replay_url ? (
                  <iframe
                    className="h-full w-full border-0"
                    title={activeBroadcast.title}
                    src={activeBroadcast.stream_url ?? activeBroadcast.replay_url ?? ""}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="grid h-full place-items-center p-8 text-center">
                    <div>
                      <PlayCircle className="mx-auto text-gold-300" size={54} />
                      <p className="mt-4 text-2xl font-semibold text-white">Broadcast Coming Soon</p>
                      <p className="mt-2 text-ink/68">Instructor studio controls can attach live stream, replay, or VOD URLs.</p>
                    </div>
                  </div>
                )}
              </div>
              {activeBroadcast ? (
                <div className="p-5">
                  <p className="text-sm text-gold-300">{activeBroadcast.show_name} - {activeBroadcast.host_name}</p>
                  <p className="mt-3 leading-7 text-ink/74">{activeBroadcast.description ?? "AFF media broadcast."}</p>
                  <button className="mt-4 border border-gold-500/45 px-4 py-2 text-sm font-semibold text-gold-300" type="button" onClick={() => toggleSubscription(activeBroadcast.show_name)}>
                    {subscribedChannels.has(activeBroadcast.show_name) ? "Subscribed" : "Subscribe to Show"}
                  </button>
                </div>
              ) : null}
            </div>

            <aside className="grid gap-6">
              <section className="terminal-panel p-5">
                <h2 className="text-xl font-semibold text-white">Channels</h2>
                <div className="mt-4 grid gap-2">
                  {showCategories.map((category) => (
                    <button
                      key={category}
                      className={`border px-3 py-2 text-left text-sm ${activeCategory === category ? "border-gold-500 bg-gold-500 text-navy-950" : "border-gold-500/24 bg-navy-950 text-ink/76"}`}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </section>

              <section className="terminal-panel p-5">
                <h2 className="text-xl font-semibold text-white">Upcoming Live Streams</h2>
                <div className="mt-4 grid gap-3">
                  {upcomingShows.length === 0 ? <p className="text-sm text-ink/64">No upcoming broadcasts scheduled.</p> : null}
                  {upcomingShows.slice(0, 4).map((show) => (
                    <button key={show.id} className="border border-gold-500/16 bg-navy-950 p-3 text-left" type="button" onClick={() => setActiveBroadcast(show)}>
                      <p className="text-sm font-semibold text-white">{show.title}</p>
                      <p className="mt-1 text-xs text-gold-300">{show.scheduled_at ? new Date(show.scheduled_at).toLocaleString() : "Date coming soon"}</p>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </section>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <h2 className="text-xl font-semibold text-white">Video Library and Replay Archives</h2>
            </div>
            {loading ? (
              <p className="p-5 text-ink/68">Loading media library...</p>
            ) : filteredBroadcasts.length === 0 ? (
              <p className="p-5 text-ink/68">No broadcasts in this channel yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/14 md:grid-cols-2 xl:grid-cols-3">
                {filteredBroadcasts.map((show) => (
                  <article key={show.id} className="bg-navy-950 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[.2em] text-gold-300">{show.category} - {show.status}</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{show.title}</h3>
                      </div>
                      {subscribedChannels.has(show.show_name) ? <Star className="text-gold-300" size={18} /> : null}
                    </div>
                    <p className="mt-3 text-sm text-ink/58">{show.show_name} - {show.host_name}</p>
                    <p className="mt-3 line-clamp-3 leading-7 text-ink/72">{show.description ?? "AFF broadcast content."}</p>
                    {show.scheduled_at ? <p className="mt-3 text-xs text-gold-300">{new Date(show.scheduled_at).toLocaleString()}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="inline-flex items-center gap-2 bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950" type="button" onClick={() => setActiveBroadcast(show)}>
                        <Video size={16} /> Watch
                      </button>
                      <button className="border border-gold-500/45 px-4 py-2 text-sm text-gold-300" type="button" onClick={() => toggleSubscription(show.show_name)}>
                        {subscribedChannels.has(show.show_name) ? "Subscribed" : "Subscribe"}
                      </button>
                    </div>
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

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="terminal-panel p-5">
      <div className="text-gold-300">{icon}</div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-ink/66">{label}</p>
    </div>
  );
}
