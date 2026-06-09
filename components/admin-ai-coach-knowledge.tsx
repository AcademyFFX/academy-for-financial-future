"use client";

import { Bot, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type KnowledgeRow = {
  id: string;
  title: string;
  topic: string;
  content: string;
  active: boolean;
  created_at: string;
};

const initialForm = {
  title: "",
  topic: "Forex Anatomy",
  content: "",
  active: true
};

export function AdminAICoachKnowledge() {
  const [uploads, setUploads] = useState<KnowledgeRow[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("Upload instructor-approved knowledge for the AI Forex Coach.");

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadKnowledge = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("ai_coach_knowledge").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setUploads((data ?? []) as KnowledgeRow[]);
      setMessage("AI Coach knowledge uploads ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the AI Coach migration to enable knowledge uploads."));
    }
  }, []);

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  async function saveKnowledge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving AI Coach knowledge...");

    try {
      const supabase = createClient();
      const payload = {
        title: form.title.trim(),
        topic: form.topic,
        content: form.content.trim(),
        active: form.active,
        uploaded_by: "acafffx@gmail.com"
      };
      const { data, error } = await supabase.from("ai_coach_knowledge").insert(payload).select("*").single();
      if (error) throw error;
      setUploads((current) => [data as KnowledgeRow, ...current]);
      setForm(initialForm);
      setMessage("AI Coach knowledge uploaded.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save AI Coach knowledge."));
    }
  }

  async function toggleActive(upload: KnowledgeRow) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("ai_coach_knowledge").update({ active: !upload.active }).eq("id", upload.id).select("*").single();
      if (error) throw error;
      setUploads((current) => current.map((item) => (item.id === upload.id ? data as KnowledgeRow : item)));
      setMessage("Knowledge status updated.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update knowledge status."));
    }
  }

  async function deleteKnowledge(id: string) {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("ai_coach_knowledge").delete().eq("id", id);
      if (error) throw error;
      setUploads((current) => current.filter((item) => item.id !== id));
      setMessage("Knowledge upload deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete knowledge upload."));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={saveKnowledge} className="terminal-panel grid h-fit gap-4 p-6">
        <div className="flex items-center gap-3">
          <Bot className="text-gold-300" size={22} />
          <h2 className="text-xl font-semibold text-white">AI Forex Coach Knowledge</h2>
        </div>
        <p className="text-sm text-ink/68">{message}</p>
        <label className="grid gap-2 text-sm text-ink/74">
          Upload title
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Topic
          <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}>
            <option>Forex Anatomy</option>
            <option>Market Structure</option>
            <option>Institutional Orders</option>
            <option>Order Flow</option>
            <option>Economic Data</option>
            <option>Liquidity</option>
            <option>Trading Sessions</option>
            <option>Broker Interface</option>
            <option>Risk Management</option>
            <option>Trading Psychology</option>
            <option>Certification Materials</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Knowledge content
          <textarea className="min-h-36 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} required />
        </label>
        <label className="flex items-center gap-3 text-sm text-ink/74">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
          Active for AI Coach responses
        </label>
        <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
          <Save size={18} /> Save Knowledge
        </button>
      </form>

      <section className="terminal-panel overflow-hidden">
        <div className="border-b border-gold-500/20 p-5">
          <h2 className="text-xl font-semibold text-white">Instructor Knowledge Uploads</h2>
        </div>
        {uploads.length === 0 ? (
          <p className="p-5 text-ink/68">No AI Coach knowledge uploads yet.</p>
        ) : (
          <div className="grid gap-px bg-gold-500/14">
            {uploads.map((upload) => (
              <article key={upload.id} className="bg-navy-950 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-gold-300">{upload.topic} - {upload.active ? "Active" : "Inactive"}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{upload.title}</h3>
                    <p className="mt-3 line-clamp-3 leading-7 text-ink/70">{upload.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="border border-gold-500/40 px-3 py-2 text-sm text-gold-300" type="button" onClick={() => toggleActive(upload)}>
                      {upload.active ? "Disable" : "Enable"}
                    </button>
                    <button className="inline-flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200" type="button" onClick={() => deleteKnowledge(upload.id)}>
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
