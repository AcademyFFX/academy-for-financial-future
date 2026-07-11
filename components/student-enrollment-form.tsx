"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { billingPlans } from "@/lib/billing";
import { createClient } from "@/lib/supabase";

const programInterests = [
  "Forex Training Division",
  "Forex Anatomy",
  "Institutional Forex Strategy",
  "Risk and Capital Protection",
  "AFF Global University",
  "Civic Leadership Institute"
];

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  country: "",
  program_interest: "Forex Training Division",
  membership_plan: "Free Trial",
  password: "",
  goal_statement: ""
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

function generateStudentId() {
  const year = new Date().getFullYear();
  const suffix = Math.floor(Date.now() % 100000).toString().padStart(5, "0");
  return `AFF-${year}-${suffix}`;
}

export function StudentEnrollmentForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Submit your enrollment application for Academy review.");

  function updateField(name: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("Creating student account and enrollment application...");

    try {
      const supabase = createClient();
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const email = form.email.trim().toLowerCase();
      const studentId = generateStudentId();
      const enrollmentDate = new Date().toISOString().slice(0, 10);

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          data: {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            full_name: fullName,
            phone: form.phone.trim(),
            country: form.country.trim(),
            program_interest: form.program_interest,
            membership_plan: form.membership_plan
          }
        }
      });

      if (signupError) {
        const lowerMessage = signupError.message.toLowerCase();
        if (lowerMessage.includes("already") || lowerMessage.includes("registered")) {
          setMessage("Email already exists. Please log in or use another email address.");
          return;
        }
        throw signupError;
      }

      if (signupData.user && Array.isArray(signupData.user.identities) && signupData.user.identities.length === 0) {
        setMessage("Email already exists. Please log in or use another email address.");
        return;
      }

      if (!signupData.user?.id) {
        setMessage("Account was created, but Supabase did not return a user session. Please log in to continue enrollment.");
        router.push("/login");
        return;
      }

      const authUserId = signupData.user.id;
      const selectedPlan = billingPlans.find((plan) => plan.name === form.membership_plan);

      const applicationPayload = {
        auth_user_id: authUserId,
        student_id: studentId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        full_name: fullName,
        email,
        phone: form.phone.trim(),
        country: form.country.trim(),
        program_interest: form.program_interest,
        membership_plan: form.membership_plan,
        goal_statement: form.goal_statement.trim(),
        application_status: "Pending Review"
      };
      const { error: applicationError } = await supabase.from("student_applications").insert(applicationPayload);
      if (applicationError) throw applicationError;

      const studentPayload = {
        auth_user_id: authUserId,
        student_id: studentId,
        full_name: fullName,
        email,
        phone: form.phone.trim(),
        country: form.country.trim(),
        enrollment_date: enrollmentDate,
        membership_plan: form.membership_plan,
        certification_level: form.program_interest,
        status: "Pending Review",
        created_at: new Date().toISOString()
      };

      const { data: existingStudent, error: existingStudentError } = await supabase
        .from("students")
        .select("id")
        .or(`auth_user_id.eq.${authUserId},email.eq.${email}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingStudentError) {
        setMessage(`Application saved, but student profile sync failed: ${existingStudentError.message}`);
        return;
      }

      const studentSyncResult = existingStudent?.id
        ? await supabase.from("students").update(studentPayload).eq("id", existingStudent.id)
        : await supabase.from("students").insert(studentPayload);

      if (studentSyncResult.error) {
        setMessage(`Application saved, but student profile sync failed: ${studentSyncResult.error.message}`);
        return;
      }

      const [profileResult, membershipResult, historyResult] = await Promise.all([
        supabase.from("student_profiles").upsert({
          auth_user_id: authUserId,
          student_id: studentId,
          full_name: fullName,
          email,
          phone: form.phone.trim(),
          country: form.country.trim(),
          program_interest: form.program_interest,
          membership_level: form.membership_plan,
          certification_status: "Pending Review",
          enrollment_status: "Pending Review",
          updated_at: new Date().toISOString()
        }, { onConflict: "auth_user_id" }),
        supabase.from("student_memberships").upsert({
          student_id: authUserId,
          student_email: email,
          membership_plan: form.membership_plan,
          membership_status: selectedPlan?.membershipStatus ?? form.membership_plan,
          account_status: "Pending",
          updated_at: new Date().toISOString()
        }, { onConflict: "student_id" }),
        supabase.from("student_status_history").insert({
          auth_user_id: authUserId,
          student_id: studentId,
          previous_status: null,
          new_status: "Pending Review",
          changed_by: email,
          note: "Student enrollment application submitted."
        })
      ]);

      for (const result of [profileResult, membershipResult, historyResult]) {
        if (result.error) throw result.error;
      }

      setMessage("Enrollment application submitted. Your status is Pending Review.");
      router.push("/student-profile");
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to submit enrollment application."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="terminal-panel mx-auto grid max-w-4xl gap-5 p-6 shadow-gold">
      <div className="grid gap-4 sm:grid-cols-2">
        <EnrollmentInput label="First name" value={form.first_name} onChange={(value) => updateField("first_name", value)} required />
        <EnrollmentInput label="Last name" value={form.last_name} onChange={(value) => updateField("last_name", value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <EnrollmentInput label="Email" type="email" value={form.email} onChange={(value) => updateField("email", value)} required />
        <EnrollmentInput label="Phone" type="tel" value={form.phone} onChange={(value) => updateField("phone", value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <EnrollmentInput label="Country" value={form.country} onChange={(value) => updateField("country", value)} required />
        <label className="grid gap-2 text-sm text-ink/78">
          Program interest
          <select className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.program_interest} onChange={(event) => updateField("program_interest", event.target.value)} required>
            {programInterests.map((program) => (
              <option key={program}>{program}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-ink/78">
          Membership plan
          <select className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={form.membership_plan} onChange={(event) => updateField("membership_plan", event.target.value)} required>
            {billingPlans.map((plan) => (
              <option key={plan.id} value={plan.name}>{plan.name}</option>
            ))}
          </select>
        </label>
        <EnrollmentInput label="Password" type="password" value={form.password} onChange={(value) => updateField("password", value)} required minLength={6} />
      </div>

      <label className="grid gap-2 text-sm text-ink/78">
        Short student goal statement
        <textarea
          className="min-h-32 border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
          value={form.goal_statement}
          onChange={(event) => updateField("goal_statement", event.target.value)}
          required
        />
      </label>

      <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={submitting}>
        {submitting ? "Submitting Application..." : "Submit Enrollment Application"}
      </button>
      <p className="text-sm text-ink/70">{message}</p>
    </form>
  );
}

function EnrollmentInput({ label, value, onChange, type = "text", required = false, minLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; minLength?: number }) {
  return (
    <label className="grid gap-2 text-sm text-ink/78">
      {label}
      <input
        className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
