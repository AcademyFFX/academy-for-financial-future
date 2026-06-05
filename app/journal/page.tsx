"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type JournalEntry = {
  id: string;
  currency_pair: string;
  trade_direction: "Buy" | "Sell";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_percentage: number;
  trade_notes: string | null;
  screenshot_url: string | null;
  created_at: string;
};

type TradingJournalRow = Partial<JournalEntry> & {
  notes?: string | null;
  result?: string | null;
};

const initialForm = {
  currency_pair: "",
  trade_direction: "Buy",
  entry_price: "",
  stop_loss: "",
  take_profit: "",
  risk_percentage: "",
  trade_notes: "",
  screenshot_url: ""
};

export default function JournalPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Record your trade plan and post-trade review.");

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeEntry(row: TradingJournalRow): JournalEntry {
    return {
      id: String(row.id ?? crypto.randomUUID()),
      currency_pair: String(row.currency_pair ?? ""),
      trade_direction: row.trade_direction === "Sell" ? "Sell" : "Buy",
      entry_price: Number(row.entry_price ?? 0),
      stop_loss: Number(row.stop_loss ?? 0),
      take_profit: Number(row.take_profit ?? 0),
      risk_percentage: Number(row.risk_percentage ?? 0),
      trade_notes: row.trade_notes ?? row.notes ?? null,
      screenshot_url: row.screenshot_url ?? null,
      created_at: row.created_at ?? new Date().toISOString()
    };
  }

  useEffect(() => {
    async function loadJournal() {
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

        const { data, error } = await supabase
          .from("trading_journal")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setEntries(((data ?? []) as TradingJournalRow[]).map(normalizeEntry));
      } catch (error) {
        setMessage(getErrorMessage(error, "Unable to load trading journal entries."));
      } finally {
        setLoading(false);
      }
    }

    loadJournal();
  }, [router]);

  function updateField(name: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentId) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setMessage("Saving journal entry...");

    try {
      const supabase = createClient();
      const payload = {
        student_id: studentId,
        currency_pair: form.currency_pair.trim().toUpperCase(),
        trade_direction: form.trade_direction,
        entry_price: Number(form.entry_price),
        stop_loss: Number(form.stop_loss),
        take_profit: Number(form.take_profit),
        risk_percentage: Number(form.risk_percentage),
        trade_notes: form.trade_notes.trim() || null,
        screenshot_url: form.screenshot_url.trim() || null
      };

      const { data, error } = await supabase
        .from("trading_journal")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setEntries((current) => [normalizeEntry(data as TradingJournalRow), ...current]);
      setForm(initialForm);
      setMessage("Journal entry saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save journal entry."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Trading Journal"
        title="Document every setup, risk decision, and market lesson."
        text="Students can save structured forex journal entries with risk metrics, notes, and chart screenshot references."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={submit} className="terminal-panel grid h-fit gap-4 p-6">
            <label className="grid gap-2 text-sm text-ink/74">
              Currency pair
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                placeholder="EUR/USD"
                value={form.currency_pair}
                onChange={(event) => updateField("currency_pair", event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Trade direction
              <select
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.trade_direction}
                onChange={(event) => updateField("trade_direction", event.target.value)}
              >
                <option>Buy</option>
                <option>Sell</option>
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Entry price", "entry_price"],
                ["Stop loss", "stop_loss"],
                ["Take profit", "take_profit"],
                ["Risk percentage", "risk_percentage"]
              ].map(([label, name]) => (
                <label key={name} className="grid gap-2 text-sm text-ink/74">
                  {label}
                  <input
                    className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                    type="number"
                    step="any"
                    min={name === "risk_percentage" ? "0" : undefined}
                    value={form[name as keyof typeof initialForm]}
                    onChange={(event) => updateField(name as keyof typeof initialForm, event.target.value)}
                    required
                  />
                </label>
              ))}
            </div>

            <label className="grid gap-2 text-sm text-ink/74">
              Trade notes
              <textarea
                className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.trade_notes}
                onChange={(event) => updateField("trade_notes", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Screenshot URL
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                type="url"
                placeholder="https://..."
                value={form.screenshot_url}
                onChange={(event) => updateField("screenshot_url", event.target.value)}
              />
            </label>

            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={saving}>
              <Save size={18} /> {saving ? "Saving..." : "Save Journal Entry"}
            </button>
            <p className="text-sm text-ink/70">{message}</p>
          </form>

          <div className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-6">
              <h2 className="text-2xl font-semibold text-white">Saved Journal Entries</h2>
              <p className="mt-2 text-sm text-ink/68">Entries are scoped to the logged-in student account.</p>
            </div>
            {loading ? (
              <p className="p-6 text-ink/72">Loading journal entries...</p>
            ) : entries.length === 0 ? (
              <p className="p-6 text-ink/72">No journal entries yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/18">
                {entries.map((entry) => (
                  <article key={entry.id} className="bg-navy-950 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[.22em] text-gold-300">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">
                          {entry.currency_pair} · {entry.trade_direction}
                        </h3>
                      </div>
                      {entry.screenshot_url ? (
                        <a className="inline-flex items-center gap-2 text-sm text-gold-300" href={entry.screenshot_url} target="_blank" rel="noreferrer">
                          Screenshot <ExternalLink size={15} />
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-ink/74 sm:grid-cols-4">
                      <p>Entry: {entry.entry_price}</p>
                      <p>Stop: {entry.stop_loss}</p>
                      <p>Target: {entry.take_profit}</p>
                      <p>Risk: {entry.risk_percentage}%</p>
                    </div>
                    {entry.trade_notes ? <p className="mt-4 leading-7 text-ink/76">{entry.trade_notes}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </SectionInner>
      </Section>
    </>
  );
}
