"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, CheckCheck, ExternalLink, Inbox, MailOpen, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type StudentMessage = {
  id: string;
  senderName: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  actionUrl: string;
  readAt: string;
  archivedAt: string;
  deletedAt: string;
  createdAt: string;
};

function value(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim().length > 0) return String(current);
  }
  return fallback;
}

function normalizeDate(raw: string) {
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeMessage(row: DbRow): StudentMessage {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    senderName: value(row, ["sender_name"], "Academy for Financial Future"),
    category: value(row, ["category"], "Announcement"),
    priority: value(row, ["priority"], "Normal"),
    title: value(row, ["title"], "Academy Message"),
    body: value(row, ["body"]),
    actionUrl: value(row, ["action_url"]),
    readAt: value(row, ["read_at"]),
    archivedAt: value(row, ["archived_at"]),
    deletedAt: value(row, ["deleted_at"]),
    createdAt: normalizeDate(value(row, ["created_at"]))
  };
}

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [activeView, setActiveView] = useState<"inbox" | "archive">("inbox");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading academy messages...");

  const unreadCount = useMemo(() => messages.filter((item) => !item.readAt && !item.deletedAt).length, [messages]);
  const visibleMessages = useMemo(() => {
    return messages.filter((item) => {
      if (item.deletedAt) return false;
      if (activeView === "archive") return Boolean(item.archivedAt);
      return !item.archivedAt;
    });
  }, [activeView, messages]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  useEffect(() => {
    async function loadMessages() {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("student_messages")
          .select("*")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMessages(((data ?? []) as DbRow[]).map(normalizeMessage));
        setMessage("Inbox ready.");
      } catch (error) {
        setMessage(getErrorMessage(error, "Run the messaging migration to enable the student inbox."));
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [router]);

  async function updateMessage(id: string, patch: Record<string, string | null>) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("student_messages").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      setMessages((current) => current.map((item) => (item.id === id ? normalizeMessage(data as DbRow) : item)));
      setMessage("Message updated.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update message."));
    }
  }

  function markRead(id: string) {
    updateMessage(id, { read_at: new Date().toISOString() });
  }

  function archiveMessage(id: string) {
    updateMessage(id, { archived_at: new Date().toISOString(), read_at: new Date().toISOString() });
  }

  function restoreMessage(id: string) {
    updateMessage(id, { archived_at: null });
  }

  function deleteMessage(id: string) {
    updateMessage(id, { deleted_at: new Date().toISOString() });
  }

  return (
    <>
      <PageHeader
        eyebrow="Student Messaging Center"
        title="Academy communications in one secure inbox."
        text="Review direct messages, homework reminders, certification notifications, Zoom class reminders, course updates, and administrator announcements."
      />
      <Section>
        <SectionInner className="grid gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink/72">{message}</p>
            <span className="w-fit border border-gold-500/30 px-3 py-2 text-xs uppercase tracking-[.18em] text-gold-300">{unreadCount} unread</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
            <button
              className={`inline-flex items-center justify-center gap-2 border px-4 py-3 text-sm font-semibold ${activeView === "inbox" ? "border-gold-500 bg-gold-500 text-navy-950" : "border-gold-500/40 text-gold-300"}`}
              type="button"
              onClick={() => setActiveView("inbox")}
            >
              <Inbox size={17} /> Inbox
            </button>
            <button
              className={`inline-flex items-center justify-center gap-2 border px-4 py-3 text-sm font-semibold ${activeView === "archive" ? "border-gold-500 bg-gold-500 text-navy-950" : "border-gold-500/40 text-gold-300"}`}
              type="button"
              onClick={() => setActiveView("archive")}
            >
              <Archive size={17} /> Archive
            </button>
          </div>

          <section className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-5">
              <h2 className="text-xl font-semibold text-white">{activeView === "archive" ? "Archived Messages" : "Inbox"}</h2>
            </div>
            {loading ? (
              <p className="p-5 text-ink/68">Loading messages...</p>
            ) : visibleMessages.length === 0 ? (
              <p className="p-5 text-ink/68">No messages in this view.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/14">
                {visibleMessages.map((item) => (
                  <article key={item.id} className={`${item.readAt ? "bg-navy-950" : "bg-navy-900"} p-5`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!item.readAt ? <span className="h-2.5 w-2.5 rounded-full bg-gold-300" aria-label="Unread" /> : null}
                          <p className="text-xs uppercase tracking-[.2em] text-gold-300">{item.category} - {item.priority}</p>
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm text-ink/58">From {item.senderName} - {new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!item.readAt ? (
                          <button className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-sm text-gold-300" type="button" onClick={() => markRead(item.id)}>
                            <CheckCheck size={15} /> Mark Read
                          </button>
                        ) : null}
                        {activeView === "archive" ? (
                          <button className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-sm text-gold-300" type="button" onClick={() => restoreMessage(item.id)}>
                            <MailOpen size={15} /> Restore
                          </button>
                        ) : (
                          <button className="inline-flex items-center gap-2 border border-gold-500/40 px-3 py-2 text-sm text-gold-300" type="button" onClick={() => archiveMessage(item.id)}>
                            <Archive size={15} /> Archive
                          </button>
                        )}
                        <button className="inline-flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200" type="button" onClick={() => deleteMessage(item.id)}>
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-4 leading-7 text-ink/74">{item.body}</p>
                    {item.actionUrl ? (
                      <Link className="mt-5 inline-flex items-center gap-2 bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950" href={item.actionUrl}>
                        <ExternalLink size={16} /> Open Related Page
                      </Link>
                    ) : null}
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
