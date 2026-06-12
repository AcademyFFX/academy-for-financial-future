"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  country: "",
  password: "",
  confirm_password: ""
};

export function StudentRegistrationForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Complete the registration form to create your student account.");

  function updateField(name: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return fallback;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.password !== form.confirm_password) {
      setMessage("Password does not match. Please confirm the same password.");
      return;
    }

    setSubmitting(true);
    setMessage("Creating your student account...");

    try {
      const supabase = createClient();
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const email = form.email.trim().toLowerCase();

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
            division: "Academy for Financial Future"
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

      const { error: studentError } = await supabase.from("students").insert({
        full_name: fullName,
        email,
        phone: form.phone.trim(),
        country: form.country.trim(),
        enrollment_date: new Date().toISOString().slice(0, 10),
        certification_level: "Academy for Financial Future",
        status: "Active"
      });

      if (studentError) throw studentError;

      setMessage("Registration successful. Redirecting to login...");
      router.push("/login");
    } catch (error) {
      setMessage(getErrorMessage(error, "Supabase signup failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="terminal-panel mx-auto grid max-w-3xl gap-5 p-6 shadow-gold">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-ink/78">
          First name
          <input
            className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
            value={form.first_name}
            onChange={(event) => updateField("first_name", event.target.value)}
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-ink/78">
          Last name
          <input
            className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
            value={form.last_name}
            onChange={(event) => updateField("last_name", event.target.value)}
            required
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm text-ink/78">
        Email
        <input
          className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
          type="email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-ink/78">
          Phone
          <input
            className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
            type="tel"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            required
          />
        </label>
        <label className="grid gap-2 text-sm text-ink/78">
          Country
          <input
            className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-ink/78">
          Password
          <input
            className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            required
            minLength={6}
          />
        </label>
        <label className="grid gap-2 text-sm text-ink/78">
          Confirm password
          <input
            className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400"
            type="password"
            value={form.confirm_password}
            onChange={(event) => updateField("confirm_password", event.target.value)}
            required
            minLength={6}
          />
        </label>
      </div>

      <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={submitting}>
        {submitting ? "Creating Account..." : "Create Student Account"}
      </button>
      <p className="text-sm text-ink/70">{message}</p>
    </form>
  );
}
