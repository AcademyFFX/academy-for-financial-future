"use client";

import { useRouter } from "next/navigation";
import { Award, ClipboardCheck, Download, GraduationCap, Megaphone, Save, ShieldCheck, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Section, SectionInner } from "@/components/section";
import { createClient } from "@/lib/supabase";

type Student = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  certification_level: string | null;
};

type Assignment = {
  id: string;
  student_id: string | null;
  title: string;
  course_module: string | null;
  file_url: string | null;
  submission_date: string;
};

type Exam = {
  id: string;
  student_id: string;
  exam_title: string;
  score: number;
  result: "Pass" | "Fail";
  submitted_at: string;
};

type Certificate = {
  id: string;
  certificate_number: string;
  student_id: string;
  student_name: string;
  verification_code: string;
  issue_date: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  published_at: string;
};

const initialAnnouncement = { id: "", title: "", body: "" };

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading admin dashboard...");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncement);

  const studentMap = useMemo(() => {
    return new Map(students.map((student) => [student.id, student]));
  }, [students]);

  const cards = [
    { label: "Total Students", value: students.length, icon: Users },
    { label: "Total Assignments Submitted", value: assignments.length, icon: ClipboardCheck },
    { label: "Total Exam Attempts", value: exams.length, icon: ShieldCheck },
    { label: "Total Certificates Issued", value: certificates.length, icon: Award }
  ];

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  const loadAdminData = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "admin") {
        setAuthorized(false);
        setMessage("Admin access only. Sign in with an administrator account.");
        return;
      }

      setAuthorized(true);

      const [studentsResult, assignmentsResult, examsResult, certificatesResult, announcementsResult] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,created_at,certification_level").order("created_at", { ascending: false }),
        supabase.from("assignments").select("id,student_id,title,course_module,file_url,submission_date").order("submission_date", { ascending: false }),
        supabase.from("exams").select("id,student_id,exam_title,score,result,submitted_at").order("submitted_at", { ascending: false }),
        supabase.from("certificates").select("id,certificate_number,student_id,student_name,verification_code,issue_date").order("issue_date", { ascending: false }),
        supabase.from("announcements").select("id,title,body,published_at").order("published_at", { ascending: false })
      ]);

      for (const result of [studentsResult, assignmentsResult, examsResult, certificatesResult, announcementsResult]) {
        if (result.error) throw result.error;
      }

      setStudents((studentsResult.data ?? []) as Student[]);
      setAssignments((assignmentsResult.data ?? []) as Assignment[]);
      setExams((examsResult.data ?? []) as Exam[]);
      setCertificates((certificatesResult.data ?? []) as Certificate[]);
      setAnnouncements((announcementsResult.data ?? []) as Announcement[]);
      setMessage("Admin dashboard ready.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load admin dashboard."));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  async function saveAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving announcement...");

    try {
      const supabase = createClient();
      const payload = {
        title: announcementForm.title.trim(),
        body: announcementForm.body.trim(),
        published_at: new Date().toISOString()
      };

      const query = announcementForm.id
        ? supabase.from("announcements").update(payload).eq("id", announcementForm.id).select("*").single()
        : supabase.from("announcements").insert(payload).select("*").single();

      const { data, error } = await query;
      if (error) throw error;

      const saved = data as Announcement;
      setAnnouncements((current) => {
        const withoutCurrent = current.filter((announcement) => announcement.id !== saved.id);
        return [saved, ...withoutCurrent];
      });
      setAnnouncementForm(initialAnnouncement);
      setMessage("Announcement saved.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save announcement."));
    }
  }

  async function deleteAnnouncement(id: string) {
    setMessage("Deleting announcement...");

    try {
      const supabase = createClient();
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
      setMessage("Announcement deleted.");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to delete announcement."));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AFF Instructor Admin"
        title="Instructor command center."
        text="Monitor students, submissions, exams, certificates, and official academy announcements."
      />
      <Section>
        <SectionInner className="grid gap-8">
          <p className="text-sm text-ink/72">{message}</p>

          {!loading && !authorized ? (
            <div className="terminal-panel p-6 text-ink/76">Admin login only.</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {cards.map((card) => (
                  <div key={card.label} className="terminal-panel p-5">
                    <card.icon className="text-gold-300" size={22} />
                    <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
                    <p className="mt-1 text-sm text-ink/66">{card.label}</p>
                  </div>
                ))}
              </div>

              <AdminTable title="Students" headers={["Name", "Email", "Enrollment Date", "Certification Level"]}>
                {students.map((student) => (
                  <TableRow key={student.id} cells={[
                    student.full_name ?? "Student",
                    student.email ?? "Not recorded",
                    new Date(student.created_at).toLocaleDateString(),
                    student.certification_level ?? "Forex Training Division"
                  ]} />
                ))}
              </AdminTable>

              <AdminTable title="Assignments" headers={["Student", "Assignment", "Course/Module", "Date", "File"]}>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="bg-navy-950">
                    <td className="p-4 text-ink/76">{studentMap.get(assignment.student_id ?? "")?.full_name ?? "Student"}</td>
                    <td className="p-4 text-ink/76">{assignment.title}</td>
                    <td className="p-4 text-ink/76">{assignment.course_module ?? "Module"}</td>
                    <td className="p-4 text-ink/76">{new Date(assignment.submission_date).toLocaleDateString()}</td>
                    <td className="p-4">
                      {assignment.file_url ? (
                        <a className="inline-flex items-center gap-2 text-gold-300" href={assignment.file_url} target="_blank" rel="noreferrer">
                          <Download size={15} /> Download
                        </a>
                      ) : (
                        <span className="text-ink/50">No file</span>
                      )}
                    </td>
                  </tr>
                ))}
              </AdminTable>

              <AdminTable title="Exams" headers={["Student", "Exam", "Score", "Pass/Fail", "Date"]}>
                {exams.map((exam) => (
                  <TableRow key={exam.id} cells={[
                    studentMap.get(exam.student_id)?.full_name ?? "Student",
                    exam.exam_title,
                    `${exam.score}%`,
                    exam.result,
                    new Date(exam.submitted_at).toLocaleDateString()
                  ]} />
                ))}
              </AdminTable>

              <AdminTable title="Certificates" headers={["Certificate Number", "Student Name", "Verification Code", "Issue Date"]}>
                {certificates.map((certificate) => (
                  <TableRow key={certificate.id} cells={[
                    certificate.certificate_number,
                    certificate.student_name,
                    certificate.verification_code,
                    new Date(certificate.issue_date).toLocaleDateString()
                  ]} />
                ))}
              </AdminTable>

              <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
                <form onSubmit={saveAnnouncement} className="terminal-panel grid h-fit gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <Megaphone className="text-gold-300" size={22} />
                    <h2 className="text-xl font-semibold text-white">{announcementForm.id ? "Edit Announcement" : "Create Announcement"}</h2>
                  </div>
                  <label className="grid gap-2 text-sm text-ink/74">
                    Title
                    <input
                      className="border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                      value={announcementForm.title}
                      onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-ink/74">
                    Body
                    <textarea
                      className="min-h-28 border border-gold-500/24 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
                      value={announcementForm.body}
                      onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))}
                      required
                    />
                  </label>
                  <button className="inline-flex items-center justify-center gap-2 bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
                    <Save size={18} /> Save Announcement
                  </button>
                </form>

                <div className="grid gap-3">
                  {announcements.map((announcement) => (
                    <article key={announcement.id} className="terminal-panel p-5">
                      <p className="text-xs uppercase tracking-[.22em] text-gold-300">{new Date(announcement.published_at).toLocaleDateString()}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{announcement.title}</h3>
                      <p className="mt-3 leading-7 text-ink/72">{announcement.body}</p>
                      <div className="mt-4 flex gap-3">
                        <button className="border border-gold-500/45 px-4 py-2 text-sm text-gold-300" type="button" onClick={() => setAnnouncementForm(announcement)}>
                          Edit
                        </button>
                        <button className="inline-flex items-center gap-2 border border-red-300/45 px-4 py-2 text-sm text-red-200" type="button" onClick={() => deleteAnnouncement(announcement.id)}>
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </SectionInner>
      </Section>
    </>
  );
}

function AdminTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <section className="terminal-panel overflow-x-auto">
      <div className="border-b border-gold-500/20 p-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </div>
      <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="bg-navy-800">
            {headers.map((header) => (
              <th key={header} className="p-4 text-left font-semibold text-gold-300">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}

function TableRow({ cells }: { cells: string[] }) {
  return (
    <tr className="bg-navy-950">
      {cells.map((cell, index) => (
        <td key={`${cell}-${index}`} className="p-4 text-ink/76">{cell}</td>
      ))}
    </tr>
  );
}
