"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export function AuthPanel({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState(
    mode === "login" ? "Enter your student credentials to continue." : "Create your student account to begin enrollment."
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const supabase = createClient();
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password, options: { data: { name, division: "Academy for Financial Future" } } });

      if (result.error) setMessage(result.error.message);
      else if (mode === "login") {
        const requestedPath = new URLSearchParams(window.location.search).get("next");
        const destination = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : email.trim().toLowerCase() === "acafffx@gmail.com" ? "/admin" : "/student-dashboard";
        router.replace(destination);
        router.refresh();
      }
      else setMessage("Registration received. Check email confirmation settings in Supabase.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication is not configured yet.");
    }
  }

  return (
    <form onSubmit={submit} className="terminal-panel mx-auto grid max-w-xl gap-4 p-6 shadow-gold">
      {mode === "register" ? (
        <label className="grid gap-2 text-sm text-ink/78">
          Full name
          <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
      ) : null}
      <label className="grid gap-2 text-sm text-ink/78">
        Email address
        <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label className="grid gap-2 text-sm text-ink/78">
        <span className="flex items-center justify-between gap-4">
          Password
          {mode === "login" ? <Link href="/reset-password" className="font-semibold text-gold-300 hover:text-white">Forgot Password?</Link> : null}
        </span>
        <input className="border border-gold-500/25 bg-navy-950 px-4 py-3 text-white outline-none focus:border-gold-400" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
      </label>
      <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950" type="submit">
        {mode === "login" ? "Sign In" : "Create Student Account"}
      </button>
      <p className="text-sm text-ink/70">{message}</p>
    </form>
  );
}
