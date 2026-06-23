"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export function PasswordResetPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [canUpdatePassword, setCanUpdatePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("Validating your secure password recovery session...");

  useEffect(() => {
    let active = true;

    try {
      const supabase = createClient();
      const initializeRecoverySession = async () => {
        try {
          const query = new URLSearchParams(window.location.search);
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const recoveryError = query.get("error_description") ?? hash.get("error_description");
          if (recoveryError) throw new Error(recoveryError.replace(/\+/g, " "));

          let { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            const code = query.get("code");
            const accessToken = hash.get("access_token");
            const refreshToken = hash.get("refresh_token");

            if (code) {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              sessionData = data;
            } else if (accessToken && refreshToken) {
              const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              if (error) throw error;
              sessionData = data;
            }
          }

          if (!active) return;
          if (sessionData.session) {
            setCanUpdatePassword(true);
            setMessage("Recovery session verified. Choose a new password for your AFF account.");
            window.history.replaceState({}, "", "/reset-password");
          } else {
            setMessage("Open the password reset link sent to your email, or request a new link below.");
          }
        } catch (error) {
          if (!active) return;
          setCanUpdatePassword(false);
          setMessage(error instanceof Error ? error.message : "This recovery link is invalid or has expired.");
        }
      };

      initializeRecoverySession();
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setCanUpdatePassword(true);
          setMessage("Recovery session verified. Choose a new password for your AFF account.");
        }
      });
      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication is not configured yet.");
    }
  }, []);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setMessage("Password reset email sent. Open the secure link in that message to choose a new password.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send the password reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated successfully. Redirecting to your AFF dashboard...");
      setPassword("");
      setConfirmPassword("");
      const destination = data.user.email?.toLowerCase() === "acafffx@gmail.com" ? "/admin" : "/student-dashboard";
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="terminal-panel mx-auto grid max-w-xl gap-6 p-6 shadow-gold">
      <form onSubmit={updatePassword} className="grid gap-4">
        <label className="grid gap-2 text-sm text-ink/78">
          New Password
          <input className="field" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={!canUpdatePassword} />
        </label>
        <label className="grid gap-2 text-sm text-ink/78">
          Confirm Password
          <input className="field" type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={!canUpdatePassword} />
        </label>
        <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={submitting || !canUpdatePassword}>
          {submitting ? "Updating..." : "Update Password"}
        </button>
      </form>

      {!canUpdatePassword ? (
        <form onSubmit={requestReset} className="grid gap-4 border-t border-gold-500/20 pt-6">
          <p className="text-sm font-semibold text-white">Need a new recovery link?</p>
          <label className="grid gap-2 text-sm text-ink/78">
            Account email
            <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <button className="bg-gold-500 px-5 py-3 font-bold text-navy-950 disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      ) : null}
      <p role="status" className="text-sm leading-6 text-ink/70">{message}</p>
      <Link href="/login" className="inline-flex text-sm font-semibold text-gold-300 hover:text-white">Return to Login</Link>
    </div>
  );
}
