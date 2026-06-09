"use client";

import { CalendarDays, Save, Trash2, Tv } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

const initialForm = {
  id: "",
  title: "",
  showName: "Market Outlook Show",
  category: "Live Broadcast",
  description: "",
  streamUrl: "",
  replayUrl: "",
  thumbnailUrl: "",
  scheduledAt: "",
  durationMinutes: "60",
  hostName: "Dr. Jean Rene Moricette",
  status: "Scheduled",
  accessLevel: "Members"
};

const categories = [
  "Live Broadcast",
  "Recorded Masterclass",
  "Student Interview",
  "Market Outlook Show",
  "Community Awareness TV",
  "Destiny Alignment TV",
  "Educational VOD"
];

function toDateTimeInputValue(date: string | null) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AdminTVStudio() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("Schedule live streams, publish VOD, and manage replay archives.");

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadBroadcasts = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("tv_broadcasts").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setBroadcasts((data ?? []) as Broadcast[]);
      setMessage("TV Studio controls ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the TV Studio migration to enable instructor studio controls."));
    }
  }, []);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  function editBroadcast(show: Broadcast) {
    setForm({
      id: show.id,
      title: show.title,
      showName: show.show_name,
      category: show.category,
      description: show.description ?? "",
      streamUrl: show.stream_url ?? "",
      replayUrl: show.replay_url ?? "",
      thumbnailUrl: show.thumbnail_url ?? "",
      scheduledAt: toDateTimeInputValue(show.scheduled_at),
      durationMinutes: String(show.duration_minutes ?? 60),
      hostName: show.host_name,
      status: show.status,
      accessLevel: show.access_level
    });
  }

  async function saveBroadcast(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving TV Studio broadcast...");

    try {
      const supabase = createClient();
      const payload = {
        title: form.title.trim(),
        show_name: form.showName.trim(),
        category: form.category,
        description: form.description.trim() || null,
        stream_url: form.streamUrl.trim() || null,
        replay_url: form.replayUrl.trim() || null,
        thumbnail_url: form.thumbnailUrl.trim() || null,
        scheduled_at: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        duration_minutes: Number(form.durationMinutes),
        host_name: form.hostName.trim(),
        status: form.status,
        access_level: form.accessLevel,
        created_by: "acafffx@gmail.com",
        updated_at: new Date().toISOString()
      };

      const query = form.id
        ? supabase.from("tv_broadcasts").update(payload).eq("id", form.id).select("*").single()
        : supabase.from("tv_broadcasts").insert(payload).select("*").single();

      const { data, error } = await query;
      if (error) throw error;

      const saved = data as Broadcast;
      setBroadcasts((current) => [saved, ...current.filter((show) => show.id !== saved.id)]);
      setForm(initialForm);
      setMessage("TV broadcast saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save TV broadcast."));
    }
  }

  async function deleteBroadcast(id: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("tv_broadcasts").delete().eq("id", id);
      if (error) throw error;
      setBroadcasts((current) => current.filter((show) => show.id !== id));
      setMessage("Broadcast deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete broadcast."));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={saveBroadcast} className="terminal-panel grid h-fit gap-4 p-6">
        <div className="flex items-center gap-3">
          <Tv className="text-gold-300" size={22} />
          <h2 className="text-xl font-semibold text-white">AFF TV Studio Controls</h2>
        </div>
        <p className="text-sm text-ink/68">{message}</p>
        <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Broadcast title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Show name" value={form.showName} onChange={(event) => setForm((current) => ({ ...current, showName: event.target.value }))} required />
          <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <textarea className="min-h-24 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Live stream URL" value={form.streamUrl} onChange={(event) => setForm((current) => ({ ...current, streamUrl: event.target.value }))} />
        <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Replay or VOD URL" value={form.replayUrl} onChange={(event) => setForm((current) => ({ ...current, replayUrl: event.target.value }))} />
        <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Thumbnail URL" value={form.thumbnailUrl} onChange={(event) => setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))} />
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" type="number" min="1" value={form.durationMinutes} onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))} />
        </div>
        <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="Host name" value={form.hostName} onChange={(event) => setForm((current) => ({ ...current, hostName: event.target.value }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option>Scheduled</option>
            <option>Live</option>
            <option>Replay</option>
            <option>Published</option>
            <option>Draft</option>
            <option>Archived</option>
          </select>
          <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.accessLevel} onChange={(event) => setForm((current) => ({ ...current, accessLevel: event.target.value }))}>
            <option>Members</option>
            <option>Premium</option>
            <option>Public</option>
          </select>
        </div>
        <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
          <Save size={18} /> Save Broadcast
        </button>
      </form>

      <section className="terminal-panel overflow-hidden">
        <div className="border-b border-gold-500/20 p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-gold-300" size={22} />
            <h2 className="text-xl font-semibold text-white">Broadcast Library Management</h2>
          </div>
        </div>
        {broadcasts.length === 0 ? (
          <p className="p-5 text-ink/68">No broadcasts created yet.</p>
        ) : (
          <div className="grid gap-px bg-gold-500/14">
            {broadcasts.map((show) => (
              <article key={show.id} className="bg-navy-950 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-gold-300">{show.category} - {show.status}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{show.title}</h3>
                    <p className="mt-2 text-sm text-ink/58">{show.show_name} - {show.host_name}</p>
                    {show.scheduled_at ? <p className="mt-2 text-sm text-gold-300">{new Date(show.scheduled_at).toLocaleString()}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="border border-gold-500/40 px-3 py-2 text-sm text-gold-300" type="button" onClick={() => editBroadcast(show)}>Edit</button>
                    <button className="inline-flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200" type="button" onClick={() => deleteBroadcast(show.id)}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
