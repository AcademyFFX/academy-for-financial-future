"use client";

import { Mail, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type DbRow = Record<string, unknown>;

type Student = {
  id: string;
  name: string;
  email: string;
};

type Message = {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  category: string;
  title: string;
  body: string;
  actionUrl: string;
  priority: string;
  readAt: string;
  archivedAt: string;
  createdAt: string;
};

const adminEmail = "acafffx@gmail.com";
const initialForm = {
  audience: "all",
  recipientId: "",
  category: "Announcement",
  priority: "Normal",
  title: "",
  body: "",
  actionUrl: ""
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

function normalizeStudent(row: DbRow): Student {
  return {
    id: value(row, ["id", "student_id"]),
    name: value(row, ["full_name", "name", "student_name"], "Student"),
    email: value(row, ["email", "student_email"], "Not recorded")
  };
}

function normalizeMessage(row: DbRow): Message {
  return {
    id: value(row, ["id"], crypto.randomUUID()),
    recipientId: value(row, ["recipient_id"]),
    recipientName: value(row, ["recipient_name"], "Student"),
    recipientEmail: value(row, ["recipient_email"]),
    category: value(row, ["category"], "Announcement"),
    title: value(row, ["title"], "Academy Message"),
    body: value(row, ["body"]),
    actionUrl: value(row, ["action_url"]),
    priority: value(row, ["priority"], "Normal"),
    readAt: value(row, ["read_at"]),
    archivedAt: value(row, ["archived_at"]),
    createdAt: normalizeDate(value(row, ["created_at"]))
  };
}

export function AdminMessageCenter() {
  const [students, setStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("Send academy messages, reminders, and certification notices.");

  const unreadCount = useMemo(() => messages.filter((item) => !item.readAt).length, [messages]);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return fallback;
  }

  const loadMessages = useCallback(async () => {
    try {
      const supabase = createClient();
      const [studentsResult, messagesResult] = await Promise.all([
        supabase.from("students").select("*").order("full_name", { ascending: true }),
        supabase.from("student_messages").select("*").order("created_at", { ascending: false }).limit(80)
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (messagesResult.error) throw messagesResult.error;

      setStudents(((studentsResult.data ?? []) as DbRow[]).map(normalizeStudent));
      setMessages(((messagesResult.data ?? []) as DbRow[]).map(normalizeMessage));
      setMessage("Student messaging center ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Run the messaging migration to enable the admin message center."));
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  function updateField(name: keyof typeof initialForm, nextValue: string) {
    setForm((current) => ({ ...current, [name]: nextValue }));
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Sending academy message...");

    try {
      const recipients = form.audience === "all"
        ? students
        : students.filter((student) => student.id === form.recipientId);

      if (recipients.length === 0) {
        setMessage("Select at least one student recipient.");
        return;
      }

      const payload = recipients.map((student) => ({
        recipient_id: student.id,
        recipient_name: student.name,
        recipient_email: student.email,
        sender_name: "Dr. Jean Rene Moricette",
        sender_email: adminEmail,
        category: form.category,
        priority: form.priority,
        title: form.title.trim(),
        body: form.body.trim(),
        action_url: form.actionUrl.trim() || null
      }));

      const supabase = createClient();
      const { data, error } = await supabase.from("student_messages").insert(payload).select("*");
      if (error) throw error;

      setMessages((current) => [...((data ?? []) as DbRow[]).map(normalizeMessage), ...current]);
      setForm(initialForm);
      setMessage(`Message sent to ${recipients.length} student${recipients.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to send message."));
    }
  }

  async function deleteMessage(id: string) {
    setMessage("Deleting message...");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("student_messages").delete().eq("id", id);
      if (error) throw error;
      setMessages((current) => current.filter((item) => item.id !== id));
      setMessage("Message deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete message."));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={sendMessage} className="terminal-panel grid h-fit gap-4 p-6">
        <div className="flex items-center gap-3">
          <Mail className="text-gold-300" size={22} />
          <h2 className="text-xl font-semibold text-white">Student Messaging Center</h2>
        </div>
        <p className="text-sm text-ink/68">{message}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-ink/74">
            Audience
            <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.audience} onChange={(event) => updateField("audience", event.target.value)}>
              <option value="all">All Students</option>
              <option value="direct">Direct Message</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-ink/74">
            Category
            <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
              <option>Announcement</option>
              <option>Direct Message</option>
              <option>Homework Reminder</option>
              <option>Certification Notification</option>
              <option>Zoom Class Reminder</option>
              <option>Course Update</option>
            </select>
          </label>
        </div>
        {form.audience === "direct" ? (
          <label className="grid gap-2 text-sm text-ink/74">
            Student
            <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.recipientId} onChange={(event) => updateField("recipientId", event.target.value)} required>
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.name} - {student.email}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-2 text-sm text-ink/74">
          Priority
          <select className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
            <option>Normal</option>
            <option>Important</option>
            <option>Urgent</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Subject
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Message
          <textarea className="min-h-32 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.body} onChange={(event) => updateField("body", event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm text-ink/74">
          Action link
          <input className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" placeholder="/assignments or /exams" value={form.actionUrl} onChange={(event) => updateField("actionUrl", event.target.value)} />
        </label>
        <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
          <Send size={18} /> Send Message
        </button>
      </form>

      <section className="terminal-panel overflow-hidden">
        <div className="border-b border-gold-500/20 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.22em] text-gold-300">Message History</p>
              <h2 className="mt-2 text-xl font-semibold text-white">Instructor and Admin Sent Messages</h2>
            </div>
            <span className="w-fit border border-gold-500/30 px-3 py-2 text-xs uppercase tracking-[.18em] text-gold-300">{unreadCount} unread</span>
          </div>
        </div>
        {messages.length === 0 ? (
          <p className="p-5 text-ink/68">No messages sent yet.</p>
        ) : (
          <div className="grid gap-px bg-gold-500/14">
            {messages.map((item) => (
              <article key={item.id} className="bg-navy-950 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[.2em] text-gold-300">{item.category} - {item.priority}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-ink/58">To {item.recipientName} - {item.recipientEmail}</p>
                  </div>
                  <button className="inline-flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200" type="button" onClick={() => deleteMessage(item.id)}>
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
                <p className="mt-4 leading-7 text-ink/74">{item.body}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink/52">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <span>{item.readAt ? `Read ${new Date(item.readAt).toLocaleString()}` : "Unread"}</span>
                  {item.archivedAt ? <span>Archived</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
