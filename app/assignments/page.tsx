"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type AssignmentSubmission = {
  id: string;
  title: string;
  course_module: string | null;
  student_notes: string | null;
  file_url: string | null;
  submission_date: string;
  created_at: string;
};

type AssignmentRow = Partial<AssignmentSubmission> & {
  notes?: string | null;
};

const initialForm = {
  title: "",
  course_module: "",
  student_notes: "",
  file_url: "",
  submission_date: new Date().toISOString().slice(0, 10)
};

export default function AssignmentsPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Submit completed coursework for review.");

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  function normalizeSubmission(row: AssignmentRow): AssignmentSubmission {
    return {
      id: String(row.id ?? crypto.randomUUID()),
      title: String(row.title ?? ""),
      course_module: row.course_module ?? null,
      student_notes: row.student_notes ?? row.notes ?? null,
      file_url: row.file_url ?? null,
      submission_date: row.submission_date ?? new Date().toISOString().slice(0, 10),
      created_at: row.created_at ?? new Date().toISOString()
    };
  }

  useEffect(() => {
    async function loadSubmissions() {
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
          .from("assignments")
          .select("*")
          .eq("student_id", user.id)
          .order("submission_date", { ascending: false });

        if (error) throw error;
        setSubmissions(((data ?? []) as AssignmentRow[]).map(normalizeSubmission));
      } catch (error) {
        setMessage(getErrorMessage(error, "Unable to load assignment submissions."));
      } finally {
        setLoading(false);
      }
    }

    loadSubmissions();
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
    setMessage("Saving assignment submission...");

    try {
      const supabase = createClient();
      const payload = {
        student_id: studentId,
        title: form.title.trim(),
        course_module: form.course_module.trim() || null,
        student_notes: form.student_notes.trim() || null,
        file_url: form.file_url.trim() || null,
        submission_date: form.submission_date
      };

      const { data, error } = await supabase
        .from("assignments")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setSubmissions((current) => [normalizeSubmission(data as AssignmentRow), ...current]);
      setForm(initialForm);
      setMessage("Assignment submission saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save assignment submission."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Assignments"
        title="Submit work that proves process, not luck."
        text="Upload assignment links, course modules, notes, and submission dates for review by the Forex Training Division."
      />
      <Section>
        <SectionInner className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={submit} className="terminal-panel grid h-fit gap-4 p-6">
            <label className="grid gap-2 text-sm text-ink/74">
              Assignment title
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Course/module
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.course_module}
                onChange={(event) => updateField("course_module", event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Student notes
              <textarea
                className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                value={form.student_notes}
                onChange={(event) => updateField("student_notes", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              File URL
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                type="url"
                placeholder="https://..."
                value={form.file_url}
                onChange={(event) => updateField("file_url", event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm text-ink/74">
              Submission date
              <input
                className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                type="date"
                value={form.submission_date}
                onChange={(event) => updateField("submission_date", event.target.value)}
                required
              />
            </label>

            <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={saving}>
              <Save size={18} /> {saving ? "Saving..." : "Save Submission"}
            </button>
            <p className="text-sm text-ink/70">{message}</p>
          </form>

          <div className="terminal-panel overflow-hidden">
            <div className="border-b border-gold-500/20 p-6">
              <h2 className="text-2xl font-semibold text-white">Submitted Assignments</h2>
              <p className="mt-2 text-sm text-ink/68">Only submissions for the logged-in student are shown.</p>
            </div>
            {loading ? (
              <p className="p-6 text-ink/72">Loading assignment submissions...</p>
            ) : submissions.length === 0 ? (
              <p className="p-6 text-ink/72">No assignment submissions yet.</p>
            ) : (
              <div className="grid gap-px bg-gold-500/18">
                {submissions.map((submission) => (
                  <article key={submission.id} className="bg-navy-950 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[.22em] text-gold-300">
                          {new Date(submission.submission_date).toLocaleDateString()}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{submission.title}</h3>
                        <p className="mt-2 text-sm text-ink/70">{submission.course_module}</p>
                      </div>
                      {submission.file_url ? (
                        <a className="inline-flex items-center gap-2 text-sm text-gold-300" href={submission.file_url} target="_blank" rel="noreferrer">
                          File <ExternalLink size={15} />
                        </a>
                      ) : null}
                    </div>
                    {submission.student_notes ? <p className="mt-4 leading-7 text-ink/76">{submission.student_notes}</p> : null}
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
